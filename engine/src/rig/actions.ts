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
    add(pose, 'torso', {sy: 1 + Math.sin(w) * 0.012 * amt, rot: Math.sin(w * 0.5) * 0.8 * amt});
    add(pose, 'head', {rot: Math.sin(w * 0.5 + 1) * 1.6 * amt, ty: Math.sin(w) * 1.5 * amt});
    add(pose, 'armL_up', {rot: Math.sin(w + 0.4) * 2 * amt});
    add(pose, 'armR_up', {rot: -Math.sin(w + 0.4) * 2 * amt});
  },
  walk: (a, t, pose, fps) => {
    const w = cycle(t, fps, num(a, 'speed', 1.6));
    const sw = num(a, 'swing', 24);
    const k = envelope(t, a.dur, 4);
    add(pose, 'legL_up', {rot: Math.sin(w) * sw * k});
    add(pose, 'legR_up', {rot: -Math.sin(w) * sw * k});
    add(pose, 'legL_lo', {rot: Math.max(0, -Math.sin(w - 0.9)) * sw * 1.1 * k});
    add(pose, 'legR_lo', {rot: Math.max(0, Math.sin(w - 0.9)) * sw * 1.1 * k});
    add(pose, 'armL_up', {rot: -Math.sin(w) * sw * 0.8 * k});
    add(pose, 'armR_up', {rot: Math.sin(w) * sw * 0.8 * k});
    add(pose, 'armL_lo', {rot: -10 * k});
    add(pose, 'armR_lo', {rot: 10 * k});
    add(pose, 'root', {ty: -Math.abs(Math.sin(w)) * 10 * k});
    add(pose, 'torso', {rot: 3 * k});
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
    add(pose, `arm${side}_up`, {rot: s * 150 * k});
    add(pose, `arm${side}_lo`, {rot: s * (20 + Math.sin(w) * 25) * k});
  },
  point: (a, t, pose) => {
    const side = str(a, 'side', 'R');
    const k = ease('back', t / 8) * envelope(t, a.dur, 6);
    const s = side === 'L' ? 1 : -1;
    add(pose, `arm${side}_up`, {rot: s * num(a, 'angle', 95) * k});
    add(pose, `arm${side}_lo`, {rot: s * 5 * k});
  },
  talk: (a, t, pose, fps) => {
    // gesticulación durante el diálogo (las bocas vienen de los visemas)
    const k = envelope(t, a.dur, 8);
    const w = t / fps;
    const g = num(a, 'gesture', 1);
    add(pose, 'head', {rot: smoothNoise(w * 2.2, 3) * 7 * k * g, ty: smoothNoise(w * 3, 5) * 3 * k});
    add(pose, 'armR_up', {rot: (-25 + smoothNoise(w * 1.6, 7) * 30) * k * g});
    add(pose, 'armR_lo', {rot: (-35 + smoothNoise(w * 2.1, 9) * 30) * k * g});
    add(pose, 'torso', {rot: smoothNoise(w * 1.2, 11) * 3 * k});
  },
  shrug: (a, t, pose) => {
    const k = Math.sin(Math.PI * Math.min(1, t / a.dur));
    add(pose, 'armL_up', {rot: 35 * k});
    add(pose, 'armR_up', {rot: -35 * k});
    add(pose, 'armL_lo', {rot: -80 * k});
    add(pose, 'armR_lo', {rot: 80 * k});
    add(pose, 'head', {rot: 8 * k, ty: 6 * k});
    add(pose, 'torso', {sy: 1 - 0.02 * k});
  },
  jump: (a, t, pose) => {
    const u = t / a.dur;
    const h = num(a, 'height', 180);
    const squash = u < 0.15 ? Math.sin((u / 0.15) * Math.PI) : u > 0.85 ? Math.sin(((u - 0.85) / 0.15) * Math.PI) : 0;
    const air = u >= 0.15 && u <= 0.85 ? Math.sin(((u - 0.15) / 0.7) * Math.PI) : 0;
    add(pose, 'root', {ty: -air * h, sy: 1 - squash * 0.12, sx: 1 + squash * 0.08});
    add(pose, 'armL_up', {rot: 120 * air});
    add(pose, 'armR_up', {rot: -120 * air});
    add(pose, 'legL_lo', {rot: 30 * air});
    add(pose, 'legR_lo', {rot: -30 * air});
  },
  nod: (a, t, pose, fps) => {
    const k = envelope(t, a.dur, 4);
    add(pose, 'head', {rot: Math.sin(cycle(t, fps, num(a, 'speed', 2.5))) * 8 * k, ty: Math.abs(Math.sin(cycle(t, fps, 2.5))) * 6 * k});
  },
  shakeHead: (a, t, pose, fps) => {
    const k = envelope(t, a.dur, 4);
    add(pose, 'head', {tx: Math.sin(cycle(t, fps, num(a, 'speed', 3))) * 10 * k, rot: Math.sin(cycle(t, fps, 3)) * 4 * k});
  },
  tremble: (a, t, pose) => {
    const k = envelope(t, a.dur, 3) * num(a, 'amount', 1);
    add(pose, 'root', {tx: smoothNoise(t * 1.7, 1) * 10 * k, ty: smoothNoise(t * 1.9, 2) * 4 * k});
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
      if ((a.type === 'walk' || a.type === 'run') && t > a.dur) {
        const to = a.params?.toX;
        if (typeof to === 'number') add(pose, 'root', {tx: to});
      }
      if (a.type === 'pop' && t < 0) add(pose, 'root', {sx: 0.0001, sy: 0.0001});
      if (a.type === 'fall' && t > a.dur) fn(a, a.dur, pose, fps);
      continue;
    }
    fn(a, t, pose, fps);
  }
  return pose;
};
