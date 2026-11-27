import React, {useMemo} from 'react';
import {evalTrack, hash} from '../lib/anim';
import type {Actor, ExpressionKey, Rig, RigPart, VisemeKey} from '../types';
import {evalActions, type Pose} from './actions';

const lastKey = <T extends {f: number}>(keys: T[] | undefined, f: number): T | undefined => {
  if (!keys) return undefined;
  let found: T | undefined;
  for (const k of keys) {
    if (k.f <= f) found = k;
    else break;
  }
  return found;
};

const partTransform = (p: RigPart, d: {rot: number; tx: number; ty: number; sx: number; sy: number}) => {
  const [px, py] = p.pivot;
  let s = '';
  if (d.tx || d.ty) s += `translate(${d.tx.toFixed(2)} ${d.ty.toFixed(2)}) `;
  if (d.rot) s += `rotate(${d.rot.toFixed(3)} ${px} ${py}) `;
  if (d.sx !== 1 || d.sy !== 1) s += `translate(${px} ${py}) scale(${d.sx.toFixed(4)} ${d.sy.toFixed(4)}) translate(${-px} ${-py}) `;
  return s;
};

export const resolveVariants = (
  rig: Rig,
  f: number,
  expressions?: ExpressionKey[],
  visemes?: VisemeKey[],
  blink = true,
  seed = 0,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const p of rig.parts) if (p.variants) out[p.id] = p.defaultVariant ?? Object.keys(p.variants)[0];
  const ex = lastKey(expressions, f);
  if (ex) Object.assign(out, ex.set);
  const vis = lastKey(visemes, f);
  if (vis && out.mouth !== undefined) {
    const mouth = rig.parts.find((p) => p.id === 'mouth');
    if (mouth?.variants?.[vis.v]) out.mouth = vis.v;
  }
  // parpadeo automático determinista
  const eyes = rig.parts.find((p) => p.id === 'eyes');
  if (blink && eyes?.variants?.closed && (out.eyes === 'open' || out.eyes === eyes.defaultVariant)) {
    const period = 70 + Math.floor(hash(seed) * 50);
    const phase = Math.floor(hash(seed + 7) * period);
    const local = (f + phase) % period;
    if (local < 3) out.eyes = local === 1 ? 'closed' : eyes.variants.half ? 'half' : 'closed';
  }
  return out;
};

type RigViewProps = {
  rig: Rig;
  frame: number;
  fps: number;
  pose?: Pose;
  tracks?: Actor['tracks'];
  variants: Record<string, string>;
};

/** Dibuja el rig en su espacio propio (sin posición de escena). Orden por z, transformaciones jerárquicas. */
export const RigView: React.FC<RigViewProps> = ({rig, frame, pose, tracks, variants}) => {
  const byId = useMemo(() => Object.fromEntries(rig.parts.map((p) => [p.id, p])), [rig]);
  const sorted = useMemo(() => [...rig.parts].sort((a, b) => a.z - b.z), [rig]);

  const local = (p: RigPart) => {
    const d = pose?.[p.id] ?? {};
    const tr = (k: string, fb: number) => evalTrack(tracks?.[`${p.id}.${k}`], frame, fb);
    return {
      rot: (d.rot ?? 0) + tr('rot', 0),
      tx: (d.tx ?? 0) + tr('tx', 0),
      ty: (d.ty ?? 0) + tr('ty', 0),
      sx: (d.sx ?? 1) * tr('sx', 1),
      sy: (d.sy ?? 1) * tr('sy', 1),
    };
  };

  const chain = (p: RigPart): string => {
    const parts: RigPart[] = [];
    let cur: RigPart | undefined = p;
    let guard = 0;
    while (cur && guard++ < 32) {
      parts.unshift(cur);
      cur = cur.parent ? byId[cur.parent] : undefined;
    }
    return parts.map((q) => partTransform(q, local(q))).join('');
  };

  return (
    <g>
      {sorted.map((p) => {
        const markup = p.variants ? p.variants[variants[p.id]] ?? p.variants[p.defaultVariant ?? ''] ?? '' : p.svg ?? '';
        if (!markup) return null;
        return <g key={p.id} data-part={p.id} transform={chain(p)} dangerouslySetInnerHTML={{__html: markup}} />;
      })}
    </g>
  );
};

/** Actor en escena: posición, escala, flip, pistas root.* y acciones procedurales. */
export const ActorView: React.FC<{actor: Actor; rig: Rig; frame: number; fps: number}> = ({actor, rig, frame, fps}) => {
  const actions = useMemo(() => {
    const list = [...(actor.actions ?? [])];
    if (actor.idle !== false) list.unshift({type: 'idle', start: 0, dur: 1e9});
    return list;
  }, [actor.actions, actor.idle]);
  const pose = evalActions(actions, frame, fps);
  // follow-through: el pelo y accesorios reaccionan con retraso a la velocidad de la cabeza/cuerpo
  const prev = evalActions(actions, frame - 4, fps);
  const dHead = (pose.head?.rot ?? 0) - (prev.head?.rot ?? 0) + ((pose.root?.rot ?? 0) - (prev.root?.rot ?? 0));
  const dY = (pose.root?.ty ?? 0) - (prev.root?.ty ?? 0);
  for (const pid of ['hair', 'hair_back']) {
    const h = pose[pid] ?? (pose[pid] = {});
    h.rot = (h.rot ?? 0) - dHead * 1.4;
    h.sy = (h.sy ?? 1) * (1 + Math.max(-0.08, Math.min(0.08, dY * 0.004)));
  }
  // "pop" caricaturesco al cambiar de expresión (squash & stretch de cabeza y ojos)
  for (const ex of actor.expressions ?? []) {
    const dt = frame - ex.f;
    if (ex.f > 0 && dt >= 0 && dt < 12) {
      const k = Math.sin((dt / 12) * Math.PI) * (1 - dt / 14);
      const hd = pose.head ?? (pose.head = {});
      hd.sy = (hd.sy ?? 1) * (1 + 0.16 * k);
      hd.sx = (hd.sx ?? 1) * (1 - 0.08 * k);
      const ey = pose.eyes ?? (pose.eyes = {});
      ey.sy = (ey.sy ?? 1) * (1 + 0.35 * k);
      ey.sx = (ey.sx ?? 1) * (1 + 0.15 * k);
    }
  }
  const seed = actor.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const variants = resolveVariants(rig, frame, actor.expressions, actor.visemes, actor.blink !== false, seed);
  const jaw = {D: 0.05, H: 0.035, C: 0.03, E: 0.025, scream: 0.07, grin: 0.02}[variants.mouth as string] ?? 0;
  if (jaw) {
    const hd = pose.head ?? (pose.head = {});
    hd.sy = (hd.sy ?? 1) * (1 + jaw);
    const m = pose.mouth ?? (pose.mouth = {});
    m.sy = (m.sy ?? 1) * (1 + jaw * 3);
  }
  const root = pose.root ?? {};
  const x = evalTrack(actor.tracks?.['root.x'], frame, actor.x) + (root.tx ?? 0);
  const y = evalTrack(actor.tracks?.['root.y'], frame, actor.y) + (root.ty ?? 0);
  const sc = evalTrack(actor.tracks?.['root.scale'], frame, actor.scale ?? 1);
  const rot = evalTrack(actor.tracks?.['root.rot'], frame, 0) + (root.rot ?? 0);
  const [ax, ay] = rig.anchor;
  const sx = sc * (root.sx ?? 1) * (actor.flip ? -1 : 1);
  const sy = sc * (root.sy ?? 1);
  // rotación alrededor del centro del cuerpo, no de los pies
  const cy = -rig.height * 0.45;
  // sombra de contacto en el suelo (no salta con el personaje: se encoge al despegar)
  const baseX = evalTrack(actor.tracks?.['root.x'], frame, actor.x) + (root.tx ?? 0);
  const lift = Math.max(0, -(root.ty ?? 0));
  const k = Math.max(0.35, 1 - lift / 320);
  const shW = rig.width * 0.36 * sc * k;
  return (
    <>
    <ellipse cx={baseX} cy={actor.y + 4 * sc} rx={shW} ry={shW * 0.16} fill="#1b1030" opacity={0.28 * k} />
    <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)} 0 ${(cy * sc).toFixed(1)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-ax} ${-ay})`} style={{['--tatflip' as string]: actor.flip ? -1 : 1}}>
      <RigView rig={rig} frame={frame} fps={fps} pose={pose} tracks={actor.tracks} variants={variants} />
    </g>
    </>
  );
};
