# ARCHITECTURE

```
                 ┌──────────── Panel web (studio/server.py + web/index.html) ────────────┐
                 │  estado · propuesta · APROBAR/CAMBIAR · cola · biblioteca · costes     │
                 └───────────────▲───────────────────────────────▲───────────────────────┘
                                 │ JSON API (127.0.0.1)           │
   CLI (studio/cli.py) ──► Autopiloto (P) ──► Gestor de episodios + pipeline (N) ──► Recuperación (P)
                                 │                    │
        ┌────────────────────────┼────────────────────┼──────────────────────────────┐
  Cerebro creativo (A,B,C)   Dirección artística (D)  Storyboard (E)   Personajes (F)
  llm.py + prompts.py        style_bible + art_dir    schemas.storyboard  rigs.py
  (claude_code|anthropic|mock)  backgrounds.py (G)                       library.py
        │                         │                          │
        └──────── Director de animación / editor: timeline.py (H, K) ─────┘
                                  │ EpisodeSpec JSON (contrato)
   Audio (I) audio.py ─ ElevenLabs (J) elevenlabs.py        ▼
   import · versiones · pausas · visemas · mezcla     Motor 2D Remotion (engine/)  (H, L)
                                  │                   render.py: bundle cacheado, segmentos, mux
                                  └───────────► QA (M) qa.py ──► Entrega + historial
   Costes (O) costs.py: estimar → autorizar → presupuesto → dedupe → registrar (todas las operaciones de pago)
```

## Módulos (letra = requisito)
| | Módulo | Fichero | Responsabilidad |
|---|---|---|---|
| A | Director creativo | `pipeline.py` (fases pre) + `prompts.py` | Orquesta desarrollo → guion → humor, aplica feedback |
| B | Ideas | `ideas.py`, `autopilot.generate_ideas` | Generar, encolar, deduplicar, registrar uso |
| C | Guionista + evaluador de humor | `prompts.py`, `schemas.script/humor` | Guion con límite de palabras; auto-revisión si humor < umbral |
| D | Director artístico | `config/style_bible.json`, `ph_art_direction` | Biblia visual permanente + escenarios por episodio |
| E | Storyboard | `schemas.storyboard` | Planos validados contra vocabularios animables |
| F | Gestor de personajes | `rigs.py`, `library.py` | Rigs paramétricos, versionado, congelado al aprobar |
| G | Recursos visuales | `backgrounds.py`, `imagegen.py` | Escenarios multicapa (parallax), IA opcional de pago |
| H | Motor de animación 2D | `engine/src/**`, `timeline.py` | Rigs jerárquicos, 17 acciones, expresiones, visemas, cámara, efectos, transiciones |
| I | Audio | `audio.py` | WAV/MP3, versiones por línea, pausas, mezcla con ducking, -14 LUFS |
| J | Sincronizador de voz | `audio.visemes`, `timeline.build_spec` | Visemas A–H/X + subtítulos alineados al audio |
| K | Editor | `timeline.py`, `ph_edit` | Timeline, transiciones, SRT, EDL |
| L | Render | `render.py` | Bundle cacheado, render por planos con caché, concat, mux, formatos extra |
| M | QA | `qa.py` | 15+ comprobaciones; críticos bloquean entrega |
| N | Episodios | `pipeline.py` | Estado, fases idempotentes, aprobación, invalidación selectiva |
| O | Costes | `costs.py` | Presupuestos, ledger, autorización, tokens |
| P | Autonomía y recuperación | `autopilot.py`, `pipeline.reconcile`, `backup.py`, `core.file_lock` | Ciclo autónomo, latido, locks, backups |

## Contratos
- **EpisodeSpec** (`engine/src/types.ts`): `meta, style, rigs, backgrounds, shots[], subtitles[]`. El motor no contiene contenido creativo: todo llega por datos.
- **Rig**: piezas SVG con `pivot`, `parent`, `z`, `variants` (ojos/cejas/boca). Esqueleto humanoide estándar compatible con `engine/src/rig/actions.ts`.
- **Artefactos** por fase: `data/episodes/EPxxx/artifacts/<fase>.json` (+ hash en `state.json`).

## Datos
```
config/      studio.json (versionado) · studio.local.json (local) · style_bible.json
library/     characters|backgrounds|props/<id>/vNNN/… + index.json · audio/manifest.json · fonts/
data/state   ideas.json · approvals.jsonl · cost_ledger.jsonl · history.jsonl · autopilot.json · benchmarks.jsonl
data/episodes/EPxxx  state.json · artifacts/ · proposal/ · audio/lines/<id>/vNNN.wav · renders/ · qa/
data/tasks   pending/ (tareas para el asistente) · done/
data/inbox/audio/EPxxx   audios de ElevenLabs a importar
data/deliveries/EPxxx    entregables finales
data/cache   llm/ · visemes/ · segments/ · bundles/ · props/ · images/
```

## Tecnologías (auditoría del entorno, ver `python -m studio doctor`)
Python 3.11+ (stdlib + numpy) · Node 20+ · Remotion 4.0.547 · React 18 · ffmpeg/ffprobe 6 · Chromium headless (Playwright) · pytest.
Descartado: 3D/Blender (prohibido), bases de datos (innecesario), frameworks web (stdlib basta), MoviePy (ffmpeg directo es más rápido).
