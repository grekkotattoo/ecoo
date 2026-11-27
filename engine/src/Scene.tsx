import React from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
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

// ---------------------------------------------------------------- cámara 2.5D
// Cada capa es un plano 2D situado a una profundidad real (translateZ) dentro de un espacio con
// perspectiva CSS. La cámara se mueve en 3D (dolly, yaw/órbita, pitch/grúa, roll, truck/pedestal),
// el parallax y la deformación de perspectiva salen solos. Desenfoque por profundidad (DOF) y efecto vértigo.
const PERSP = 1600;
export const depthToZ = (depth: number) => (depth - 1) * 2600;

export const SceneView: React.FC<{spec: EpisodeSpec; shot: Shot; f: number}> = ({spec, shot, f}) => {
  const {width: W, height: H, fps} = spec.meta;
  const bg: Background | undefined = shot.background ? spec.backgrounds[shot.background] : undefined;
  const cam = shot.camera ?? {};
  const shk = shakeOffset(shot.effects, f);
  const cx = evalTrack(cam.x, f, 0) + shk.x;
  const cy = evalTrack(cam.y, f, 0) + shk.y;
  const zoom = evalTrack(cam.zoom, f, 1);
  const roll = evalTrack(cam.rot, f, 0) + shk.r;
  const yaw = evalTrack(cam.yaw, f, 0) + shk.r * 0.6;
  const pitch = evalTrack(cam.pitch, f, 0);
  const persp = evalTrack(cam.persp, f, PERSP);
  const focusZ = evalTrack(cam.focus, f, 0);
  const dof = evalTrack(cam.dof, f, spec.style.dof ?? 0);
  // zoom → dolly real (la cámara avanza): el sujeto en z=0 escala ×zoom
  const dolly = persp * (1 - 1 / Math.max(0.2, zoom));
  const camera = `translateZ(${dolly.toFixed(1)}px) rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg) translate(${(-cx).toFixed(1)}px, ${(-cy).toFixed(1)}px)`;

  type Drawable = {z: number; node: React.ReactNode};
  const front: Drawable[] = [];
  for (const a of shot.actors ?? []) {
    const rig = spec.rigs[a.rig];
    if (!rig) continue;
    front.push({z: a.z ?? 0, node: <ActorView key={`a-${a.id}`} actor={a} rig={rig} frame={f} fps={fps} />});
  }
  for (const p of shot.props ?? []) front.push({z: p.z ?? 0, node: <PropView key={`p-${p.id}`} p={p} f={f} fps={fps} />});
  front.sort((a, b) => a.z - b.z);

  const plane = (key: string, z: number, content: React.ReactNode, opacity = 1) => {
    const s = (PERSP - z) / PERSP; // compensa la distancia: en reposo el plano llena el encuadre
    // DOF dentro del SVG (no filtro CSS): el raster del plano se cachea entre fotogramas mientras el foco no cambie.
    // Radio cuantizado a 0,5 px para maximizar la reutilización de caché. Se aplica en unidades del plano (÷ escala).
    const blurPx = dof > 0 ? Math.min(12, (Math.abs(z - focusZ) / 1000) * dof) : 0;
    const blur = Math.round((blurPx / s) * 2) / 2;
    const fid = `dof_${key}_${blur}`;
    return (
      <div key={key} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translateZ(${z.toFixed(1)}px) scale(${s.toFixed(4)})`, opacity}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'visible', position: 'absolute', inset: 0}}>
          {blur >= 0.5 ? (
            <defs>
              <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={blur} />
              </filter>
            </defs>
          ) : null}
          <g filter={blur >= 0.5 ? `url(#${fid})` : spec.style.boil > 0 ? 'url(#boil)' : undefined}>{content}</g>
        </svg>
      </div>
    );
  };
  const layers = bg?.layers ?? [];
  const bgPlanes = layers.filter((l) => l.depth < 0.995);
  const fgPlanes = layers.filter((l) => l.depth >= 0.995);
  const layerContent = (l: BgLayer) => (
    <g transform={layerAnim(l, f, fps)}>
      {l.image ? <SvgImage src={l.image} w={bg?.width ?? W} h={bg?.height ?? H} /> : null}
      {l.svg ? <g dangerouslySetInnerHTML={{__html: l.svg}} /> : null}
    </g>
  );
  return (
    <AbsoluteFill style={{background: shot.bgColor ?? spec.style.palette.ink ?? '#1b1424', overflow: 'hidden', perspective: `${persp.toFixed(0)}px`, perspectiveOrigin: '50% 50%'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformStyle: 'preserve-3d', transformOrigin: '50% 50%', transform: camera}}>
        {bgPlanes.map((l) => plane(l.id, depthToZ(l.depth), layerContent(l), layerOpacity(l, f, fps)))}
        {plane('actors', 0, (
          <>
            {front.map((d) => d.node)}
            <WorldEffects effects={shot.effects} f={f} w={W} h={H} />
          </>
        ))}
        {fgPlanes.map((l) => plane(l.id, depthToZ(Math.max(1.02, l.depth)), layerContent(l), layerOpacity(l, f, fps)))}
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <ScreenEffects effects={shot.effects} f={f} w={W} h={H} />
      </svg>
    </AbsoluteFill>
  );
};
