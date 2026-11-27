"""Gestor de episodios + pipeline de fases + aprobación humana + recuperación.

Estado de cada episodio en data/episodes/EPxxx/state.json (escritura atómica + lock).
Cada fase es idempotente: lee artefactos de entrada, escribe su artefacto y se marca 'done'
con el hash de salida. Reanudar = volver a llamar a advance(): las fases hechas se saltan.

PREPRODUCCIÓN (sin coste de render) → PROPUESTA → **APROBACIÓN HUMANA OBLIGATORIA** → PRODUCCIÓN.
Silencio ≠ aprobación: la producción comprueba aprobación explícita + hash de la propuesta aprobada.
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from . import audio, costs, ideas, library, llm, prompts, qa, render, schemas, timeline
from .backgrounds import build_background
from .core import (StudioError, append_jsonl, file_lock, hash_file, hash_obj, load_config, log, now_iso,
                   paths, read_json, read_jsonl, slug, write_json)
from .rigs import EXPRESSION_PRESETS, build_rig

PRE = ["development", "script", "humor_review", "art_direction", "characters", "storyboard", "base_images", "proposal"]
POST = ["voice", "audio_sync", "animation", "edit", "sound", "render", "master", "qa", "delivery"]
ALL = PRE + POST

ACTIONS = {
    "APPROVE": [], "CANCEL": [],
    "CHANGE_IDEA": PRE,
    "REVISE_SCRIPT": ["script", "humor_review", "storyboard", "base_images", "proposal"],
    "REVISE_HUMOR": ["script", "humor_review", "storyboard", "base_images", "proposal"],
    "CHANGE_CHARACTERS": ["characters", "base_images", "proposal"],
    "CHANGE_IMAGES": ["art_direction", "base_images", "proposal"],
}
ALIASES = {"APROBAR": "APPROVE", "CANCELAR": "CANCEL", "CAMBIAR IDEA": "CHANGE_IDEA", "CAMBIAR IMAGENES": "CHANGE_IMAGES",
           "CAMBIAR IMÁGENES": "CHANGE_IMAGES", "CAMBIAR PERSONAJES": "CHANGE_CHARACTERS", "REVISAR GUION": "REVISE_SCRIPT",
           "REVISAR GUIÓN": "REVISE_SCRIPT", "REVISAR HUMOR": "REVISE_HUMOR"}
FEEDBACK_SCOPE = {"CHANGE_IDEA": "idea", "REVISE_SCRIPT": "script", "REVISE_HUMOR": "humor", "CHANGE_CHARACTERS": "characters", "CHANGE_IMAGES": "images"}


class WaitingInput(StudioError):
    """La fase espera material del usuario (p.ej. audios de ElevenLabs)."""


class Rerun(Exception):
    pass


# ------------------------------------------------------------------ estado

def _state_path(ep_id: str) -> Path:
    return paths().episode(ep_id) / "state.json"


def load_ep(ep_id: str) -> dict:
    st = read_json(_state_path(ep_id))
    if st is None:
        raise StudioError(f"Episodio inexistente: {ep_id}")
    return st


def save_ep(ep: dict) -> None:
    ep["updated"] = now_iso()
    write_json(_state_path(ep["id"]), ep)


def list_eps() -> list[dict]:
    base = paths().episodes
    if not base.exists():
        return []
    return [read_json(d / "state.json") for d in sorted(base.iterdir()) if (d / "state.json").exists()]


def art_path(ep_id: str, name: str) -> Path:
    return paths().episode(ep_id) / "artifacts" / f"{name}.json"


def art(ep_id: str, name: str):
    v = read_json(art_path(ep_id, name))
    if v is None:
        raise StudioError(f"{ep_id}: falta el artefacto '{name}' (fase previa no completada)")
    return v


def put_art(ep_id: str, name: str, data) -> str:
    write_json(art_path(ep_id, name), data)
    return hash_obj(data)


def style() -> dict:
    return read_json(paths().config / "style_bible.json")


def new_episode(idea_id: str | None = None, test: bool = False) -> dict:
    """Crea un episodio a partir de una idea de la cola (nunca repetida)."""
    P = paths().ensure()
    with file_lock(P.state / "episodes.lock"):
        q = ideas.queue()
        if idea_id is None:
            if not q:
                raise StudioError("La cola de ideas está vacía: ejecuta `studio ideas generate`")
            idea = q[0]
        else:
            idea = ideas.get(idea_id)
            if idea["status"] != "queued":
                raise StudioError(f"La idea {idea_id} no está en cola (estado {idea['status']})")
        nums = [e["number"] for e in list_eps()]
        n = (max(nums) + 1) if nums else 1
        ep_id = f"EP{n:03d}"
        ep = {"id": ep_id, "number": n, "idea_id": idea["id"], "title": idea["title"], "question": idea["question"],
              "status": "drafting", "test": test, "created": now_iso(), "updated": now_iso(),
              "phases": {p: {"status": "pending", "attempts": 0} for p in ALL},
              "feedback": [], "humor_revisions": 0, "approval": {"approved": False}, "waiting": None, "history": []}
        put_art(ep_id, "idea", ideas.get(idea["id"]))
        save_ep(ep)
        ideas.set_status(idea["id"], "in_episode", ep_id)
    log("episode.new", episode=ep_id, idea=idea["id"], test=test)
    return ep


# ------------------------------------------------------------------ fases de preproducción

def _fb(ep: dict, *scopes: str) -> list[str]:
    return [f["text"] for f in ep["feedback"] if f["scope"] in scopes and f.get("text")]


def ph_development(ep: dict) -> dict:
    cfg = load_config()["project"]
    idea = art(ep["id"], "idea")
    d = llm.complete("development", prompts.system("desarrollo creativo"),
                     prompts.development_prompt({k: idea[k] for k in ("title", "question", "premise", "humor_type", "twist")},
                                                (cfg["target_seconds"]["min"], cfg["target_seconds"]["max"]), _fb(ep, "idea")),
                     schemas.development, ep["id"])
    return d


def _max_words() -> int:
    cfg = load_config()["project"]
    # deja ~6 s para cartelas, respiraciones y remate visual
    return int((cfg["target_seconds"]["max"] - 6) * cfg["words_per_second"])


def ph_script(ep: dict) -> dict:
    dev = art(ep["id"], "development")
    cast = read_json(art_path(ep["id"], "characters"))
    arts = read_json(art_path(ep["id"], "art_direction"))
    locked_cast = cast["characters"] if cast and ep["phases"]["characters"]["status"] == "done" else None
    locked_locs = [l["id"] for l in arts["locations"]] if arts and ep["phases"]["art_direction"]["status"] == "done" else None
    humor_notes = _fb(ep, "humor")
    mode = "punchup" if humor_notes else "write"
    s = llm.complete("script", prompts.system("guion"),
                     prompts.script_prompt(dev, _max_words(), locked_cast, locked_locs, _fb(ep, "script", "humor"), mode),
                     lambda d: schemas.script(d, _max_words() + 10), ep["id"])
    if locked_cast:
        ids = {c["id"] for c in locked_cast} | {"narrador"}
        bad = {l["speaker"] for b in s["beats"] for l in b["lines"]} - ids
        if bad:
            raise StudioError(f"El guion revisado introduce personajes no aprobados: {bad}")
    return s


def ph_humor_review(ep: dict) -> dict:
    cfg = load_config()["llm"]
    s = art(ep["id"], "script")
    h = llm.complete("humor_review", prompts.system("evaluación de humor"), prompts.humor_prompt(s, cfg["humor_min_score"]), schemas.humor, ep["id"])
    passed = h["verdict"] == "pass" and h["overall"] >= cfg["humor_min_score"]
    h["passed"] = passed
    if not passed and ep["humor_revisions"] < cfg["humor_max_revisions"]:
        ep["humor_revisions"] += 1
        ep["feedback"].append({"scope": "humor", "text": f"[auto-revisión {ep['humor_revisions']}] {h['notes']}", "by": "humor_review", "ts": now_iso()})
        _reset(ep, ["script", "humor_review"])
        raise Rerun()
    return h


def ph_art_direction(ep: dict) -> dict:
    s = art(ep["id"], "script")
    st = style()
    prev = read_json(art_path(ep["id"], "art_direction"))
    keep = [l["id"] for l in prev["locations"]] if prev else None
    a = llm.complete("art_direction", prompts.system("dirección artística"),
                     prompts.art_prompt(s, prompts.style_summary(st), keep, _fb(ep, "images")), schemas.art_direction, ep["id"])
    need = {b["location"] for b in s["beats"]}
    have = {l["id"] for l in a["locations"]}
    if need - have:
        raise StudioError(f"Dirección artística sin localizaciones del guion: {need - have}")
    versions = {}
    for loc in a["locations"]:
        bg = build_background(loc, st, seed=int(hash_obj(loc)[:6], 16))
        from . import imagegen
        bg = imagegen.maybe_ai_background(ep, loc, bg)
        versions[loc["id"]] = library.save("backgrounds", loc["id"], bg, {"name": loc["name"], "episode": ep["id"]})
    a["library"] = versions
    return a


def ph_characters(ep: dict) -> dict:
    s = art(ep["id"], "script")
    st = style()
    existing = [{"id": c["id"], "name": c["name"]} for c in library.list_all("characters")]
    prev = read_json(art_path(ep["id"], "characters"))
    keep = [c["id"] for c in prev["characters"]] if prev else None
    c = llm.complete("characters", prompts.system("diseño de personajes"),
                     prompts.characters_prompt(s, existing, keep, _fb(ep, "characters")), schemas.characters, ep["id"])
    speakers = {l["speaker"] for b in s["beats"] for l in b["lines"]} - {"narrador"}
    ids = {x["id"] for x in c["characters"]}
    if speakers - ids:
        raise StudioError(f"Faltan diseños para: {speakers - ids}")
    versions = {}
    for ch in c["characters"]:
        if ch["reuse"] and library.index("characters", ch["reuse"])["versions"]:
            rig = library.load("characters", ch["reuse"])
            if ch["reuse"] != ch["id"]:
                rig = {**rig, "id": ch["id"]}
            ver = library.save("characters", ch["id"], rig, {"name": ch["name"], "reused_from": ch["reuse"], "episode": ep["id"]})
        else:
            rig = build_rig(ch["id"], ch["name"], ch["params"], st)
            ver = library.save("characters", ch["id"], rig, {"name": ch["name"], "episode": ep["id"]})
        versions[ch["id"]] = ver
    c["library"] = versions
    return c


def ph_storyboard(ep: dict) -> dict:
    s = art(ep["id"], "script")
    chars = [c["id"] for c in art(ep["id"], "characters")["characters"]]
    locs = [l["id"] for l in art(ep["id"], "art_direction")["locations"]]
    line_ids = {l["id"] for b in s["beats"] for l in b["lines"]}
    return llm.complete("storyboard", prompts.system("storyboard"), prompts.storyboard_prompt(s, chars, locs, _fb(ep, "script", "images")),
                        lambda d: schemas.storyboard(d, line_ids, set(chars), set(locs)), ep["id"])


def _assets(ep_id: str) -> tuple[dict, dict]:
    chars = art(ep_id, "characters")["library"]
    bgs = art(ep_id, "art_direction")["library"]
    rigs = {cid: library.load("characters", cid, v["version"]) for cid, v in chars.items()}
    backs = {lid: library.load("backgrounds", lid, v["version"]) for lid, v in bgs.items()}
    return rigs, backs


def _estimated_line_audio(script: dict) -> dict:
    wps = load_config()["project"]["words_per_second"]
    return {l["id"]: {"duration": round(max(0.8, len(l["text"].split()) / wps), 2), "file": None, "visemes": []}
            for b in script["beats"] for l in b["lines"]}


def _fake_visemes(dur: float, fps: int) -> list[dict]:
    seq = ["C", "B", "D", "E", "A", "C", "F", "B"]
    return [{"f": i * 3, "v": seq[i % len(seq)]} for i in range(int(dur * fps / 3))]


def ph_base_images(ep: dict) -> dict:
    """Imágenes REALES renderizadas con el motor: fotogramas clave + hojas de personaje + escenarios."""
    s = art(ep["id"], "script")
    sb = art(ep["id"], "storyboard")
    rigs, backs = _assets(ep["id"])
    st = style()
    vcfg = load_config()["video"]["primary"]
    la = _estimated_line_audio(s)
    for v in la.values():
        v["visemes"] = _fake_visemes(v["duration"], vcfg["fps"])  # bocas en movimiento en los fotogramas clave
    spec, _ = timeline.build_spec(ep, sb, s, rigs, backs, st, la, vcfg["fps"], vcfg["width"], vcfg["height"])
    out = paths().episode(ep["id"]) / "proposal" / "images"
    out.mkdir(parents=True, exist_ok=True)
    imgs_cfg = load_config()["images"]
    keys = [x for x in sb["shots"] if x["key_image"]][: imgs_cfg["base_images_max"]]
    if len(keys) < imgs_cfg["base_images_min"]:
        keys = sb["shots"][: imgs_cfg["base_images_min"]]
    images = []
    for shot in keys:
        sp, fr = timeline.storyboard_still_spec(spec, shot["id"])
        f = render.still({"spec": sp}, "Episode", out / f"key_{shot['id']}.png", fr)
        images.append({"kind": "key_frame", "shot": shot["id"], "file": f.name, "caption": shot["description"]})
    tsty = timeline.style_props(st)
    for cid, rig in rigs.items():
        sheet = {"style": tsty, "rig": rig, "width": 1080, "height": 1920, "title": rig["name"],
                 "expressions": [{"label": ES_LABEL[k], "set": EXPRESSION_PRESETS[k]} for k in ES_LABEL],
                 "poses": [{"label": "saludo", "tracks": {"armR_up.rot": -150, "armR_lo.rot": -20}},
                           {"label": "señala", "tracks": {"armR_up.rot": -95}},
                           {"label": "encogido", "tracks": {"armL_up.rot": 35, "armR_up.rot": -35, "armL_lo.rot": -80, "armR_lo.rot": 80}}]}
        f = render.still({"sheet": sheet}, "CharacterSheet", out / f"char_{cid}.png")
        ver = art(ep["id"], "characters")["library"][cid]["version"]
        if not library.is_approved("characters", cid, ver):
            library.attach_file("characters", cid, ver, f, "preview_sheet.png")
        images.append({"kind": "character_sheet", "character": cid, "file": f.name, "caption": rig["name"]})
    for lid, bg in backs.items():
        plate = {**spec, "shots": [{"id": "plate", "start": 0, "dur": 1, "kind": "scene", "background": lid, "actors": [], "effects": []}],
                 "subtitles": [], "meta": {**spec["meta"], "durationInFrames": 1}}
        f = render.still({"spec": plate}, "Episode", out / f"bg_{lid}.png")
        images.append({"kind": "background", "location": lid, "file": f.name, "caption": bg["meta"]["name"]})
    return {"images": images, "estimated_seconds": round(spec["meta"]["durationInFrames"] / spec["meta"]["fps"], 1),
            "hashes": {i["file"]: hash_file(out / i["file"]) for i in images}}


def ph_proposal(ep: dict) -> dict:
    eid = ep["id"]
    dev, s, h = art(eid, "development"), art(eid, "script"), art(eid, "humor_review")
    c, a, bi = art(eid, "characters"), art(eid, "art_direction"), art(eid, "base_images")
    prop = {"episode": ep["number"], "id": eid, "title": s["title"] or ep["title"], "question": ep["question"],
            "summary": dev["synopsis"], "logline": dev["logline"], "humor_type": dev["humor_type"], "twist": dev["twist"],
            "estimated_seconds": bi["estimated_seconds"], "humor": {"overall": h["overall"], "passed": h["passed"], "scores": h["scores"], "notes": h["notes"]},
            "characters": [{"id": x["id"], "name": x["name"], "role": x["role"], "voice_hint": x.get("voice_hint", ""),
                            "version": c["library"][x["id"]]["version"]} for x in c["characters"]],
            "locations": [{"id": l["id"], "name": l["name"], "description": l["description"], "version": a["library"][l["id"]]["version"]} for l in a["locations"]],
            "script": [{"id": l["id"], "speaker": l["speaker"], "text": l["text"]} for b in s["beats"] for l in b["lines"]],
            "punchline": s["punchline"], "images": bi["images"], "test": ep.get("test", False),
            "actions": ["APROBAR", "CAMBIAR IDEA", "CAMBIAR IMÁGENES", "CAMBIAR PERSONAJES", "REVISAR GUION", "REVISAR HUMOR", "CANCELAR"]}
    prop["hash"] = hash_obj({k: v for k, v in prop.items() if k != "hash"} | {"img": bi["hashes"]})
    d = paths().episode(eid) / "proposal"
    write_json(d / "proposal.json", prop)
    md = [f"# Episodio {prop['episode']:03d} — {prop['title']}", f"**{prop['question']}**", "", prop["summary"], "",
          f"- Humor: {prop['humor_type']} · puntuación {prop['humor']['overall']}/10 {'✅' if prop['humor']['passed'] else '⚠️ por debajo del umbral'}",
          f"- Giro: {prop['twist']}", f"- Duración estimada: {prop['estimated_seconds']} s", "", "## Imágenes base"]
    md += [f"![{i['caption']}](images/{i['file']})" for i in prop["images"]]
    md += ["", "## Guion"] + [f"- **{l['speaker']}**: {l['text']}" for l in prop["script"]]
    md += ["", "## Acciones", "`studio approve " + eid + " APROBAR` · o desde el panel"]
    (d / "proposal.md").write_text("\n".join(md), encoding="utf-8")
    return prop


# ------------------------------------------------------------------ producción (requiere aprobación)

def _require_approval(ep: dict) -> None:
    ap = ep.get("approval", {})
    prop = read_json(paths().episode(ep["id"]) / "proposal" / "proposal.json")
    if not ap.get("approved") or not prop or ap.get("proposal_hash") != prop.get("hash"):
        raise StudioError(f"{ep['id']}: producción bloqueada — no hay aprobación explícita válida de la propuesta actual.")


def ph_voice(ep: dict) -> dict:
    _require_approval(ep)
    from . import elevenlabs
    s = art(ep["id"], "script")
    lines = [l for b in s["beats"] for l in b["lines"]]
    inbox = paths().inbox / "audio" / ep["id"]
    vcfg = load_config()["voice"]
    # 1) narración única → divide por pausas
    narr = next((p for p in (inbox.glob("narration.*") if inbox.exists() else []) if p.suffix.lower() in (".wav", ".mp3")), None)
    if narr and not any(audio.active_line(ep["id"], l["id"]) for l in lines):
        audio.split_narration(ep["id"], narr, [l["id"] for l in lines], [l["text"] for l in lines], vcfg["silence_db"], vcfg["silence_min_s"])
        narr.rename(narr.with_name(narr.name + ".imported"))
    missing = []
    for l in lines:
        f = None
        if inbox.exists():
            f = next((p for p in inbox.glob(f"{l['id']}.*") if p.suffix.lower() in (".wav", ".mp3")), None)
        if f:  # import / sustitución → nueva versión
            audio.add_line_version(ep["id"], l["id"], f, source=f"import:{f.name}")
            f.rename(f.with_name(f.name + ".imported"))
            continue
        if audio.active_line(ep["id"], l["id"]):
            continue
        if vcfg["provider"] == "elevenlabs" and elevenlabs.status()["ready"]:
            mp3 = elevenlabs.synthesize(ep["id"], l["id"], l["speaker"], l["text"])
            audio.add_line_version(ep["id"], l["id"], mp3, source="elevenlabs")
            continue
        if ep.get("test") and vcfg["provider"] == "test_tone":
            wps = load_config()["project"]["words_per_second"]
            t = audio.tone(paths().episode(ep["id"]) / "audio" / "_tone" / f"{l['id']}.wav", max(0.8, len(l["text"].split()) / wps), 180 + 20 * len(l["id"]))
            audio.add_line_version(ep["id"], l["id"], t, source="test_tone")
            continue
        missing.append(l["id"])
    if missing:
        ep["waiting"] = {"type": "audio", "lines": missing, "inbox": str(inbox)}
        inbox.mkdir(parents=True, exist_ok=True)
        guide = ["# Audios pendientes " + ep["id"], "Genera en ElevenLabs y guarda aquí como <id>.mp3 o <id>.wav (o una sola pista narration.mp3).", ""]
        guide += [f"- {l['id']}.mp3 — {l['speaker']}: «{l['text']}»" for l in lines if l["id"] in missing]
        (inbox / "LEEME.md").write_text("\n".join(guide), encoding="utf-8")
        raise WaitingInput(f"{ep['id']}: faltan {len(missing)} audios de voz → {inbox}")
    ep["waiting"] = None
    return {l["id"]: {"version": audio.line_versions(ep["id"], l["id"])[-1]["version"]} for l in lines}


def ph_audio_sync(ep: dict) -> dict:
    _require_approval(ep)
    s = art(ep["id"], "script")
    fps = load_config()["video"]["primary"]["fps"]
    out = {}
    for b in s["beats"]:
        for l in b["lines"]:
            f = audio.active_line(ep["id"], l["id"])
            if not f:
                raise StudioError(f"Sin audio activo para {l['id']}")
            cache = paths().cache / "visemes" / f"{hash_file(f)}_{fps}.json"
            hit = read_json(cache)
            if hit is None:
                vis, method = audio.visemes(f, fps, l["text"])
                hit = {"visemes": vis, "method": method}
                write_json(cache, hit)
            out[l["id"]] = {"duration": round(audio.duration(f), 3), "file": str(f), "visemes": hit["visemes"], "lipsync": hit["method"]}
    return out


def ph_animation(ep: dict) -> dict:
    _require_approval(ep)
    vcfg = load_config()["video"]["primary"]
    rigs, backs = _assets(ep["id"])
    spec, plan = timeline.build_spec(ep, art(ep["id"], "storyboard"), art(ep["id"], "script"), rigs, backs, style(),
                                     art(ep["id"], "audio_sync"), vcfg["fps"], vcfg["width"], vcfg["height"])
    put_art(ep["id"], "spec", spec)
    put_art(ep["id"], "audio_plan", plan)
    return {"spec_hash": hash_obj(spec), "frames": spec["meta"]["durationInFrames"], "shots": len(spec["shots"])}


def ph_edit(ep: dict) -> dict:
    _require_approval(ep)
    spec, plan = art(ep["id"], "spec"), art(ep["id"], "audio_plan")
    issues = [c for c in qa.check_spec(spec, plan, ep["approval"].get("asset_hashes")) if c["level"] == qa.CRIT]
    if issues:
        raise StudioError(f"Montaje inválido: {issues}")
    d = paths().episode(ep["id"]) / "renders"
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{ep['id']}.srt").write_text(timeline.to_srt(spec["subtitles"], spec["meta"]["fps"]), encoding="utf-8")
    edl = [{"shot": s["id"], "in_s": s["start"] / spec["meta"]["fps"], "dur_s": s["dur"] / spec["meta"]["fps"],
            "transition": s.get("transitionIn", {}).get("type", "cut")} for s in spec["shots"]]
    return {"edl": edl, "subtitles": len(spec["subtitles"])}


def ph_sound(ep: dict) -> dict:
    _require_approval(ep)
    plan = art(ep["id"], "audio_plan")
    lib = paths().library
    music = library.find_audio("music", plan.get("music_tags", []))
    sfx = []
    missing_sfx = set()
    for c in plan["sfx"]:
        m = library.find_audio("sfx", [c["tag"]])
        if m and c["tag"] in m.get("tags", []):
            sfx.append((lib / m["file"], c["at"], c["gain"]))
        else:
            missing_sfx.add(c["tag"])
    out = paths().episode(ep["id"]) / "audio" / "mix.wav"
    audio.mix(out, plan["total_s"], [(Path(d["file"]), d["at"]) for d in plan["dialogue"]], (lib / music["file"]) if music else None, sfx,
              load_config()["video"]["primary"]["loudness_lufs"])
    return {"music": music["id"] if music else None, "sfx": len(sfx), "sfx_missing_in_library": sorted(missing_sfx), "file": out.name, "hash": hash_file(out)}


def ph_render(ep: dict) -> dict:
    _require_approval(ep)
    out = paths().episode(ep["id"]) / "renders" / "video_noaudio.mp4"
    return render.render_video(art(ep["id"], "spec"), out)


def final_name(ep: dict) -> str:
    v = load_config()["video"]["primary"]
    return f"{ep['id']}_{slug(ep['title'], 30)}_{v['width']}x{v['height']}.mp4"


def ph_master(ep: dict) -> dict:
    _require_approval(ep)
    d = paths().episode(ep["id"]) / "renders"
    spec = art(ep["id"], "spec")
    out = render.mux(d / "video_noaudio.mp4", paths().episode(ep["id"]) / "audio" / "mix.wav", d / final_name(ep),
                     spec["meta"]["durationInFrames"] / spec["meta"]["fps"])
    render.contact_sheet(out, d / "contact_sheet.png")
    return {"file": out.name, "hash": hash_file(out), "bytes": out.stat().st_size}


def ph_qa(ep: dict) -> dict:
    _require_approval(ep)
    v = load_config()["video"]["primary"]
    cfg = load_config()["project"]["target_seconds"]
    d = paths().episode(ep["id"]) / "renders"
    rep = qa.check_video(d / final_name(ep), {"width": v["width"], "height": v["height"], "fps": v["fps"], "min_s": cfg["min"], "max_s": cfg["max"] + 6},
                         art(ep["id"], "spec"), art(ep["id"], "audio_plan"), ep["approval"].get("asset_hashes"))
    qa.write_report(rep, paths().episode(ep["id"]) / "qa")
    if not rep["passed"]:
        ep["status"] = "blocked_qa"
        raise StudioError(f"QA bloquea la entrega: {rep['critical']} errores críticos (ver {ep['id']}/qa/qa_report.md)")
    return {"passed": True, "warnings": rep["warnings"]}


def ph_delivery(ep: dict) -> dict:
    _require_approval(ep)
    src = paths().episode(ep["id"]) / "renders"
    dst = paths().deliveries / ep["id"]
    dst.mkdir(parents=True, exist_ok=True)
    files = [final_name(ep), f"{ep['id']}.srt", "contact_sheet.png"]
    for f in files:
        shutil.copy2(src / f, dst / f)
    shutil.copy2(paths().episode(ep["id"]) / "qa" / "qa_report.md", dst / "qa_report.md")
    ideas.set_status(ep["idea_id"], "produced", ep["id"])
    append_jsonl(paths().state / "history.jsonl", {"ts": now_iso(), "episode": ep["id"], "title": ep["title"], "question": ep["question"],
                                                   "file": str(dst / files[0]), "test": ep.get("test", False)})
    return {"dir": str(dst), "files": files + ["qa_report.md"]}


ES_LABEL = {"neutral": "neutral", "happy": "feliz", "angry": "furioso", "sad": "triste", "surprised": "sorpresa", "scared": "pánico"}

PHASE_FN = {name: globals()[f"ph_{name}"] for name in ALL}


# ------------------------------------------------------------------ motor de fases

def _reset(ep: dict, names: list[str]) -> None:
    for n in names:
        ep["phases"][n] = {"status": "pending", "attempts": 0}


def _pid_alive(pid: int | None) -> bool:
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def run_phase(ep: dict, name: str) -> str:
    ph = ep["phases"][name]
    if ph["status"] == "done":
        return "done"
    ph.update({"status": "running", "pid": os.getpid(), "started": now_iso(), "attempts": ph.get("attempts", 0) + 1})
    save_ep(ep)
    try:
        result = PHASE_FN[name](ep)
        h = put_art(ep["id"], name, result)
        ph.update({"status": "done", "finished": now_iso(), "output_hash": h, "error": None, "task": None})
        log("phase.done", episode=ep["id"], phase=name)
        return "done"
    except Rerun:
        save_ep(ep)
        return "rerun"
    except llm.TaskPending as e:
        ph.update({"status": "waiting", "task": e.task_id, "error": None})
        ep["waiting"] = {"type": "assistant", "task": e.task_id}
        return "waiting"
    except WaitingInput as e:
        ph.update({"status": "waiting", "error": str(e)})
        return "waiting"
    except (costs.PaidNotAuthorized, costs.BudgetExceeded) as e:
        ph.update({"status": "waiting", "error": str(e)})
        ep["waiting"] = {"type": "budget", "detail": str(e)}
        return "waiting"
    except Exception as e:  # fallo controlado: se registra y se puede reintentar
        ph.update({"status": "failed", "error": f"{type(e).__name__}: {str(e)[:1500]}"})
        log("phase.failed", episode=ep["id"], phase=name, error=str(e)[:300])
        return "failed"
    finally:
        save_ep(ep)


def advance(ep_id: str, max_steps: int = 40) -> dict:
    """Avanza el episodio todo lo posible. Seguro de llamar repetidamente (idempotente)."""
    P = paths()
    with file_lock(P.episode(ep_id) / ".lock", exclusive_fail=True):
        ep = load_ep(ep_id)
        if ep["status"] in ("cancelled", "delivered"):
            return {"episode": ep_id, "status": ep["status"]}
        steps = 0
        while steps < max_steps:
            steps += 1
            approved = ep["approval"].get("approved")
            group = POST if approved else PRE
            nxt = next((p for p in group if ep["phases"][p]["status"] != "done"), None)
            if nxt is None:
                if approved:
                    ep["status"] = "delivered"
                    ep["waiting"] = None
                else:
                    ep["status"] = "awaiting_approval"
                    ep["waiting"] = {"type": "approval"}
                break
            ep["status"] = "producing" if approved else "drafting"
            ep["waiting"] = None
            r = run_phase(ep, nxt)
            if r == "rerun":
                ep = load_ep(ep_id)
                continue
            if r == "waiting":
                ep["status"] = {"assistant": "waiting_assistant", "audio": "waiting_audio", "budget": "waiting_budget"}.get((ep.get("waiting") or {}).get("type"), "waiting")
                if ep.get("waiting") is None:
                    ep["waiting"] = {"type": "input", "detail": ep["phases"][nxt].get("error")}
                break
            if r == "failed":
                if nxt == "qa":
                    ep["status"] = "blocked_qa"
                else:
                    ep["status"] = "error"
                break
        save_ep(ep)
        return {"episode": ep_id, "status": ep["status"], "waiting": ep.get("waiting"),
                "phases": {k: v["status"] for k, v in ep["phases"].items()}}


# ------------------------------------------------------------------ aprobación humana

def act(ep_id: str, action: str, feedback: str = "", by: str = "user") -> dict:
    """Acciones del usuario sobre la propuesta. Registro persistente append-only."""
    from . import backup
    action = ALIASES.get(action.strip().upper(), action.strip().upper())
    if action not in ACTIONS:
        raise StudioError(f"Acción desconocida: {action}. Válidas: {list(ALIASES)}")
    with file_lock(paths().episode(ep_id) / ".lock", exclusive_fail=True):
        ep = load_ep(ep_id)
        if ep["status"] != "awaiting_approval" and action != "CANCEL":
            raise StudioError(f"{ep_id} no está esperando aprobación (estado: {ep['status']})")
        if ep["status"] in ("delivered", "cancelled"):
            raise StudioError(f"{ep_id} ya está {ep['status']}")
        backup.create(f"before-{action.lower()}-{ep_id}")
        prop = read_json(paths().episode(ep_id) / "proposal" / "proposal.json") or {}
        rec = {"ts": now_iso(), "episode": ep_id, "action": action, "feedback": feedback[:2000], "by": by, "proposal_hash": prop.get("hash")}
        append_jsonl(paths().state / "approvals.jsonl", rec)
        ep["history"].append(rec)
        if action == "APPROVE":
            hashes = {}
            for cid, v in art(ep_id, "characters")["library"].items():
                library.approve("characters", cid, v["version"])
                hashes[cid] = hash_obj(library.load("characters", cid, v["version"]))
            for lid, v in art(ep_id, "art_direction")["library"].items():
                library.approve("backgrounds", lid, v["version"])
            ep["approval"] = {"approved": True, "proposal_hash": prop["hash"], "at": rec["ts"], "by": by, "asset_hashes": hashes}
            ep["status"] = "approved"
            ideas.set_status(ep["idea_id"], "approved", ep_id)
        elif action == "CANCEL":
            ep["status"] = "cancelled"
            ep["waiting"] = None
            ideas.set_status(ep["idea_id"], "cancelled", ep_id)
        else:
            if action == "CHANGE_IDEA":
                ideas.set_status(ep["idea_id"], "rejected", ep_id)
                if feedback:
                    new = ideas.add([schemas.idea({"title": feedback[:60], "question": feedback[:180], "premise": feedback, "humor_type": "a definir", "twist": "a definir"})], "user")
                    pick = new["added"][0] if new["added"] else None
                else:
                    q = ideas.queue()
                    pick = q[0] if q else None
                if not pick:
                    raise StudioError("No hay ideas en cola para sustituir: `studio ideas generate` o indica la idea en el feedback")
                ideas.set_status(pick["id"], "in_episode", ep_id)
                ep.update({"idea_id": pick["id"], "title": pick["title"], "question": pick["question"], "feedback": [], "humor_revisions": 0})
                put_art(ep_id, "idea", ideas.get(pick["id"]))
            else:
                ep["feedback"].append({"scope": FEEDBACK_SCOPE[action], "text": feedback, "by": by, "ts": rec["ts"]})
                if action == "REVISE_HUMOR":
                    ep["humor_revisions"] = 0
            _reset(ep, ACTIONS[action])
            ep["status"] = "drafting"
            ep["approval"] = {"approved": False}
        save_ep(ep)
    log("approval.action", episode=ep_id, action=action)
    return {"episode": ep_id, "action": action, "status": ep["status"]}


def approvals_log() -> list[dict]:
    return read_jsonl(paths().state / "approvals.jsonl")


# ------------------------------------------------------------------ recuperación

ARTIFACT_FILES = {"base_images": lambda eid: [paths().episode(eid) / "proposal" / "images"],
                  "render": lambda eid: [paths().episode(eid) / "renders" / "video_noaudio.mp4"],
                  "sound": lambda eid: [paths().episode(eid) / "audio" / "mix.wav"],
                  "proposal": lambda eid: [paths().episode(eid) / "proposal" / "proposal.json"]}


def reconcile() -> list[dict]:
    """Tras un cierre/reinicio: fases 'running' huérfanas → pending; fases 'done' con salida perdida → rehacer."""
    fixes = []
    for ep in list_eps():
        changed = False
        for group in (PRE, POST):
            for i, name in enumerate(group):
                ph = ep["phases"][name]
                if ph["status"] == "running" and not _pid_alive(ph.get("pid")):
                    ph["status"] = "pending"
                    fixes.append({"episode": ep["id"], "phase": name, "fix": "running huérfana → pending"})
                    changed = True
                if ph["status"] == "done":
                    lost = not art_path(ep["id"], name).exists() or any(not p.exists() for p in ARTIFACT_FILES.get(name, lambda e: [])(ep["id"]))
                    if lost:
                        _reset(ep, group[i:])
                        fixes.append({"episode": ep["id"], "phase": name, "fix": "salida perdida → rehacer desde aquí"})
                        changed = True
                        break
        if changed:
            save_ep(ep)
    if fixes:
        log("recovery.reconcile", fixes=len(fixes))
    return fixes


def retry(ep_id: str, phase: str | None = None) -> dict:
    ep = load_ep(ep_id)
    for n, ph in ep["phases"].items():
        if ph["status"] == "failed" and (phase is None or n == phase):
            ph["status"] = "pending"
    if ep["status"] in ("error", "blocked_qa"):
        ep["status"] = "approved" if ep["approval"].get("approved") else "drafting"
    save_ep(ep)
    return advance(ep_id)
