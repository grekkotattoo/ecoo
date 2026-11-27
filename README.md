# ¿QUÉ PASARÍA SI...? — Estudio autónomo de animación 2D

Infraestructura que convierte una pregunta hipotética en un corto animado 2D vertical (1080×1920, 30 fps, H.264) para adultos, con **aprobación humana obligatoria** antes de producir.

> Estado: **instalado y probado, sin episodios** (ningún contenido de la serie creado). Ver `SYSTEM_STATE.md`.

## Instalación (local o servidor)
Requisitos: Python ≥3.11, Node ≥20, ffmpeg/ffprobe, Chromium/Chrome (o deja que Remotion descargue el suyo).
```bash
pip install -r requirements.txt            # numpy (+ pillow/pytest para tests)
cd engine && npm ci && cd ..               # motor 2D (Remotion)
python -m studio init                      # carpetas de datos
python -m studio doctor                    # auditoría del entorno
python -m studio selftest                  # prueba técnica del motor (formas grises) → data/cache/selftest/
python -m studio stylesample               # muestra del acabado visual (personajes genéricos) → data/cache/style_sample/
```
Si no tienes Chromium en la ruta de `render.browser_executable`, bórrala en `config/studio.local.json` y Remotion usará el suyo:
`python -m studio config set render.browser_executable ""`

## Activar el modo producción
**Opción A — con Claude Code / Codex (sin coste de API):** abre el repo y di *"ACTIVA PRODUCCIÓN"*. El asistente sigue `CLAUDE.md`: genera ideas, desarrolla la propuesta, renderiza las imágenes base y te la presenta. Tú decides.
**Opción B — 100 % desatendido (API de pago):**
```bash
pip install -r requirements-anthropic.txt
export ANTHROPIC_API_KEY=...               # o .env
python -m studio config set llm.provider anthropic
python -m studio config set costs.authorize_paid true
python -m studio autopilot run             # proceso continuo (déjalo vivo: tmux/systemd)
```
**Panel:** `python -m studio serve` → http://127.0.0.1:8787 (propuestas con imágenes, botones de aprobación, cola, costes, biblioteca, ajustes).

## Tu intervención
1. **Aprobar** cada propuesta (APROBAR · CAMBIAR IDEA · CAMBIAR IMÁGENES · CAMBIAR PERSONAJES · REVISAR GUION · REVISAR HUMOR · CANCELAR).
2. **Voces**: soltar los audios de ElevenLabs en la carpeta indicada (o activar la API, ver `docs/ELEVENLABS.md`).
Todo lo demás es automático.

## Documentación
| Fichero | Contenido |
|---|---|
| `PROJECT_CONTEXT.md` | Contexto compacto y reglas (leer primero) |
| `ARCHITECTURE.md` | Módulos, contratos, datos, tecnologías |
| `PRODUCTION_PIPELINE.md` | Fases, estados, acciones, comandos |
| `ASSET_LIBRARY.md` | Biblioteca, rigs, mecanismos de animación |
| `QUALITY_CHECKLIST.md` | QA automático |
| `COST_TRACKING.md` | Costes, presupuestos, consumo por episodio |
| `SYSTEM_STATE.md` | Estado de instalación y limitaciones |
| `CHANGELOG.md` | Historial |
| `CLAUDE.md` / `AGENTS.md` | Manual operativo del asistente |
| `docs/ELEVENLABS.md` | Conexión de voces |

## Tests
```bash
python -m pytest -m "not slow"   # ~15 s
python -m pytest -m slow         # end-to-end con render real, ~3 min
```

`legacy/tattoo-rocket/` conserva intacto el proyecto Remotion anterior.
