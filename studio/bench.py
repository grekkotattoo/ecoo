"""Autoprueba técnica y medición de rendimiento REAL del motor.

Usa exclusivamente recursos geométricos TEST (rigs grises, fondo neutro, tonos sintéticos).
No crea episodios ni contenido de la serie. Resultado en data/cache/selftest/.
"""
from __future__ import annotations

import time
from pathlib import Path

from . import audio, qa, render, timeline
from .backgrounds import test_background
from .core import append_jsonl, load_config, now_iso, paths, read_json
from .rigs import test_rig


def engine_selftest(out_dir: Path | None = None, seconds_per_shot: float = 1.5) -> dict:
    P = paths()
    out = out_dir or (P.cache / "selftest")
    out.mkdir(parents=True, exist_ok=True)
    st = read_json(P.config / "style_bible.json")
    rig = test_rig(st)
    rig_b = {**test_rig(st), "id": "test_geom_b"}
    bg = test_background(st)
    v = load_config()["video"]["primary"]
    ep = {"id": "EP000", "title": "SELFTEST", "question": "¿Prueba técnica del motor?", "test": True}
    sb = {"shots": [
        {"id": "s01", "location": "test_grid", "framing": "wide", "camera": "push_in", "transition": "cut", "effects": ["impact"], "text_pop": "",
         "actors": [{"character": "test_geom", "position": "left", "facing": "right", "actions": ["walk"], "expression": "neutral"},
                    {"character": "test_geom_b", "position": "right", "facing": "left", "actions": ["jump"], "expression": "surprised"}],
         "lines": ["l01"], "seconds": seconds_per_shot, "description": "TEST", "key_image": True},
        {"id": "s02", "location": "test_grid", "framing": "close", "camera": "handheld", "transition": "whip", "effects": ["textPop"], "text_pop": "TEST",
         "actors": [{"character": "test_geom", "position": "center", "facing": "right", "actions": ["wave"], "expression": "happy"}],
         "lines": ["l02"], "seconds": seconds_per_shot, "description": "TEST", "key_image": True}]}
    script = {"beats": [{"id": "b1", "location": "test_grid", "action": "", "lines": [
        {"id": "l01", "speaker": "test_geom_b", "text": "uno dos tres", "emotion": "surprised"},
        {"id": "l02", "speaker": "test_geom", "text": "cuatro cinco seis", "emotion": "happy"}]}]}
    la = {}
    for i, lid in enumerate(("l01", "l02")):
        w = audio.tone(out / f"{lid}.wav", 1.0, 200 + 60 * i)
        vis, method = audio.visemes(w, v["fps"])
        la[lid] = {"duration": 1.0, "file": str(w), "visemes": vis, "lipsync": method}
    spec, plan = timeline.build_spec(ep, sb, script, {"test_geom": rig, "test_geom_b": rig_b}, {"test_grid": bg}, st, la, v["fps"], v["width"], v["height"])
    res: dict = {"ts": now_iso(), "frames": spec["meta"]["durationInFrames"]}
    t0 = time.time()
    render.bundle()
    res["bundle_s"] = round(time.time() - t0, 2)
    t0 = time.time()
    render.still({"spec": spec}, "Episode", out / "still.png", spec["shots"][1]["start"] + 20)
    res["still_s"] = round(time.time() - t0, 2)
    stats = render.render_video(spec, out / "video.mp4")
    res["render"] = stats
    stats2 = render.render_video(spec, out / "video_cached.mp4")
    res["render_cached_s"] = stats2["render_seconds"]
    res["segments_cached_second_pass"] = stats2["cached"]
    mix = audio.mix(out / "mix.wav", plan["total_s"], [(Path(d["file"]), d["at"]) for d in plan["dialogue"]], None, [])
    final = render.mux(out / "video.mp4", mix, out / "final.mp4", plan["total_s"])
    render.contact_sheet(final, out / "contact.png", 4, 2)
    rep = qa.check_video(final, {"width": v["width"], "height": v["height"], "fps": v["fps"]}, spec, plan)
    qa.write_report(rep, out)
    res["qa_passed"] = rep["passed"]
    res["qa_critical"] = [c for c in rep["checks"] if c["level"] == "critical"]
    res["files"] = {"final": str(final), "still": str(out / "still.png"), "contact": str(out / "contact.png")}
    append_jsonl(P.state / "benchmarks.jsonl", {k: res[k] for k in ("ts", "frames", "bundle_s", "still_s", "render_cached_s")} | {"render": stats})
    return res


SAMPLE_CHARS = [  # personajes GENÉRICOS de muestra (no son de la serie)
    ("muestra_a", "Muestra A", {"body": "skinny", "head": "round", "head_scale": 1.6, "hair": "spiky", "eyes": "tired", "nose": "long", "outfit": "hoodie",
                                "skin": "#c68a5e", "hair_color": "#0d0d0d", "top_color": "#ff2e88", "bottom_color": "#1c1f33", "accent_color": "#c6ff00",
                                "height": 0.9, "accessories": ["headphones"], "seed": 4}),
    ("muestra_b", "Muestra B", {"body": "tall", "head": "square", "head_scale": 0.8, "hair": "none", "eyes": "big", "nose": "pointy", "outfit": "tracksuit",
                                "skin": "#f1c7a3", "hair_color": "#0d0d0d", "top_color": "#00d1ff", "bottom_color": "#00d1ff", "accent_color": "#0d0d0d",
                                "height": 1.35, "accessories": ["cap", "chain", "sunglasses"], "seed": 9}),
    ("muestra_c", "Muestra C", {"body": "blob", "head": "egg", "head_scale": 1.2, "hair": "curly", "eyes": "big", "nose": "round", "outfit": "tshirt",
                                "skin": "#7a4a2e", "hair_color": "#1a1a1a", "top_color": "#c6ff00", "bottom_color": "#2b2d3a", "accent_color": "#ff6b00",
                                "height": 0.8, "accessories": ["earring", "beard"], "seed": 21}),
]
SAMPLE_LOCS = [
    {"id": "muestra_calle", "name": "Calle", "description": "x", "type": "city", "mood": "neon", "sky": "#1c1f33", "ground": "#4a4d55", "accent": "#7a3b2e", "horizon": 0.7,
     "elements": [{"kind": "neon", "x": 0.72, "y": 0.3, "scale": 0.9, "color": "#ff2e88", "text": "24H", "depth": 0.62},
                  {"kind": "shutter", "x": 0.25, "y": 0.6, "scale": 1.1, "depth": 0.62}, {"kind": "poster", "x": 0.55, "y": 0.45, "scale": 0.9, "depth": 0.62},
                  {"kind": "lamp", "x": 0.95, "y": 0.18, "scale": 1.0, "depth": 0.8}, {"kind": "dumpster", "x": 0.05, "y": 0.7, "scale": 0.9, "depth": 0.95},
                  {"kind": "moon", "x": 0.2, "y": 0.1, "scale": 0.6, "depth": 0.1}]},
    {"id": "muestra_piso", "name": "Piso", "description": "x", "type": "interior", "sky": "#3a3d5c", "ground": "#5a3e2b", "accent": "#ff2e88", "horizon": 0.68,
     "elements": [{"kind": "window", "x": 0.25, "y": 0.32, "scale": 1.0, "depth": 0.5}, {"kind": "poster", "x": 0.7, "y": 0.3, "scale": 1.0, "color": "#c6ff00", "depth": 0.5},
                  {"kind": "screen", "x": 0.75, "y": 0.52, "scale": 0.8, "depth": 0.6}, {"kind": "graffiti", "x": 0.4, "y": 0.5, "scale": 0.7, "color": "#00d1ff", "depth": 0.55},
                  {"kind": "chair", "x": 0.08, "y": 0.6, "scale": 1.0, "depth": 1.2}]},
]


def _samples(st):
    from . import schemas
    from .backgrounds import build_background
    from .rigs import build_rig
    rigs = {cid: build_rig(cid, name, schemas.character_params(p, cid), st) for cid, name, p in SAMPLE_CHARS}
    locs = schemas.art_direction({"locations": SAMPLE_LOCS})["locations"]
    return rigs, {l["id"]: build_background(l, st, seed=5) for l in locs}


def style_sample(out_dir: Path | None = None) -> dict:
    """Muestra del acabado visual con personajes y escenarios GENÉRICOS (no son contenido de la serie).
    Sirve para evaluar/ajustar la biblia visual. Salida: data/cache/style_sample/."""
    from . import schemas
    from .backgrounds import build_background
    from .rigs import EXPRESSION_PRESETS, build_rig
    P = paths()
    out = out_dir or (P.cache / "style_sample")
    out.mkdir(parents=True, exist_ok=True)
    st = read_json(P.config / "style_bible.json")
    v = load_config()["video"]["primary"]
    rigs, bgs = _samples(st)
    ep = {"id": "EP000", "title": "MUESTRA DE ESTILO", "question": "¿Qué pasaría si esto fuera una muestra de estilo?", "test": True}
    sb = {"shots": [
        {"id": "s01", "location": "muestra_calle", "framing": "medium", "camera": "static", "transition": "cut", "effects": [], "text_pop": "",
         "actors": [{"character": "muestra_a", "position": "left", "facing": "right", "actions": [], "expression": "smug"},
                    {"character": "muestra_b", "position": "right", "facing": "left", "actions": [], "expression": "surprised"}],
         "lines": ["l01"], "seconds": 2, "description": "x", "key_image": True},
        {"id": "s02", "location": "muestra_piso", "framing": "medium", "camera": "static", "transition": "cut", "effects": [], "text_pop": "",
         "actors": [{"character": "muestra_c", "position": "center", "facing": "right", "actions": ["point"], "expression": "crazy"}],
         "lines": ["l02"], "seconds": 2, "description": "x", "key_image": True}]}
    script = {"beats": [{"id": "b1", "location": "muestra_calle", "action": "", "lines": [
        {"id": "l01", "speaker": "muestra_b", "text": "Muestra de subtítulo", "emotion": "surprised"},
        {"id": "l02", "speaker": "muestra_c", "text": "Otra línea de muestra", "emotion": "crazy"}]}]}
    la = {"l01": {"duration": 1.5, "file": None, "visemes": [{"f": 0, "v": "D"}]}, "l02": {"duration": 1.5, "file": None, "visemes": [{"f": 0, "v": "C"}]}}
    spec, _ = timeline.build_spec(ep, sb, script, rigs, bgs, st, la, v["fps"], v["width"], v["height"])
    files = []
    for s in spec["shots"][1:3]:
        f = out / f"escena_{s['id']}.png"
        render.still({"spec": spec}, "Episode", f, s["start"] + 30)
        files.append(str(f))
    f = out / "cartela.png"
    render.still({"spec": spec}, "Episode", f, 40)
    files.append(str(f))
    from .pipeline import ES_LABEL
    for cid, rig in rigs.items():
        sheet = {"style": timeline.style_props(st), "rig": rig, "width": 1080, "height": 1920, "title": rig["name"],
                 "expressions": [{"label": ES_LABEL[k], "set": EXPRESSION_PRESETS[k]} for k in ES_LABEL],
                 "poses": [{"label": "saludo", "tracks": {"armR_up.rot": -150, "armR_lo.rot": -20}}, {"label": "señala", "tracks": {"armR_up.rot": -95}},
                           {"label": "encogido", "tracks": {"armL_up.rot": 35, "armR_up.rot": -35, "armL_lo.rot": -80, "armR_lo.rot": 80}}]}
        f = out / f"hoja_{cid}.png"
        render.still({"sheet": sheet}, "CharacterSheet", f)
        files.append(str(f))
    return {"files": files}


def motion_sample(out_dir: Path | None = None) -> dict:
    """Clip de muestra de cámara 2.5D + actuación exagerada (personajes genéricos). Mide coste de render real."""
    import time as _t
    from . import schemas
    from .backgrounds import build_background
    from .rigs import build_rig
    P = paths()
    out = out_dir or (P.cache / "style_sample")
    out.mkdir(parents=True, exist_ok=True)
    st = read_json(P.config / "style_bible.json")
    v = load_config()["video"]["primary"]
    rigs, bgs = _samples(st)
    ep = {"id": "EP000", "title": "MUESTRA", "question": "¿Qué pasaría si esto fuera una muestra de movimiento?", "test": True}
    shots = []
    for i, (cam, acts_a, acts_b, ea, eb) in enumerate([("swoop", ["talk"], ["take"], "smug", "surprised"), ("orbit_left", ["rage"], ["cower"], "angry", "scared"),
                                                       ("vertigo", ["faint"], ["laugh"], "scared", "crazy")]):
        shots.append({"id": f"s{i+1:02d}", "location": "muestra_calle" if i != 1 else "muestra_piso", "framing": "medium", "camera": cam, "transition": "whip" if i else "cut",
                      "effects": ["speedlines", "confetti"] if cam == "vertigo" else ["impact"] if cam == "swoop" else [], "text_pop": "",
                      "actors": [{"character": "muestra_a", "position": "left", "facing": "right", "actions": acts_a, "expression": ea},
                                 {"character": "muestra_b", "position": "right", "facing": "left", "actions": acts_b, "expression": eb}],
                      "lines": [f"l0{i+1}"], "seconds": 2.2, "description": "x", "key_image": True})
    script = {"beats": [{"id": "b1", "location": "muestra_calle", "action": "", "lines": [
        {"id": f"l0{i+1}", "speaker": "muestra_a" if i != 1 else "muestra_b", "text": "Muestra", "emotion": "neutral"} for i in range(3)]}]}
    la = {f"l0{i+1}": {"duration": 1.6, "file": None, "visemes": [{"f": k * 3, "v": "CDBEHA"[k % 6]} for k in range(16)]} for i in range(3)}
    spec, _ = timeline.build_spec(ep, {"shots": shots}, script, rigs, bgs, st, la, v["fps"], v["width"], v["height"])
    spec["shots"] = spec["shots"][1:-1]  # sin cartelas
    t = 0
    for s in spec["shots"]:
        s["start"] = t
        t += s["dur"]
    spec["meta"]["durationInFrames"] = t
    spec["subtitles"] = []
    t0 = _t.time()
    stats = render.render_video(spec, out / "movimiento.mp4")
    render.contact_sheet(out / "movimiento.mp4", out / "movimiento_contactos.png", 4, 3)
    return {"video": str(out / "movimiento.mp4"), "contact": str(out / "movimiento_contactos.png"), "render": stats, "wall_s": round(_t.time() - t0, 1)}
