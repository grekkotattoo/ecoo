import { interpolate, spring } from "remotion";

type Ease = (t: number) => number;

/** interpolate con clamp en ambos extremos. */
export const lerpF = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing?: Ease,
): number =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** spring que arranca en `start` (0 antes de empezar). */
export const pop = (
  frame: number,
  fps: number,
  start: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
): number =>
  spring({
    frame: Math.max(0, frame - start),
    fps,
    config: { damping: 12, stiffness: 200, mass: 1, ...config },
  });

/** Decaimiento exponencial a partir de `start`. */
export const decay = (frame: number, start: number, tau: number): number =>
  frame < start ? 0 : Math.exp(-(frame - start) / tau);
