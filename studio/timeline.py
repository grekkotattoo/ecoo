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
        "fonts": {"title": t["title"]["family"], "subtitle": t["subtitle"]["family"], "kicker": t.get("kicker", t["title"])["family"],
                  "urls": {v["family"]: f"asset://{v['file']}" for k, v in t.items() if isinstance(v, dict) and "file" in v}},
        "grain": tex["grain"], "boil": tex["boil"], "dof": tex.get("dof", 0),
        "engine": style.get("engine", "css"), "three": style.get("three", {}), "boilFps": tex["boil_fps"], "vignette": tex["vignette"],
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
    """Movimientos de cámara 2.5D (perspectiva real sobre planos): dolly, órbita, grúa, roll, vértigo, DOF.
    Ningún plano queda estático: 'static' es una deriva cinematográfica sutil."""
    L = lambda a, b, e="inOut": [{"f": 0, "v": a}, {"f": dur, "v": b, "e": e}]
    sgn = 1 if seed % 2 == 0 else -1
    presets = {
        "static":      {"yaw": L(-1.2 * sgn, 1.2 * sgn), "zoom": L(1.0, 1.04), "pitch": L(0.6, -0.4)},
        "push_in":     {"zoom": L(1.0, 1.28), "pitch": L(2.0, -1.0), "yaw": L(-2 * sgn, 1 * sgn)},
        "pull_out":    {"zoom": L(1.3, 1.0), "pitch": L(-1.5, 1.0), "yaw": L(2 * sgn, -1 * sgn)},
        "pan_left":    {"x": L(160, -160), "yaw": L(-7, 7), "zoom": L(1.06, 1.08)},
        "pan_right":   {"x": L(-160, 160), "yaw": L(7, -7), "zoom": L(1.06, 1.08)},
        "tilt_up":     {"y": L(200, -60), "pitch": L(-9, 3), "zoom": L(1.08, 1.04)},
        "tilt_down":   {"y": L(-200, 40), "pitch": L(9, -2), "zoom": L(1.08, 1.04)},
        "dutch":       {"rot": L(-3, -9), "zoom": L(1.06, 1.14), "yaw": L(4, -2)},
        "crash_zoom":  {"zoom": [{"f": 0, "v": 1.0}, {"f": 5, "v": 1.6, "e": "out"}, {"f": dur, "v": 1.66}], "rot": [{"f": 0, "v": 0}, {"f": 5, "v": 2.5, "e": "out"}, {"f": dur, "v": 3}]},
        "handheld":    {},
        "orbit_left":  {"yaw": L(-16, 12), "x": L(-120, 90), "zoom": L(1.1, 1.14)},
        "orbit_right": {"yaw": L(16, -12), "x": L(120, -90), "zoom": L(1.1, 1.14)},
        "crane_up":    {"pitch": L(12, -4), "y": L(260, -40), "zoom": L(1.12, 1.0)},
        "crane_down":  {"pitch": L(-10, 3), "y": L(-240, 30), "zoom": L(1.0, 1.12)},
        "vertigo":     {"persp": L(2400, 900), "zoom": L(1.0, 1.06)},
        "swoop":       {"yaw": L(-22 * sgn, 0, "out"), "pitch": L(10, 0, "out"), "zoom": L(1.45, 1.05, "out"), "x": L(-200 * sgn, 0, "out")},
        "rack_focus":  {"focus": L(-1800, 0), "dof": L(3.5, 3.5), "zoom": L(1.04, 1.1)},
    }
    cam = dict(presets.get(kind, presets["static"]))
    if kind == "handheld" or kind not in ("crash_zoom",):
        # temblor de cámara al hombro sutil en todos los planos (más fuerte en 'handheld')
        amp = 1.0 if kind == "handheld" else 0.25
        for key, scale in (("yaw", 1.6), ("pitch", 1.0), ("rot", 0.8)):
            noise = [{"f": f, "v": math.sin(seed * 1.3 + i * 1.7 + len(key)) * scale * amp} for i, f in enumerate(range(0, dur + 1, 10))]
            if key in cam:
                base = cam[key]
                noise = [{"f": n["f"], "v": n["v"] + _lin(base, n["f"])} for n in noise]
            cam[key] = noise
    return cam


def _lin(track: list[dict], f: int) -> float:
    if f <= track[0]["f"]:
        return track[0]["v"]
    for a, b in zip(track, track[1:]):
        if a["f"] <= f <= b["f"]:
            return a["v"] + (b["v"] - a["v"]) * (f - a["f"]) / max(1, b["f"] - a["f"])
    return track[-1]["v"]


def _action(name: str, start: int, dur: int, side: str, i: int) -> dict:
    a = {"type": name, "start": start, "dur": dur}
    if name in ("walk", "run"):
        a["params"] = {"fromX": -420 if i % 2 == 0 else 420, "toX": 0}
        a["dur"] = min(dur, 40 if name == "walk" else 22)
    elif name in ("wave", "point"):
        a["params"] = {"side": side}
        a["dur"] = min(dur, 36)
    elif name in ("jump", "shrug", "nod", "shakeHead", "spin", "stretch", "take", "facepalm", "cower"):
        a["dur"] = min(dur, {"jump": 26, "shrug": 24, "nod": 22, "shakeHead": 24, "spin": 22, "stretch": 18, "take": 30, "facepalm": 40, "cower": 40}[name])
    elif name == "sneak":
        a["params"] = {"fromX": -380 if i % 2 == 0 else 380, "toX": 0}
        a["dur"] = min(dur, 60)
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
    tm = {"title_s": TITLE_S, "end_s": END_S, "lead": 0.35, "tail": 0.53, "gap": 0.18, "last_tail": 0.53, **style.get("timing", {})}
    gap = tm["gap"]
    frame = 0

    # cartela de título (identidad de la serie)
    tdur = int(tm["title_s"] * fps)
    tdur += tdur % 2
    shots.append({"id": "title", "start": 0, "dur": tdur, "kind": "title", "bgColor": style["title_card"]["bg"],
                  "title": {"kicker": style["title_card"]["kicker"], "text": title_text(ep["question"])}})
    sfx.append({"tag": "sting", "at": 0.0, "gain": -6})
    frame += tdur

    for si, s in enumerate(storyboard["shots"]):
        lead = tm["lead"]
        t = lead
        line_slots = []
        for lid in s["lines"]:
            la = line_audio[lid]
            line_slots.append((lid, t, la["duration"]))
            t += la["duration"] + gap
        dur_s = max(s["seconds"], t - gap + (tm["last_tail"] if si == len(storyboard["shots"]) - 1 else tm["tail"]))
        dur = int(round(dur_s * fps))
        dur += dur % 2  # par: render en dobles sin deriva
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
                           "z": ai, "actions": acts, "expressions": expr, "visemes": vis, "blink": True, "idle": True,
                           **({"look": "charred"} if a.get("state") == "charred" else {})})
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
        lit_moods = set(style.get("three", {}).get("lit_moods", []))
        lighting = backgrounds.get(s["location"], {}).get("meta", {}).get("mood") in lit_moods
        shot = {"id": s["id"], "start": frame, "dur": dur, "kind": "scene", "background": s["location"], "lighting": lighting,
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

    edur = int(tm["end_s"] * fps)
    edur += edur % 2
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
