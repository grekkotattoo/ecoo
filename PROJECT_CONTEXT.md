# PROJECT_CONTEXT — ¿QUÉ PASARÍA SI...?

> Resumen compacto y PERMANENTE. Léelo en lugar de releer el código. ≤1 pantalla.

**Qué es:** estudio autónomo de animación 2D que convierte una pregunta hipotética en un corto vertical terminado.
**Serie:** cortos 2D para ADULTOS, español de España, 20–45 s, 1080×1920, 30 fps, H.264.
**Tono:** absurdo, surrealista, retorcido, sátira, ironía, giro inesperado, remate inteligente. Nunca infantil.
**Estética:** URBANA y joven (biblia v4): color plano + una sombra dura, contorno negro grueso, caricatura extrema y básica, escenarios callejeros nocturnos con neón y pintadas, animación en dobles, cámara 2.5D. Solo 2D (prohibido 3D, foto, metraje real, fotorrealismo). Biblia visual: `config/style_bible.json`.

## Reglas inquebrantables
1. **Aprobación humana obligatoria** antes de animar/renderizar cada episodio. Silencio ≠ aprobación.
2. Una sola propuesta pendiente a la vez. Las ideas se encolan pero no se producen solas.
3. Nunca repetir ideas (registro `data/state/ideas.json`, deduplicación por similitud).
4. Ningún gasto sin `costs.authorize_paid=true` + presupuesto + estimación previa. Claves solo en entorno/.env.
5. Animación real por piezas (rigs). Prohibido "imagen fija + zoom" (QA lo bloquea).
6. Los recursos aprobados son inmutables (versionado; aprobado = solo lectura).
7. Errores críticos de QA bloquean la entrega.

## Mapa rápido
| Necesito… | Dónde |
|---|---|
| Estado actual | `python -m studio status` · `SYSTEM_STATE.md` |
| Arquitectura | `ARCHITECTURE.md` |
| Fases y acciones | `PRODUCTION_PIPELINE.md` |
| Operar como asistente | `CLAUDE.md` (= `AGENTS.md`) |
| Configuración | `config/studio.json` (+ `config/studio.local.json` local) |

## Decisiones técnicas (registro)
- D1 Motor 2D = **Remotion 4 (React/SVG)**: animación vectorial por capas, render determinista, H.264 nativo. Ya existía en el repo y no requiere GPU.
- D2 Orquestador = **Python stdlib + numpy**; estado en JSON/JSONL atómico (diffeable, versionable), sin base de datos.
- D3 Personajes = **rigs SVG paramétricos** (no imágenes IA planas) → extremidades, expresiones y bocas animables y continuidad perfecta.
- D4 Cerebro creativo enchufable: `claude_code` (por defecto, sin coste API) · `anthropic` (SDK oficial, Opus 5.5 por defecto) · `mock` (tests).
- D5 Voz: importación de ElevenLabs (por defecto) o API ElevenLabs (desactivada, con guardas).
- D6 Lip-sync: Rhubarb si está instalado; si no, aproximación por energía/ZCR (honesta).
- D7 Render incremental por planos con caché por hash; bundle del motor cacheado.
- D12 @react-three/fiber en modo híbrido `auto` (decisión del usuario): luces de neón y FX 3D solo donde se notan; dibujos siguen 2D.
- D11 Estilo v4 urbano + render rápido (en dobles, 75 % reescalado, lotes, caché de fotogramas) por decisión del usuario.
- D10 Estilo v3 (decisión del usuario): acabado semirrealista + actuación caricaturesca exagerada + cámara 2.5D con DOF.
- D9 Estilo v2 "cartoon adulto premium" (decisión del usuario): vectorial pro con techo de calidad asumido; para nivel ilustrador humano habría que importar arte por capas.
- D8 Fuentes libres: Bangers (OFL-1.1) y Luckiest Guy (Apache-2.0), locales.
