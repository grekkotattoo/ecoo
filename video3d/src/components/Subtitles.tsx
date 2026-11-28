// Subtítulos de alto impacto: Montserrat Black, mayúsculas, borde negro grueso, sombra dura, palabras clave en amarillo neón.
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE, SUBTITLES, type SubtitleCue} from '../config/timeline';
import {FONT_FAMILY} from '../lib/fonts';

const isHighlighted = (word: string, cue: SubtitleCue) => cue.highlight.some((h) => h.split(/\s+/).includes(word));

const Cue: React.FC<{cue: SubtitleCue; frame: number; fps: number}> = ({cue, frame, fps}) => {
  const words = cue.text.split(/\s+/);
  const local = frame - cue.from;
  const out = spring({frame: frame - (cue.to - 6), fps, config: {damping: 20, stiffness: 200}});
  const long = cue.text.length > 22;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 26px',
        maxWidth: 960,
        transform: `scale(${1 - out * 0.15})`,
        opacity: 1 - out,
      }}
    >
      {words.map((w, i) => {
        const pop = spring({frame: local - i * 3, fps, config: {damping: 9, stiffness: 190, mass: 0.6}});
        const hl = isHighlighted(w, cue);
        return (
          <span
            key={`${cue.id}-${i}`}
            style={{
              fontFamily: FONT_FAMILY,
              fontWeight: 900,
              fontSize: long ? 96 : 116,
              lineHeight: 1.05,
              letterSpacing: -1,
              textTransform: 'uppercase',
              color: hl ? PALETTE.neonYellow : '#ffffff',
              WebkitTextStroke: '16px #000000',
              paintOrder: 'stroke fill',
              textShadow: '0 10px 0 rgba(0,0,0,0.9), 0 18px 34px rgba(0,0,0,0.55)' + (hl ? ', 0 0 38px rgba(255,214,10,0.55)' : ''),
              display: 'inline-block',
              transform: `translateY(${(1 - pop) * 60}px) scale(${0.4 + pop * 0.6}) rotate(${hl ? (1 - pop) * -8 : 0}deg)`,
              opacity: Math.min(1, pop * 1.6),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const active = SUBTITLES.filter((c) => frame >= c.from && frame < c.to);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 1180, pointerEvents: 'none'}}>
      {active.map((c) => (
        <Cue key={c.id} cue={c} frame={frame} fps={fps} />
      ))}
    </AbsoluteFill>
  );
};
