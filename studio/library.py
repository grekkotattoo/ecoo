"""Biblioteca de recursos con versionado y continuidad visual.

library/<tipo>/<id>/v001/<fichero>.json + index.json
- Toda modificación crea una versión nueva; nunca se sobrescribe una versión existente.
- Las versiones aprobadas se marcan solo-lectura (chmod 444) y quedan "congeladas" para continuidad.
- Los episodios referencian (id, versión, hash): QA comprueba que el render usa exactamente eso.
"""
from __future__ import annotations

import os
import shutil
import stat
from pathlib import Path

from .core import StudioError, hash_obj, log, now_iso, paths, read_json, slug, write_json

KINDS = {"characters": "rig.json", "backgrounds": "bg.json", "props": "prop.json"}


def _dir(kind: str, aid: str) -> Path:
    if kind not in KINDS:
        raise StudioError(f"Tipo de recurso desconocido: {kind}")
    return paths().library / kind / aid


def index(kind: str, aid: str) -> dict:
    return read_json(_dir(kind, aid) / "index.json", {"id": aid, "versions": [], "approved": None})


def save(kind: str, aid: str, data: dict, meta: dict | None = None) -> dict:
    """Guarda como nueva versión si el contenido cambió. Devuelve {id, version, hash}."""
    idx = index(kind, aid)
    h = hash_obj(data)
    for v in idx["versions"]:
        if v["hash"] == h:
            return {"id": aid, "version": v["version"], "hash": h}
    ver = (idx["versions"][-1]["version"] + 1) if idx["versions"] else 1
    vdir = _dir(kind, aid) / f"v{ver:03d}"
    if vdir.exists():
        raise StudioError(f"La versión {vdir} ya existe: no se sobrescribe.")
    if "version" in data:
        data = {**data, "version": ver}
        h = hash_obj(data)
    write_json(vdir / KINDS[kind], data)
    idx["versions"].append({"version": ver, "hash": h, "created": now_iso(), **(meta or {})})
    write_json(_dir(kind, aid) / "index.json", idx)
    log("library.save", kind=kind, id=aid, version=ver)
    return {"id": aid, "version": ver, "hash": h}


def load(kind: str, aid: str, version: int | None = None) -> dict:
    idx = index(kind, aid)
    if not idx["versions"]:
        raise StudioError(f"Recurso inexistente: {kind}/{aid}")
    ver = version or idx.get("approved") or idx["versions"][-1]["version"]
    p = _dir(kind, aid) / f"v{ver:03d}" / KINDS[kind]
    data = read_json(p)
    if data is None:
        raise StudioError(f"Falta el fichero {p} (recurso dañado)")
    return data


def version_dir(kind: str, aid: str, version: int) -> Path:
    return _dir(kind, aid) / f"v{version:03d}"


def approve(kind: str, aid: str, version: int) -> None:
    idx = index(kind, aid)
    if not any(v["version"] == version for v in idx["versions"]):
        raise StudioError(f"{kind}/{aid} v{version} no existe")
    idx["approved"] = version
    for v in idx["versions"]:
        if v["version"] == version:
            v["approved_at"] = now_iso()
    write_json(_dir(kind, aid) / "index.json", idx)
    for f in version_dir(kind, aid, version).glob("*"):
        if f.is_file():
            os.chmod(f, stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
    log("library.approve", kind=kind, id=aid, version=version)


def is_approved(kind: str, aid: str, version: int) -> bool:
    return index(kind, aid).get("approved") == version


def list_all(kind: str) -> list[dict]:
    base = paths().library / kind
    out = []
    if base.exists():
        for d in sorted(base.iterdir()):
            if (d / "index.json").exists():
                idx = read_json(d / "index.json")
                last = idx["versions"][-1] if idx["versions"] else {}
                out.append({"id": idx["id"], "versions": len(idx["versions"]), "latest": last.get("version"),
                            "approved": idx.get("approved"), "name": last.get("name", idx["id"]),
                            "preview": last.get("preview")})
    return out


def attach_file(kind: str, aid: str, version: int, src: Path, name: str) -> Path:
    """Adjunta un fichero (p.ej. preview.png) a una versión no aprobada."""
    if is_approved(kind, aid, version):
        raise StudioError(f"{kind}/{aid} v{version} está aprobado y congelado")
    dst = version_dir(kind, aid, version) / name
    shutil.copy2(src, dst)
    idx = index(kind, aid)
    for v in idx["versions"]:
        if v["version"] == version and name.startswith("preview"):
            v["preview"] = str(dst.relative_to(paths().library))
    write_json(_dir(kind, aid) / "index.json", idx)
    return dst


# ------------------------------------------------------------- audio (música / sfx)

def audio_manifest() -> list[dict]:
    return read_json(paths().library / "audio" / "manifest.json", [])


def import_audio_asset(src: Path, kind: str, tags: list[str], license_: str) -> dict:
    """Importa música o SFX con licencia declarada. No genera audio."""
    from . import audio
    if kind not in ("music", "sfx"):
        raise StudioError("kind debe ser music o sfx")
    if not license_:
        raise StudioError("Declara la licencia del audio (--license). Sin licencia no entra en la biblioteca.")
    info = audio.probe(src)
    aid = slug(src.stem)
    dst = paths().library / "audio" / kind / f"{aid}.wav"
    audio.to_wav(src, dst)
    man = [m for m in audio_manifest() if m["id"] != aid]
    rec = {"id": aid, "kind": kind, "file": str(dst.relative_to(paths().library)), "tags": tags, "license": license_,
           "duration": info["duration"], "imported": now_iso()}
    man.append(rec)
    write_json(paths().library / "audio" / "manifest.json", man)
    return rec


def find_audio(kind: str, tags: list[str]) -> dict | None:
    best, score = None, -1
    for m in audio_manifest():
        if m["kind"] != kind:
            continue
        s = len(set(tags) & set(m.get("tags", [])))
        if s > score:
            best, score = m, s
    return best
