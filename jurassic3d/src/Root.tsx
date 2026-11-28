import React from 'react';
import {AbsoluteFill, Composition, interpolate, Series, useCurrentFrame} from 'remotion';
import {Subtitles} from './components/Subtitles';
import {FPS, HEIGHT, SCENES, TOTAL_FRAMES, WIDTH} from './lib/timeline';
import {Scene01} from './scenes/Scene01';
import {Scene02} from './scenes/Scene02';
import {Scene03} from './scenes/Scene03';
import {Scene04} from './scenes/Scene04';
import {Scene05} from './scenes/Scene05';

const SCENE_COMPONENTS = [Scene01, Scene02, Scene03, Scene04, Scene05];

/** Golpe de corte: micro-fundido a negro en cada cambio de escena + viñeta cinematográfica. */
const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const cuts = SCENES.slice(1).map((s) => s.from);
  const dip = Math.max(
    0,
    ...cuts.map((c) => interpolate(frame, [c - 5, c, c + 7], [0, 0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})),
    interpolate(frame, [0, 10], [1, 0], {extrapolateRight: 'clamp'}),
    interpolate(frame, [TOTAL_FRAMES - 14, TOTAL_FRAMES], [0, 1], {extrapolateLeft: 'clamp'}),
  );
  return (
    <>
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />
      <AbsoluteFill style={{backgroundColor: '#000', opacity: dip, pointerEvents: 'none'}} />
    </>
  );
};

export const JurassicTattoo: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Series>
      {SCENES.map((s, i) => {
        const Scene = SCENE_COMPONENTS[i];
        return (
          <Series.Sequence key={s.id} name={s.id} durationInFrames={s.duration} premountFor={30}>
            <Scene />
          </Series.Sequence>
        );
      })}
    </Series>
    <Finish />
    <Subtitles />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="JurassicTattoo"
      component={JurassicTattoo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {SCENES.map((s, i) => (
      <Composition
        key={s.id}
        id={s.id}
        component={SCENE_COMPONENTS[i]}
        durationInFrames={s.duration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    ))}
  </>
);
