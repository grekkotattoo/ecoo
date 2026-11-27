"""Integración: preproducción → aprobación humana → cambios selectivos → recuperación → autopiloto → panel.
Usa el cerebro mock (contenido TEST) y stills falsos (rápido). El render real se prueba en test_e2e."""
import json
import threading
import urllib.request

import pytest

from studio import autopilot, ideas, pipeline
from studio.core import StudioError, read_json, read_jsonl, save_local_config


@pytest.fixture()
def proposal_ep(studio_env, fake_still):
    autopilot.generate_ideas(3)
    ep = pipeline.new_episode(test=True)
    r = pipeline.advance(ep["id"])
    assert r["status"] == "awaiting_approval", r
    return ep["id"]


def test_preproduction_builds_complete_proposal(proposal_ep, studio_env):
    prop = read_json(studio_env.episode(proposal_ep) / "proposal" / "proposal.json")
    for k in ("episode", "title", "question", "summary", "humor_type", "twist", "estimated_seconds", "characters", "locations", "images"):
        assert prop[k] not in (None, "", []), k
    kinds = [i["kind"] for i in prop["images"]]
    assert 3 <= kinds.count("key_frame") <= 5 and "character_sheet" in kinds and "background" in kinds
    st = pipeline.load_ep(proposal_ep)
    assert st["humor_revisions"] == 1  # el mock suspende la 1ª versión → auto-revisión del humor
    assert prop["humor"]["passed"]


def test_silence_is_not_approval(proposal_ep):
    for _ in range(3):
        assert pipeline.advance(proposal_ep)["status"] == "awaiting_approval"
    st = pipeline.load_ep(proposal_ep)
    assert all(st["phases"][p]["status"] == "pending" for p in pipeline.POST)
    with pytest.raises(StudioError, match="aprobación"):
        pipeline.ph_voice(st)


def test_selective_changes_keep_the_rest(proposal_ep):
    before = pipeline.load_ep(proposal_ep)
    r = pipeline.act(proposal_ep, "CAMBIAR PERSONAJES", "más grotescos")
    st = pipeline.load_ep(proposal_ep)
    assert r["status"] == "drafting"
    assert st["phases"]["characters"]["status"] == "pending" and st["phases"]["base_images"]["status"] == "pending"
    for keep in ("development", "script", "humor_review", "art_direction", "storyboard"):
        assert st["phases"][keep] == before["phases"][keep], keep
    assert pipeline.advance(proposal_ep)["status"] == "awaiting_approval"
    pipeline.act(proposal_ep, "REVISAR GUION", "más corto")
    st = pipeline.load_ep(proposal_ep)
    assert st["phases"]["characters"]["status"] == "done" and st["phases"]["script"]["status"] == "pending"


def test_change_idea_never_repeats(proposal_ep):
    old = pipeline.load_ep(proposal_ep)["idea_id"]
    pipeline.act(proposal_ep, "CAMBIAR IDEA")
    st = pipeline.load_ep(proposal_ep)
    assert st["idea_id"] != old and ideas.get(old)["status"] == "rejected"
    assert all(st["phases"][p]["status"] == "pending" for p in pipeline.PRE)


def test_approval_is_persistent_and_freezes_assets(proposal_ep, studio_env):
    pipeline.act(proposal_ep, "APROBAR", by="test")
    st = pipeline.load_ep(proposal_ep)
    assert st["approval"]["approved"] and st["approval"]["proposal_hash"]
    log = read_jsonl(studio_env.state / "approvals.jsonl")
    assert log[-1]["action"] == "APPROVE" and log[-1]["by"] == "test"
    from studio import library
    for cid, v in pipeline.art(proposal_ep, "characters")["library"].items():
        assert library.is_approved("characters", cid, v["version"])
    with pytest.raises(StudioError):
        pipeline.act(proposal_ep, "APROBAR")  # ya no está pendiente
    # alterar la propuesta tras aprobar invalida la producción
    p = studio_env.episode(proposal_ep) / "proposal" / "proposal.json"
    d = json.loads(p.read_text()); d["hash"] = "manipulado"; p.write_text(json.dumps(d))
    with pytest.raises(StudioError, match="bloqueada"):
        pipeline.ph_voice(pipeline.load_ep(proposal_ep))


def test_cancel(proposal_ep):
    pipeline.act(proposal_ep, "CANCELAR")
    assert pipeline.advance(proposal_ep)["status"] == "cancelled"


def test_recovery_after_crash(proposal_ep, studio_env):
    st = pipeline.load_ep(proposal_ep)
    st["phases"]["proposal"] = {"status": "running", "pid": 999999, "attempts": 1}
    pipeline.save_ep(st)
    fixes = pipeline.reconcile()
    assert any(f["fix"].startswith("running") for f in fixes)
    assert pipeline.advance(proposal_ep)["status"] == "awaiting_approval"
    # salida perdida → se rehace desde esa fase, sin repetir lo anterior
    import shutil
    shutil.rmtree(studio_env.episode(proposal_ep) / "proposal" / "images")
    fixes = pipeline.reconcile()
    st = pipeline.load_ep(proposal_ep)
    assert st["phases"]["base_images"]["status"] == "pending" and st["phases"]["storyboard"]["status"] == "done"
    assert pipeline.advance(proposal_ep)["status"] == "awaiting_approval"


def test_waiting_for_audio_lists_lines(proposal_ep, studio_env):
    save_local_config({"voice": {"provider": "import"}})
    pipeline.act(proposal_ep, "APROBAR")
    r = pipeline.advance(proposal_ep)
    assert r["status"] == "waiting_audio" and r["waiting"]["lines"]
    assert (studio_env.inbox / "audio" / proposal_ep / "LEEME.md").exists()


def test_autopilot_single_pending_proposal(studio_env, fake_still):
    r1 = autopilot.tick()
    assert r1["created"] and r1["ideas_generated"] > 0
    r2 = autopilot.tick()
    assert r2["created"] is None  # nunca más de una propuesta pendiente
    assert any(n["need"] == "approval" for n in r2["needs_human"])
    assert len([e for e in pipeline.list_eps() if e["status"] == "awaiting_approval"]) == 1


def test_claude_code_mode_waits_for_assistant(studio_env, fake_still):
    autopilot.generate_ideas(2)
    save_local_config({"llm": {"provider": "claude_code"}})
    ep = pipeline.new_episode()
    r = pipeline.advance(ep["id"])
    assert r["status"] == "waiting_assistant" and r["waiting"]["task"]


def test_panel_api(proposal_ep, studio_env):
    from studio import server
    srv = server.make_server("127.0.0.1", 0)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    try:
        st = json.loads(urllib.request.urlopen(base + "/api/state").read())
        assert st["proposal"]["id"] == proposal_ep
        html = urllib.request.urlopen(base + "/").read().decode()
        assert "APROBAR" in html
        img = st["proposal"]["images"][0]["file"]
        assert urllib.request.urlopen(f"{base}/files/episodes/{proposal_ep}/proposal/images/{img}").status == 200
        for bad in ("/files/episodes/../../config/studio.json", "/files/config/studio.json"):
            with pytest.raises(urllib.error.HTTPError):
                urllib.request.urlopen(base + bad)
        req = urllib.request.Request(base + "/api/action", data=json.dumps({"episode": proposal_ep, "action": "APROBAR"}).encode(), method="POST")
        with pytest.raises(urllib.error.HTTPError) as e:  # sin cabecera anti-CSRF
            urllib.request.urlopen(req)
        assert e.value.code == 403
        req = urllib.request.Request(base + "/api/config", data=json.dumps({"key": "render.browser_executable", "value": "x"}).encode(),
                                     method="POST", headers={"X-Studio": "1"})
        with pytest.raises(urllib.error.HTTPError):  # clave no editable
            urllib.request.urlopen(req)
    finally:
        srv.shutdown()
