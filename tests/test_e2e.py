"""END-TO-END con render real (≈2-4 min): idea TEST → propuesta con imágenes reales → aprobación →
voces sintéticas de prueba → lip-sync → animación → mezcla con música (ducking) → render → QA → entrega.
Contenido 100% técnico (formas grises, tonos). Ejecutar: pytest -m slow"""
import json
import subprocess

import pytest

from studio import audio, autopilot, library, pipeline
from studio.core import read_json, read_jsonl


@pytest.mark.slow
def test_full_pipeline_real_render(studio_env):
    tone = audio.tone(studio_env.data / "t" / "music_test.wav", 6.0, 110, pattern="flat")
    library.import_audio_asset(tone, "music", ["comedy"], "TEST sintético (generado localmente)")
    library.import_audio_asset(audio.tone(studio_env.data / "t" / "impact.wav", 0.4, 60, pattern="flat"), "sfx", ["impact"], "TEST sintético")
    autopilot.generate_ideas(2)
    ep = pipeline.new_episode(test=True)
    eid = ep["id"]
    assert pipeline.advance(eid)["status"] == "awaiting_approval"
    prop = read_json(studio_env.episode(eid) / "proposal" / "proposal.json")
    from PIL import Image
    for i in prop["images"]:
        im = Image.open(studio_env.episode(eid) / "proposal" / "images" / i["file"])
        assert im.size[0] >= 1080 and sum(1 for c in im.convert("L").histogram() if c) > 8  # imagen real, no vacía
    pipeline.act(eid, "APROBAR", by="e2e")
    r = pipeline.advance(eid)
    assert r["status"] == "delivered", (r, pipeline.load_ep(eid)["phases"])
    rep = read_json(studio_env.episode(eid) / "qa" / "qa_report.json")
    assert rep["passed"], rep
    d = studio_env.deliveries / eid
    mp4 = next(d.glob("*_1080x1920.mp4"))
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(mp4)], capture_output=True, text=True).stdout)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    assert (v["width"], v["height"], v["codec_name"], v["r_frame_rate"]) == (1080, 1920, "h264", "30/1")
    assert (d / f"{eid}.srt").exists() and (d / "qa_report.md").exists() and (d / "contact_sheet.png").exists()
    assert read_jsonl(studio_env.state / "history.jsonl")[-1]["episode"] == eid
    sound = pipeline.art(eid, "sound")
    assert sound["music"] == "music_test" and sound["sfx"] >= 1
    # el siguiente ciclo del autopiloto prepara automáticamente la siguiente propuesta
    nxt = autopilot.tick()
    assert nxt["created"] and nxt["created"] != eid
