// Composición principal: 5 escenas 3D en secuencia + subtítulos + HUD + transiciones + audio.
import React from 'react';
import {AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AudioLayer} from './audio/AudioLayer';
import {HUD} from './components/HUD';
import {Subtitles} from './components/Subtitles';
import {SCENE_LIST, SCENES, type SceneId} from './config/timeline';
import {loadFonts} from './lib/fonts';
import {Scene01} from './scenes/Scene01';
import {Scene02} from './scenes/Scene02';
import {Scene03} from './scenes/Scene03';
import {Scene04} from './scenes/Scene04';
import {Scene05} from './scenes/Scene05';

loadFonts();

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  S01: Scene01,
  S02: Scene02,
  S03: Scene03,
  S04: Scene04,
  S05: Scene05,
};

/** Destello de corte (flash blanco con muelle) en cada cambio de escena. */
const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cut = SCENE_LIST.filter((s) => s.from > 0 && frame >= s.from && frame < s.from + 24).pop();
  if (!cut) return null;
  const k = spring({frame: frame - cut.from, fps, config: {damping: 30, stiffness: 140}});
  return <AbsoluteFill style={{background: '#ffffff', opacity: (1 - k) * 0.85, pointerEvents: 'none'}} />;
};

/** Viñeta cinematográfica suave. */
const Vignette: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
);

export const Main: React.FC<{muted?: boolean}> = ({muted = false}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {SCENE_LIST.map((s) => {
      const C = SCENE_COMPONENTS[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={`${s.id} · ${s.title}`}>
          <C />
        </Sequence>
      );
    })}
    <Vignette />
    <CutFlash />
    <HUD />
    <Subtitles />
    <AudioLayer muted={muted} />
  </AbsoluteFill>
);

/** Para previsualizar una escena aislada con sus subtítulos. */
export const SinglePreview: React.FC<{scene: SceneId}> = ({scene}) => {
  const C = SCENE_COMPONENTS[scene];
  const s = SCENES[scene];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <C />
      <Vignette />
      <Sequence from={-s.from} layout="none">
        <HUD />
        <Subtitles />
      </Sequence>
    </AbsoluteFill>
  );
};
