"""Copias de seguridad del estado (no de renders pesados), con rotación y restauración segura."""
from __future__ import annotations

import datetime as _dt
import tarfile
from pathlib import Path

from .core import StudioError, load_config, log, paths

INCLUDE_DATA = ["state", "episodes"]
EXCLUDE_SUFFIX = (".mp4", ".wav", ".lock", ".tmp")


def _filter(ti: tarfile.TarInfo):
    if ti.name.endswith(EXCLUDE_SUFFIX) or "/renders/" in ti.name or "/_split/" in ti.name or "/_tone/" in ti.name:
        return None
    return ti


def create(label: str = "manual") -> Path:
    P = paths()
    P.backups.mkdir(parents=True, exist_ok=True)
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    out = P.backups / f"backup-{ts}-{label[:40]}.tar.gz"
    with tarfile.open(out, "w:gz") as tar:
        for d in INCLUDE_DATA:
            if (P.data / d).exists():
                tar.add(P.data / d, arcname=f"data/{d}", filter=_filter)
        for kind in ("characters", "backgrounds", "props"):
            if (P.library / kind).exists():
                tar.add(P.library / kind, arcname=f"library/{kind}", filter=_filter)
        if (P.library / "audio" / "manifest.json").exists():
            tar.add(P.library / "audio" / "manifest.json", arcname="library/audio/manifest.json")
        tar.add(P.config, arcname="config", filter=lambda t: None if t.name.endswith(".env") else t)
    keep = int(load_config().get("backup", {}).get("keep", 10))
    olds = sorted(P.backups.glob("backup-*.tar.gz"))
    for o in olds[:-keep]:
        o.unlink(missing_ok=True)
    log("backup.create", file=out.name)
    return out


def list_backups() -> list[str]:
    return [p.name for p in sorted(paths().backups.glob("backup-*.tar.gz"))]


def restore(name: str) -> Path:
    """Restaura un backup. Antes crea otro de seguridad del estado actual (nada se pierde)."""
    P = paths()
    src = P.backups / name
    if not src.exists() or "/" in name:
        raise StudioError(f"Backup inexistente: {name}")
    safety = create("pre-restore")
    with tarfile.open(src, "r:gz") as tar:
        for m in tar.getmembers():
            if m.name.startswith("/") or ".." in m.name:
                raise StudioError("Backup con rutas inseguras")
        for m in tar.getmembers():
            top, _, rest = m.name.partition("/")
            base = {"data": P.data, "library": P.library, "config": P.config}.get(top)
            if base is None:
                continue
            target = base / rest if rest else base
            if m.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif m.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.exists():
                    target.chmod(0o644)
                with tar.extractfile(m) as fsrc, open(target, "wb") as fdst:
                    fdst.write(fsrc.read())
    log("backup.restore", file=name, safety=safety.name)
    return safety
