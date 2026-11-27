"""CLI del estudio: `python -m studio <comando>` (o ./studio.sh)."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .core import ROOT, StudioError, load_config, paths, read_json, save_local_config


def out(obj) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2) if not isinstance(obj, str) else obj)


def cmd_init(a):
    P = paths().ensure()
    src = ROOT / "library" / "fonts"
    dst = P.library / "fonts"
    if src.resolve() != dst.resolve():
        for f in src.glob("*.woff"):
            shutil.copy2(f, dst / f.name)
    out({"ok": True, "data": str(P.data), "library": str(P.library)})


def cmd_doctor(a):
    """Auditoría del entorno: herramientas, motor, credenciales (sin mostrar valores)."""
    from . import elevenlabs
    from .core import secret
    P = paths()
    def ver(cmd):
        try:
            return subprocess.run(cmd, capture_output=True, text=True, timeout=20).stdout.splitlines()[0][:80]
        except Exception:
            return None
    cfg = load_config()
    rep = {
        "python": sys.version.split()[0], "ffmpeg": ver(["ffmpeg", "-version"]), "ffprobe": ver(["ffprobe", "-version"]),
        "node": ver(["node", "--version"]), "engine_installed": (P.engine / "node_modules" / ".bin" / "remotion").exists(),
        "browser": Path(cfg["render"]["browser_executable"]).exists(), "rhubarb_lipsync": bool(shutil.which("rhubarb")),
        "fonts": sorted(f.name for f in (P.library / "fonts").glob("*.woff")),
        "llm_provider": cfg["llm"]["provider"], "anthropic_key": bool(secret("ANTHROPIC_API_KEY")),
        "elevenlabs": elevenlabs.status(), "openai_key": bool(secret("OPENAI_API_KEY")), "images_provider": cfg["images"]["provider"],
        "authorize_paid": cfg["costs"]["authorize_paid"], "cpus": __import__("os").cpu_count(),
        "disk_free_gb": round(shutil.disk_usage(P.root).free / 1e9, 1),
    }
    out(rep)


def cmd_status(a):
    from . import autopilot, costs, ideas, pipeline
    eps = pipeline.list_eps()
    out({"autopilot": autopilot.status(), "episodes": [{"id": e["id"], "title": e["title"], "status": e["status"], "test": e.get("test")} for e in eps],
         "idea_queue": len(ideas.queue()), "needs_human": autopilot.needs_human(), "costs_month_usd": costs.summary()["spent_month_usd"]})


def cmd_ideas(a):
    from . import autopilot, ideas, schemas
    if a.action == "generate":
        out(autopilot.generate_ideas(a.n, a.feedback or ""))
    elif a.action == "list":
        out([{k: i[k] for k in ("id", "status", "title", "question")} for i in ideas.load()["items"]])
    elif a.action == "add":
        out(ideas.add([schemas.idea({"title": a.title or a.question[:50], "question": a.question, "premise": a.premise or a.question,
                                     "humor_type": a.humor or "absurdo", "twist": a.twist or "a definir"})], "user"))


def cmd_episode(a):
    from . import pipeline
    if a.action == "new":
        ep = pipeline.new_episode(a.idea)
        out(pipeline.advance(ep["id"]) if not a.no_advance else ep)
    elif a.action == "advance":
        out(pipeline.advance(a.id))
    elif a.action == "show":
        ep = pipeline.load_ep(a.id)
        out({k: ep[k] for k in ("id", "title", "question", "status", "waiting", "approval")} | {"phases": {k: v["status"] + (f" ({v.get('error','')[:120]})" if v.get("error") else "") for k, v in ep["phases"].items()}})
    elif a.action == "list":
        out([{"id": e["id"], "title": e["title"], "status": e["status"]} for e in pipeline.list_eps()])
    elif a.action == "retry":
        out(pipeline.retry(a.id, a.phase))


def cmd_approve(a):
    from . import pipeline
    r = pipeline.act(a.id, a.action, a.feedback or "", by="cli")
    if a.advance:
        r["advance"] = pipeline.advance(a.id)
    out(r)


def cmd_task(a):
    from . import llm
    if a.action == "list":
        out([{"id": t["id"], "kind": t["kind"], "episode": t.get("episode"), "last_error": t.get("last_error")} for t in llm.pending_tasks()])
    elif a.action == "show":
        t = read_json(paths().tasks / "pending" / f"{a.id}.json")
        if not t:
            raise StudioError("Tarea inexistente")
        print(f"## SYSTEM\n{t['system']}\n\n## TAREA ({t['kind']})\n{t['prompt']}\n")
        if t.get("last_error"):
            print(f"## ERROR DE LA RESPUESTA ANTERIOR\n{t['last_error']}\n")
        print(f"## RESPONDER\nGuarda el JSON en un fichero y ejecuta: python -m studio task submit {t['id']} <fichero.json>")
    elif a.action == "submit":
        data = json.loads(Path(a.file).read_text(encoding="utf-8"))
        llm.submit_task(a.id, data)
        out({"submitted": a.id})


def cmd_audio(a):
    from . import audio, pipeline
    if a.action == "import":
        out(audio.add_line_version(a.id, a.line, Path(a.file), source=f"manual:{Path(a.file).name}"))
        ep = pipeline.load_ep(a.id)
        if ep["phases"]["audio_sync"]["status"] == "done":  # sustitución tras sincronizar → rehacer desde audio_sync
            pipeline._reset(ep, pipeline.POST[1:])
            pipeline.save_ep(ep)
    elif a.action == "narration":
        s = pipeline.art(a.id, "script")
        lines = [l for b in s["beats"] for l in b["lines"]]
        v = load_config()["voice"]
        out(audio.split_narration(a.id, Path(a.file), [l["id"] for l in lines], [l["text"] for l in lines], v["silence_db"], v["silence_min_s"]))
    elif a.action == "versions":
        out(audio.line_versions(a.id, a.line))


def cmd_library(a):
    from . import library
    if a.action == "list":
        out({k: library.list_all(k) for k in ("characters", "backgrounds", "props")} | {"audio": library.audio_manifest()})
    elif a.action == "import-audio":
        out(library.import_audio_asset(Path(a.file), a.kind, a.tags.split(",") if a.tags else [], a.license or ""))


def cmd_autopilot(a):
    from . import autopilot
    if a.action == "run":
        autopilot.run(a.ticks, a.interval)
    elif a.action == "tick":
        out(autopilot.tick())
    elif a.action == "status":
        out(autopilot.status())


def cmd_costs(a):
    from . import costs
    out(costs.summary())


def cmd_backup(a):
    from . import backup
    if a.action == "create":
        out(str(backup.create("manual")))
    elif a.action == "list":
        out(backup.list_backups())
    elif a.action == "restore":
        out({"restored": a.name, "safety_backup": str(backup.restore(a.name))})


def cmd_config(a):
    if a.action == "get":
        cfg = load_config()
        for k in (a.key or "").split(".") if a.key else []:
            cfg = cfg[k]
        out(cfg)
    elif a.action == "set":
        val = json.loads(a.value) if a.value in ("true", "false", "null") or a.value.replace(".", "", 1).isdigit() or a.value[:1] in "[{\"" else a.value
        patch: dict = {}
        cur = patch
        keys = a.key.split(".")
        for k in keys[:-1]:
            cur[k] = {}
            cur = cur[k]
        cur[keys[-1]] = val
        save_local_config(patch)
        out({"set": a.key, "value": val, "file": "config/studio.local.json"})


def cmd_elevenlabs(a):
    from . import elevenlabs
    out({"status": elevenlabs.status, "voices": elevenlabs.list_voices, "subscription": elevenlabs.subscription}[a.action]())


def cmd_export(a):
    from . import pipeline, render
    cfg = load_config()["video"]["formats"][a.format]
    src = paths().deliveries / a.id / pipeline.final_name(pipeline.load_ep(a.id))
    dst = src.with_name(src.stem.rsplit("_", 1)[0] + f"_{cfg['width']}x{cfg['height']}.mp4")
    out(str(render.transcode_format(src, dst, cfg["width"], cfg["height"])))


def cmd_selftest(a):
    """Prueba técnica del motor con recursos geométricos TEST (no crea episodios)."""
    from . import bench
    out(bench.engine_selftest(Path(a.out) if a.out else None))


def cmd_cache(a):
    from . import render
    out(render.prune_cache(a.days))


def cmd_stylesample(a):
    from . import bench
    out(bench.style_sample())


def cmd_serve(a):
    from . import server
    cfg = load_config()["server"]
    server.serve(a.host or cfg["host"], a.port or cfg["port"])


def main(argv=None):
    p = argparse.ArgumentParser(prog="studio", description="Estudio autónomo ¿QUÉ PASARÍA SI...?")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(fn=cmd_init)
    sub.add_parser("doctor").set_defaults(fn=cmd_doctor)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    s = sub.add_parser("ideas"); s.add_argument("action", choices=["generate", "list", "add"]); s.add_argument("-n", type=int, default=5)
    s.add_argument("--feedback"); s.add_argument("--question"); s.add_argument("--title"); s.add_argument("--premise"); s.add_argument("--humor"); s.add_argument("--twist")
    s.set_defaults(fn=cmd_ideas)
    s = sub.add_parser("episode"); s.add_argument("action", choices=["new", "advance", "show", "list", "retry"]); s.add_argument("id", nargs="?")
    s.add_argument("--idea"); s.add_argument("--phase"); s.add_argument("--no-advance", action="store_true"); s.set_defaults(fn=cmd_episode)
    s = sub.add_parser("approve", help="APROBAR | CAMBIAR IDEA | CAMBIAR IMÁGENES | CAMBIAR PERSONAJES | REVISAR GUION | REVISAR HUMOR | CANCELAR")
    s.add_argument("id"); s.add_argument("action"); s.add_argument("--feedback"); s.add_argument("--advance", action="store_true"); s.set_defaults(fn=cmd_approve)
    s = sub.add_parser("task"); s.add_argument("action", choices=["list", "show", "submit"]); s.add_argument("id", nargs="?"); s.add_argument("file", nargs="?"); s.set_defaults(fn=cmd_task)
    s = sub.add_parser("audio"); s.add_argument("action", choices=["import", "narration", "versions"]); s.add_argument("id"); s.add_argument("--line"); s.add_argument("--file"); s.set_defaults(fn=cmd_audio)
    s = sub.add_parser("library"); s.add_argument("action", choices=["list", "import-audio"]); s.add_argument("--file"); s.add_argument("--kind")
    s.add_argument("--tags"); s.add_argument("--license"); s.set_defaults(fn=cmd_library)
    s = sub.add_parser("autopilot"); s.add_argument("action", choices=["run", "tick", "status"]); s.add_argument("--ticks", type=int); s.add_argument("--interval", type=int)
    s.set_defaults(fn=cmd_autopilot)
    sub.add_parser("costs").set_defaults(fn=cmd_costs)
    s = sub.add_parser("backup"); s.add_argument("action", choices=["create", "list", "restore"]); s.add_argument("name", nargs="?"); s.set_defaults(fn=cmd_backup)
    s = sub.add_parser("config"); s.add_argument("action", choices=["get", "set"]); s.add_argument("key", nargs="?"); s.add_argument("value", nargs="?"); s.set_defaults(fn=cmd_config)
    s = sub.add_parser("elevenlabs"); s.add_argument("action", choices=["status", "voices", "subscription"]); s.set_defaults(fn=cmd_elevenlabs)
    s = sub.add_parser("export"); s.add_argument("id"); s.add_argument("--format", default="square_1x1"); s.set_defaults(fn=cmd_export)
    s = sub.add_parser("selftest"); s.add_argument("--out"); s.set_defaults(fn=cmd_selftest)
    s = sub.add_parser("cache"); s.add_argument("action", choices=["prune"]); s.add_argument("--days", type=float, default=14); s.set_defaults(fn=cmd_cache)
    sub.add_parser("stylesample", help="muestra del acabado visual (personajes genéricos, no de la serie)").set_defaults(fn=cmd_stylesample)
    s = sub.add_parser("serve"); s.add_argument("--host"); s.add_argument("--port", type=int); s.set_defaults(fn=cmd_serve)
    a = p.parse_args(argv)
    paths().ensure()
    try:
        t0 = time.time()
        a.fn(a)
        return 0
    except StudioError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2
    finally:
        _ = t0
