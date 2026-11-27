# PRODUCTION_PIPELINE

## Fases (17 pasos del encargo → fases del sistema)
| # | Paso | Fase | Salida |
|---|---|---|---|
| 1 | Selección de idea | `new_episode` (cola, sin repetir) | `artifacts/idea.json` |
| 2 | Desarrollo creativo | `development` | logline, sinopsis, beats, giro |
| 3 | Guion | `script` | líneas con id, hablante, emoción (≤ palabras objetivo) |
| 4 | Evaluación del humor | `humor_review` | 6 ejes 0–10; < umbral → auto-revisión (máx. 2) |
| 5 | Dirección artística | `art_direction` | escenarios multicapa → biblioteca (versión) |
| — | Personajes | `characters` | rigs → biblioteca (reutiliza recurrentes) |
| 6 | Storyboard | `storyboard` | planos validados (sin planos solo-cámara) |
| 7 | Imágenes base | `base_images` | PNG reales renderizados: 3–5 fotogramas clave + hojas de personaje + escenarios |
| 8 | Presentación | `proposal` | `proposal/proposal.json` + `.md` (+ panel) |
| 9 | **Espera de aprobación** | estado `awaiting_approval` | — |
| 10 | Producción audiovisual | `voice` | audios por línea (import/ElevenLabs), versionados |
| 11 | Animación | `audio_sync` + `animation` | visemas, duraciones reales → EpisodeSpec |
| 12 | Montaje | `edit` | validación de timeline, SRT, EDL |
| 13 | Sonido | `sound` | mezcla: voz + música con ducking + SFX, -14 LUFS |
| 14 | Renderizado | `render` + `master` | MP4 H.264 1080×1920 30 fps + hoja de contactos |
| 15 | Control de calidad | `qa` | informe; críticos bloquean |
| 16 | Entrega | `delivery` | `data/deliveries/EPxxx/` + historial |
| 17 | Siguiente episodio | autopiloto | nueva propuesta automática (máx. 1 pendiente) |

## Estados del episodio
`drafting → waiting_assistant → awaiting_approval → approved → producing → waiting_audio → delivered`
Laterales: `waiting_budget`, `error`, `blocked_qa`, `cancelled`.

## Acciones de aprobación (persistidas en `data/state/approvals.jsonl`)
| Acción | Rehace | Conserva |
|---|---|---|
| APROBAR | — (congela rigs/escenarios, guarda hash de la propuesta) | todo |
| CAMBIAR IDEA | toda la preproducción con otra idea (la anterior → `rejected`) | registro |
| REVISAR GUION | guion, humor, storyboard, imágenes, propuesta | desarrollo, personajes, escenarios |
| REVISAR HUMOR | ídem en modo "subir el humor" | ídem |
| CAMBIAR PERSONAJES | personajes (mismos ids), imágenes, propuesta | guion, storyboard, escenarios |
| CAMBIAR IMÁGENES | dirección artística (mismos ids), imágenes, propuesta | guion, personajes |
| CANCELAR | — | registro |

El texto de feedback se inyecta obligatoriamente en la fase regenerada. La producción verifica **aprobación explícita + hash de la propuesta**: si algo cambia después, se bloquea.

## Comandos
```bash
python -m studio ideas generate -n 5           # llena la cola
python -m studio episode new                   # crea y avanza hasta la propuesta
python -m studio approve EP001 APROBAR --advance
python -m studio approve EP001 "REVISAR HUMOR" --feedback "remate más negro"
python -m studio episode advance EP001         # reanudar (idempotente)
python -m studio autopilot run                 # modo autónomo continuo
python -m studio autopilot tick                # un ciclo (ideal desde una sesión de Claude Code)
python -m studio audio import EP001 --line l03 --file voz.mp3   # sustituir una voz (nueva versión)
python -m studio export EP001 --format landscape_16x9
```

## Audio (ElevenLabs)
Al aprobar, la fase `voice` deja `data/inbox/audio/EPxxx/LEEME.md` con la lista exacta `l01.mp3 … lNN.mp3` y su texto. Suelta los ficheros (o una sola `narration.mp3`, que se divide por pausas) y ejecuta `episode advance`. Ver `docs/ELEVENLABS.md`.
