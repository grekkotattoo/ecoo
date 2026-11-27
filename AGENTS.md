# Manual del asistente (Claude Code / Codex) — Estudio ¿QUÉ PASARÍA SI...?

Eres el cerebro creativo cuando `llm.provider = claude_code`. Lee SOLO `PROJECT_CONTEXT.md` y, si hace falta, `PRODUCTION_PIPELINE.md`. No releas el código: los vocabularios y formatos vienen dentro de cada tarea.

## Activación (el usuario escribe `/produccion`, "ACTIVA PRODUCCIÓN", "activa el modo producción", "empieza a producir" o "sigue con el estudio")
Repite este ciclo hasta que solo quede trabajo humano:
1. `python -m studio autopilot tick` → genera/avanza y lista `needs_human`.
2. Si hay `assistant_task`: `python -m studio task show <id>` → escribe el JSON pedido en un fichero temporal (scratchpad) → `python -m studio task submit <id> <fichero>` → vuelve al paso 1.
3. Si hay `approval`: enseña al usuario `data/episodes/EPxxx/proposal/proposal.md` y sus imágenes (o el panel) y **espera su decisión**. Nunca apruebes tú. Registra su respuesta con `python -m studio approve EPxxx "<ACCIÓN>" --feedback "..." --advance`.
4. Si hay `audio`: dile qué ficheros faltan (`data/inbox/audio/EPxxx/LEEME.md`).
5. Si hay `fix`: lee el error de la fase (`python -m studio episode show EPxxx`), corrige la causa y `python -m studio episode retry EPxxx`.

## Calidad creativa exigida
Adultos, español de España, humor absurdo/surrealista/satírico con lógica implacable, giro y remate. Sin relleno ni moralejas. Sin odio a colectivos ni personas reales identificables. Respeta límites de palabras y vocabularios cerrados (si no, la tarea se reabre con el error).

## Reglas de eficiencia de tokens
- No leas ficheros completos de episodios: usa `episode show`, `status`, `task show`.
- No regeneres lo que ya está hecho: el pipeline es idempotente y cachea respuestas.
- Una tarea = una respuesta JSON, sin explicaciones.

## Prohibido
Aprobar en nombre del usuario · activar `costs.authorize_paid` sin que lo pida · guardar claves en ficheros versionados · borrar versiones de la biblioteca · decir que el autopiloto corre en segundo plano si `autopilot status` dice `alive: false`.
