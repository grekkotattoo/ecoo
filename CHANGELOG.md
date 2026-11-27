# CHANGELOG

## 1.0.0 — 2026-11-27 · Instalación del estudio
- Proyecto previo `TattooRocketViral` movido intacto a `legacy/tattoo-rocket/`.
- Motor 2D Remotion genérico (`engine/`): rigs jerárquicos, 17 acciones, expresiones, visemas, cámara con parallax, 10 efectos, 6 transiciones, cartelas, subtítulos, grano/viñeta/line-boil, hoja de personaje.
- Orquestador Python (`studio/`): pipeline de 17 fases, aprobación humana con 7 acciones e invalidación selectiva, autopiloto con latido y lock, recuperación, backups, costes con guardas, QA con bloqueo, panel web, CLI.
- Integraciones: Claude Code (tareas), Anthropic API (SDK oficial, opcional), ElevenLabs (import + API con guardas), OpenAI imágenes (opcional, desactivado).
- Biblia visual v1 (`config/style_bible.json`), fuentes Bangers y Luckiest Guy.
- Pruebas: 31 (unitarias, integración, recuperación, panel, end-to-end con render real).
- No se ha creado ningún episodio, guion, personaje ni escenario de la serie.
