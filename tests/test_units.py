"""Pruebas unitarias: núcleo, costes, ideas, esquemas, rigs, audio, LLM/tareas, QA, backup, ElevenLabs."""
import json
import os
import subprocess

import pytest

from studio import audio, backup, costs, elevenlabs, ideas, library, llm, qa, schemas
from studio.backgrounds import build_background
from studio.core import StudioError, file_lock, hash_obj, load_config, read_json, read_jsonl, save_local_config, write_json
from studio.rigs import EXPRESSION_PRESETS, VISEMES, build_rig


# ----------------------------------------------------------------- núcleo
def test_atomic_json_and_hash(studio_env):
    p = studio_env.state / "x.json"
    write_json(p, {"b": 1, "a": [1, 2]})
    assert read_json(p) == {"b": 1, "a": [1, 2]}
    assert hash_obj({"a": 1, "b": 2}) == hash_obj({"b": 2, "a": 1})
    assert not list(studio_env.state.glob(".x.json.*"))  # sin temporales huérfanos


def test_corrupt_json_is_reported(studio_env):
    p = studio_env.state / "bad.json"
    p.write_text("{nope")
    with pytest.raises(StudioError):
        read_json(p)


def test_exclusive_lock_prevents_duplicates(studio_env):
    lk = studio_env.state / "t.lock"
    with file_lock(lk, exclusive_fail=True):
        r = subprocess.run(["python3", "-c", f"from studio.core import file_lock\nfrom pathlib import Path\n"
                            f"with file_lock(Path('{lk}'), exclusive_fail=True): pass"], capture_output=True, text=True,
                           cwd=os.path.dirname(os.path.dirname(__file__)))
        assert r.returncode != 0 and "Otro proceso" in r.stderr


# ----------------------------------------------------------------- costes
def test_paid_blocked_without_authorization(studio_env):
    with pytest.raises(costs.PaidNotAuthorized):
        costs.guard(costs.Estimate("images", 0.5, {}), "EP001", "k1")
    assert costs.spent() == 0


def test_budget_and_dedupe(studio_env):
    save_local_config({"costs": {"authorize_paid": True, "budgets": {"per_episode": 1.0}}})
    costs.guard(costs.Estimate("voice", 0.4, {}), "EP001", "a")
    costs.record("voice", 0.5, "EP001", "a")
    assert costs.guard(costs.Estimate("voice", 0.4, {}), "EP001", "a")["idem"] == "a"  # ya pagado → no repite
    with pytest.raises(costs.BudgetExceeded):
        costs.guard(costs.Estimate("voice", 0.6, {}), "EP001", "b")
    s = costs.summary()
    assert s["by_category_usd"]["voice"] == 0.5


def test_llm_price():
    assert costs.price_llm("claude-opus-5-5", 1_000_000, 0) == 4.0
    assert costs.price_llm("claude-sonnet-5-5", 0, 1_000_000) == 10.0


# ----------------------------------------------------------------- ideas
def test_ideas_dedupe(studio_env):
    i1 = schemas.idea({"title": "Gatos al poder", "question": "¿Qué pasaría si los gatos gobernasen España?", "premise": "x", "humor_type": "satira", "twist": "y"})
    i2 = schemas.idea({"title": "Michis presidentes", "question": "¿Qué pasaría si los gatos gobernasen en España?", "premise": "x", "humor_type": "satira", "twist": "y"})
    i3 = schemas.idea({"title": "Lunes infinito", "question": "¿Qué pasaría si el lunes durase un año?", "premise": "x", "humor_type": "absurdo", "twist": "y"})
    r = ideas.add([i1, i2, i3], "test")
    assert len(r["added"]) == 2 and r["duplicates"][0]["duplicate_of"] == "I0001"
    assert ideas.add([i1], "test")["added"] == []  # nunca se repite


# ----------------------------------------------------------------- esquemas
def test_script_validation_limits():
    good = {"title": "t", "punchline": "p", "beats": [{"location": "loc_a", "action": "a", "lines": [{"speaker": "pepe", "text": "hola", "emotion": "xx"}]}]}
    s = schemas.script(good)
    assert s["beats"][0]["lines"][0]["emotion"] == "neutral" and s["beats"][0]["lines"][0]["id"] == "l01"
    with pytest.raises(StudioError):
        schemas.script({**good, "beats": [{"location": "loc_a", "action": "a", "lines": [{"speaker": "pepe", "text": "palabra " * 200}]}]})
    with pytest.raises(StudioError):
        schemas.script({**good, "beats": [{"location": "Loc A!", "action": "a", "lines": [{"speaker": "pepe", "text": "x"}]}]})


def test_storyboard_rejects_static_and_unknown():
    base = {"location": "l", "actors": [{"character": "a", "actions": ["wave", "teleport"]}], "lines": ["l01"], "description": "d"}
    sb = schemas.storyboard({"shots": [base, base, base]}, {"l01"}, {"a"}, {"l"})
    assert sb["shots"][0]["actors"][0]["actions"] == ["wave"]  # acción inexistente filtrada
    with pytest.raises(StudioError):
        schemas.storyboard({"shots": [{**base, "actors": []}] * 3}, {"l01"}, {"a"}, {"l"})  # solo cámara: prohibido
    with pytest.raises(StudioError):
        schemas.storyboard({"shots": [{**base, "actors": [{"character": "zz"}]}] * 3}, {"l01"}, {"a"}, {"l"})
    with pytest.raises(StudioError):
        schemas.storyboard({"shots": [{**base, "lines": []}] * 3}, {"l01"}, {"a"}, {"l"})  # línea sin plano


# ----------------------------------------------------------------- rigs / escenarios / biblioteca
def test_rig_structure_and_determinism(studio_env):
    st = read_json(studio_env.config / "style_bible.json")
    p = schemas.character_params({"accessories": ["hat", "glasses", "nope"], "height": 9}, "c")
    assert p["height"] == 1.35 and p["accessories"] == ["hat", "glasses"]
    r1, r2 = build_rig("pepe", "Pepe", p, st), build_rig("pepe", "Pepe", p, st)
    assert hash_obj(r1) == hash_obj(r2)
    ids = {x["id"] for x in r1["parts"]}
    assert {"torso", "head", "eyes", "brows", "mouth", "armL_up", "armR_lo", "legL_up", "legR_lo"} <= ids
    mouth = next(x for x in r1["parts"] if x["id"] == "mouth")
    assert set(VISEMES) <= set(mouth["variants"])
    eyes = next(x for x in r1["parts"] if x["id"] == "eyes")
    for e in EXPRESSION_PRESETS.values():
        assert e["eyes"] in eyes["variants"]
    parents = {x["id"]: x.get("parent") for x in r1["parts"]}
    assert all(v is None or v in parents for v in parents.values())


def test_background_layers(studio_env):
    st = read_json(studio_env.config / "style_bible.json")
    loc = schemas.art_direction({"locations": [{"id": "bar", "name": "Bar", "description": "d", "elements": [
        {"kind": "lamp", "x": .5, "y": .2, "depth": .6}, {"kind": "tree", "x": .1, "y": .6, "depth": .3}, {"kind": "chair", "depth": 1.2}]}]})["locations"][0]
    bg = build_background(loc, st)
    depths = [l["depth"] for l in bg["layers"]]
    assert depths == sorted(depths) and len(bg["layers"]) >= 4
    assert any(l.get("anim") for l in bg["layers"])  # fondo vivo


def test_library_versions_and_protection(studio_env):
    v1 = library.save("characters", "pepe", {"id": "pepe", "version": 1, "x": 1})
    assert library.save("characters", "pepe", {"id": "pepe", "version": 1, "x": 1})["version"] == 1  # mismo contenido
    v2 = library.save("characters", "pepe", {"id": "pepe", "version": 1, "x": 2})
    assert v2["version"] == 2
    library.approve("characters", "pepe", 1)
    f = library.version_dir("characters", "pepe", 1) / "rig.json"
    assert not os.access(f, os.W_OK) or os.geteuid() == 0  # solo lectura (root ignora permisos)
    assert oct(f.stat().st_mode)[-3:] == "444"
    assert library.load("characters", "pepe")["x"] == 1  # carga la aprobada
    with pytest.raises(StudioError):
        library.attach_file("characters", "pepe", 1, f, "preview.png")


# ----------------------------------------------------------------- audio
def test_audio_import_split_versions_visemes_mix(studio_env):
    tmp = studio_env.data / "t"
    w = audio.tone(tmp / "a.wav", 3.0)
    mp3 = tmp / "a.mp3"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(w), str(mp3)], check=True)
    assert audio.probe(mp3)["codec"] == "mp3"
    ep = "EP001"
    r1 = audio.add_line_version(ep, "l01", mp3, "test")
    r2 = audio.add_line_version(ep, "l01", w, "test")
    assert (r1["version"], r2["version"]) == (1, 2)
    assert audio.active_line(ep, "l01").name == "v002.wav"
    assert len(audio.line_versions(ep, "l01")) == 2  # la versión anterior se conserva
    segs = audio.speech_segments(w)
    assert len(segs) >= 3  # el tono de prueba tiene pausas
    res = audio.split_narration(ep, w, ["l10", "l11", "l12"], ["a", "bb", "ccc"], -35, 0.2)
    assert res["segments"] == 3
    vis, method = audio.visemes(w, 30)
    assert method in ("amplitude", "rhubarb") and {v["v"] for v in vis} - {"X"}
    out = audio.mix(tmp / "mix.wav", 4.0, [(w, 0.5)], None, [(w, 1.0, -10)])
    assert abs(audio.duration(out) - 4.0) < 0.05
    with pytest.raises(StudioError):
        audio.to_wav(tmp / "x.txt", tmp / "y.wav")


# ----------------------------------------------------------------- LLM / tareas del asistente
def test_claude_code_task_roundtrip(studio_env):
    save_local_config({"llm": {"provider": "claude_code"}})
    with pytest.raises(llm.TaskPending) as e:
        llm.complete("development", "sys", "prompt", schemas.development, "EP001")
    tid = e.value.task_id
    assert llm.pending_tasks()[0]["id"] == tid
    llm.submit_task(tid, {"logline": "x"})  # inválida
    with pytest.raises(llm.TaskPending):
        llm.complete("development", "sys", "prompt", schemas.development, "EP001")
    assert "last_error" in llm.pending_tasks()[0]
    good = {"logline": "l", "synopsis": "s", "humor_type": "h", "twist": "t", "beats": [{"description": "d"}] * 3}
    llm.submit_task(tid, good)
    assert llm.complete("development", "sys", "prompt", schemas.development, "EP001")["logline"] == "l"
    assert llm.pending_tasks() == []
    # caché: segunda llamada no crea tarea
    assert llm.complete("development", "sys", "prompt", schemas.development, "EP001")["twist"] == "t"
    assert any(e["category"] == "assistant_tokens" for e in costs.entries())


def test_anthropic_without_key_fails_cleanly(studio_env):
    save_local_config({"llm": {"provider": "anthropic"}})
    with pytest.raises(StudioError, match="ANTHROPIC_API_KEY"):
        llm.complete("ideas", "s", "p", schemas.ideas)


def test_extract_json():
    assert llm.extract_json('bla ```json\n{"a":1}\n``` bla') == {"a": 1}
    assert llm.extract_json('Respuesta: {"a":[1,2]} fin') == {"a": [1, 2]}


# ----------------------------------------------------------------- ElevenLabs
def test_elevenlabs_disabled_and_guarded(studio_env):
    st = elevenlabs.status()
    assert not st["ready"] and not st["api_key_present"]
    with pytest.raises(StudioError, match="desactivado"):
        elevenlabs.synthesize("EP001", "l01", "pepe", "hola")
    save_local_config({"voice": {"elevenlabs": {"enabled": True, "voices": {"pepe": "v1"}}}})
    with pytest.raises(costs.PaidNotAuthorized):
        elevenlabs.synthesize("EP001", "l01", "pepe", "hola")  # bloqueado antes de llamar a la red


# ----------------------------------------------------------------- QA
def _synthetic(path, size="1080x1920", rate=30, secs=2, color=None, audio_on=True):
    src = f"color=c={color}:s={size}:r={rate}:d={secs}" if color else f"testsrc2=s={size}:r={rate}:d={secs}"
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", src]
    if audio_on:
        cmd += ["-f", "lavfi", "-i", f"sine=f=440:d={secs}", "-c:a", "aac"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-shortest", str(path)]
    subprocess.run(cmd, check=True)
    return path


def test_qa_detects_problems(studio_env):
    exp = {"width": 1080, "height": 1920, "fps": 30}
    good = qa.check_video(_synthetic(studio_env.data / "g.mp4"), exp)
    assert good["passed"], good
    bad_res = qa.check_video(_synthetic(studio_env.data / "r.mp4", size="720x1280"), exp)
    assert not bad_res["passed"] and any(c["check"] == "resolucion" and c["level"] == "critical" for c in bad_res["checks"])
    black = qa.check_video(_synthetic(studio_env.data / "b.mp4", color="black"), exp)
    assert any(c["check"] == "fotogramas_negros" and c["level"] == "critical" for c in black["checks"])
    mute = qa.check_video(_synthetic(studio_env.data / "m.mp4", audio_on=False), exp)
    assert any(c["check"] == "audio" and c["level"] == "critical" for c in mute["checks"])
    assert not qa.check_video(studio_env.data / "nope.mp4", exp)["passed"]
    md = qa.write_report(good, studio_env.data / "qa")
    assert "APTO" in md.read_text()


# ----------------------------------------------------------------- backup
def test_backup_restore(studio_env):
    write_json(studio_env.state / "ideas.json", {"next_id": 5, "items": []})
    b = backup.create("t")
    write_json(studio_env.state / "ideas.json", {"next_id": 99, "items": []})
    safety = backup.restore(b.name)
    assert read_json(studio_env.state / "ideas.json")["next_id"] == 5
    assert safety.exists()
    with pytest.raises(StudioError):
        backup.restore("../etc/passwd")
