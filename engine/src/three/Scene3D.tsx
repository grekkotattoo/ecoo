// Escena HÍBRIDA 2.5D con @react-three/fiber.
// Los dibujos siguen siendo 2D (SVG planos), pero viven en un espacio 3D real de three.js:
// - cada capa de fondo es un plano texturizado a su profundidad (textura generada UNA vez y cacheada),
// - los personajes son una capa vectorial con la MISMA cámara (proyección idéntica en z=0): sin raster por fotograma,
// - cámara 3D real (dolly, órbita, grúa, roll, vértigo), luces de neón que tiñen la escena,
// - efectos 3D (escombros, chispas, confeti) que salen hacia cámara con profundidad real.
import React, {useEffect, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import * as THREE from 'three';
import {evalTrack, hash} from '../lib/anim';
import {ActorView} from '../rig/Rig';
import {ScreenEffects, shakeOffset, WorldEffects} from '../fx/Effects';
import type {BgLayer, Effect, EpisodeSpec, Shot, Style} from '../types';

const U = 100; // px por unidad three.js
const PERSP = 1600; // distancia de cámara base (px), igual que la versión CSS
const MARGIN = 0.45; // margen de textura de FONDOS fuera de encuadre (paneos/órbitas)
const FX3D = new Set(['impact', 'sparks', 'confetti']);
export const depthToZ = (depth: number) => (depth - 1) * 2600;

// ---------------------------------------------------------------- SVG → textura
let fontCssPromise: Promise<string> | null = null;
const fontCss = (style: Style): Promise<string> => {
  // Las imágenes SVG no pueden cargar fuentes externas: se incrustan en base64 (una vez por pestaña).
  if (!fontCssPromise) {
    fontCssPromise = Promise.all(
      Object.entries(style.fonts.urls ?? {}).map(async ([family, url]) => {
        try {
          const buf = await (await fetch(url)).arrayBuffer();
          let bin = '';
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          return `@font-face{font-family:'${family}';src:url(data:font/woff;base64,${btoa(bin)}) format('woff');}`;
        } catch {
          return '';
        }
      }),
    ).then((parts) => parts.join('') + `:root{--font-title:'${style.fonts.title}'}`);
  }
  return fontCssPromise;
};

const svgImage = async (inner: string, W: number, H: number, css: string, scale: number, margin = MARGIN): Promise<HTMLImageElement> => {
  const mx = W * margin;
  const my = H * margin;
  const w = W + 2 * mx;
  const h = H + 2 * my;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}" viewBox="${-mx} ${-my} ${w} ${h}"><style>${css}</style>${inner}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
};

const toTexture = (img: HTMLImageElement | HTMLCanvasElement) => {
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
};

const layerCache = new Map<string, Promise<THREE.Texture>>();

// ---------------------------------------------------------------- plano texturizado
const PlaneMesh: React.FC<{tex: THREE.Texture | null; W: number; H: number; z: number; opacity?: number; lit: boolean; margin?: number}> = ({tex, W, H, z, opacity = 1, lit, margin = MARGIN}) => {
  const s = (PERSP - z) / PERSP;
  const w = (W * (1 + 2 * margin)) / U;
  const h = (H * (1 + 2 * margin)) / U;
  if (!tex) return null;
  return (
    <mesh position={[0, 0, z / U]} scale={[s, s, 1]}>
      <planeGeometry args={[w, h]} />
      {lit ? (
        <meshLambertMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
      ) : (
        <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      )}
    </mesh>
  );
};

const layerAnimProps = (l: BgLayer, f: number, fps: number, W: number, H: number) => {
  const a = l.anim;
  const out = {x: 0, y: 0, rot: 0, opacity: 1};
  if (!a) return out;
  const t = (f / fps) * (a.speed ?? 1);
  const m = a.amount ?? 1;
  if (a.type === 'drift') out.x = ((t * 20 * m) % 2400) - 600;
  if (a.type === 'bob') out.y = Math.sin(t * 2.5) * 12 * m;
  if (a.type === 'sway') out.rot = Math.sin(t * 2) * 2 * m;
  if (a.type === 'spin') out.rot = t * 40 * m;
  if (a.type === 'flicker') out.opacity = 0.75 + 0.25 * Math.abs(Math.sin(t * 13) * Math.sin(t * 7.3));
  void W;
  void H;
  return out;
};

// ---------------------------------------------------------------- capas de fondo (textura cacheada)
const BgPlane: React.FC<{l: BgLayer; bgKey: string; spec: EpisodeSpec; f: number; lit: boolean}> = ({l, bgKey, spec, f, lit}) => {
  const {width: W, height: H, fps} = spec.meta;
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const advance = useThree((s) => s.advance);
  const key = `${bgKey}:${l.id}:${l.svg?.length ?? 0}`;
  useEffect(() => {
    let done = false;
    const h = delayRender(`capa ${key}`);
    if (!layerCache.has(key)) {
      layerCache.set(key, fontCss(spec.style).then((css) => svgImage(l.svg ?? '', W, H, css, spec.style.three?.bgScale ?? 0.85)).then(toTexture));
    }
    layerCache.get(key)!.then((t) => {
      if (done) return;
      setTex(t);
      requestAnimationFrame(() => {
        advance(performance.now());
        continueRender(h);
      });
    });
    return () => {
      done = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const z = depthToZ(l.depth >= 0.995 ? Math.max(1.02, l.depth) : l.depth);
  const an = layerAnimProps(l, f, fps, W, H);
  const cx = (l.anim?.cx ?? W / 2) - W / 2;
  const cy = -((l.anim?.cy ?? H / 2) - H / 2);
  const s = (PERSP - z) / PERSP;
  return (
    <group position={[(cx * s) / U, (cy * s) / U, 0]} rotation={[0, 0, (-an.rot * Math.PI) / 180]}>
      <group position={[(-cx * s + an.x * s) / U, (-cy * s - an.y * s) / U, 0]}>
        <PlaneMesh tex={tex} W={W} H={H} z={z} opacity={an.opacity} lit={lit} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- efectos 3D (escombros / chispas / confeti)
const Debris: React.FC<{e: Effect; f: number; W: number; H: number}> = ({e, f, W, H}) => {
  const t = f - e.start;
  if (t < 0 || t > e.dur) return null;
  const u = t / e.dur;
  const n = Math.round((e.type === 'confetti' ? 60 : 36) * (e.intensity ?? 1));
  const cx = ((e.x ?? W / 2) - W / 2) / U;
  const cy = -((e.y ?? H / 2) - H / 2) / U;
  const colors = e.type === 'sparks' ? ['#ffd54a', '#ff6b00', '#ffffff'] : ['#c6ff00', '#ff2e88', '#00d1ff', '#ff6b00', '#ffffff'];
  const items = [];
  for (let i = 0; i < n; i++) {
    const seed = (e.seed ?? 1) * 31 + i;
    const a = hash(seed) * Math.PI * 2;
    const el = (hash(seed + 7) - 0.3) * Math.PI * 0.9;
    const sp = 2 + hash(seed + 3) * 6;
    const d = sp * Math.min(1, u * 1.6);
    const x = cx + Math.cos(a) * Math.cos(el) * d;
    const y = cy + Math.sin(el) * d - u * u * 6 * (e.type === 'confetti' ? 0.4 : 1);
    const z = Math.sin(a) * Math.cos(el) * d * 0.6 + d * 0.9; // hacia cámara
    const size = e.type === 'sparks' ? 0.06 : 0.12 + hash(seed + 5) * 0.14;
    items.push(
      <mesh key={i} position={[x, y, z]} rotation={[t * 0.3 * hash(seed + 1) * 3, t * 0.2, t * 0.25]}>
        <boxGeometry args={e.type === 'sparks' ? [size, size, size * 6] : e.type === 'confetti' ? [size * 1.6, size, 0.02] : [size, size, size]} />
        <meshBasicMaterial color={colors[i % colors.length]} transparent opacity={1 - u * u} toneMapped={false} />
      </mesh>,
    );
  }
  return <group>{items}</group>;
};

// ---------------------------------------------------------------- cámara 3D real
const CameraRig: React.FC<{persp: number; W: number; H: number}> = ({persp, W, H}) => {
  const {camera, size} = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = (2 * Math.atan(H / 2 / persp) * 180) / Math.PI;
    cam.aspect = W / H;
    cam.near = 0.1;
    cam.far = 500;
    cam.position.set(0, 0, persp / U);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, persp, W, H, size]);
  return null;
};

export const SceneView3D: React.FC<{spec: EpisodeSpec; shot: Shot; f: number}> = ({spec, shot, f}) => {
  const {width: W, height: H, fps} = spec.meta;
  const bg = shot.background ? spec.backgrounds[shot.background] : undefined;
  const cam = shot.camera ?? {};
  const shk = shakeOffset(shot.effects, f);
  const cx = evalTrack(cam.x, f, 0) + shk.x;
  const cy = evalTrack(cam.y, f, 0) + shk.y;
  const zoom = evalTrack(cam.zoom, f, 1);
  const roll = evalTrack(cam.rot, f, 0) + shk.r;
  const yaw = evalTrack(cam.yaw, f, 0) + shk.r * 0.6;
  const pitch = evalTrack(cam.pitch, f, 0);
  const persp = evalTrack(cam.persp, f, PERSP);
  const dolly = persp * (1 - 1 / Math.max(0.2, zoom));
  const r3 = spec.style.three ?? {};
  const lit = r3.lights !== false && !!shot.lighting;
  const d2r = Math.PI / 180;

  const effects2d = (shot.effects ?? []).filter((e) => !FX3D.has(e.type));
  const effects3d = (shot.effects ?? []).filter((e) => FX3D.has(e.type));
  const neon = r3.neon ?? [spec.style.palette.pink ?? '#ff2e88', spec.style.palette.blue ?? '#00d1ff'];
  const layers = bg?.layers ?? [];
  const back = layers.filter((l) => l.depth < 0.995);
  const front = layers.filter((l) => l.depth >= 0.995);
  // misma cámara para three.js y para la capa vectorial CSS → proyección idéntica en z=0
  const cssCamera = `translateZ(${dolly.toFixed(1)}px) rotateX(${pitch.toFixed(3)}deg) rotateY(${yaw.toFixed(3)}deg) rotateZ(${roll.toFixed(3)}deg) translate(${(-cx).toFixed(1)}px, ${(-cy).toFixed(1)}px)`;
  const world = (children: React.ReactNode) => (
    <group position={[0, 0, dolly / U]}>
      <group rotation={[-pitch * d2r, 0, 0]}>
        <group rotation={[0, yaw * d2r, 0]}>
          <group rotation={[0, 0, -roll * d2r]}>
            <group position={[-cx / U, cy / U, 0]}>{children}</group>
          </group>
        </group>
      </group>
    </group>
  );
  const cssPlane = (key: string, z: number, content: React.ReactNode, opacity = 1) => {
    const s = (PERSP - z) / PERSP;
    return (
      <div key={key} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translateZ(${z.toFixed(1)}px) scale(${s.toFixed(4)})`, opacity}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'visible', position: 'absolute', inset: 0}}>{content}</svg>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{background: shot.bgColor ?? spec.style.palette.ink ?? '#0d0d0d'}}>
      {lit ? (
      <ThreeCanvas width={W} height={H} linear={false} flat>
        <CameraRig persp={persp} W={W} H={H} />
        <ambientLight intensity={r3.ambient ?? 2.4} />
        <directionalLight position={[-4, 6, 8]} intensity={r3.key ?? 0.9} />
        {true
          ? neon.map((c, i) => (
              <pointLight key={i} position={[(i % 2 ? 4 : -4) + Math.sin(f / fps + i) * 0.6, 3 - i * 4, 3]} color={c} intensity={r3.neonIntensity ?? 40} distance={14} decay={1.6} />
            ))
          : null}
        {world(back.map((l) => <BgPlane key={l.id} l={l} bgKey={bg!.id} spec={spec} f={f} lit={lit} />))}
      </ThreeCanvas>
      ) : null}
      <AbsoluteFill style={{perspective: `${persp.toFixed(0)}px`, perspectiveOrigin: '50% 50%', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformStyle: 'preserve-3d', transformOrigin: '50% 50%', transform: cssCamera}}>
          {lit ? null : back.map((l) => cssPlane(l.id, depthToZ(l.depth), <g dangerouslySetInnerHTML={{__html: l.svg ?? ''}} />, layerAnimProps(l, f, fps, W, H).opacity))}
          {cssPlane('actors', 0, (
            <>
              {[...(shot.actors ?? [])]
                .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
                .map((a) => (spec.rigs[a.rig] ? <ActorView key={a.id} actor={a} rig={spec.rigs[a.rig]} frame={f} fps={fps} /> : null))}
              <WorldEffects effects={effects2d} f={f} w={W} h={H} />
            </>
          ))}
          {front.map((l) => cssPlane(l.id, depthToZ(Math.max(1.02, l.depth)), <g dangerouslySetInnerHTML={{__html: l.svg ?? ''}} />))}
        </div>
      </AbsoluteFill>
      {effects3d.some((e) => f >= e.start && f <= e.start + e.dur) ? (
        <ThreeCanvas width={W} height={H} linear={false} flat style={{position: 'absolute', inset: 0}}>
          <CameraRig persp={persp} W={W} H={H} />
          {world(effects3d.map((e, i) => <Debris key={i} e={e} f={f} W={W} H={H} />))}
        </ThreeCanvas>
      ) : null}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <ScreenEffects effects={shot.effects} f={f} w={W} h={H} />
      </svg>
    </AbsoluteFill>
  );
};
