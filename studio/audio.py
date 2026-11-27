"""Gestor de audio: importación (WAV/MP3), versiones, pausas, visemas y mezcla final.

- Importa cualquier WAV/MP3 (ElevenLabs u otro) → WAV PCM 48 kHz mono normalizado por pico.
- Versionado por línea de diálogo: audio/lines/<line_id>/v001.wav ... sustituir = nueva versión.
- Detección de pausas con ffmpeg silencedetect → divide una narración única en líneas.
- Visemas para lip-sync: Rhubarb Lip Sync si está instalado (mejor), si no aproximación
  por energía + tasa de cruces por cero (honesta: sincroniza aperturas, no fonemas exactos).
- Mezcla: diálogos + música con ducking (sidechain) + SFX → loudnorm a -14 LUFS (redes).
"""
from __future__ import annotations

import json
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np

from .core import StudioError, log, now_iso, paths, read_json, write_json

SR = 48000


def _run(cmd: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as e:
        raise StudioError(f"Herramienta no encontrada: {cmd[0]}") from e
    except subprocess.TimeoutExpired as e:
        raise StudioError(f"Timeout ejecutando {cmd[0]}") from e
    if r.returncode != 0:
        raise StudioError(f"{cmd[0]} falló: {r.stderr[-800:]}")
    return r


def probe(p: Path) -> dict:
    if not p.exists():
        raise StudioError(f"No existe {p}")
    r = _run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(p)])
    j = json.loads(r.stdout)
    a = [s for s in j.get("streams", []) if s.get("codec_type") == "audio"]
    if not a:
        raise StudioError(f"{p.name} no contiene audio")
    return {"duration": float(j["format"].get("duration", 0)), "codec": a[0].get("codec_name"),
            "sample_rate": int(a[0].get("sample_rate", 0)), "channels": a[0].get("channels")}


def to_wav(src: Path, dst: Path) -> Path:
    if src.suffix.lower() not in (".wav", ".mp3", ".m4a", ".ogg", ".flac"):
        raise StudioError(f"Formato no soportado: {src.suffix} (usa WAV o MP3)")
    dst.parent.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-ac", "1", "-ar", str(SR), "-af", "dynaudnorm=p=0.9:m=10", "-c:a", "pcm_s16le", str(dst)])
    return dst


def read_mono(p: Path) -> np.ndarray:
    with wave.open(str(p), "rb") as w:
        if w.getsampwidth() != 2:
            raise StudioError("Se esperaba PCM 16-bit")
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if w.getnchannels() > 1:
            data = data.reshape(-1, w.getnchannels()).mean(axis=1)
        return data


def duration(p: Path) -> float:
    with wave.open(str(p), "rb") as w:
        return w.getnframes() / float(w.getframerate())


def silences(p: Path, db: float = -35, min_s: float = 0.25) -> list[tuple[float, float]]:
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", str(p), "-af", f"silencedetect=noise={db}dB:d={min_s}", "-f", "null", "-"],
                       capture_output=True, text=True)
    out, start = [], None
    for line in r.stderr.splitlines():
        if "silence_start:" in line:
            start = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and start is not None:
            end = float(line.split("silence_end:")[1].split()[0])
            out.append((max(0.0, start), end))
            start = None
    if start is not None:
        out.append((start, duration(p)))
    return out


def speech_segments(p: Path, db: float = -35, min_s: float = 0.25) -> list[tuple[float, float]]:
    total = duration(p)
    sil = silences(p, db, min_s)
    segs, t = [], 0.0
    for s, e in sil:
        if s - t > 0.08:
            segs.append((t, s))
        t = e
    if total - t > 0.08:
        segs.append((t, total))
    return segs


def trim(src: Path, dst: Path, start: float, end: float, pad: float = 0.05) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0, start - pad):.3f}", "-to", f"{end + pad:.3f}", "-i", str(src), "-c:a", "pcm_s16le", str(dst)])
    return dst


# ------------------------------------------------------------- versiones por línea

def line_dir(ep_id: str, line_id: str) -> Path:
    return paths().episode(ep_id) / "audio" / "lines" / line_id


def line_versions(ep_id: str, line_id: str) -> list[dict]:
    return read_json(line_dir(ep_id, line_id) / "versions.json", [])


def add_line_version(ep_id: str, line_id: str, src: Path, source: str) -> dict:
    """Importa/sustituye el audio de una línea. Nunca borra versiones previas."""
    vers = line_versions(ep_id, line_id)
    v = len(vers) + 1
    dst = line_dir(ep_id, line_id) / f"v{v:03d}.wav"
    to_wav(src, dst)
    rec = {"version": v, "file": dst.name, "source": source, "original": src.name, "duration": round(duration(dst), 3),
           "imported": now_iso(), "active": True}
    for o in vers:
        o["active"] = False
    vers.append(rec)
    write_json(line_dir(ep_id, line_id) / "versions.json", vers)
    log("audio.line_version", episode=ep_id, line=line_id, version=v, source=source)
    return rec


def active_line(ep_id: str, line_id: str) -> Path | None:
    for v in reversed(line_versions(ep_id, line_id)):
        if v.get("active"):
            return line_dir(ep_id, line_id) / v["file"]
    return None


def split_narration(ep_id: str, src: Path, line_ids: list[str], texts: list[str], db: float, min_s: float) -> dict:
    """Una sola pista para todo el episodio → una versión por línea usando pausas.
    Si el nº de segmentos no cuadra, reparte proporcionalmente a la longitud del texto (y lo avisa)."""
    tmp = paths().episode(ep_id) / "audio" / "_narration.wav"
    to_wav(src, tmp)
    segs = speech_segments(tmp, db, min_s)
    method = "pauses"
    if len(segs) != len(line_ids):
        # fusiona/reparte: proporcional al nº de caracteres dentro del habla total
        method = "proportional"
        start, end = (segs[0][0], segs[-1][1]) if segs else (0.0, duration(tmp))
        weights = np.array([max(1, len(t)) for t in texts], dtype=float)
        cuts = start + np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * (end - start)
        segs = [(float(cuts[i]), float(cuts[i + 1])) for i in range(len(line_ids))]
    for lid, (s, e) in zip(line_ids, segs):
        piece = paths().episode(ep_id) / "audio" / "_split" / f"{lid}.wav"
        trim(tmp, piece, s, e)
        add_line_version(ep_id, lid, piece, source=f"narration:{src.name}:{method}")
    return {"segments": len(segs), "method": method}


# ------------------------------------------------------------- visemas

def visemes(p: Path, fps: int, text: str | None = None) -> tuple[list[dict], str]:
    rh = shutil.which("rhubarb")
    if rh:
        try:
            r = _run([rh, "-f", "json", "--machineReadable", "-q", str(p)], timeout=300)
            cues = json.loads(r.stdout)["mouthCues"]
            return [{"f": int(round(c["start"] * fps)), "v": c["value"]} for c in cues], "rhubarb"
        except Exception as e:  # cae a la aproximación
            log("audio.rhubarb_failed", error=str(e)[:200])
    x = read_mono(p)
    hop = int(SR / fps)
    n = max(1, len(x) // hop)
    frames = x[: n * hop].reshape(n, hop)
    rms = np.sqrt((frames ** 2).mean(axis=1) + 1e-12)
    zcr = (np.abs(np.diff(np.sign(frames), axis=1)) > 0).mean(axis=1)
    ref = np.percentile(rms, 95) + 1e-9
    lv = rms / ref
    out, last, hold = [], None, 0
    for i in range(n):
        if lv[i] < 0.12:
            v = "X"
        elif lv[i] < 0.3:
            v = "B" if zcr[i] > 0.25 else "A" if lv[i] < 0.18 else "F"
        elif lv[i] < 0.6:
            v = "C" if zcr[i] < 0.18 else "G" if zcr[i] > 0.3 else "E"
        else:
            v = "D" if zcr[i] < 0.2 else "H"
        if v != last and (hold >= 2 or last is None):
            out.append({"f": i, "v": v})
            last, hold = v, 0
        else:
            hold += 1
    out.append({"f": n, "v": "X"})
    return out, "amplitude"


# ------------------------------------------------------------- mezcla

def mix(out: Path, total_s: float, dialogue: list[tuple[Path, float]], music: Path | None, sfx: list[tuple[Path, float, float]],
        lufs: float = -14, music_gain_db: float = -16) -> Path:
    """dialogue: [(wav, start_s)], sfx: [(wav, start_s, gain_db)]. Ducking automático de música bajo la voz."""
    if total_s <= 0:
        raise StudioError("Duración de mezcla inválida")
    inputs, filt, labels = [], [], []
    inputs += ["-f", "lavfi", "-t", f"{total_s:.3f}", "-i", f"anullsrc=r={SR}:cl=mono"]
    idx = 1
    dl = []
    for wav, st in dialogue:
        inputs += ["-i", str(wav)]
        ms = int(st * 1000)
        filt.append(f"[{idx}:a]adelay={ms}|{ms},apad[d{idx}]")
        dl.append(f"[d{idx}]")
        idx += 1
    if dl:
        filt.append(f"[0:a]{''.join(dl)}amix=inputs={len(dl)+1}:normalize=0:duration=first[dlg]")
    else:
        filt.append("[0:a]anull[dlg]")
    filt.append("[dlg]asplit=2[dlgA][dlgB]")
    if music:
        inputs += ["-stream_loop", "-1", "-i", str(music)]
        filt.append(f"[{idx}:a]aformat=channel_layouts=mono,volume={music_gain_db}dB,atrim=0:{total_s:.3f}[mus]")
        filt.append("[mus][dlgB]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[duck]")
        idx += 1
        labels.append("[duck]")
    else:
        filt.append("[dlgB]anullsink")
    for wav, st, g in sfx:
        inputs += ["-i", str(wav)]
        ms = int(st * 1000)
        filt.append(f"[{idx}:a]volume={g}dB,adelay={ms}|{ms},apad[s{idx}]")
        labels.append(f"[s{idx}]")
        idx += 1
    allin = "[dlgA]" + "".join(labels)
    filt.append(f"{allin}amix=inputs={1 + len(labels)}:normalize=0:duration=first,atrim=0:{total_s:.3f},loudnorm=I={lufs}:TP=-1.5:LRA=11,aresample={SR}[out]")
    out.parent.mkdir(parents=True, exist_ok=True)
    _run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-ac", "2", "-c:a", "pcm_s16le", str(out)], timeout=900)
    return out


def tone(dst: Path, seconds: float, freq: float = 220, pattern: str = "speech") -> Path:
    """Genera audio SINTÉTICO de prueba técnica (no es voz ni contenido)."""
    t = np.arange(int(SR * seconds)) / SR
    sig = 0.4 * np.sin(2 * np.pi * freq * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * t))
    if pattern == "speech":  # ráfagas con pausas para probar silencedetect/visemas
        env = (np.sin(2 * np.pi * 1.3 * t) > -0.2).astype(float)
        sig *= env
    dst.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1) * 32767).astype(np.int16).tobytes())
    return dst
