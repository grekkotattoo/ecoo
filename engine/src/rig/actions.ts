// Biblioteca de mecanismos de animación reutilizables.
// Cada acción devuelve deltas ADITIVOS por pieza para un frame local.
// Esqueleto humanoide estándar (las piezas que falten se ignoran):
// torso, head, hair, eyes, brows, mouth, armL_up, armL_lo, armR_up, armR_lo, legL_up, legL_lo, legR_up, legR_lo
import {ease, smoothNoise} from '../lib/anim';
import type {Action} from '../types';

export type PartDelta = {rot?: number; tx?: number; ty?: number; sx?: number; sy?: number};
export type Pose = Record<string, PartDelta>; // 'root' = actor completo (tx,ty en px de escena)

const add = (pose: Pose, id: string, d: PartDelta) => {
  const p = pose[id] ?? (pose[id] = {});
  if (d.rot) p.rot = (p.rot ?? 0) + d.rot;
  if (d.tx) p.tx = (p.tx ?? 0) + d.tx;
  if (d.ty) p.ty = (p.ty ?? 0) + d.ty;
  if (d.sx !== undefined) p.sx = (p.sx ?? 1) * d.sx;
  if (d.sy !== undefined) p.sy = (p.sy ?? 1) * d.sy;
};

const num = (a: Action, k: string, d: number) => {
  const v = a.params?.[k];
  return typeof v === 'number' ? v : d;
};
const str = (a: Action, k: string, d: string) => {
  const v = a.params?.[k];
  return typeof v === 'string' ? v : d;
};

/** Envolvente de entrada/salida para que ninguna acción "salte". */
const envelope = (t: number, dur: number, fade = 6) => {
  const fi = Math.min(1, t / fade);
  const fo = Math.min(1, (dur - t) / fade);
  return Math.max(0, Math.min(fi, fo));
};

type ActionFn = (a: Action, t: number, pose: Pose, fps: number) => void;

const cycle = (t: number, fps: number, speed: number) => (t / fps) * Math.PI * 2 * speed;

export const ACTIONS: Record<string, ActionFn> = {
  idle: (a, t, pose, fps) => {
    const w = cycle(t, fps, num(a, 'speed', 0.35));
    const amt = num(a, 'amount', 1);
    add(pose, 'torso', {sy: 1 + Math.sin(w) * 0.025 * amt, sx: 1 - Math.sin(w) * 0.012 * amt, rot: Math.sin(w * 0.5) * 2 * amt});
    add(pose, 'head', {rot: Math.sin(w * 0.5 + 1) * 3.5 * amt, ty: Math.sin(w) * 3 * amt});
    add(pose, 'armL_up', {rot: Math.sin(w + 0.4) * 4 * amt});
    add(pose, 'armR_up', {rot: -Math.sin(w + 0.4) * 4 * amt});
    add(pose, 'armL_lo', {rot: Math.sin(w + 0.9) * 5 * amt});
    add(pose, 'armR_lo', {rot: -Math.sin(w + 0.9) * 5 * amt});
    add(pose, 'root', {tx: Math.sin(w * 0.37) * 6 * amt, rot: Math.sin(w * 0.37) * 1.2 * amt});
  },
  walk: (a, t, pose, fps) => {
    const w = cycle(t, fps, num(a, 'speed', 1.6));
    const sw = num(a, 'swing', 34);
    const k = envelope(t, a.dur, 4);
    add(pose, 'legL_up', {rot: Math.sin(w) * sw * k});
    add(pose, 'legR_up', {rot: -Math.sin(w) * sw * k});
    add(pose, 'legL_lo', {rot: Math.max(0, -Math.sin(w - 0.9)) * sw * 1.1 * k});
    add(pose, 'legR_lo', {rot: Math.max(0, Math.sin(w - 0.9)) * sw * 1.1 * k});
    add(pose, 'armL_up', {rot: -Math.sin(w) * sw * 0.8 * k});
    add(pose, 'armR_up', {rot: Math.sin(w) * sw * 0.8 * k});
    add(pose, 'armL_lo', {rot: -10 * k});
    add(pose, 'armR_lo', {rot: 10 * k});
    add(pose, 'root', {ty: -Math.abs(Math.sin(w)) * 18 * k, sy: 1 + Math.abs(Math.cos(w)) * 0.04 * k, sx: 1 - Math.abs(Math.cos(w)) * 0.02 * k});
    add(pose, 'torso', {rot: 6 * k});
    add(pose, 'head', {rot: Math.sin(w * 2) * 4 * k});
    // desplazamiento: from -> to (px de escena)
    const from = num(a, 'fromX', NaN);
    const to = num(a, 'toX', NaN);
    if (!Number.isNaN(from) && !Number.isNaN(to)) add(pose, 'root', {tx: from + (to - from) * ease('linear', t / a.dur)});
  },
  run: (a, t, pose, fps) => {
    const w = cycle(t, fps, num(a, 'speed', 2.6));
    const k = envelope(t, a.dur, 3);
    add(pose, 'legL_up', {rot: Math.sin(w) * 42 * k});
    add(pose, 'legR_up', {rot: -Math.sin(w) * 42 * k});
    add(pose, 'legL_lo', {rot: Math.max(0, -Math.sin(w - 1)) * 60 * k});
    add(pose, 'legR_lo', {rot: Math.max(0, Math.sin(w - 1)) * 60 * k});
    add(pose, 'armL_up', {rot: -Math.sin(w) * 50 * k});
    add(pose, 'armR_up', {rot: Math.sin(w) * 50 * k});
    add(pose, 'armL_lo', {rot: -70 * k});
    add(pose, 'armR_lo', {rot: 70 * k});
    add(pose, 'torso', {rot: 10 * k});
    add(pose, 'root', {ty: -Math.abs(Math.sin(w)) * 22 * k});
    const from = num(a, 'fromX', NaN);
    const to = num(a, 'toX', NaN);
    if (!Number.isNaN(from) && !Number.isNaN(to)) add(pose, 'root', {tx: from + (to - from) * (t / a.dur)});
  },
  wave: (a, t, pose, fps) => {
    const side = str(a, 'side', 'R');
    const k = envelope(t, a.dur, 6);
    const w = cycle(t, fps, num(a, 'speed', 2.2));
    const s = side === 'L' ? 1 : -1;
    add(pose, `arm${side}_up`, {rot: s * 160 * k});
    add(pose, 'head', {rot: -s * 8 * k});
    add(pose, 'torso', {rot: -s * 5 * k});
    add(pose, `arm${side}_lo`, {rot: s * (20 + Math.sin(w) * 25) * k});
  },
  point: (a, t, pose) => {
    const side = str(a, 'side', 'R');
    const k = ease('back', t / 8) * envelope(t, a.dur, 6);
    const s = side === 'L' ? 1 : -1;
    add(pose, `arm${side}_up`, {rot: s * num(a, 'angle', 100) * k});
    add(pose, 'torso', {rot: -s * 8 * k});
    add(pose, 'head', {rot: -s * 10 * k, tx: -s * 8 * k});
    add(pose, 'root', {sx: 1 + 0.04 * k});
    add(pose, `arm${side}_lo`, {rot: s * 5 * k});
  },
  talk: (a, t, pose, fps) => {
    // actuación al hablar: cabeza, cejas, hombros, ambos brazos, peso del cuerpo y acentos con squash
    const k = envelope(t, a.dur, 6);
    const w = t / fps;
    const g = num(a, 'gesture', 1.6);
    const beat = Math.max(0, Math.sin(w * Math.PI * 2.2)) ** 3; // acentos rítmicos
    add(pose, 'head', {rot: smoothNoise(w * 2.4, 3) * 16 * k * g, ty: (smoothNoise(w * 3.2, 5) * 6 - beat * 8) * k * g, tx: smoothNoise(w * 1.7, 13) * 6 * k * g});
    add(pose, 'brows', {ty: (-beat * 12 + smoothNoise(w * 4, 17) * 4) * k * g});
    add(pose, 'eyes', {sy: 1 + beat * 0.12 * k * g, sx: 1 + beat * 0.06 * k});
    add(pose, 'armR_up', {rot: (-35 + smoothNoise(w * 1.6, 7) * 60) * k * g});
    add(pose, 'armR_lo', {rot: (-55 + smoothNoise(w * 2.1, 9) * 55) * k * g});
    add(pose, 'armL_up', {rot: (18 + smoothNoise(w * 1.3, 21) * 40) * k * g});
    add(pose, 'armL_lo', {rot: (30 + smoothNoise(w * 1.9, 23) * 45) * k * g});
    add(pose, 'torso', {rot: smoothNoise(w * 1.2, 11) * 7 * k * g, sy: 1 + beat * 0.04 * k * g, sx: 1 - beat * 0.02 * k});
    add(pose, 'root', {sy: 1 - beat * 0.035 * k * g, sx: 1 + beat * 0.025 * k * g, ty: beat * 4 * k});
  },
  shrug: (a, t, pose) => {
    const k = Math.sin(Math.PI * Math.min(1, t / a.dur));
    add(pose, 'armL_up', {rot: 50 * k});
    add(pose, 'armR_up', {rot: -50 * k});
    add(pose, 'armL_lo', {rot: -100 * k});
    add(pose, 'armR_lo', {rot: 100 * k});
    add(pose, 'head', {rot: 14 * k, ty: 14 * k});
    add(pose, 'brows', {ty: -14 * k});
    add(pose, 'torso', {sy: 1 - 0.06 * k});
    add(pose, 'root', {sy: 1 - 0.05 * k, sx: 1 + 0.04 * k});
  },
  jump: (a, t, pose) => {
    const u = t / a.dur;
    const h = num(a, 'height', 280);
    const squash = u < 0.15 ? Math.sin((u / 0.15) * Math.PI) : u > 0.85 ? Math.sin(((u - 0.85) / 0.15) * Math.PI) : 0;
    const air = u >= 0.15 && u <= 0.85 ? Math.sin(((u - 0.15) / 0.7) * Math.PI) : 0;
    add(pose, 'root', {ty: -air * h, sy: 1 - squash * 0.28 + air * 0.18, sx: 1 + squash * 0.2 - air * 0.1});
    add(pose, 'armL_up', {rot: 120 * air});
    add(pose, 'armR_up', {rot: -120 * air});
    add(pose, 'legL_lo', {rot: 30 * air});
    add(pose, 'legR_lo', {rot: -30 * air});
  },
  nod: (a, t, pose, fps) => {
    const k = envelope(t, a.dur, 4);
    add(pose, 'head', {rot: Math.sin(cycle(t, fps, num(a, 'speed', 2.5))) * 14 * k, ty: Math.abs(Math.sin(cycle(t, fps, 2.5))) * 14 * k});
  },
  shakeHead: (a, t, pose, fps) => {
    const k = envelope(t, a.dur, 4);
    add(pose, 'head', {tx: Math.sin(cycle(t, fps, num(a, 'speed', 3.5))) * 22 * k, rot: Math.sin(cycle(t, fps, 3.5)) * 9 * k});
  },
  tremble: (a, t, pose) => {
    const k = envelope(t, a.dur, 3) * num(a, 'amount', 1);
    add(pose, 'root', {tx: smoothNoise(t * 1.7, 1) * 18 * k, ty: smoothNoise(t * 1.9, 2) * 8 * k, sy: 1 + smoothNoise(t * 2.3, 4) * 0.05 * k});
    add(pose, 'head', {rot: smoothNoise(t * 2.3, 3) * 6 * k});
  },
  lean: (a, t, pose) => {
    const k = ease('inOut', t / Math.min(10, a.dur)) * envelope(t, a.dur, 8);
    add(pose, 'torso', {rot: num(a, 'angle', 12) * k});
    add(pose, 'head', {rot: num(a, 'angle', 12) * 0.5 * k});
  },
  lookAt: (a, t, pose) => {
    const k = ease('inOut', t / 8) * envelope(t, a.dur, 8);
    add(pose, 'head', {rot: num(a, 'angle', 10) * k});
    add(pose, 'eyes', {tx: num(a, 'eyesX', 6) * k, ty: num(a, 'eyesY', 0) * k});
  },
  spin: (a, t, pose) => {
    add(pose, 'root', {rot: 360 * num(a, 'turns', 1) * ease('inOut', t / a.dur)});
  },
  fall: (a, t, pose) => {
    const u = ease('in', t / Math.min(a.dur, 14));
    add(pose, 'root', {rot: num(a, 'angle', 90) * u, ty: num(a, 'drop', 40) * u});
    add(pose, 'armL_up', {rot: 140 * u});
    add(pose, 'armR_up', {rot: -140 * u});
  },
  stretch: (a, t, pose) => {
    const k = Math.sin(Math.PI * Math.min(1, t / a.dur));
    add(pose, 'root', {sy: 1 + num(a, 'amount', 0.25) * k, sx: 1 - num(a, 'amount', 0.25) * 0.5 * k});
  },
  pop: (a, t, pose) => {
    // entrada cartoon con rebote
    const u = Math.min(1, t / num(a, 'in', 10));
    const s = ease('back', u);
    add(pose, 'root', {sx: s, sy: s});
  },
  take: (a, t, pose) => {
    // doble take clásico: anticipación (se encoge) → estirón con ojos fuera de órbita → asentamiento con rebote
    const u = t / a.dur;
    const ant = u < 0.18 ? Math.sin((u / 0.18) * Math.PI / 2) : u < 0.3 ? 1 - (u - 0.18) / 0.12 : 0;
    const pop = u >= 0.18 && u < 0.75 ? Math.sin(((u - 0.18) / 0.57) * Math.PI) : 0;
    const settle = u >= 0.75 ? Math.sin(((u - 0.75) / 0.25) * Math.PI * 2) * (1 - u) * 2 : 0;
    add(pose, 'root', {sy: 1 - ant * 0.22 + pop * 0.32 + settle * 0.06, sx: 1 + ant * 0.16 - pop * 0.14, ty: -pop * 60});
    add(pose, 'head', {ty: -pop * 70, sy: 1 + pop * 0.18, rot: -ant * 10});
    add(pose, 'eyes', {sx: 1 + pop * 0.55, sy: 1 + pop * 0.75, ty: -pop * 10});
    add(pose, 'brows', {ty: -pop * 40});
    add(pose, 'armL_up', {rot: pop * 70});
    add(pose, 'armR_up', {rot: -pop * 70});
    add(pose, 'armL_lo', {rot: pop * 40});
    add(pose, 'armR_lo', {rot: -pop * 40});
  },
  laugh: (a, t, pose, fps) => {
    const k = envelope(t, a.dur, 5);
    const w = cycle(t, fps, num(a, 'speed', 4.5));
    add(pose, 'head', {rot: (-12 + Math.sin(w) * 6) * k, ty: Math.abs(Math.sin(w)) * -10 * k});
    add(pose, 'torso', {sy: 1 + Math.sin(w) * 0.05 * k, rot: -6 * k});
    add(pose, 'root', {ty: Math.abs(Math.sin(w)) * 10 * k, sy: 1 - Math.abs(Math.sin(w)) * 0.04 * k});
    add(pose, 'armL_up', {rot: (30 + Math.sin(w) * 10) * k});
    add(pose, 'armL_lo', {rot: -90 * k});
    add(pose, 'armR_up', {rot: (-30 - Math.sin(w) * 10) * k});
    add(pose, 'armR_lo', {rot: 90 * k});
  },
  rage: (a, t, pose, fps) => {
    const k = Math.min(1, t / 8) * envelope(t, a.dur, 4);
    const sh = smoothNoise(t * 2.8, 5);
    add(pose, 'root', {tx: sh * 14 * k, sy: 1 + 0.1 * k, sx: 1 - 0.04 * k});
    add(pose, 'head', {ty: 16 * k, tx: smoothNoise(t * 3.1, 7) * 6 * k, sx: 1 + 0.06 * k});
    add(pose, 'torso', {rot: 8 * k});
    add(pose, 'armL_up', {rot: (20 + sh * 20) * k});
    add(pose, 'armR_up', {rot: (-20 - sh * 20) * k});
    add(pose, 'armL_lo', {rot: -110 * k});
    add(pose, 'armR_lo', {rot: 110 * k});
    add(pose, 'eyes', {sy: 1 - 0.15 * k});
    add(pose, 'brows', {ty: 10 * k});
  },
  cower: (a, t, pose) => {
    const k = ease('back', t / 8) * envelope(t, a.dur, 8);
    add(pose, 'root', {sy: 1 - 0.18 * k, sx: 1 + 0.08 * k, tx: -20 * k});
    add(pose, 'head', {ty: 30 * k, rot: -10 * k});
    add(pose, 'armL_up', {rot: 150 * k});
    add(pose, 'armR_up', {rot: -150 * k});
    add(pose, 'armL_lo', {rot: 60 * k});
    add(pose, 'armR_lo', {rot: -60 * k});
    add(pose, 'eyes', {sx: 1 + 0.2 * k, sy: 1 + 0.2 * k});
  },
  celebrate: (a, t, pose, fps) => {
    const w = cycle(t, fps, 2.4);
    const k = envelope(t, a.dur, 5);
    add(pose, 'root', {ty: -Math.abs(Math.sin(w)) * 120 * k, sy: 1 + Math.abs(Math.sin(w)) * 0.12 * k, rot: Math.sin(w * 0.5) * 6 * k});
    add(pose, 'armL_up', {rot: (165 + Math.sin(w * 2) * 15) * k});
    add(pose, 'armR_up', {rot: (-165 - Math.sin(w * 2) * 15) * k});
    add(pose, 'legL_lo', {rot: Math.abs(Math.sin(w)) * 50 * k});
    add(pose, 'legR_lo', {rot: -Math.abs(Math.sin(w)) * 50 * k});
    add(pose, 'head', {rot: Math.sin(w) * 10 * k});
  },
  facepalm: (a, t, pose) => {
    const k = ease('back', t / 10) * envelope(t, a.dur, 8);
    add(pose, 'armR_up', {rot: -125 * k});
    add(pose, 'armR_lo', {rot: -95 * k});
    add(pose, 'head', {rot: 12 * k, ty: 18 * k});
    add(pose, 'torso', {rot: 6 * k, sy: 1 - 0.04 * k});
  },
  dance: (a, t, pose, fps) => {
    const w = cycle(t, fps, num(a, 'speed', 2));
    const k = envelope(t, a.dur, 6);
    add(pose, 'root', {tx: Math.sin(w) * 30 * k, rot: Math.sin(w) * 8 * k, ty: -Math.abs(Math.cos(w)) * 20 * k});
    add(pose, 'torso', {rot: -Math.sin(w) * 10 * k});
    add(pose, 'armL_up', {rot: (90 + Math.sin(w * 2) * 60) * k});
    add(pose, 'armR_up', {rot: (-90 + Math.sin(w * 2) * 60) * k});
    add(pose, 'head', {rot: Math.sin(w + 1) * 14 * k});
    add(pose, 'legL_up', {rot: Math.max(0, Math.sin(w)) * 30 * k});
    add(pose, 'legR_up', {rot: -Math.max(0, -Math.sin(w)) * 30 * k});
  },
  sneak: (a, t, pose, fps) => {
    const w = cycle(t, fps, num(a, 'speed', 1.1));
    const k = envelope(t, a.dur, 6);
    add(pose, 'root', {sy: 1 - 0.12 * k, ty: -Math.abs(Math.sin(w)) * 12 * k});
    add(pose, 'torso', {rot: 18 * k});
    add(pose, 'head', {rot: -8 * k, tx: 12 * k});
    add(pose, 'legL_up', {rot: Math.sin(w) * 40 * k});
    add(pose, 'legR_up', {rot: -Math.sin(w) * 40 * k});
    add(pose, 'legL_lo', {rot: Math.max(0, -Math.sin(w)) * 60 * k});
    add(pose, 'legR_lo', {rot: Math.max(0, Math.sin(w)) * 60 * k});
    add(pose, 'armL_up', {rot: 60 * k});
    add(pose, 'armR_up', {rot: -60 * k});
    add(pose, 'armL_lo', {rot: -80 * k});
    add(pose, 'armR_lo', {rot: 80 * k});
    const from = num(a, 'fromX', NaN);
    const to = num(a, 'toX', NaN);
    if (!Number.isNaN(from) && !Number.isNaN(to)) add(pose, 'root', {tx: from + (to - from) * (t / a.dur)});
  },
  faint: (a, t, pose) => {
    const u = ease('in', Math.min(1, t / Math.min(a.dur, 18)));
    const wob = t < 10 ? Math.sin(t * 0.9) * (1 - t / 10) : 0;
    add(pose, 'root', {rot: -88 * u + wob * 8, ty: 40 * u});
    add(pose, 'head', {rot: -20 * u});
    add(pose, 'armL_up', {rot: 120 * u});
    add(pose, 'armR_up', {rot: -60 * u});
    add(pose, 'eyes', {sy: 1 - 0.6 * u});
  },
};

export const ACTION_NAMES = Object.keys(ACTIONS);

export const evalActions = (actions: Action[] | undefined, f: number, fps: number): Pose => {
  const pose: Pose = {};
  for (const a of actions ?? []) {
    const fn = ACTIONS[a.type];
    if (!fn) continue;
    const t = f - a.start;
    if (t < 0 || t > a.dur) {
      // acciones de desplazamiento mantienen su posición final
      if ((a.type === 'walk' || a.type === 'run' || a.type === 'sneak') && t > a.dur) {
        const to = a.params?.toX;
        if (typeof to === 'number') add(pose, 'root', {tx: to});
      }
      if (a.type === 'pop' && t < 0) add(pose, 'root', {sx: 0.0001, sy: 0.0001});
      if ((a.type === 'fall' || a.type === 'faint') && t > a.dur) fn(a, a.dur, pose, fps);
      continue;
    }
    fn(a, t, pose, fps);
  }
  return pose;
};
