import React from 'react';
import {continueRender, delayRender} from 'remotion';
import {evalTrack} from './lib/anim';
import {ActorView} from './rig/Rig';
import {ScreenEffects, shakeOffset, WorldEffects} from './fx/Effects';
import type {Background, BgLayer, EpisodeSpec, PropItem, Shot} from './types';

const layerAnim = (l: {anim?: BgLayer['anim']}, f: number, fps: number) => {
  const a = l.anim;
  if (!a) return '';
  const t = (f / fps) * (a.speed ?? 1);
  const m = a.amount ?? 1;
  const cx = a.cx ?? 540;
  const cy = a.cy ?? 960;
  switch (a.type) {
    case 'sway':
      return `rotate(${(Math.sin(t * 2) * 2 * m).toFixed(3)} ${cx} ${cy})`;
    case 'drift':
      return `translate(${((t * 20 * m) % 2400) - 600} 0)`;
    case 'bob':
      return `translate(0 ${(Math.sin(t * 2.5) * 12 * m).toFixed(2)})`;
    case 'spin':
      return `rotate(${(t * 40 * m).toFixed(2)} ${cx} ${cy})`;
    default:
      return '';
  }
};

const layerOpacity = (l: BgLayer, f: number, fps: number) =>
  l.anim?.type === 'flicker' ? 0.75 + 0.25 * Math.abs(Math.sin((f / fps) * 13 * (l.anim.speed ?? 1)) * Math.sin((f / fps) * 7.3)) : 1;

/** <image> SVG que bloquea el render hasta estar cargada (sin frames vacíos). */
const SvgImage: React.FC<{src: string; w: number; h: number}> = ({src, w, h}) => {
  const [handle] = React.useState(() => delayRender(`img ${src}`));
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => continueRender(handle);
    img.onerror = () => continueRender(handle);
    img.src = src;
  }, [src, handle]);
  return <image href={src} width={w} height={h} preserveAspectRatio="xMidYMid slice" />;
};

const PropView: React.FC<{p: PropItem; f: number; fps: number}> = ({p, f, fps}) => {
  const x = evalTrack(p.tracks?.x, f, p.x);
  const y = evalTrack(p.tracks?.y, f, p.y);
  const r = evalTrack(p.tracks?.rot, f, 0);
  const s = evalTrack(p.tracks?.scale, f, 1);
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s}) ${layerAnim(p, f, fps)}`}>
      <g dangerouslySetInnerHTML={{__html: p.svg}} />
    </g>
  );
};

export const SceneView: React.FC<{spec: EpisodeSpec; shot: Shot; f: number}> = ({spec, shot, f}) => {
  const {width: W, height: H, fps} = spec.meta;
  const bg: Background | undefined = shot.background ? spec.backgrounds[shot.background] : undefined;
  const cam = shot.camera ?? {};
  const shk = shakeOffset(shot.effects, f);
  const cx = evalTrack(cam.x, f, 0) + shk.x;
  const cy = evalTrack(cam.y, f, 0) + shk.y;
  const zoom = evalTrack(cam.zoom, f, 1);
  const rot = evalTrack(cam.rot, f, 0) + shk.r;
  // cámara: zoom alrededor del centro del encuadre + paneo
  const camT = (depth: number) =>
    `translate(${W / 2} ${H / 2}) rotate(${(rot * depth).toFixed(3)}) scale(${(1 + (zoom - 1) * depth).toFixed(4)}) translate(${(-W / 2 - cx * depth).toFixed(2)} ${(-H / 2 - cy * depth).toFixed(2)})`;

  type Drawable = {z: number; node: React.ReactNode};
  const front: Drawable[] = [];
  for (const a of shot.actors ?? []) {
    const rig = spec.rigs[a.rig];
    if (!rig) continue;
    front.push({z: a.z ?? 0, node: <ActorView key={`a-${a.id}`} actor={a} rig={rig} frame={f} fps={fps} />});
  }
  for (const p of shot.props ?? []) front.push({z: p.z ?? 0, node: <PropView key={`p-${p.id}`} p={p} f={f} fps={fps} />});
  front.sort((a, b) => a.z - b.z);

  const bgLayers = (bg?.layers ?? []).filter((l) => l.depth < 1.0001);
  const fgLayers = (bg?.layers ?? []).filter((l) => l.depth >= 1.0001);
  const renderLayer = (l: BgLayer) => (
    <g key={l.id} transform={camT(l.depth)} opacity={layerOpacity(l, f, fps)}>
      <g transform={layerAnim(l, f, fps)}>
        {l.image ? <SvgImage src={l.image} w={bg?.width ?? W} h={bg?.height ?? H} /> : null}
        {l.svg ? <g dangerouslySetInnerHTML={{__html: l.svg}} /> : null}
      </g>
    </g>
  );

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <rect width={W} height={H} fill={shot.bgColor ?? spec.style.palette.paper ?? '#f3e9d2'} />
      <g filter={spec.style.boil > 0 ? 'url(#boil)' : undefined}>
        {bgLayers.map(renderLayer)}
        <g transform={camT(1)}>
          {front.map((d) => d.node)}
          <WorldEffects effects={shot.effects} f={f} w={W} h={H} />
        </g>
        {fgLayers.map(renderLayer)}
      </g>
      <ScreenEffects effects={shot.effects} f={f} w={W} h={H} />
    </svg>
  );
};
