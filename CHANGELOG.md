# CHANGELOG

## 1.1.0 — 2026-11-27 · Acabado visual "Cartoon adulto premium"
- Biblia visual v2: paleta saturada, sombras de color (violeta frío), luz de borde cálida, gradación cinematográfica, grano/viñeta más suaves.
- Personajes v2: línea de grosor variable (engrosada en el lado de sombra), pinceladas afiladas en detalles, sombreado en 3 tonos + brillos,
  ojos con iris degradado, pupila y doble brillo, párpados y pestañas, rubor, boca con interior/dientes/lengua, manos de 4 dedos,
  zapatos con suela, pliegues de ropa, pelo con mechones, reflejos y masa trasera que no tapa la cara, color de ojos configurable.
- Escenarios v2: cielo/pared con degradados y papel pintado, suelo en perspectiva, neblina atmosférica entre capas, resplandores y haces
  de luz, oclusión ambiental, sombras de contacto, primer plano cinematográfico en el borde inferior, sol emisivo sin sombra.
- Motor: sombra de contacto bajo los personajes (se encoge al saltar), cartela con rayos animados y título con relieve.
- Nuevo comando `studio stylesample`: muestra del acabado con personajes genéricos (no de la serie).
- Rendimiento de render sin cambios (8,1× tiempo real). 31/31 pruebas.

## 1.0.0 — 2026-11-27 · Instalación del estudio
- Proyecto previo `TattooRocketViral` movido intacto a `legacy/tattoo-rocket/`.
- Motor 2D Remotion genérico (`engine/`): rigs jerárquicos, 17 acciones, expresiones, visemas, cámara con parallax, 10 efectos, 6 transiciones, cartelas, subtítulos, grano/viñeta/line-boil, hoja de personaje.
- Orquestador Python (`studio/`): pipeline de 17 fases, aprobación humana con 7 acciones e invalidación selectiva, autopiloto con latido y lock, recuperación, backups, costes con guardas, QA con bloqueo, panel web, CLI.
- Integraciones: Claude Code (tareas), Anthropic API (SDK oficial, opcional), ElevenLabs (import + API con guardas), OpenAI imágenes (opcional, desactivado).
- Biblia visual v1 (`config/style_bible.json`), fuentes Bangers y Luckiest Guy.
- Pruebas: 31 (unitarias, integración, recuperación, panel, end-to-end con render real).
- No se ha creado ningún episodio, guion, personaje ni escenario de la serie.
