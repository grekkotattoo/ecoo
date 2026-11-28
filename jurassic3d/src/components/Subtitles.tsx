import React from 'react';
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Cue, CUES} from '../lib/timeline';

export const FONT_FAMILY = 'MontserratBlack';

// Montserrat Black (OFL-1.1) local: render determinista y sin red.
const fontHandle = delayRender('Cargando Montserrat Black');
const face = new FontFace(FONT_FAMILY, `url('${staticFile('fonts/Montserrat-Black.woff2')}') format('woff2')`, {
  weight: '900',
});
face
  .load()
  .then(() => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(face);
    continueRender(fontHandle);
  })
  .catch((err) => cancelRender(err));

const YELLOW = '#ffd60a';

const Word: React.FC<{word: string; hot: boolean; local: number; index: number}> = ({word, hot, local, index}) => {
  const {fps} = useVideoConfig();
  const pop = spring({frame: local - index * 4, fps, config: {damping: 9, stiffness: 210, mass: 0.6}});
  const settle = spring({frame: local - index * 4 - 6, fps, config: {damping: 14, stiffness: 120}});
  const scale = interpolate(pop, [0, 1], [0.2, 1]) * (hot ? interpolate(settle, [0, 1], [1.25, 1.06]) : 1);
  const rot = interpolate(pop, [0, 1], [index % 2 === 0 ? -14 : 12, hot ? -2 : 0]);
  const y = interpolate(pop, [0, 1], [60, 0]);
  return (
    <span
      style={{
        display: 'inline-block',
        margin: '0 0.3em',
        transform: `translateY(${y}px) scale(${scale}) rotate(${rot}deg)`,
        opacity: interpolate(pop, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'}),
        color: hot ? YELLOW : '#ffffff',
        textShadow: hot
          ? `0 10px 0 #000, 0 0 38px rgba(255,214,10,0.65), 0 18px 34px rgba(0,0,0,0.7)`
          : `0 10px 0 #000, 0 18px 34px rgba(0,0,0,0.7)`,
      }}
    >
      {word}
    </span>
  );
};

const CueView: React.FC<{cue: Cue; frame: number}> = ({cue, frame}) => {
  const {fps} = useVideoConfig();
  const local = frame - cue.from;
  const outro = spring({frame: frame - (cue.to - 9), fps, config: {damping: 20, stiffness: 200}});
  const words = cue.text.split(' ');
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: '63%',
        textAlign: 'center',
        fontFamily: `${FONT_FAMILY}, 'Montserrat', 'Inter', sans-serif`,
        fontWeight: 900,
        fontSize: words.join('').length > 18 ? 92 : 112,
        lineHeight: 1.08,
        letterSpacing: '-0.01em',
        WebkitTextStroke: '16px #000',
        paintOrder: 'stroke fill',
        transform: `scale(${1 - outro * 0.25})`,
        opacity: 1 - outro,
      }}
    >
      {words.map((w, i) => (
        <Word key={i} word={w} hot={cue.keywords.includes(w)} local={local} index={i} />
      ))}
    </div>
  );
};

/** Capa superior de subtítulos (frames globales). */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const active = CUES.filter((c) => frame >= c.from && frame < c.to);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {active.map((c) => (
        <CueView key={c.from} cue={c} frame={frame} />
      ))}
    </AbsoluteFill>
  );
};
