---
description: Activa el modo producción del estudio ¿QUÉ PASARÍA SI...? (ideas → propuesta con imágenes → tu aprobación → vídeo)
---
Activa el modo producción del estudio siguiendo `CLAUDE.md` (sección "Activación"). Pasos:

1. Prepara el entorno si hace falta (solo la primera vez en esta máquina/sesión):
   `pip install -r requirements.txt` · `cd engine && npm ci && cd ..` · `python -m studio init` · `python -m studio doctor`
2. Ejecuta `python -m studio autopilot tick` y lee `needs_human`.
3. Por cada `assistant_task`: `python -m studio task show <id>`, escribe el JSON pedido (contenido creativo de la serie, según `PROJECT_CONTEXT.md`) en un fichero temporal y `python -m studio task submit <id> <fichero>`. Repite el paso 2.
4. Cuando haya una propuesta (`approval`): muéstrame título, pregunta, resumen, guion y las imágenes de `data/episodes/EPxxx/proposal/images/` y ESPERA mi decisión (APROBAR · CAMBIAR IDEA · CAMBIAR IMÁGENES · CAMBIAR PERSONAJES · REVISAR GUION · REVISAR HUMOR · CANCELAR). Nunca apruebes por mí.
5. Registra mi decisión con `python -m studio approve EPxxx "<ACCIÓN>" --feedback "..." --advance` y continúa (audios en `data/inbox/audio/EPxxx/`).

$ARGUMENTS
