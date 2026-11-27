"""Panel de control: API JSON + interfaz web estática. Sin dependencias (stdlib).

Seguridad: escucha en 127.0.0.1 por defecto; los POST exigen cabecera `X-Studio: 1` (bloquea CSRF
desde formularios de otras webs) y, si existe STUDIO_PANEL_TOKEN, también `X-Studio-Token`.
Solo sirve ficheros de episodes/, deliveries/ y library/ (nunca config, .env ni código).
Las acciones largas (avanzar/render) corren en segundo plano con lock por episodio.
"""
from __future__ import annotations

import json
import mimetypes
import threading
import traceback
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import autopilot, costs, ideas, library, llm, pipeline
from .core import StudioError, load_config, log, paths, read_json, read_jsonl, save_local_config, secret

WEB = Path(__file__).parent / "web"
JOBS: dict[str, dict] = {}
SAFE_CONFIG = {"costs.authorize_paid": bool, "llm.provider": str, "voice.provider": str, "images.provider": str,
               "voice.elevenlabs.enabled": bool, "costs.budgets.per_episode": float, "costs.budgets.monthly": float}


def _bg(key: str, fn, *args):
    if JOBS.get(key, {}).get("state") == "running":
        raise StudioError(f"Ya hay una tarea en curso para {key}")
    JOBS[key] = {"state": "running"}

    def run():
        try:
            JOBS[key] = {"state": "done", "result": fn(*args)}
        except Exception as e:
            JOBS[key] = {"state": "error", "error": str(e)[:800]}
            log("panel.job_error", key=key, error=str(e)[:300])
    threading.Thread(target=run, daemon=True).start()


def snapshot() -> dict:
    eps = pipeline.list_eps()
    pend = [e for e in eps if e["status"] == "awaiting_approval"]
    proposal = None
    if pend:
        proposal = read_json(paths().episode(pend[0]["id"]) / "proposal" / "proposal.json")
    return {"project": load_config()["project"]["name"], "autopilot": autopilot.status(), "needs_human": autopilot.needs_human(),
            "episodes": [{"id": e["id"], "title": e["title"], "question": e["question"], "status": e["status"], "test": e.get("test"),
                          "updated": e["updated"], "phases": {k: v["status"] for k, v in e["phases"].items()},
                          "error": next((v.get("error") for v in e["phases"].values() if v["status"] == "failed"), None)} for e in eps],
            "proposal": proposal, "ideas": [{k: i.get(k) for k in ("id", "status", "title", "question", "episode")} for i in ideas.load()["items"]][-50:],
            "costs": costs.summary(), "history": read_jsonl(paths().state / "history.jsonl")[-30:],
            "approvals": pipeline.approvals_log()[-30:], "tasks": [{"id": t["id"], "kind": t["kind"], "episode": t.get("episode")} for t in llm.pending_tasks()],
            "library": {k: library.list_all(k) for k in ("characters", "backgrounds")} | {"audio": library.audio_manifest()},
            "config": {k: _get(k) for k in SAFE_CONFIG}, "jobs": JOBS}


def _get(dotted: str):
    cur = load_config()
    for k in dotted.split("."):
        cur = cur.get(k) if isinstance(cur, dict) else None
    return cur


class Handler(BaseHTTPRequestHandler):
    server_version = "QPSStudio/1.0"

    def log_message(self, *a):
        pass

    def _send(self, code: int, body: bytes, ctype: str = "application/json; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, obj):
        self._send(code, json.dumps(obj, ensure_ascii=False, default=str).encode())

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        try:
            if u.path in ("/", "/index.html"):
                return self._send(200, (WEB / "index.html").read_bytes(), "text/html; charset=utf-8")
            if u.path == "/api/state":
                return self._json(200, snapshot())
            if u.path.startswith("/api/episode/"):
                eid = u.path.rsplit("/", 1)[1]
                return self._json(200, {"state": pipeline.load_ep(eid), "proposal": read_json(paths().episode(eid) / "proposal" / "proposal.json")})
            if u.path.startswith("/files/"):
                return self._file(urllib.parse.unquote(u.path[len("/files/"):]))
            self._json(404, {"error": "no encontrado"})
        except StudioError as e:
            self._json(400, {"error": str(e)})
        except Exception as e:
            traceback.print_exc()
            self._json(500, {"error": str(e)[:400]})

    def _file(self, rel: str):
        P = paths()
        roots = {"episodes": P.episodes, "deliveries": P.deliveries, "library": P.library}
        top, _, rest = rel.partition("/")
        base = roots.get(top)
        if not base or ".." in rest.split("/") or rest.startswith("/"):
            return self._json(403, {"error": "prohibido"})
        f = (base / rest).resolve()
        if not str(f).startswith(str(base.resolve())) or not f.is_file() or f.suffix.lower() not in (".png", ".jpg", ".mp4", ".srt", ".md", ".json", ".wav"):
            return self._json(404, {"error": "no encontrado"})
        self._send(200, f.read_bytes(), mimetypes.guess_type(f.name)[0] or "application/octet-stream")

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if self.headers.get("X-Studio") != "1":
            return self._json(403, {"error": "cabecera X-Studio requerida"})
        tok = secret("STUDIO_PANEL_TOKEN")
        if tok and self.headers.get("X-Studio-Token") != tok:
            return self._json(401, {"error": "token inválido"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n > 100_000:
                return self._json(413, {"error": "petición demasiado grande"})
            body = json.loads(self.rfile.read(n) or b"{}")
            if u.path == "/api/action":
                eid, action = str(body.get("episode", "")), str(body.get("action", ""))
                r = pipeline.act(eid, action, str(body.get("feedback", ""))[:2000], by="panel")
                if r["status"] in ("approved", "drafting"):
                    _bg(eid, pipeline.advance, eid)  # producción o regeneración en segundo plano
                return self._json(200, r)
            if u.path == "/api/advance":
                eid = str(body.get("episode", ""))
                _bg(eid, pipeline.advance, eid)
                return self._json(202, {"started": eid})
            if u.path == "/api/tick":
                _bg("autopilot", autopilot.tick)
                return self._json(202, {"started": "tick"})
            if u.path == "/api/ideas":
                _bg("ideas", autopilot.generate_ideas, int(body.get("n", 5)), str(body.get("feedback", ""))[:500])
                return self._json(202, {"started": "ideas"})
            if u.path == "/api/config":
                key, val = str(body.get("key")), body.get("value")
                if key not in SAFE_CONFIG:
                    return self._json(400, {"error": "clave no editable desde el panel"})
                val = SAFE_CONFIG[key](val)
                patch: dict = {}
                cur = patch
                ks = key.split(".")
                for k in ks[:-1]:
                    cur = cur.setdefault(k, {})
                cur[ks[-1]] = val
                save_local_config(patch)
                log("panel.config", key=key, value=val)
                return self._json(200, {"ok": True})
            self._json(404, {"error": "no encontrado"})
        except StudioError as e:
            self._json(400, {"error": str(e)})
        except (ValueError, TypeError) as e:
            self._json(400, {"error": f"entrada inválida: {e}"})
        except Exception as e:
            traceback.print_exc()
            self._json(500, {"error": str(e)[:400]})


def make_server(host: str, port: int) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), Handler)


def serve(host: str, port: int) -> None:
    srv = make_server(host, port)
    print(f"Panel: http://{host}:{port}  (Ctrl+C para salir)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
