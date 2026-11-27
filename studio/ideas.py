"""Registro de ideas: cola (sin producir), deduplicación y memoria de lo usado.

Nunca se repite una idea: se compara contra TODO lo registrado (cola, usadas, rechazadas)
por similitud de pregunta/título (Jaccard de palabras + trigramas).
"""
from __future__ import annotations

import re
import unicodedata

from .core import StudioError, file_lock, log, now_iso, paths, read_json, write_json

STOP = set("que pasaria si el la los las un una unos unas de del al y o en a con por para su sus se lo le les es fuera".split())


def _path():
    return paths().state / "ideas.json"


def _norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]+", " ", t)


def _words(t: str) -> set[str]:
    return {w for w in _norm(t).split() if w not in STOP and len(w) > 2}


def _tri(t: str) -> set[str]:
    s = re.sub(r"\s+", " ", _norm(t)).strip()
    return {s[i:i + 3] for i in range(max(0, len(s) - 2))}


def similarity(a: str, b: str) -> float:
    wa, wb = _words(a), _words(b)
    ta, tb = _tri(a), _tri(b)
    j1 = len(wa & wb) / max(1, len(wa | wb))
    j2 = len(ta & tb) / max(1, len(ta | tb))
    return max(j1, j2)


def load() -> dict:
    return read_json(_path(), {"next_id": 1, "items": []})


def all_questions() -> list[str]:
    return [i["question"] for i in load()["items"]]


def is_duplicate(idea: dict, threshold: float = 0.55) -> str | None:
    for it in load()["items"]:
        if similarity(idea["question"], it["question"]) >= threshold or _norm(idea["title"]).strip() == _norm(it["title"]).strip():
            return it["id"]
    return None


def add(ideas: list[dict], source: str) -> dict:
    added, dupes = [], []
    with file_lock(_path().with_suffix(".lock")):
        db = load()
        for idea in ideas:
            dup = None
            for it in db["items"] + added:
                if similarity(idea["question"], it["question"]) >= 0.55 or _norm(idea["title"]).strip() == _norm(it["title"]).strip():
                    dup = it["id"]
                    break
            if dup:
                dupes.append({"title": idea["title"], "duplicate_of": dup})
                continue
            rec = {**idea, "id": f"I{db['next_id']:04d}", "status": "queued", "source": source, "created": now_iso(), "episode": None}
            db["next_id"] += 1
            added.append(rec)
        db["items"].extend(added)
        write_json(_path(), db)
    log("ideas.add", added=len(added), duplicates=len(dupes))
    return {"added": added, "duplicates": dupes}


def set_status(idea_id: str, status: str, episode: str | None = None) -> None:
    if status not in ("queued", "in_episode", "approved", "produced", "rejected", "cancelled"):
        raise StudioError(f"Estado de idea inválido: {status}")
    with file_lock(_path().with_suffix(".lock")):
        db = load()
        for it in db["items"]:
            if it["id"] == idea_id:
                it["status"] = status
                it["updated"] = now_iso()
                if episode:
                    it["episode"] = episode
        write_json(_path(), db)


def queue() -> list[dict]:
    return [i for i in load()["items"] if i["status"] == "queued"]


def get(idea_id: str) -> dict:
    for it in load()["items"]:
        if it["id"] == idea_id:
            return it
    raise StudioError(f"Idea inexistente: {idea_id}")
