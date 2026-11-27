"""Generador de recursos visuales enchufable.

- 'svg' (por defecto, coste 0): todo vectorial y animable (rigs + escenarios por capas).
- 'openai' (opcional, de pago, desactivado): pinta un fondo pictórico para la capa lejana del
  escenario. Los personajes SIEMPRE son rigs SVG (animación real por piezas).
Pasa por el guard de costes y por caché (misma descripción = misma imagen, sin repagar).
"""
from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request

from . import costs
from .core import StudioError, hash_obj, load_config, log, paths, secret


def maybe_ai_background(ep: dict, loc: dict, bg: dict) -> dict:
    cfg = load_config()["images"]
    if cfg["provider"] != "openai" or not cfg["openai"].get("enabled") or not loc.get("ai_prompt"):
        return bg
    if not secret("OPENAI_API_KEY"):
        raise StudioError("images.provider=openai sin OPENAI_API_KEY")
    o = cfg["openai"]
    st = load_config()
    prompt = (f"Fondo de dibujo animado 2D para adultos, estilo cómic underground, contornos gruesos, sombras planas, textura de papel, "
              f"sin personajes, sin texto, formato vertical. {loc['ai_prompt']}")
    key = hash_obj([o["model"], o["size"], o["quality"], prompt])
    out = paths().cache / "images" / f"{key}.png"
    if not out.exists():
        price = st["costs"]["prices"]["openai_image_medium_usd"]
        costs.guard(costs.Estimate("images", price, {"location": loc["id"]}), ep["id"], f"img:{key}")
        body = json.dumps({"model": o["model"], "prompt": prompt, "size": o["size"], "quality": o["quality"], "n": 1}).encode()
        req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, method="POST",
                                     headers={"Authorization": f"Bearer {secret('OPENAI_API_KEY')}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                j = json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise StudioError(f"OpenAI images HTTP {e.code}: {e.read()[:300]!r}") from e
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(base64.b64decode(j["data"][0]["b64_json"]))
        costs.record("images", price, ep["id"], f"img:{key}", detail={"location": loc["id"], "model": o["model"]})
        log("imagegen.openai", location=loc["id"])
    layer = {"id": "ai_plate", "image": f"asset://data/cache/images/{out.name}", "depth": 0.08}
    layers = [l for l in bg["layers"] if l["id"] != "sky"]
    return {**bg, "layers": [layer] + layers}
