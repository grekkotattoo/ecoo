# ElevenLabs — conexión

## Vía 1 · Importación (por defecto, recomendada para empezar)
1. Aprueba un episodio. El estudio crea `data/inbox/audio/EPxxx/LEEME.md` con cada línea: `l01.mp3 — personaje: «texto»`.
2. Genera las voces en ElevenLabs (web) y guárdalas con esos nombres (`.mp3` o `.wav`).
   - Alternativa: una sola pista `narration.mp3` con pausas de ≥0,25 s entre líneas → se divide sola.
3. `python -m studio episode advance EPxxx` (o botón *Continuar* en el panel).
Sustituir una voz más tarde: `python -m studio audio import EPxxx --line l03 --file nueva.mp3` (crea v002; la v001 se conserva) y `episode retry`.

## Vía 2 · API (automática, de pago)
1. Crea una API key en ElevenLabs → guárdala SOLO como variable de entorno o en `.env` (gitignored):
   `ELEVENLABS_API_KEY=...`
2. Lista tus voces: `python -m studio elevenlabs voices`
3. Asigna voz a cada personaje (en `config/studio.local.json`, no versionado):
```json
{"voice": {"provider": "elevenlabs", "elevenlabs": {"enabled": true, "voices": {"narrador": "VOICE_ID", "pepe": "VOICE_ID"}}}}
```
4. Autoriza pagos y fija presupuesto: `python -m studio config set costs.authorize_paid true`
5. Ajusta `costs.prices.elevenlabs_usd_per_1k_chars` a tu plan (es una estimación para el presupuesto).

Antes de cada síntesis el estudio: estima coste → comprueba presupuesto → consulta tu cuota REAL de caracteres → reutiliza audio idéntico ya generado (nunca paga dos veces) → registra el gasto.

## Requisitos de red
El host `api.elevenlabs.io` debe ser accesible. En el entorno cloud de instalación está **bloqueado por la política de red** (verificado): la vía API solo funcionará en tu máquina o en un entorno con ese host permitido. La vía de importación funciona siempre.

## Lip-sync
Por defecto: aproximación por energía + cruces por cero (sincroniza aperturas de boca, no fonemas exactos). Para lip-sync fonético instala **Rhubarb Lip Sync** (`rhubarb` en el PATH): el estudio lo detecta y lo usa automáticamente.
