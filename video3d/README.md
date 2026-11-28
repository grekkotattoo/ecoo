# ¿Qué pasaría si te tatuaras en gravedad cero? — corto 3D

Remotion 4 + Three.js (@react-three/fiber + drei). 1080×1920 · 60 fps · 36 s (2160 frames).
Proyecto independiente del pipeline 2D de `engine/` (no lo toca).

| Comando | Qué hace |
|---|---|
| `npm install` | dependencias (versiones fijadas) |
| `npm run studio` | servidor de previsualización (http://localhost:3000) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run render` | MP4 final → `out/gravedad-cero.mp4` |
| `node scripts/stills.mjs 150 420 900` | fotogramas sueltos de control → `out/stills/` |

## Estructura
- `src/config/timeline.ts` — **fuente única de verdad**: FPS, resolución, rangos de escena, beats, voz en off, subtítulos, `sfxMarkers`, paleta.
- `src/config/physics.ts` — simulación determinista de la escena 3; los choques generan los SFX `bonk` automáticamente.
- `src/scenes/Scene01..05.tsx` — escenas 3D. `src/three/` — modelos (ISS, máquina, astronauta, cámara, texturas de texto).
- `src/components/Subtitles.tsx`, `HUD.tsx` — capa 2D superpuesta. `src/audio/AudioLayer.tsx` — audio.

## Audio
Suelta los ficheros y se conectan solos (si faltan, no rompe el render):
`public/voz.mp3`, `public/sfx/{buzz,liquid_pop,bonk,geiger,fanfare}.mp3`.

## Notas
- Render por software (`swangle`): ~5–12 s/fotograma en servidor sin GPU. Con GPU: `REMOTION_GL=angle npm run render`.
- Etiqueta del bote "DYNAMIC": es marca registrada de tintas → cámbiala en `src/three/Props.tsx` (`INK_LABEL`) si vas a monetizar.
- Fuentes locales OFL en `public/fonts/` (sin CDN en render).
