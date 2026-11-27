"""Integración ElevenLabs (preparada, desactivada por defecto).

Dos vías:
  1) IMPORT (por defecto, coste 0 para el estudio): generas las voces en ElevenLabs y sueltas los
     WAV/MP3 en data/inbox/audio/<EP>/ con nombre <line_id>.mp3 (o una narración única narration.mp3).
  2) API: con ELEVENLABS_API_KEY en el entorno + voice.elevenlabs.enabled=true + costs.authorize_paid=true.
     Antes de cada llamada: estimación → presupuesto → cuota REAL de la cuenta (/v1/user/subscription) → dedupe.

La clave NUNCA se guarda en código ni en config: solo variable de entorno o .env (gitignored).
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from pathlib import Path

from . import costs
from .core import StudioError, hash_obj, load_config, log, paths, secret

API = "https://api.elevenlabs.io/v1"


def status() -> dict:
    cfg = load_config()["voice"]["elevenlabs"]
    has_key = bool(secret("ELEVENLABS_API_KEY"))
    return {"enabled": bool(cfg.get("enabled")), "api_key_present": has_key, "voices_mapped": cfg.get("voices", {}),
            "ready": bool(cfg.get("enabled")) and has_key and bool(load_config()["costs"].get("authorize_paid")),
            "import_inbox": str(paths().inbox / "audio")}


def _req(method: str, path: str, body: dict | None = None, accept: str = "application/json") -> bytes:
    key = secret("ELEVENLABS_API_KEY")
    if not key:
        raise StudioError("Falta ELEVENLABS_API_KEY (variable de entorno o .env). Ver docs/ELEVENLABS.md")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise StudioError(f"ElevenLabs HTTP {e.code}: {e.read()[:300]!r}") from e
    except urllib.error.URLError as e:
        raise StudioError(f"ElevenLabs no accesible: {e.reason}") from e


def subscription() -> dict:
    """Cuota real de caracteres de la cuenta (no se inventa)."""
    j = json.loads(_req("GET", "/user/subscription"))
    return {"used": j.get("character_count"), "limit": j.get("character_limit"), "tier": j.get("tier"),
            "reset_unix": j.get("next_character_count_reset_unix")}


def list_voices() -> list[dict]:
    j = json.loads(_req("GET", "/voices"))
    return [{"voice_id": v["voice_id"], "name": v["name"], "labels": v.get("labels", {})} for v in j.get("voices", [])]


def synthesize(ep_id: str, line_id: str, speaker: str, text: str) -> Path:
    st = status()
    cfg = load_config()["voice"]["elevenlabs"]
    if not st["enabled"]:
        raise StudioError("ElevenLabs desactivado (voice.elevenlabs.enabled=false). Usa la vía IMPORT.")
    voice_id = cfg.get("voices", {}).get(speaker)
    if not voice_id:
        raise StudioError(f"Sin voice_id para '{speaker}'. Mapea en config: voice.elevenlabs.voices.{speaker}")
    price = load_config()["costs"]["prices"]["elevenlabs_usd_per_1k_chars"]
    idem = f"tts:{hash_obj([voice_id, cfg['model_id'], text])}"
    out = paths().episode(ep_id) / "audio" / "_tts" / f"{line_id}-{idem[4:12]}.mp3"
    if out.exists():
        return out  # reutiliza: nunca se paga dos veces el mismo texto con la misma voz
    costs.guard(costs.Estimate("voice", len(text) / 1000 * price, {"chars": len(text), "line": line_id}), ep_id, idem)
    sub = subscription()
    if sub["limit"] is not None and sub["used"] is not None and sub["used"] + len(text) > sub["limit"]:
        raise StudioError(f"Cuota ElevenLabs insuficiente ({sub['used']}/{sub['limit']} caracteres)")
    audio = _req("POST", f"/text-to-speech/{voice_id}?output_format={cfg['output_format']}",
                 {"text": text, "model_id": cfg["model_id"], "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.35}},
                 accept="audio/mpeg")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio)
    costs.record("voice", len(text) / 1000 * price, ep_id, idem, detail={"chars": len(text), "line": line_id, "voice": voice_id})
    log("elevenlabs.tts", episode=ep_id, line=line_id, chars=len(text))
    return out
