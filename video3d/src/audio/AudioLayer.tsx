// Capa de audio preparada: lee sfxMarkers de timeline.ts.
// Solo monta <Audio> si el fichero EXISTE en public/ (getStaticFiles) → nunca rompe el render
// mientras faltan los .mp3. Basta con soltar los ficheros en public/sfx/ y public/voz.mp3.
import React from 'react';
import {Audio, getStaticFiles, Sequence, staticFile} from 'remotion';
import {DURATION_IN_FRAMES, sfxMarkers, VOICE_FILE} from '../config/timeline';

const available = () => {
  try {
    return new Set(getStaticFiles().map((f) => f.name.replace(/^\//, '')));
  } catch {
    return new Set<string>();
  }
};

export const AudioLayer: React.FC<{muted?: boolean}> = ({muted = false}) => {
  if (muted) return null;
  const files = available();
  const hasVoice = files.has(VOICE_FILE);
  return (
    <>
      {/* Voz en off completa */}
      <Sequence from={0} durationInFrames={DURATION_IN_FRAMES} name="VO · voz.mp3" layout="none">
        {hasVoice ? <Audio src={staticFile(VOICE_FILE)} volume={1} /> : null}
        {/* <Audio src={staticFile('voz.mp3')} volume={1} /> */}
      </Sequence>

      {sfxMarkers.map((m) => {
        const path = `sfx/${m.file}`;
        return (
          <Sequence key={m.id} from={m.from} durationInFrames={m.durationInFrames} name={`SFX · ${m.id}`} layout="none">
            {files.has(path) ? <Audio src={staticFile(path)} volume={m.volume} /> : null}
          </Sequence>
        );
      })}

      {/*
        Bloques manuales equivalentes (por si prefieres conectarlos a mano):
        <Sequence from={420}  durationInFrames={300}><Audio src={staticFile('sfx/buzz.mp3')} volume={0.55} /></Sequence>
        <Sequence from={428}  durationInFrames={40}><Audio src={staticFile('sfx/liquid_pop.mp3')} volume={0.7} /></Sequence>
        <Sequence from={600}  durationInFrames={50}><Audio src={staticFile('sfx/liquid_pop.mp3')} volume={0.9} /></Sequence>
        <Sequence from={840}  durationInFrames={45}><Audio src={staticFile('sfx/bonk.mp3')} volume={0.9} /></Sequence>
        <Sequence from={1260} durationInFrames={480}><Audio src={staticFile('sfx/geiger.mp3')} volume={0.6} /></Sequence>
        <Sequence from={1740} durationInFrames={420}><Audio src={staticFile('sfx/fanfare.mp3')} volume={0.85} /></Sequence>
      */}
    </>
  );
};
