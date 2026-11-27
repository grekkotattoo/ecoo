"""Director de animación + editor: storyboard + audio + rigs → EpisodeSpec (contrato del motor).

Aquí se decide QUÉ se mueve y CUÁNDO: colocación, acciones procedurales, expresiones por línea,
visemas sincronizados al audio, reacciones de quien escucha, cámara, efectos, transiciones,
subtítulos y plan de mezcla. Determinista: mismo input → mismo spec → caché de render válida.
"""
from __future__ import annotations

import math

from .rigs import EXPRESSION_PRESETS

POS_X = {"far_left": 170, "left": 330, "center": 540, "right": 750, "far_right": 910}
FRAMING = {  # escala del rig y suelo (y de los pies)
    "wide": (0.8, 1580), "medium": (1.15, 1760), "close": (1.6, 2180), "extreme_close": (2.3, 2750),
}
TITLE_S = 2.2
END_S = 1.4
TRANSITION_FRAMES = {"cut": 0, "fade": 10, "wipe": 9, "iris": 12, "whip": 7, "smash": 5}


def style_props(style: dict) -> dict:
    t = style["typography"]
    tex = style["texture"]
    return {
        "palette": style["palette"], "outline": {"color": style["outline"]["color"], "width": style["outline"]["width"]},
        "fonts": {"title": t["title"]["family"], "subtitle": t["subtitle"]["family"],
                  "urls": {t["title"]["family"]: f"asset://{t['title']['file']}", t["subtitle"]["family"]: f"asset://{t['subtitle']['file']}"}},
        "grain": tex["grain"], "boil": tex["boil"], "boilFps": tex["boil_fps"], "vignette": tex["vignette"],
        **({"grade": {"top": tex["grade"]["top"], "topOpacity": tex["grade"]["top_opacity"], "bottom": tex["grade"]["bottom"],
                      "bottomOpacity": tex["grade"]["bottom_opacity"]}} if tex.get("grade") else {}),
        "subtitle": {"size": t["subtitle_style"]["size"], "y": t["subtitle_style"]["y"], "color": t["subtitle_style"]["color"],
                     "stroke": t["subtitle_style"]["stroke"], "maxChars": t["subtitle_style"]["max_chars"]},
    }


def title_text(question: str) -> str:
    """'¿Qué pasaría si los gatos votasen?' → '...LOS GATOS VOTASEN?' (la cartela ya dice ¿QUÉ PASARÍA SI)."""
    import re
    q = question.strip().lstrip("¿").rstrip("?").strip()
    rest = re.sub(r"^(qu[eé]\s+pasar[ií]a\s+si)\s*", "", q, flags=re.I)
    return ("..." + rest.upper() + "?") if rest != q else "¿" + q.upper() + "?"


def chunk_subtitle(text: str, max_chars: int) -> list[str]:
    words, out, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > max_chars and cur:
            out.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        out.append(cur)
    return out


def _camera(kind: str, dur: int, seed: int) -> dict:
    if kind == "push_in":
        return {"zoom": [{"f": 0, "v": 1.0}, {"f": dur, "v": 1.14, "e": "inOut"}]}
    if kind == "pull_out":
        return {"zoom": [{"f": 0, "v": 1.16}, {"f": dur, "v": 1.0, "e": "inOut"}]}
    if kind == "pan_left":
        return {"x": [{"f": 0, "v": 140}, {"f": dur, "v": -140, "e": "inOut"}]}
    if kind == "pan_right":
        return {"x": [{"f": 0, "v": -140}, {"f": dur, "v": 140, "e": "inOut"}]}
    if kind == "tilt_up":
        return {"y": [{"f": 0, "v": 160}, {"f": dur, "v": -60, "e": "inOut"}]}
    if kind == "tilt_down":
        return {"y": [{"f": 0, "v": -160}, {"f": dur, "v": 40, "e": "inOut"}]}
    if kind == "dutch":
        return {"rot": [{"f": 0, "v": -2}, {"f": dur, "v": -7, "e": "inOut"}], "zoom": [{"f": 0, "v": 1.05}, {"f": dur, "v": 1.1}]}
    if kind == "crash_zoom":
        return {"zoom": [{"f": 0, "v": 1.0}, {"f": 6, "v": 1.45, "e": "out"}, {"f": dur, "v": 1.5}]}
    if kind == "handheld":
        keys_x, keys_y = [], []
        for i, f in enumerate(range(0, dur + 1, 12)):
            keys_x.append({"f": f, "v": math.sin(seed + i * 1.7) * 14})
            keys_y.append({"f": f, "v": math.cos(seed * 2 + i * 1.3) * 10})
        return {"x": keys_x, "y": keys_y}
    return {}


def _action(name: str, start: int, dur: int, side: str, i: int) -> dict:
    a = {"type": name, "start": start, "dur": dur}
    if name in ("walk", "run"):
        a["params"] = {"fromX": -420 if i % 2 == 0 else 420, "toX": 0}
        a["dur"] = min(dur, 40 if name == "walk" else 22)
    elif name in ("wave", "point"):
        a["params"] = {"side": side}
        a["dur"] = min(dur, 36)
    elif name in ("jump", "shrug", "nod", "shakeHead", "spin", "stretch"):
        a["dur"] = min(dur, {"jump": 24, "shrug": 22, "nod": 20, "shakeHead": 22, "spin": 20, "stretch": 16}[name])
    elif name == "pop":
        a["params"] = {"in": 10}
        a["start"] = 0
        a["dur"] = 12
    return a


def build_spec(ep: dict, storyboard: dict, script: dict, rigs: dict, backgrounds: dict, style: dict,
               line_audio: dict[str, dict], fps: int = 30, width: int = 1080, height: int = 1920) -> tuple[dict, dict]:
    """line_audio: {line_id: {"duration": s, "file": ruta|None, "visemes": [...]}}. Devuelve (spec, plan_audio)."""
    lines = {l["id"]: l for b in script["beats"] for l in b["lines"]}
    sp = style_props(style)
    shots, subs, dialogue, sfx = [], [], [], []
    gap = 0.18
    frame = 0

    # cartela de título (identidad de la serie)
    tdur = int(TITLE_S * fps)
    shots.append({"id": "title", "start": 0, "dur": tdur, "kind": "title", "bgColor": style["title_card"]["bg"],
                  "title": {"kicker": style["title_card"]["kicker"], "text": title_text(ep["question"])}})
    sfx.append({"tag": "sting", "at": 0.0, "gain": -6})
    frame += tdur

    for si, s in enumerate(storyboard["shots"]):
        lead = 0.35
        t = lead
        line_slots = []
        for lid in s["lines"]:
            la = line_audio[lid]
            line_slots.append((lid, t, la["duration"]))
            t += la["duration"] + gap
        dur_s = max(s["seconds"], t + 0.35)
        dur = int(round(dur_s * fps))
        sc, floor_y = FRAMING[s["framing"]]
        speakers_here = {lines[l]["speaker"] for l in s["lines"]}
        actors = []
        n = len(s["actors"])
        for ai, a in enumerate(s["actors"]):
            rig = rigs[a["character"]]
            x = POS_X[a["position"]]
            side = "R" if x < 540 else "L"
            flip = (a["facing"] == "left")
            if n > 1 and a["facing"] == "right" and x > 540:
                flip = True  # mirar hacia el centro de la escena
            acts = [_action(name, 4 + k * 10, dur - 8, side, ai) for k, name in enumerate(a["actions"])]
            base = dict(EXPRESSION_PRESETS.get(a["expression"], EXPRESSION_PRESETS["neutral"]))
            expr = [{"f": 0, "set": base}]
            vis = []
            for lid, st, d in line_slots:
                ln = lines[lid]
                if ln["speaker"] != a["character"]:
                    continue
                f0 = int(round(st * fps))
                emo = dict(EXPRESSION_PRESETS.get(ln["emotion"], base))
                emo.pop("mouth", None)
                expr.append({"f": f0, "set": emo})
                acts.append({"type": "talk", "start": f0, "dur": max(6, int(d * fps)), "params": {"gesture": 1}})
                for k in line_audio[lid].get("visemes", []):
                    vis.append({"f": f0 + k["f"], "v": k["v"]})
                vis.append({"f": f0 + int(d * fps) + 1, "v": "rest"})
            if a["character"] not in speakers_here and speakers_here:
                acts.append({"type": "lookAt", "start": 6, "dur": dur - 10, "params": {"angle": -6 if side == "L" else 6, "eyesX": 8 if side == "R" else -8}})
                if s["lines"]:
                    acts.append({"type": "nod", "start": int(dur * 0.55), "dur": 18})
            vis.sort(key=lambda k: k["f"])
            actors.append({"id": f"{a['character']}_{si}", "rig": a["character"], "x": x, "y": floor_y, "scale": sc, "flip": flip,
                           "z": ai, "actions": acts, "expressions": expr, "visemes": vis, "blink": True, "idle": True})
        effects = []
        for k, e in enumerate(s["effects"]):
            at = int(dur * (0.15 + 0.25 * k))
            fx = {"type": e, "start": at, "dur": 14 if e in ("flash", "impact", "shake") else min(dur - at, 60), "seed": si * 7 + k}
            if e == "impact":
                fx.update({"x": 540, "y": 900})
                effects.append({"type": "shake", "start": at, "dur": 14, "intensity": 0.8, "seed": si})
                sfx.append({"tag": "impact", "at": (frame + at) / fps, "gain": -4})
            if e == "textPop":
                fx.update({"text": s.get("text_pop") or "¡!", "x": 540, "y": 520, "dur": 40})
                sfx.append({"tag": "pop", "at": (frame + at) / fps, "gain": -6})
            if e in ("smoke", "sparks"):
                fx.update({"x": 540, "y": 1100})
            if e == "speedlines":
                fx.update({"start": 0, "dur": dur})
            effects.append(fx)
        tr = s["transition"] if si > 0 else "fade"
        if tr == "whip":
            sfx.append({"tag": "whoosh", "at": frame / fps, "gain": -8})
        shot = {"id": s["id"], "start": frame, "dur": dur, "kind": "scene", "background": s["location"],
                "camera": _camera(s["camera"], dur, si), "actors": actors, "effects": effects,
                "transitionIn": {"type": tr, "dur": TRANSITION_FRAMES[tr]}}
        shots.append(shot)
        for lid, st, d in line_slots:
            a0 = frame + int(round(st * fps))
            a1 = a0 + int(round(d * fps))
            if line_audio[lid].get("file"):
                dialogue.append({"line": lid, "file": line_audio[lid]["file"], "at": a0 / fps, "duration": d})
            chunks = chunk_subtitle(lines[lid]["text"], sp["subtitle"]["maxChars"])
            total_chars = sum(len(c) for c in chunks) or 1
            cur = a0
            for c in chunks:
                cd = max(8, int(round((a1 - a0) * len(c) / total_chars)))
                subs.append({"start": cur, "end": min(cur + cd, a1 + 6), "text": c, "speaker": lines[lid]["speaker"], "line": lid})
                cur += cd
        frame += dur

    edur = int(END_S * fps)
    shots.append({"id": "end", "start": frame, "dur": edur, "kind": "end", "bgColor": style["title_card"]["bg"],
                  "title": {"kicker": style["title_card"]["kicker"], "text": "", "sub": ep.get("title", "")},
                  "transitionIn": {"type": "fade", "dur": 8}})
    frame += edur
    spec = {"meta": {"id": ep["id"], "fps": fps, "width": width, "height": height, "durationInFrames": frame, "test": bool(ep.get("test"))},
            "style": sp, "rigs": {k: rigs[k] for k in sorted(rigs)}, "backgrounds": {k: backgrounds[k] for k in sorted(backgrounds)},
            "shots": shots, "subtitles": subs}
    plan = {"total_s": frame / fps, "dialogue": dialogue, "sfx": sfx, "music_tags": ep.get("music_tags", ["comedy"])}
    return spec, plan


def to_srt(subs: list[dict], fps: int) -> str:
    def ts(f):
        s = f / fps
        return f"{int(s//3600):02d}:{int(s%3600//60):02d}:{int(s%60):02d},{int((s%1)*1000):03d}"
    return "\n".join(f"{i+1}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n" for i, s in enumerate(subs))


def storyboard_still_spec(spec: dict, shot_id: str) -> tuple[dict, int]:
    """Frame representativo de un plano (para imágenes base de la propuesta)."""
    for s in spec["shots"]:
        if s["id"] == shot_id:
            return spec, s["start"] + int(s["dur"] * 0.55)
    raise KeyError(shot_id)
