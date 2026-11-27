# Tattoo Rocket Viral (Remotion)

Vídeo vertical 1080×1920 · 30 fps · 300 frames (10 s). Todo el arte es SVG inline, sin assets externos.

```bash
npm install
npm run dev        # Remotion Studio
npm run render     # → out/tattoo-rocket.mp4
npm run typecheck  # tsc --noEmit
```

Estructura:
- `src/Composition.tsx` — cámara virtual, CameraShake, trayectoria del cohete y orden de capas
- `src/components/TattooStudio.tsx` — estudio, techo, lámpara, camilla, cliente, tatuador
- `src/components/Rocket.tsx` — cohete Heavy, llamas azules, aguja + cinta americana
- `src/components/Effects.tsx` — escombros, impacto, humo, partículas, flash
- `src/components/Aftermath.tsx` — cráter, mano 👍 chamuscada, cartel "10/10"
- `src/components/SplitBadge.tsx` — comparativa superior
- `src/components/Captions.tsx` — `<ViralCaptions />`
- `src/constants.ts` — timing, textos y paleta

Audio: no hay librerías de audio instaladas; los puntos de sonido están marcados como `// TODO: Audio cue` en `src/Composition.tsx`.
