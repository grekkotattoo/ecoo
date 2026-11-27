"""Núcleo: rutas, configuración, almacenamiento atómico, locks y registro de operaciones.

Estado = ficheros JSON/JSONL (legibles, diffeables, versionables en git) con escritura
atómica (tmp + os.replace) y lock de fichero. No depende de la memoria de conversación.
"""
from __future__ import annotations

import contextlib
import copy
import datetime as _dt
import fcntl
import hashlib
import json
import os
import re
import tempfile
import time
from pathlib import Path
from typing import Any, Iterator

ROOT = Path(os.environ.get("STUDIO_ROOT", Path(__file__).resolve().parent.parent))


class StudioError(Exception):
    """Error controlado del estudio (se muestra al usuario sin traza)."""


class Paths:
    """Todas las rutas del estudio. STUDIO_DATA / STUDIO_LIBRARY permiten aislar tests."""

    def __init__(self) -> None:
        self.root = ROOT
        self.config = Path(os.environ.get("STUDIO_CONFIG", ROOT / "config"))
        self.library = Path(os.environ.get("STUDIO_LIBRARY", ROOT / "library"))
        self.data = Path(os.environ.get("STUDIO_DATA", ROOT / "data"))
        self.engine = ROOT / "engine"

    @property
    def state(self) -> Path: return self.data / "state"
    @property
    def episodes(self) -> Path: return self.data / "episodes"
    @property
    def inbox(self) -> Path: return self.data / "inbox"
    @property
    def tasks(self) -> Path: return self.data / "tasks"
    @property
    def cache(self) -> Path: return self.data / "cache"
    @property
    def backups(self) -> Path: return self.data / "backups"
    @property
    def logs(self) -> Path: return self.data / "logs"
    @property
    def deliveries(self) -> Path: return self.data / "deliveries"

    def episode(self, ep_id: str) -> Path:
        if not re.fullmatch(r"EP\d{3,4}", ep_id):
            raise StudioError(f"ID de episodio inválido: {ep_id!r}")
        return self.episodes / ep_id

    def ensure(self) -> "Paths":
        for p in (self.state, self.episodes, self.inbox / "audio", self.tasks / "pending", self.tasks / "done",
                  self.cache, self.backups, self.logs, self.deliveries,
                  self.library / "characters", self.library / "backgrounds", self.library / "props",
                  self.library / "audio" / "music", self.library / "audio" / "sfx", self.library / "fonts"):
            p.mkdir(parents=True, exist_ok=True)
        return self


def paths() -> Paths:
    return Paths()


# ---------------------------------------------------------------- utilidades

def now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def stable_json(obj: Any) -> str:
    """JSON canónico (claves ordenadas): base de hashes de caché estables."""
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def hash_obj(obj: Any) -> str:
    return sha256_bytes(stable_json(obj).encode())[:16]


def hash_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def slug(text: str, maxlen: int = 40) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "_", t).strip("_")
    return t[:maxlen] or "x"


# ---------------------------------------------------------------- IO atómica

def write_json(p: Path, data: Any) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=p.parent, prefix=f".{p.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, p)
    except BaseException:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp)
        raise


def read_json(p: Path, default: Any = None) -> Any:
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return copy.deepcopy(default)
    except json.JSONDecodeError as e:
        raise StudioError(f"JSON corrupto en {p}: {e}. Restaura con `studio backup restore`.") from e


def append_jsonl(p: Path, record: dict) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with file_lock(p.with_suffix(p.suffix + ".lock")):
        with open(p, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()
            os.fsync(f.fileno())


def read_jsonl(p: Path) -> list[dict]:
    if not p.exists():
        return []
    out = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                with contextlib.suppress(json.JSONDecodeError):
                    out.append(json.loads(line))
    return out


@contextlib.contextmanager
def file_lock(p: Path, timeout: float = 30.0, exclusive_fail: bool = False) -> Iterator[None]:
    """Lock de fichero (flock). exclusive_fail=True: falla al instante si otro proceso lo tiene."""
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "a+") as fh:
        start = time.monotonic()
        while True:
            try:
                fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if exclusive_fail:
                    raise StudioError(f"Otro proceso ya tiene el lock {p.name} (prevención de procesos duplicados).")
                if time.monotonic() - start > timeout:
                    raise StudioError(f"Timeout esperando lock {p}")
                time.sleep(0.05)
        try:
            fh.seek(0)
            fh.truncate()
            fh.write(f"{os.getpid()} {now_iso()}\n")
            fh.flush()
            yield
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)


# ---------------------------------------------------------------- config

def deep_merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def load_config() -> dict:
    """config/studio.json (versionado) + config/studio.local.json (local, no versionado)."""
    P = paths()
    base = read_json(P.config / "studio.json", {})
    local = read_json(P.config / "studio.local.json", {})
    return deep_merge(base, local)


def save_local_config(patch: dict) -> dict:
    P = paths()
    local = read_json(P.config / "studio.local.json", {})
    write_json(P.config / "studio.local.json", deep_merge(local, patch))
    return load_config()


def secret(name: str) -> str | None:
    """Secretos SOLO desde variables de entorno (o .env local no versionado). Nunca en código."""
    v = os.environ.get(name)
    if v:
        return v.strip()
    env_file = paths().root / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, _, val = line.partition("=")
                if k.strip() == name:
                    return val.strip().strip('"').strip("'") or None
    return None


# ---------------------------------------------------------------- registro

def log(event: str, **fields: Any) -> None:
    """Registro de operaciones append-only (data/logs/operations.jsonl)."""
    rec = {"ts": now_iso(), "event": event, "pid": os.getpid(), **fields}
    with contextlib.suppress(OSError):
        append_jsonl(paths().logs / "operations.jsonl", rec)
    if os.environ.get("STUDIO_VERBOSE"):
        print(f"[{rec['ts']}] {event} {fields if fields else ''}")
