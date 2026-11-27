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
    shot = spec["shots"][i]
    prev = spec["shots"][i - 1] if i > 0 and shot.get("transitionIn", {}).get("type", "cut") != "cut" else None
    used_rigs = sorted({a["rig"] for s in (shot, prev) if s for a in s.get("actors", [])})
    used_bgs = sorted({s.get("background") for s in (shot, prev) if s and s.get("background")})
    subs = [s for s in spec["subtitles"] if s["end"] > shot["start"] and s["start"] < shot["start"] + shot["dur"]]
    return hash_obj({"shot": shot, "prev": prev, "style": spec["style"], "meta": spec["meta"], "subs": subs,
                     "rigs": [spec["rigs"][r] for r in used_rigs], "bgs": [spec["backgrounds"][b] for b in used_bgs],
                     "engine": _engine_hash()})


def render_video(spec: dict, out: Path, on_progress=None) -> dict:
    """Render incremental por planos. Devuelve métricas reales (segundos de render, caché)."""
    if not spec["shots"]:
        raise StudioError("Spec sin planos")
    P = paths()
    b = bundle()
    seg_dir = P.cache / "segments"
    seg_dir.mkdir(parents=True, exist_ok=True)
    use_cache = load_config()["render"].get("segment_cache", True)
    t0 = time.time()
    stats = {"segments": len(spec["shots"]), "cached": 0, "rendered": 0}
    files = []
    with asset_server(P.root) as base:
        pf = P.cache / "props" / f"{hash_obj(spec)}.json"
        write_json(pf, {"spec": resolve_urls(spec, base)})
        for i, shot in enumerate(spec["shots"]):
            key = segment_key(spec, i)
            seg = seg_dir / f"{key}.mp4"
            if use_cache and seg.exists() and seg.stat().st_size > 0:
                stats["cached"] += 1
            else:
                a, z = shot["start"], shot["start"] + shot["dur"] - 1
                tmp = seg.with_suffix(".part.mp4")
                _remotion(["render", str(b), "Episode", str(tmp), f"--props={pf}", f"--frames={a}-{z}", "--codec=h264", "--crf=18",
                           "--pixel-format=yuv420p", f"--concurrency={_concurrency()}", "--muted", "--image-format=jpeg", "--jpeg-quality=92"])
                tmp.rename(seg)
                stats["rendered"] += 1
            files.append(seg)
            if on_progress:
                on_progress(i + 1, len(spec["shots"]))
    lst = out.with_suffix(".concat.txt")
    out.parent.mkdir(parents=True, exist_ok=True)
    lst.write_text("".join(f"file '{f}'\n" for f in files))
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)], capture_output=True, text=True)
    lst.unlink(missing_ok=True)
    if r.returncode != 0:
        raise StudioError(f"Fallo al concatenar segmentos: {r.stderr[-800:]}")
    stats["render_seconds"] = round(time.time() - t0, 2)
    stats["video_seconds"] = round(spec["meta"]["durationInFrames"] / spec["meta"]["fps"], 2)
    stats["realtime_factor"] = round(stats["render_seconds"] / max(0.01, stats["video_seconds"]), 2)
    log("render.video", **stats)
    return stats


def mux(video: Path, audio_wav: Path | None, out: Path, total_s: float) -> Path:
    v = load_config()["video"]["primary"]
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(video)]
    if audio_wav:
        cmd += ["-i", str(audio_wav), "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", v["audio_bitrate"], "-ar", "48000"]
    cmd += ["-c:v", "copy", "-t", f"{total_s:.3f}", "-movflags", "+faststart", str(out)]
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
    for sub in ("segments", "props", "selftest"):
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
