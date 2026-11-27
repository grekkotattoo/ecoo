# El retiro espiritual de tatuadores (Remotion)

Falso documental de humor negro · vertical 1080×1920 · 30 fps · H.264 · **sin audio**.
Todo el apartado visual está hecho **solo con código** (sin IA generativa): las texturas fotográficas (montañas, niebla, madera, piel, tinta, grano de película) se generan con Python y la animación, con Remotion.

- Guion definitivo y planificación por planos: [`GUION.md`](GUION.md)
- Configuración de tiempos: [`src/voz-tiempos.json`](src/voz-tiempos.json)
- Vídeo entregado: `entrega/retiro_tatuadores_silencioso.mp4`

## Instalar y renderizar

```bash
npm install
npm run texturas        # (solo si borras public/tex) regenera las texturas con Python + numpy + Pillow
npm run dev             # Remotion Studio para revisar
npm run render          # → out/retiro_tatuadores_silencioso.mp4 (H.264, silencioso)
```

Si Remotion no puede descargar su Chrome, indica uno instalado:
`REMOTION_BROWSER=/ruta/a/chrome-headless-shell npm run render`

## Sustituir las voces y volver a renderizar

1. Genera en ElevenLabs los 4 audios con el texto **exacto** de `src/guion.ts` y guárdalos así:
   ```
   public/voz/01_gancho.mp3
   public/voz/02_maestro.mp3
   public/voz/03_tecnica.mp3
   public/voz/04_final.mp3
   ```
   *(Opcional, máxima precisión)*: si usas el endpoint *with-timestamps*, guarda su respuesta JSON como `public/voz/01_gancho.json`, etc.
2. `npm run voces` → mide la duración real de cada MP3 (ffprobe), actualiza `src/voz-tiempos.json` (`provisional: false`) y escribe `out/CUES.txt` con el instante exacto en que empieza cada voz.
3. `npm run render` → nuevo vídeo silencioso ajustado a las voces.
4. (Opcional) `npm run preview-voz` renderiza una copia **con** la voz solo para comprobar la sincronía; o usa el comando ffmpeg que imprime `out/CUES.txt` para mezclarla.

Nada acelera ni recorta las voces: cada escena dura `entrada + duración real de la voz + cola`.

### Ajustes a mano en `src/voz-tiempos.json`
| Campo | Qué hace |
|---|---|
| `duracionVoz` | duración del MP3 (s). Se rellena sola con `npm run voces` |
| `entrada` | silencio de imagen antes de que empiece la voz en esa escena |
| `cola` | tiempo de imagen tras la voz (remates). Escena 4: incluye los tres golpes y la espera |
| `palabras` | inicio (s) de cada palabra; `null` = reparto automático por sílabas y puntuación |
| `pausaRemate` | pausa entre el final de la frase y el remate visual (tostadas, golpes) |
| `negroFinal` | duración del corte a negro final |

## Estructura

```
src/
  guion.ts               narración oficial (texto exacto)
  voz-tiempos.json       ← tiempos editables / generados
  tiempos.ts             motor: escenas, palabras → frames, palabra("tecnica","tostadora")
  Retiro.tsx             composición: 4 <Sequence>, etalonaje, viñeta, grano, subtítulos
  Root.tsx               composiciones "Retiro" (entrega muda) y "RetiroConVoz" (control)
  scenes/                Escena1Viaje · Escena2Maestro · Escena3Tecnica · Escena4Desgracia
  components/fx.tsx      cámara en mano, niebla, velas, grano, rótulos, subtítulos
  components/personajes.tsx  monje, cabaña, coche, humo
scripts/
  generar_texturas.py    texturas fotográficas procedurales
  sync-voces.mjs         medición de voces + hoja de cues
```
