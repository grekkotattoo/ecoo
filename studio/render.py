"""Motor de renderizado (Remotion) con bundle cacheado y render incremental por segmentos.

- Bundle: se compila una vez por hash del código del motor (cache/bundles/<hash>).
- Recursos (fuentes, imágenes) servidos por un servidor HTTP efímero local → nada se copia al bundle.
- Segmentos: cada plano se renderiza aparte y se cachea por hash(plano + plano previo si hay transición
  + estilo + rigs/fondos usados). Cambiar un plano solo re-renderiza ese plano.
- Ensamblado: concat sin recodificar + mux de audio → MP4 H.264 yuv420p, faststart.
"""
from __future__ import annotations

import contextlib
import functools
import http.server
import os
import shutil
import subprocess
import threading
import time
import urllib.parse
from pathlib import Path

from .core import StudioError, hash_file, hash_obj, load_config, log, paths, write_json


def _engine_hash() -> str:
    P = paths()
    files = sorted((P.engine / "src").rglob("*.ts*")) + [P.engine / "package.json", P.engine / "remotion.config.ts"]
    return hash_obj([hash_file(f) for f in files])


def _npx() -> list[str]:
    P = paths()
    local = P.engine / "node_modules" / ".bin" / "remotion"
    if not local.exists():
        raise StudioError("Motor no instalado: ejecuta `cd engine && npm ci` (ver docs/INSTALL.md)")
    return [str(local)]


def _browser_args() -> list[str]:
    exe = load_config()["render"].get("browser_executable")
    return [f"--browser-executable={exe}"] if exe and Path(exe).exists() else []


def bundle() -> Path:
    P = paths()
    h = _engine_hash()
    out = P.cache / "bundles" / h
    if (out / "index.html").exists():
        return out
    tmp = out.with_suffix(".tmp")
    shutil.rmtree(tmp, ignore_errors=True)
    t0 = time.time()
    r = subprocess.run(_npx() + ["bundle", "src/index.ts", f"--out-dir={tmp}"], cwd=P.engine, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise StudioError(f"Fallo al compilar el motor: {r.stderr[-1500:] or r.stdout[-1500:]}")
    shutil.rmtree(out, ignore_errors=True)
    tmp.rename(out)
    for old in (P.cache / "bundles").iterdir():  # conserva solo el bundle vigente (≈80 MB cada uno)
        if old != out and old.is_dir():
            shutil.rmtree(old, ignore_errors=True)
    log("render.bundle", hash=h, seconds=round(time.time() - t0, 1))
    return out


ALLOWED_PREFIXES = ("library/", "data/episodes/", "data/cache/images/")


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Solo sirve library/ y partes de data/ (nunca .env, config ni código)."""

    def log_message(self, *a):  # silencio
        pass

    def translate_path(self, path):
        rel = path.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        rel = urllib.parse.unquote(rel)
        if ".." in rel or "/." in "/" + rel or not rel.startswith(ALLOWED_PREFIXES):
            return "/nonexistent/forbidden"
        P = paths()
        if rel.startswith("library/"):
            return str(P.library / rel[len("library/"):])
        return str(P.data / rel[len("data/"):])

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


@contextlib.contextmanager
def asset_server(root: Path):
    """Sirve `root` (solo lectura, localhost, puerto aleatorio) durante el render."""
    handler = functools.partial(_QuietHandler, directory=str(root))  # root no se usa: translate_path restringe
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    th = threading.Thread(target=srv.serve_forever, daemon=True)
    th.start()
    try:
        yield f"http://127.0.0.1:{srv.server_address[1]}"
    finally:
        srv.shutdown()
        srv.server_close()


def resolve_urls(obj, base: str):
    """Sustituye 'asset://ruta' por la URL del servidor efímero (raíz = repo)."""
    if isinstance(obj, dict):
        return {k: resolve_urls(v, base) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve_urls(v, base) for v in obj]
    if isinstance(obj, str) and obj.startswith("asset://"):
        return f"{base}/{obj[8:]}"
    return obj


def _concurrency() -> int:
    c = int(load_config()["render"].get("concurrency") or 0)
    return c if c > 0 else max(1, (os.cpu_count() or 2) - 1)


def _remotion(args: list[str], timeout: int | None = None) -> None:
    P = paths()
    timeout = timeout or int(load_config()["render"].get("timeout_s", 3600))
    r = subprocess.run(_npx() + args + _browser_args() + ["--gl=swangle", "--log=error"], cwd=P.engine, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise StudioError(f"Error de render: {(r.stderr or r.stdout)[-2000:]}")


def still(props: dict, composition: str, out: Path, frame: int = 0) -> Path:
    b = bundle()
    out.parent.mkdir(parents=True, exist_ok=True)
    with asset_server(paths().root) as base:
        pf = paths().cache / "props" / f"{hash_obj(props)}.json"
        write_json(pf, resolve_urls(props, base))
        _remotion(["still", str(b), composition, str(out), f"--props={pf}", f"--frame={frame}", "--image-format=png"])
    return out


def segment_key(spec: dict, i: int) -> str:
    on_twos = bool(load_config()["render"].get("on_twos", False))
    shot = spec["shots"][i]
    prev = spec["shots"][i - 1] if i > 0 and shot.get("transitionIn", {}).get("type", "cut") != "cut" else None
    used_rigs = sorted({a["rig"] for s in (shot, prev) if s for a in s.get("actors", [])})
    used_bgs = sorted({s.get("background") for s in (shot, prev) if s and s.get("background")})
    subs = [s for s in spec["subtitles"] if s["end"] > shot["start"] and s["start"] < shot["start"] + shot["dur"]]
    return hash_obj({"shot": shot, "prev": prev, "style": spec["style"], "meta": spec["meta"], "subs": subs,
                     "rigs": [spec["rigs"][r] for r in used_rigs], "bgs": [spec["backgrounds"][b] for b in used_bgs],
                     "engine": _engine_hash(), "twos": on_twos, "scale": load_config()["render"].get("scale", 1.0)})


def render_video(spec: dict, out: Path, on_progress=None) -> dict:
    """Render incremental y por lotes:
    - Caché por plano = secuencia de fotogramas JPEG (data/cache/frames/<hash>/). Un plano sin cambios no se vuelve a pintar.
    - Los planos seguidos pendientes se pintan en UNA sola llamada al motor (sin arranques repetidos de navegador).
    - 'En dobles' (render.on_twos): se pinta 1 de cada 2 fotogramas y se duplica al codificar (mitad de trabajo).
    - Una única codificación final H.264 a la cadencia de entrega."""
    if not spec["shots"]:
        raise StudioError("Spec sin planos")
    P = paths()
    b = bundle()
    cfg = load_config()
    step = 2 if cfg["render"].get("on_twos", False) else 1
    scale = float(cfg["render"].get("scale", 1.0))
    use_cache = cfg["render"].get("segment_cache", True)
    fdir = P.cache / "frames"
    fdir.mkdir(parents=True, exist_ok=True)
    shots = spec["shots"]
    keys = [segment_key(spec, i) for i in range(len(shots))]
    done = lambda k: use_cache and (fdir / k / ".done").exists()  # noqa: E731
    t0 = time.time()
    stats = {"segments": len(shots), "cached": sum(1 for k in keys if done(k)), "rendered": 0, "batches": 0}
    runs, cur = [], []
    for i, k in enumerate(keys):
        if done(k):
            if cur:
                runs.append(cur)
                cur = []
        else:
            cur.append(i)
    if cur:
        runs.append(cur)
    with asset_server(P.root) as base:
        pf = P.cache / "props" / f"{hash_obj(spec)}.json"
        write_json(pf, {"spec": resolve_urls(spec, base)})
        for run in runs:
            a = shots[run[0]]["start"]
            z = shots[run[-1]]["start"] + shots[run[-1]]["dur"] - 1
            tmp = P.cache / "frames" / f"_run_{keys[run[0]]}"
            shutil.rmtree(tmp, ignore_errors=True)
            tmp.mkdir(parents=True)
            _remotion(["render", str(b), "Episode", str(tmp), f"--props={pf}", f"--frames={a}-{z}", "--sequence", "--image-format=jpeg",
                       "--jpeg-quality=92", f"--concurrency={_concurrency()}", *([f"--every-nth-frame={step}"] if step > 1 else []),
                       *([f"--scale={scale}"] if scale != 1 else [])])
            files = sorted(tmp.glob("element-*.jpeg"), key=lambda f: int(f.stem.split("-")[1]))
            pos = 0
            for i in run:
                n = len(range(shots[i]["start"], shots[i]["start"] + shots[i]["dur"], step))
                d = fdir / keys[i]
                shutil.rmtree(d, ignore_errors=True)
                d.mkdir(parents=True)
                for j, f in enumerate(files[pos:pos + n]):
                    f.rename(d / f"{j:05d}.jpg")
                if len(files[pos:pos + n]) != n:
                    raise StudioError(f"Render incompleto en el plano {shots[i]['id']}")
                (d / ".done").write_text(str(n))
                pos += n
                stats["rendered"] += 1
                if on_progress:
                    on_progress(stats["rendered"] + stats["cached"], len(shots))
            shutil.rmtree(tmp, ignore_errors=True)
            stats["batches"] += 1
    # codificación única: secuencia ordenada (enlaces) → H.264 a la cadencia final
    seq = P.cache / "frames" / f"_seq_{hash_obj(keys)}"
    shutil.rmtree(seq, ignore_errors=True)
    seq.mkdir(parents=True)
    n = 0
    for k in keys:
        for f in sorted((fdir / k).glob("*.jpg")):
            os.symlink(f, seq / f"{n:06d}.jpg")
            n += 1
    fps = spec["meta"]["fps"]
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-y", "-v", "error", "-framerate", f"{fps / step:g}", "-i", str(seq / "%06d.jpg")]
    W, H = spec["meta"]["width"], spec["meta"]["height"]
    vf = [f"scale={W}:{H}:flags=lanczos"] if scale != 1 else []
    if step > 1:
        vf.append(f"fps={fps}")
    if vf:
        cmd += ["-vf", ",".join(vf)]
    cmd += ["-c:v", "libx264", "-crf", str(cfg["video"]["primary"].get("crf", 18)), "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(fps), str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    shutil.rmtree(seq, ignore_errors=True)
    if r.returncode != 0:
        raise StudioError(f"Fallo al codificar: {r.stderr[-800:]}")
    stats["render_seconds"] = round(time.time() - t0, 2)
    stats["video_seconds"] = round(spec["meta"]["durationInFrames"] / fps, 2)
    stats["realtime_factor"] = round(stats["render_seconds"] / max(0.01, stats["video_seconds"]), 2)
    log("render.video", **stats)
    return stats


def mux(video: Path, audio_wav: Path | None, out: Path, total_s: float) -> Path:
    v = load_config()["video"]["primary"]
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video)]
    if audio_wav:
        cmd += ["-i", str(audio_wav), "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", v["audio_bitrate"], "-ar", "48000"]
    cmd += ["-c:v", "copy"]
    cmd += ["-t", f"{total_s:.3f}", "-movflags", "+faststart", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise StudioError(f"Fallo en mux: {r.stderr[-800:]}")
    return out


def contact_sheet(video: Path, out: Path, cols: int = 4, rows: int = 3) -> Path:
    """Hoja de contactos para revisión visual rápida del render."""
    n = cols * rows
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                               capture_output=True, text=True).stdout.strip() or 1)
    fps = max(0.01, n / dur)
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(video), "-vf", f"fps={fps:.4f},scale=270:-1,tile={cols}x{rows}", "-frames:v", "1", str(out)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise StudioError(f"Fallo en hoja de contactos: {r.stderr[-400:]}")
    return out


def transcode_format(src: Path, out: Path, width: int, height: int) -> Path:
    """Formatos futuros (1:1, 16:9): reencuadre con relleno desenfocado, sin deformar."""
    vf = (f"split[a][b];[a]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},boxblur=30[bg];"
          f"[b]scale={width}:{height}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-filter_complex", vf, "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
                        "-c:a", "copy", "-movflags", "+faststart", str(out)], capture_output=True, text=True)
    if r.returncode != 0:
        raise StudioError(f"Fallo al transcodificar: {r.stderr[-400:]}")
    return out


def prune_cache(days: float = 14) -> dict:
    """Borra segmentos/props de caché no usados en `days` días (nunca entregas ni episodios)."""
    P = paths()
    limit = time.time() - days * 86400
    freed, n = 0, 0
    for sub in ("segments", "frames", "props", "selftest"):
        d = P.cache / sub
        if not d.exists():
            continue
        for f in d.rglob("*"):
            if f.is_file() and f.stat().st_atime < limit and f.stat().st_mtime < limit:
                freed += f.stat().st_size
                f.unlink()
                n += 1
    log("cache.prune", files=n, mb=round(freed / 1e6, 1))
    return {"files": n, "freed_mb": round(freed / 1e6, 1)}
