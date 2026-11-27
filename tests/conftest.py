"""Entorno aislado por test: datos, biblioteca y config en tmp (nunca toca el estudio real)."""
import json
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture()
def studio_env(tmp_path, monkeypatch):
    cfg = tmp_path / "config"
    shutil.copytree(ROOT / "config", cfg, ignore=shutil.ignore_patterns("studio.local.json"))
    (cfg / "studio.local.json").write_text(json.dumps({"llm": {"provider": "mock"}, "voice": {"provider": "test_tone"}}))
    monkeypatch.setenv("STUDIO_CONFIG", str(cfg))
    monkeypatch.setenv("STUDIO_DATA", str(tmp_path / "data"))
    monkeypatch.setenv("STUDIO_LIBRARY", str(tmp_path / "library"))
    for k in ("ANTHROPIC_API_KEY", "ELEVENLABS_API_KEY", "OPENAI_API_KEY", "STUDIO_PANEL_TOKEN"):
        monkeypatch.delenv(k, raising=False)
    from studio.core import paths
    P = paths().ensure()
    for f in (ROOT / "library" / "fonts").glob("*.woff"):
        shutil.copy2(f, P.library / "fonts" / f.name)
    return P


@pytest.fixture()
def fake_still(monkeypatch):
    """Sustituye el render de stills por un PNG mínimo (tests rápidos sin navegador)."""
    import base64
    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
    from studio import render

    def still(props, comp, out, frame=0):
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(png)
        return out
    monkeypatch.setattr(render, "still", still)
