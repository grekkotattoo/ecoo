// Utilidades de movimiento deterministas (sin Math.random ni reloj: render reproducible).
import {Easing, interpolate, random, spring} from 'remotion';
import type {Vec3} from '../config/physics';

export const EASE = {
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  cine: Easing.bezier(0.45, 0.05, 0.25, 1),
};

/** interpolate con curva suave y clamp por defecto (prohibido lineal rígido). */
export const ease = (frame: number, input: [number, number], output: [number, number], easing = EASE.inOut) =>
  interpolate(frame, input, output, {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Interpolación por tramos con la misma curva en cada tramo. */
export const easeKeys = (frame: number, input: number[], output: number[], easing = EASE.inOut) =>
  interpolate(frame, input, output, {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

type SpringConfig = {damping?: number; stiffness?: number; mass?: number; overshootClamping?: boolean};
export const sp = (frame: number, fps: number, delay = 0, config: SpringConfig = {damping: 14, stiffness: 120, mass: 1}) =>
  spring({frame: frame - delay, fps, config});

export const rnd = (seed: string | number) => random(seed);
export const rndRange = (seed: string | number, min: number, max: number) => min + random(seed) * (max - min);

// ---------------------------------------------------------------- Ruido procedural (value noise 3D)
const hash3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
export const noise3 = (x: number, y: number, z: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const zf = smooth(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return (
    l(
      l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
      l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
      zf,
    ) *
      2 -
    1
  );
};
/** fBm de 3 octavas en [-1,1] aprox. */
export const fbm3 = (x: number, y: number, z: number) =>
  noise3(x, y, z) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1) * 0.28 + noise3(x * 4.3, y * 4.3, z * 4.3) * 0.12;

// ---------------------------------------------------------------- Cámara
/** Base ortonormal de una cámara (para pegar objetos a la lente: manchas de tinta). */
export const cameraBasis = (pos: Vec3, target: Vec3) => {
  const f: Vec3 = [target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]];
  const fl = Math.hypot(...f);
  const fw: Vec3 = [f[0] / fl, f[1] / fl, f[2] / fl];
  let r: Vec3 = [-fw[2], 0, fw[0]];
  const rl = Math.hypot(...r) || 1;
  r = [r[0] / rl, r[1] / rl, r[2] / rl];
  const u: Vec3 = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  return {forward: fw, right: r, up: u};
};

/** Vibración de alta frecuencia determinista (máquina encendida). */
export const buzz = (frame: number, amp: number, seed = 0) => Math.sin(frame * 2.7 + seed) * amp + Math.sin(frame * 4.1 + seed * 3) * amp * 0.5;
