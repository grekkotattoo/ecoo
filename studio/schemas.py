"""Validación de entradas/salidas creativas. Todo lo que entra al pipeline pasa por aquí.

Vocabularios cerrados = el LLM no puede pedir algo que el motor no sabe animar.
"""
from __future__ import annotations

import re
from typing import Any

from .core import StudioError

ACTIONS = ["idle", "walk", "run", "wave", "point", "talk", "shrug", "jump", "nod", "shakeHead", "tremble",
           "lean", "lookAt", "spin", "fall", "stretch", "pop",
           "take", "laugh", "rage", "cower", "celebrate", "facepalm", "dance", "sneak", "faint"]
EXPRESSIONS = ["neutral", "happy", "angry", "sad", "surprised", "scared", "smug", "crazy", "tired", "disgusted"]
CAMERA = ["static", "push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "dutch", "crash_zoom", "handheld",
          "orbit_left", "orbit_right", "crane_up", "crane_down", "vertigo", "swoop", "rack_focus"]
TRANSITIONS = ["cut", "fade", "wipe", "iris", "whip", "smash"]
EFFECTS = ["flash", "speedlines", "impact", "smoke", "sparks", "shake", "rain", "confetti", "vignettePulse", "textPop"]
FRAMING = ["wide", "medium", "close", "extreme_close"]
POSITIONS = ["far_left", "left", "center", "right", "far_right"]
HUMOR_AXES = ["sorpresa", "absurdo", "satira", "remate", "ritmo", "originalidad"]

CHAR_ENUMS = {
    "body": ["pear", "round", "tall", "stocky", "blob", "skinny"],
    "head": ["round", "oval", "square", "egg", "long", "bean"],
    "hair": ["none", "spiky", "bob", "mohawk", "bald_ring", "curly", "long", "slick", "bun"],
    "eyes": ["dots", "big", "tired", "wild"],
    "nose": ["round", "long", "pointy", "none", "pig"],
    "outfit": ["hoodie", "tshirt", "tracksuit", "jacket", "suit", "dress", "robe", "uniform", "tank", "lab"],
    "species": ["human", "creature", "robot", "object"],
}
ACCESSORIES = ["cap", "beanie", "chain", "headphones", "glasses", "sunglasses", "hat", "tie", "mustache", "beard", "earring", "eyepatch",
               "horns", "antenna", "crown", "bandage", "cigar"]
TATTOO_ZONES = ["arm_R_lo", "arm_R_up", "arm_L_lo", "arm_L_up", "hand_R", "hand_L", "neck", "face"]
TATTOO_MOTIFS = ["tribal", "text", "heart", "star", "anchor", "skull", "rose", "swallow", "dot", "barcode", "flash", "teardrop"]
BG_TYPES = ["interior", "exterior", "city", "nature", "space", "void", "underground", "office"]
BG_ELEMENTS = ["graffiti", "shutter", "poster", "neon", "dumpster", "building", "tree", "window", "door", "table", "lamp", "cloud", "sun", "moon", "mountain", "star", "sign",
               "plant", "chair", "screen", "rock", "planet", "car", "bush", "shelf", "frame", "column"]

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _req(d: dict, key: str, typ, ctx: str):
    if not isinstance(d, dict) or key not in d:
        raise StudioError(f"{ctx}: falta '{key}'")
    v = d[key]
    if typ is not None and not isinstance(v, typ):
        raise StudioError(f"{ctx}: '{key}' debe ser {typ}")
    return v


def _text(d: dict, key: str, ctx: str, maxlen: int = 600, required: bool = True) -> str:
    if not required and key not in d:
        return ""
    v = _req(d, key, str, ctx).strip()
    if required and not v:
        raise StudioError(f"{ctx}: '{key}' vacío")
    return v[:maxlen]


def _ident(v: Any, ctx: str) -> str:
    if not isinstance(v, str) or not re.fullmatch(r"[a-z][a-z0-9_]{1,39}", v):
        raise StudioError(f"{ctx}: id inválido {v!r} (usa snake_case)")
    return v


def _enum(v: Any, allowed: list[str], ctx: str, default: str | None = None) -> str:
    if v in allowed:
        return v
    if default is not None:
        return default
    raise StudioError(f"{ctx}: {v!r} no está en {allowed}")


def _color(v: Any, default: str) -> str:
    return v if isinstance(v, str) and HEX.match(v) else default


def _num(v: Any, lo: float, hi: float, default: float) -> float:
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return default


# ----------------------------------------------------------------- ideas

def idea(d: dict, ctx="idea") -> dict:
    q = _text(d, "question", ctx, 200)
    if not q.startswith("¿"):
        q = "¿" + q.lstrip("¿")
    if not q.endswith("?"):
        q = q.rstrip("?") + "?"
    return {"title": _text(d, "title", ctx, 80), "question": q, "premise": _text(d, "premise", ctx, 500),
            "humor_type": _text(d, "humor_type", ctx, 80), "twist": _text(d, "twist", ctx, 300),
            "tags": [str(t)[:30] for t in d.get("tags", [])][:8]}


def ideas(d: Any) -> dict:
    lst = _req(d, "ideas", list, "ideas")
    if not lst:
        raise StudioError("ideas: lista vacía")
    return {"ideas": [idea(x, f"ideas[{i}]") for i, x in enumerate(lst[:20])]}


def development(d: Any) -> dict:
    beats = _req(d, "beats", list, "development")
    if not 3 <= len(beats) <= 10:
        raise StudioError("development: entre 3 y 10 beats")
    return {"logline": _text(d, "logline", "development", 300), "synopsis": _text(d, "synopsis", "development", 1500),
            "humor_type": _text(d, "humor_type", "development", 100), "twist": _text(d, "twist", "development", 400),
            "tone_notes": _text(d, "tone_notes", "development", 600, required=False),
            "beats": [{"id": f"b{i+1}", "description": _text(b, "description", f"beat{i}", 400)} for i, b in enumerate(beats)]}


def script(d: Any, max_words: int = 140) -> dict:
    beats = _req(d, "beats", list, "script")
    out, ids, words = [], set(), 0
    for i, b in enumerate(beats):
        lines = []
        for j, ln in enumerate(b.get("lines", [])):
            lid = f"l{len(ids)+1:02d}"
            ids.add(lid)
            text = _text(ln, "text", f"beat{i}.line{j}", 10_000)
            if len(text) > 220:
                raise StudioError(f"beat{i}.line{j}: línea de {len(text)} caracteres (máx 220): divídela")
            words += len(text.split())
            lines.append({"id": lid, "speaker": _ident(ln.get("speaker", "narrador"), "speaker"), "text": text,
                          "emotion": _enum(ln.get("emotion"), EXPRESSIONS, "emotion", "neutral")})
        out.append({"id": f"b{i+1}", "location": _ident(b.get("location", "loc_1"), "location"),
                    "action": _text(b, "action", f"beat{i}", 500), "lines": lines})
    if not ids:
        raise StudioError("script: sin diálogos")
    if words > max_words:
        raise StudioError(f"script: {words} palabras; máximo {max_words} para la duración objetivo")
    return {"title": _text(d, "title", "script", 80), "beats": out, "punchline": _text(d, "punchline", "script", 300),
            "word_count": words}


def humor(d: Any) -> dict:
    sc = _req(d, "scores", dict, "humor")
    scores = {k: _num(sc.get(k), 0, 10, 0) for k in HUMOR_AXES}
    overall = round(sum(scores.values()) / len(scores), 2)
    return {"scores": scores, "overall": overall, "verdict": "pass" if d.get("verdict") == "pass" else "revise",
            "notes": _text(d, "notes", "humor", 1200, required=False)}


def character_params(p: dict, ctx: str) -> dict:
    out = {k: _enum(p.get(k), v, f"{ctx}.{k}", v[0]) for k, v in CHAR_ENUMS.items()}
    out.update({
        "skin": _color(p.get("skin"), "#f6c49d"), "hair_color": _color(p.get("hair_color"), "#2b2d42"),
        "top_color": _color(p.get("top_color"), "#e63946"), "bottom_color": _color(p.get("bottom_color"), "#1d3557"),
        "accent_color": _color(p.get("accent_color"), "#ffb703"), "eye_color": _color(p.get("eye_color"), "#3f88c5"),
        "height": _num(p.get("height"), 0.75, 1.35, 1.0), "head_scale": _num(p.get("head_scale"), 0.8, 1.6, 1.0),
        "width": _num(p.get("width"), 0.7, 1.5, 1.0),
        "accessories": [a for a in p.get("accessories", []) if a in ACCESSORIES][:4],
        "seed": int(_num(p.get("seed"), 0, 1e6, 7)),
        "tattoos": tattoos(p.get("tattoos"), ctx),
    })
    return out


def tattoos(lst: Any, ctx: str) -> list[dict]:
    """Tatuajes visibles sobre la piel del rig (zona + motivo + texto opcional). Inválidos se descartan."""
    out = []
    for t in (lst if isinstance(lst, list) else [])[:6]:
        if not isinstance(t, dict) or t.get("zone") not in TATTOO_ZONES or t.get("motif") not in TATTOO_MOTIFS:
            continue
        txt = str(t.get("text") or "").strip()[:14]
        if t["motif"] == "text" and not txt:
            continue
        out.append({"zone": t["zone"], "motif": t["motif"], "text": txt, "color": _color(t.get("color"), "#0d0d0d")})
    return out


def characters(d: Any) -> dict:
    lst = _req(d, "characters", list, "characters")
    if not 1 <= len(lst) <= 6:
        raise StudioError("characters: entre 1 y 6")
    out = []
    for i, c in enumerate(lst):
        cid = _ident(c.get("id"), f"characters[{i}].id")
        out.append({"id": cid, "name": _text(c, "name", cid, 60), "role": _text(c, "role", cid, 200),
                    "description": _text(c, "description", cid, 500), "reuse": c.get("reuse") if isinstance(c.get("reuse"), str) else None,
                    "voice_hint": _text(c, "voice_hint", cid, 200, required=False),
                    "params": character_params(c.get("params", {}), cid)})
    return {"characters": out}


def art_direction(d: Any) -> dict:
    locs = _req(d, "locations", list, "art")
    out = []
    for i, l in enumerate(locs[:6]):
        lid = _ident(l.get("id"), f"locations[{i}]")
        els = []
        for e in l.get("elements", [])[:24]:
            if e.get("kind") in BG_ELEMENTS:
                els.append({"kind": e["kind"], "x": _num(e.get("x"), -0.2, 1.2, 0.5), "y": _num(e.get("y"), -0.2, 1.2, 0.6),
                            "scale": _num(e.get("scale"), 0.2, 3, 1), "color": _color(e.get("color"), ""),
                            "depth": _num(e.get("depth"), 0.05, 1.3, 0.5), "text": str(e.get("text", ""))[:20]})
        out.append({"id": lid, "name": _text(l, "name", lid, 60), "description": _text(l, "description", lid, 400),
                    "type": _enum(l.get("type"), BG_TYPES, f"{lid}.type", "interior"),
                    "sky": _color(l.get("sky"), "#23395b"), "ground": _color(l.get("ground"), "#3a2f2a"),
                    "accent": _color(l.get("accent"), "#ffd23f"), "horizon": _num(l.get("horizon"), 0.4, 0.85, 0.68),
                    "mood": str(l.get("mood", "normal"))[:20], "elements": els,
                    "custom_svg": l.get("custom_svg") if isinstance(l.get("custom_svg"), str) and len(l["custom_svg"]) < 60000 else None,
                    "ai_prompt": str(l.get("ai_prompt", ""))[:800]})
    if not out:
        raise StudioError("art: al menos 1 localización")
    return {"mood": str(d.get("mood", ""))[:300], "locations": out}


def storyboard(d: Any, line_ids: set[str], char_ids: set[str], loc_ids: set[str]) -> dict:
    shots = _req(d, "shots", list, "storyboard")
    if not 3 <= len(shots) <= 24:
        raise StudioError("storyboard: entre 3 y 24 planos")
    out, used_lines = [], set()
    for i, s in enumerate(shots):
        ctx = f"shot{i+1}"
        loc = s.get("location")
        if loc not in loc_ids:
            raise StudioError(f"{ctx}: localización desconocida {loc!r}")
        actors = []
        for a in s.get("actors", [])[:4]:
            if a.get("character") not in char_ids:
                raise StudioError(f"{ctx}: personaje desconocido {a.get('character')!r}")
            acts = [x for x in a.get("actions", []) if x in ACTIONS][:4]
            actors.append({"character": a["character"], "position": _enum(a.get("position"), POSITIONS, "pos", "center"),
                           "actions": acts, "expression": _enum(a.get("expression"), EXPRESSIONS, "expr", "neutral"),
                           "facing": "left" if a.get("facing") == "left" else "right"})
        lines = [l for l in s.get("lines", []) if l in line_ids]
        used_lines.update(lines)
        if not actors and not s.get("effects"):
            raise StudioError(f"{ctx}: plano sin actores ni efectos (prohibido: solo cámara sobre imagen fija)")
        out.append({"id": f"s{i+1:02d}", "location": loc, "framing": _enum(s.get("framing"), FRAMING, "framing", "medium"),
                    "camera": _enum(s.get("camera"), CAMERA, "camera", "static"),
                    "transition": _enum(s.get("transition"), TRANSITIONS, "transition", "cut"),
                    "effects": [e for e in s.get("effects", []) if e in EFFECTS][:3],
                    "actors": actors, "lines": lines, "seconds": _num(s.get("seconds"), 0.8, 8, 2.5),
                    "description": _text(s, "description", ctx, 400), "key_image": bool(s.get("key_image")),
                    "text_pop": str(s.get("text_pop", ""))[:16]})
    missing = line_ids - used_lines
    if missing:
        raise StudioError(f"storyboard: líneas sin plano asignado: {sorted(missing)}")
    if sum(1 for s in out if s["key_image"]) < 3:
        for s in out[:: max(1, len(out) // 4)][:4]:
            s["key_image"] = True
    return {"shots": out}
