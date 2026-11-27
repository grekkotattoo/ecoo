"""Control de calidad automático. Los errores CRÍTICOS bloquean la entrega.

Comprueba: resolución, FPS, códec/pix_fmt, duración, integridad (decodificación completa), pista de
audio y nivel, sincronía audio/vídeo y diálogos, fotogramas negros, congelados, subtítulos (límites,
solapes, longitud), recursos faltantes, continuidad de personajes (versión/hash aprobados) y la regla
anti-"slideshow": todo plano de escena debe tener animación propia además de la cámara.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .core import hash_obj, load_config, now_iso, write_json

CRIT, WARN, OK = "critical", "warning", "ok"


def ffprobe(p: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(p)], capture_output=True, text=True)
    if r.returncode != 0:
        return {}
    return json.loads(r.stdout)


def _filter_log(p: Path, vf: str | None = None, af: str | None = None) -> str:
    cmd = ["ffmpeg", "-v", "info", "-i", str(p)]
    if vf:
        cmd += ["-vf", vf]
    if af:
        cmd += ["-af", af]
    cmd += ["-f", "null", "-"]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=900).stderr


def check_video(video: Path, expect: dict, spec: dict | None = None, plan: dict | None = None,
                approved_assets: dict | None = None) -> dict:
    checks: list[dict] = []

    def add(name, level, detail):
        checks.append({"check": name, "level": level, "detail": detail})

    if not video.exists() or video.stat().st_size == 0:
        add("existe", CRIT, f"No existe {video}")
        return _report(checks, video)
    info = ffprobe(video)
    if not info:
        add("integridad", CRIT, "ffprobe no puede leer el fichero")
        return _report(checks, video)
    vs = [s for s in info["streams"] if s["codec_type"] == "video"]
    aus = [s for s in info["streams"] if s["codec_type"] == "audio"]
    if not vs:
        add("pista_video", CRIT, "Sin pista de vídeo")
        return _report(checks, video)
    v = vs[0]
    res_ok = v["width"] == expect["width"] and v["height"] == expect["height"]
    add("resolucion", OK if res_ok else CRIT, f"{v['width']}x{v['height']} (esperado {expect['width']}x{expect['height']})")
    num, den = (int(x) for x in v["r_frame_rate"].split("/"))
    fps = num / den
    add("fps", OK if abs(fps - expect["fps"]) < 0.01 else CRIT, f"{fps:.3f} (esperado {expect['fps']})")
    add("codec", OK if v["codec_name"] == "h264" else CRIT, v["codec_name"])
    add("pix_fmt", OK if v.get("pix_fmt") == "yuv420p" else WARN, v.get("pix_fmt"))
    dur = float(info["format"].get("duration", 0))
    if spec:
        exp_d = spec["meta"]["durationInFrames"] / spec["meta"]["fps"]
        add("duracion", OK if abs(dur - exp_d) <= 2 / expect["fps"] + 0.05 else CRIT, f"{dur:.3f}s (spec {exp_d:.3f}s)")
    tmin, tmax = expect.get("min_s"), expect.get("max_s")
    if tmin and tmax:
        add("duracion_objetivo", OK if tmin <= dur <= tmax else WARN, f"{dur:.1f}s (objetivo {tmin}-{tmax}s)")
    # integridad: decodifica todo y busca errores
    dec = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-f", "null", "-"], capture_output=True, text=True, timeout=900)
    add("integridad", OK if dec.returncode == 0 and not dec.stderr.strip() else CRIT, (dec.stderr.strip()[:300] or "decodificación completa sin errores"))
    # negros y congelados
    log = _filter_log(video, vf="blackdetect=d=0.25:pic_th=0.97,freezedetect=n=0.001:d=1.5")
    blacks = [l for l in log.splitlines() if "black_start" in l]
    freezes = [l for l in log.splitlines() if "freeze_start" in l]
    add("fotogramas_negros", OK if not blacks else CRIT, f"{len(blacks)} tramos negros" + (f": {blacks[0][-80:]}" if blacks else ""))
    add("congelados", OK if not freezes else WARN, f"{len(freezes)} tramos sin movimiento >1.5s")
    # audio
    if expect.get("audio", True):
        if not aus:
            add("audio", CRIT, "Sin pista de audio")
        else:
            a = aus[0]
            add("audio", OK, f"{a['codec_name']} {a.get('sample_rate')}Hz {a.get('channels')}ch")
            alog = _filter_log(video, af="ebur128=framelog=quiet")
            lufs = None
            for line in alog.splitlines()[::-1]:
                if line.strip().startswith("I:") and "LUFS" in line:
                    lufs = float(line.split()[1])
                    break
            if lufs is None or lufs < -40:
                add("nivel_audio", CRIT, f"Audio vacío o inaudible (I={lufs})")
            else:
                tgt = load_config()["video"]["primary"]["loudness_lufs"]
                add("nivel_audio", OK if abs(lufs - tgt) <= 2.5 else WARN, f"{lufs:.1f} LUFS (objetivo {tgt})")
            adur = float(a.get("duration") or dur)
            add("sincronia_av", OK if abs(adur - dur) <= 0.1 else CRIT, f"audio {adur:.3f}s vs vídeo {dur:.3f}s")
    if spec:
        checks.extend(check_spec(spec, plan, approved_assets))
    return _report(checks, video)


def check_spec(spec: dict, plan: dict | None = None, approved_assets: dict | None = None) -> list[dict]:
    out = []

    def add(name, level, detail):
        out.append({"check": name, "level": level, "detail": detail})

    fps = spec["meta"]["fps"]
    W = spec["meta"]["width"]
    # recursos faltantes
    missing = []
    for s in spec["shots"]:
        if s.get("background") and s["background"] not in spec["backgrounds"]:
            missing.append(f"fondo {s['background']}")
        for a in s.get("actors", []):
            if a["rig"] not in spec["rigs"]:
                missing.append(f"rig {a['rig']}")
    if plan:
        for d in plan.get("dialogue", []):
            if not Path(d["file"]).exists():
                missing.append(f"audio {d['line']}")
    add("recursos", OK if not missing else CRIT, ", ".join(missing) or "todos presentes")
    # continuidad temporal de planos
    t = 0
    gaps = []
    for s in spec["shots"]:
        if s["start"] != t:
            gaps.append(s["id"])
        t = s["start"] + s["dur"]
    add("continuidad_planos", OK if not gaps and t == spec["meta"]["durationInFrames"] else CRIT, f"huecos/solapes: {gaps}" if gaps else "timeline continuo")
    # anti-slideshow
    static = []
    for s in spec["shots"]:
        if s.get("kind", "scene") != "scene":
            continue
        animated = any(a.get("actions") or a.get("visemes") or a.get("idle", True) for a in s.get("actors", [])) or \
            any(e["type"] != "shake" for e in s.get("effects", [])) or \
            any(l.get("anim") for l in spec["backgrounds"].get(s.get("background"), {}).get("layers", []))
        if not animated:
            static.append(s["id"])
    add("animacion_real", OK if not static else CRIT, f"planos solo-cámara: {static}" if static else "todos los planos tienen animación propia")
    # subtítulos
    subs = spec.get("subtitles", [])
    bad = []
    max_chars = spec["style"]["subtitle"]["maxChars"]
    for i, s in enumerate(subs):
        if s["end"] <= s["start"]:
            bad.append(f"#{i} duración≤0")
        if len(s["text"]) > max_chars + 8:
            bad.append(f"#{i} demasiado largo")
        if i and s["start"] < subs[i - 1]["end"] - 1:
            bad.append(f"#{i} solapa")
        if s["end"] > spec["meta"]["durationInFrames"]:
            bad.append(f"#{i} fuera del vídeo")
        if (s["end"] - s["start"]) / fps < 0.25:
            bad.append(f"#{i} ilegible (<0.25s)")
    est_w = max_chars * spec["style"]["subtitle"]["size"] * 0.55
    if est_w > W - 120:
        bad.append("ancho estimado excede márgenes")
    add("subtitulos", OK if not bad else CRIT if any("fuera" in b or "≤0" in b for b in bad) else WARN, "; ".join(bad[:6]) or f"{len(subs)} subtítulos correctos")
    # sincronía diálogo ↔ subtítulos ↔ visemas
    if plan:
        desync = []
        for d in plan.get("dialogue", []):
            f0 = int(round(d["at"] * fps))
            ss = [s for s in subs if s.get("line") == d["line"]]
            if ss and abs(ss[0]["start"] - f0) > 1:
                desync.append(d["line"])
        add("sincronia_dialogo", OK if not desync else CRIT, f"desfasadas: {desync}" if desync else "subtítulos alineados al audio (±1 frame)")
    # continuidad de personajes
    if approved_assets:
        drift = []
        for rid, rig in spec["rigs"].items():
            exp = approved_assets.get(rid)
            if exp and hash_obj(rig) != exp:
                drift.append(rid)
        add("continuidad_personajes", OK if not drift else CRIT, f"rigs alterados respecto a lo aprobado: {drift}" if drift else "rigs idénticos a la versión aprobada")
    return out


def _report(checks: list[dict], video: Path) -> dict:
    crit = [c for c in checks if c["level"] == CRIT]
    warn = [c for c in checks if c["level"] == WARN]
    return {"video": str(video), "ts": now_iso(), "passed": not crit, "critical": len(crit), "warnings": len(warn), "checks": checks}


def write_report(rep: dict, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    write_json(out_dir / "qa_report.json", rep)
    icon = {OK: "✅", WARN: "⚠️", CRIT: "❌"}
    md = [f"# Informe de calidad\n\n- Vídeo: `{Path(rep['video']).name}`\n- Fecha: {rep['ts']}\n- Resultado: **{'APTO' if rep['passed'] else 'BLOQUEADO'}** "
          f"({rep['critical']} críticos, {rep['warnings']} avisos)\n\n| | Comprobación | Detalle |\n|---|---|---|"]
    md += [f"| {icon[c['level']]} | {c['check']} | {str(c['detail']).replace('|', '/')} |" for c in rep["checks"]]
    (out_dir / "qa_report.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    return out_dir / "qa_report.md"
