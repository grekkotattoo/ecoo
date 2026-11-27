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
