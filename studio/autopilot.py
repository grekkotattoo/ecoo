"""AUTONOMOUS PRODUCTION MODE.

Ciclo (tick):
  1. Recuperación (fases huérfanas / salidas perdidas).
  2. Episodios APROBADOS → avanzar producción (render, QA, entrega).
  3. Mantener EXACTAMENTE una propuesta pendiente de aprobación (no satura al usuario).
  4. Mantener la cola de ideas (sin producirlas).
  5. Informar qué necesita al humano (aprobación, audios, tareas del asistente, presupuesto).

Honestidad operativa: solo corre mientras el proceso `studio autopilot` esté vivo (o mientras una
sesión de Claude Code/Codex lo ejecute). Escribe un latido en data/state/autopilot.json; el panel
muestra si está vivo o no. Lock exclusivo: imposible lanzar dos autopilotos a la vez.
"""
from __future__ import annotations

import os
import time

from . import ideas, llm, pipeline, prompts, schemas
from .core import StudioError, file_lock, load_config, log, now_iso, paths, read_json, write_json

PRE_STATES = ("drafting", "waiting_assistant", "awaiting_approval", "error", "waiting_budget")
PROD_STATES = ("approved", "producing", "waiting_audio")


def generate_ideas(n: int = 5, feedback: str = "") -> dict:
    res = llm.complete("ideas", prompts.system("generación de ideas"), prompts.ideas_prompt(n, ideas.all_questions(), feedback), schemas.ideas)
    return ideas.add(res["ideas"], source=llm.provider_name())


def needs_human() -> list[dict]:
    out = []
    for ep in pipeline.list_eps():
        w = ep.get("waiting") or {}
        if ep["status"] == "awaiting_approval":
            out.append({"episode": ep["id"], "need": "approval", "title": ep["title"]})
        elif ep["status"] == "waiting_audio":
            out.append({"episode": ep["id"], "need": "audio", "lines": w.get("lines"), "inbox": w.get("inbox")})
        elif ep["status"] == "waiting_budget":
            out.append({"episode": ep["id"], "need": "budget", "detail": w.get("detail")})
        elif ep["status"] in ("error", "blocked_qa"):
            failed = [k for k, v in ep["phases"].items() if v["status"] == "failed"]
            out.append({"episode": ep["id"], "need": "fix", "phases": failed, "error": ep["phases"][failed[0]].get("error") if failed else None})
    for t in llm.pending_tasks():
        out.append({"need": "assistant_task", "task": t["id"], "kind": t["kind"], "episode": t.get("episode")})
    return out


def tick() -> dict:
    cfg = load_config()["autopilot"]
    report = {"ts": now_iso(), "recovered": pipeline.reconcile(), "advanced": [], "created": None, "ideas_generated": 0}
    eps = pipeline.list_eps()
    for ep in eps:
        if ep["status"] in PROD_STATES or (ep["status"] in PRE_STATES and ep["status"] != "awaiting_approval"):
            try:
                report["advanced"].append(pipeline.advance(ep["id"]))
            except StudioError as e:
                report["advanced"].append({"episode": ep["id"], "error": str(e)})
    eps = pipeline.list_eps()
    pending = [e for e in eps if e["status"] in PRE_STATES]
    if len(ideas.queue()) < 1 or (not pending and len(ideas.queue()) < cfg["idea_queue_target"]):
        try:
            report["ideas_generated"] = len(generate_ideas(cfg["idea_queue_target"])["added"])
        except llm.TaskPending as e:
            report["ideas_task"] = e.task_id
    if len(pending) < cfg["max_pending_proposals"] and ideas.queue():
        ep = pipeline.new_episode()
        report["created"] = ep["id"]
        report["advanced"].append(pipeline.advance(ep["id"]))
    report["needs_human"] = needs_human()
    return report


def _heartbeat(state: str, extra: dict | None = None) -> None:
    write_json(paths().state / "autopilot.json", {"state": state, "pid": os.getpid(), "ts": now_iso(), "epoch": time.time(), **(extra or {})})


def status() -> dict:
    hb = read_json(paths().state / "autopilot.json", {"state": "never_run"})
    alive = False
    if hb.get("pid"):
        try:
            os.kill(hb["pid"], 0)
            alive = hb.get("state") == "running" and time.time() - hb.get("epoch", 0) < 3 * load_config()["autopilot"]["tick_seconds"] + 600
        except OSError:
            alive = False
    return {**hb, "alive": alive}


def run(max_ticks: int | None = None, tick_seconds: int | None = None) -> None:
    cfg = load_config()["autopilot"]
    max_ticks = cfg["max_ticks"] if max_ticks is None else max_ticks
    tick_seconds = tick_seconds or cfg["tick_seconds"]
    with file_lock(paths().state / "autopilot.lock", exclusive_fail=True):
        n = 0
        log("autopilot.start", pid=os.getpid())
        try:
            while True:
                n += 1
                rep = tick()
                _heartbeat("running", {"tick": n, "needs_human": rep["needs_human"]})
                print(f"[{rep['ts']}] tick {n}: creado={rep['created']} avanzados={len(rep['advanced'])} pendiente_humano={len(rep['needs_human'])}", flush=True)
                if max_ticks and n >= max_ticks:
                    break
                time.sleep(tick_seconds)
        except KeyboardInterrupt:
            pass
        finally:
            _heartbeat("stopped", {"tick": n})
            log("autopilot.stop", ticks=n)
