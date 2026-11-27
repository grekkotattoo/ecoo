# COST_TRACKING

Fuente de verdad: `data/state/cost_ledger.jsonl` (append-only) · resumen: `python -m studio costs` o pestaña *Costes*.
El estudio **no conoce tu saldo real** de ninguna plataforma: registra solo lo que gasta él. La única cuota real que consulta es la de ElevenLabs (`/v1/user/subscription`) antes de sintetizar.

## Flujo obligatorio de toda operación de pago (`costs.guard`)
1. Estimar (× margen de seguridad 1,25). 2. ¿`authorize_paid`? si no → bloquea sin cobrar.
3. Presupuesto mensual, por episodio y por categoría. 4. Deduplicación por clave idempotente (nunca se paga dos veces lo mismo). 5. Registrar gasto real.

## Categorías
| Categoría | Qué | Medición |
|---|---|---|
| `assistant_tokens` | Claude Code / Codex resolviendo tareas | **estimado** (caracteres/4), coste marginal $0 (suscripción) |
| `llm_external` | API Anthropic | **real** (usage de la API) |
| `images` | fondos IA opcionales | por imagen |
| `voice` | ElevenLabs API | por caracteres |
| `render` | local | $0 (tiempo de CPU) |
| `storage` | disco local | $0 |

## Presupuestos por defecto (`config/studio.json → costs.budgets`)
por episodio $2 · mensual $30 · LLM $15 · imágenes $10 · voz $10. Pagos **bloqueados** por defecto.

## Consumo estimado por episodio (medido/estimado en la instalación)
| Concepto | Modo por defecto | Alternativa de pago |
|---|---|---|
| Creatividad (7 tareas, ~4,2k tokens de entrada medidos + ~6–10k salida) | Claude Code: $0 extra | Opus 5.5: ~$0,25–0,45 · Sonnet 5.5: ~$0,12–0,25 · Haiku 5.5: <$0,02 (estimado, incluye 1 auto-revisión) |
| Voz (~100 palabras ≈ 650 caracteres) | importación: $0 para el estudio (consumes créditos de tu plan ElevenLabs) | API: ≈ $0,20 con el precio configurado (ajústalo a tu plan) |
| Imágenes | SVG: $0 | OpenAI opcional: ~$0,07 × 2–3 escenarios |
| Render 40 s | local: $0 · ≈ 6 min CPU (4 vCPU, medido 8,5× tiempo real) | — |
| Almacenamiento | ≈ 20 MB entrega + ≈ 20 MB caché | — |
**Total típico modo por defecto: $0 de API** + créditos de tu plan de ElevenLabs.

## Cambiar precios
Los precios viven en `costs.prices` (USD/MTok para LLM). Revísalos si cambian las tarifas; el estudio no los actualiza solo.
