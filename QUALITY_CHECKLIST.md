# QUALITY_CHECKLIST

Automático en la fase `qa` (`studio/qa.py`). Informe por episodio: `data/episodes/EPxxx/qa/qa_report.{json,md}` (también en la entrega).
❌ = crítico (bloquea la entrega) · ⚠️ = aviso.

| Comprobación | Nivel | Criterio |
|---|---|---|
| Existe / integridad | ❌ | ffprobe lee y ffmpeg decodifica todo sin errores |
| Resolución | ❌ | 1080×1920 |
| FPS | ❌ | 30 |
| Códec / pix_fmt | ❌ / ⚠️ | h264 / yuv420p |
| Duración vs spec | ❌ | ±2 frames |
| Duración objetivo | ⚠️ | 20–45 s (+cartelas) |
| Fotogramas negros | ❌ | ningún tramo negro ≥0,25 s |
| Congelados | ⚠️ | sin tramos estáticos >1,5 s |
| Pista de audio | ❌ | presente |
| Nivel de audio | ❌ / ⚠️ | audible / -14 LUFS ±2,5 |
| Sincronía A/V | ❌ | duraciones ±0,1 s |
| Sincronía diálogo↔subtítulos | ❌ | ±1 frame |
| Subtítulos | ❌ / ⚠️ | dentro del vídeo, sin solapes, legibles (≥0,25 s), ancho en márgenes |
| Recursos faltantes | ❌ | rigs, fondos, audios |
| Continuidad de planos | ❌ | timeline sin huecos ni solapes |
| Animación real | ❌ | ningún plano "solo cámara" |
| Continuidad de personajes | ❌ | hash del rig = versión aprobada |

## Revisión visual
- `renders/contact_sheet.png`: 12 fotogramas repartidos (revisión en 5 segundos).
- `proposal/images/*.png`: imágenes base previas a la aprobación.

## Checklist humano (opcional, 1 minuto)
- [ ] El remate se entiende sin sonido (subtítulos).
- [ ] Ningún subtítulo tapa una cara en el plano clave.
- [ ] La voz encaja con el personaje.
