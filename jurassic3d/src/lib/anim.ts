import {Easing, interpolate, spring, SpringConfig} from 'remotion';

export const SOFT: Partial<SpringConfig> = {damping: 18, stiffness: 70, mass: 1.1};
export const SNAPPY: Partial<SpringConfig> = {damping: 11, stiffness: 160, mass: 0.7};
export const HEAVY: Partial<SpringConfig> = {damping: 26, stiffness: 45, mass: 2};

/** Muelle 0→1 que arranca en `delay` (frames locales). */
export const sp = (
  frame: number,
  fps: number,
  delay = 0,
  config: Partial<SpringConfig> = SOFT,
  durationInFrames?: number,
) => spring({frame: frame - delay, fps, config, durationInFrames});

/** interpolate con easing (nunca lineal) y clamp. */
export const ease = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing: (t: number) => number = Easing.inOut(Easing.cubic),
) =>
  interpolate(frame, input, output, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const mix3 = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Ruido determinista suave (suma de senos) para temblores orgánicos. */
export const wobble = (t: number, seed = 0) =>
  Math.sin(t * 1.7 + seed * 12.9898) * 0.5 +
  Math.sin(t * 3.1 + seed * 78.233) * 0.3 +
  Math.sin(t * 7.3 + seed * 37.719) * 0.2;
