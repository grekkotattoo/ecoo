# ¿Qué pasaría si te tatuaras en el puto Jurásico? — 3D

Vídeo vertical 3D · 1080×1920 · 30 fps (60 opcional) · 36 s · Remotion 4 + React Three Fiber.

```
src/
  Root.tsx              Composición principal (<Series> de 5 escenas) + composiciones sueltas por escena
  lib/timeline.ts       ÚNICA fuente de tiempos: escenas, subtítulos (frames globales) y locución
  lib/anim.ts           Muelles/easing (sin movimientos lineales)
  lib/textures.ts       Texturas procedurales (piel+tatuaje, piedra con musgo, mármol, corteza, placa)
  components/           Stage3D (ThreeCanvas, ACES, sombras), Subtitles, Allosaurus, TattooChair,
                        TattooMachine, Arm (petrificación por planos de corte), Particles, Env
  scenes/Scene01..05    Gancho · Tatuador · Tinta · Infección · Remate
```

## Uso
```bash
npm install
npm run studio                                   # previsualizar
npm run render                                   # out/jurassic-tattoo.mp4 (1080x1920@30)
npx remotion still JurassicTattoo out/f.jpg --frame=975   # frames de SALIDA (30 fps)
```
En servidores sin GPU añade `--gl=angle` (SwiftShader). Con GPU, `--gl=angle-egl` es mucho más rápido.

## Sincronía con la locución
Todo se anima en *unidades de timeline* (60 por segundo) en `src/lib/timeline.ts`; el fps de salida
es independiente (`FPS = 30`; pon 60 si lo necesitas, sin tocar nada más). Escena 1 = 6 s y escena 3 = 7 s
para que la locución de apertura quepa. Cuando tengas la VO
definitiva, ajusta allí `CUES` y añade el audio en `Root.tsx` con `<Audio src={staticFile('vo.mp3')} />`.

Fuente: Montserrat Black (OFL-1.1) servida localmente desde `public/fonts`.
