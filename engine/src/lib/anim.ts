import {Easing} from 'remotion';
import type {EaseName, Track} from '../types';

const EASE: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  in: Easing.in(Easing.cubic),
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  back: Easing.out(Easing.back(1.7)),
  elastic: Easing.elastic(1.2),
  bounce: Easing.bounce,
  step: (t) => (t < 1 ? 0 : 1),
};

/** Evalúa una pista de keyframes. La easing de una key gobierna el tramo que llega a ella. */
export const evalTrack = (track: Track | undefined, f: number, fallback = 0): number => {
  if (!track || track.length === 0) return fallback;
  if (f <= track[0].f) return track[0].v;
  const last = track[track.length - 1];
  if (f >= last.f) return last.v;
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i];
    const b = track[i + 1];
    if (f >= a.f && f <= b.f) {
      const span = b.f - a.f || 1;
      const t = EASE[b.e ?? 'inOut']((f - a.f) / span);
      return a.v + (b.v - a.v) * t;
    }
  }
  return fallback;
};

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const ease = (name: EaseName, t: number) => EASE[name](clamp01(t));

/** Ruido determinista barato (no usa Math.random: renders reproducibles). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const smoothNoise = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const fr = t - i;
  const a = hash(i + seed * 101);
  const b = hash(i + 1 + seed * 101);
  const u = fr * fr * (3 - 2 * fr);
  return a + (b - a) * u - 0.5;
};
