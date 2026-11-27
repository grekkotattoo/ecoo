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
    specs = [
        ("muestra_a", "Muestra A", {"body": "pear", "head": "egg", "hair": "bald_ring", "eyes": "big", "nose": "long", "outfit": "suit", "skin": "#f6c49d",
                                    "hair_color": "#3d2c2e", "top_color": "#2b59c3", "bottom_color": "#1d3557", "accent_color": "#ffb703", "eye_color": "#2a9d8f",
                                    "head_scale": 1.3, "accessories": ["tie", "mustache", "glasses"], "seed": 4}),
        ("muestra_b", "Muestra B", {"body": "skinny", "head": "oval", "hair": "bob", "eyes": "big", "nose": "pointy", "outfit": "dress", "skin": "#d99a6c",
                                    "hair_color": "#e63946", "top_color": "#7b2cbf", "bottom_color": "#3c096c", "accent_color": "#9ef01a", "eye_color": "#7b2cbf",
                                    "height": 1.15, "head_scale": 1.25, "accessories": ["earring"], "seed": 9}),
        ("muestra_c", "Muestra C", {"body": "round", "head": "square", "hair": "spiky", "eyes": "wild", "nose": "round", "outfit": "tank", "skin": "#80ed99",
                                    "hair_color": "#fb8500", "top_color": "#ff5d8f", "bottom_color": "#264653", "accent_color": "#ffb703", "eye_color": "#e63946",
                                    "species": "creature", "height": 0.9, "head_scale": 1.45, "accessories": ["horns"], "seed": 21}),
    ]
    rigs = {cid: build_rig(cid, name, schemas.character_params(p, cid), st) for cid, name, p in specs}
    locs = schemas.art_direction({"locations": [
        {"id": "muestra_interior", "name": "Interior", "description": "x", "type": "interior", "sky": "#2ec4b6", "ground": "#8a5a44", "accent": "#ffb703", "horizon": 0.66,
         "elements": [{"kind": "window", "x": 0.25, "y": 0.33, "scale": 1.0, "depth": 0.5}, {"kind": "frame", "x": 0.72, "y": 0.3, "scale": 0.9, "color": "#e63946", "depth": 0.5},
                      {"kind": "lamp", "x": 0.55, "y": 0.12, "scale": 1.1, "depth": 0.6}, {"kind": "shelf", "x": 0.85, "y": 0.45, "scale": 0.9, "depth": 0.55},
                      {"kind": "plant", "x": 0.06, "y": 0.6, "scale": 1.1, "color": "#2d6a4f", "depth": 0.9}, {"kind": "table", "x": 0.82, "y": 0.6, "scale": 0.9, "color": "#b5651d", "depth": 0.95}]},
        {"id": "muestra_exterior", "name": "Exterior", "description": "x", "type": "city", "sky": "#ff9e6d", "ground": "#6a994e", "accent": "#ffb703", "horizon": 0.7,
         "elements": [{"kind": "sun", "x": 0.7, "y": 0.22, "scale": 1.1, "color": "#ffd166", "depth": 0.1}, {"kind": "mountain", "x": 0.2, "y": 0.6, "scale": 1.2, "color": "#7b5ea7", "depth": 0.15},
                      {"kind": "building", "x": 0.1, "y": 0.6, "scale": 1.0, "color": "#457b9d", "depth": 0.3}, {"kind": "building", "x": 0.9, "y": 0.6, "scale": 0.8, "color": "#e76f51", "depth": 0.3},
                      {"kind": "cloud", "x": 0.35, "y": 0.15, "depth": 0.2}, {"kind": "tree", "x": 0.85, "y": 0.6, "scale": 1.1, "color": "#2d6a4f", "depth": 0.6},
                      {"kind": "sign", "x": 0.15, "y": 0.58, "scale": 0.8, "color": "#ffb703", "text": "BAR", "depth": 0.8}, {"kind": "bush", "x": 0.5, "y": 0.7, "scale": 1.0, "color": "#40916c", "depth": 1.1}]}]})["locations"]
    bgs = {l["id"]: build_background(l, st, seed=5) for l in locs}
    ep = {"id": "EP000", "title": "MUESTRA DE ESTILO", "question": "¿Qué pasaría si esto fuera una muestra de estilo?", "test": True}
    sb = {"shots": [
        {"id": "s01", "location": "muestra_interior", "framing": "medium", "camera": "static", "transition": "cut", "effects": [], "text_pop": "",
         "actors": [{"character": "muestra_a", "position": "left", "facing": "right", "actions": [], "expression": "smug"},
                    {"character": "muestra_b", "position": "right", "facing": "left", "actions": [], "expression": "surprised"}],
         "lines": ["l01"], "seconds": 2, "description": "x", "key_image": True},
        {"id": "s02", "location": "muestra_exterior", "framing": "medium", "camera": "static", "transition": "cut", "effects": [], "text_pop": "",
         "actors": [{"character": "muestra_c", "position": "center", "facing": "right", "actions": ["point"], "expression": "crazy"}],
         "lines": ["l02"], "seconds": 2, "description": "x", "key_image": True}]}
    script = {"beats": [{"id": "b1", "location": "muestra_interior", "action": "", "lines": [
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
