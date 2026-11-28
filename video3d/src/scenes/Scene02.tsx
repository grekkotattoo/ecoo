// ESCENA 2 — LA TINTA FLOTANTE (frames 300–720). La máquina se enciende (420) → nube negra asesina.
import React, {useMemo} from 'react';
import {useDesignFrame} from '../lib/time';
import * as THREE from 'three';
import type {Vec3} from '../config/physics';
import {DESIGN_BEATS, DESIGN_FPS, PALETTE} from '../config/timeline';
import {buzz, cameraBasis, ease, EASE, rnd, rndRange, sp} from '../lib/motion';
import {CabinLights, ISSModule, MODULE_R, StudioEnv} from '../three/ISS';
import {InkBottle, TattooMachine} from '../three/Props';
import {AimedSpotLight, CameraRig, SceneCanvas} from '../three/Stage';

const ON = DESIGN_BEATS.S02.machineOn; // 120 (diseño)
const SPLAT = DESIGN_BEATS.S02.lensSplat; // 300 (diseño)
const ORIGIN: Vec3 = [0, 0.3, 2]; // boca del bote (coordenadas del módulo)
const BLOBS = 56;

const InkMaterial: React.FC = () => (
  <meshPhysicalMaterial color={PALETTE.ink} roughness={0.04} metalness={0.15} clearcoat={1} clearcoatRoughness={0.02} reflectivity={0.9} />
);

interface Blob {
  dir: Vec3;
  speed: number;
  delay: number;
  r: number;
  phase: number;
}

const useBlobs = () =>
  useMemo<Blob[]>(
    () =>
      new Array(BLOBS).fill(0).map((_, i) => {
        // Hemisferio superior sesgado (sale por la boquilla) + dispersión completa
        const u = rndRange(`bu${i}`, -0.35, 1);
        const a = rnd(`ba${i}`) * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        return {
          dir: [Math.cos(a) * s, u, Math.sin(a) * s * 0.8] as Vec3,
          speed: rndRange(`bs${i}`, 0.35, 1.25),
          delay: ON + 4 + Math.floor(i * 1.6 + rnd(`bd${i}`) * 6),
          r: rndRange(`br${i}`, 0.025, i % 7 === 0 ? 0.16 : 0.085),
          phase: rnd(`bp${i}`) * 10,
        };
      }),
    [],
  );

/** Posición de una gota: arranque con muelle (expulsión) y deriva en cámara lenta. Choca con las paredes. */
const blobState = (b: Blob, frame: number, fps: number) => {
  const tl = (frame - b.delay) / fps;
  if (tl <= 0) return null;
  const kick = sp(frame, fps, b.delay, {damping: 18, stiffness: 60, mass: 1.2}); // 0→1
  const dist = kick * 0.35 + tl * b.speed * 0.42; // cámara lenta: deriva suave tras la expulsión
  const p: Vec3 = [ORIGIN[0] + b.dir[0] * dist, ORIGIN[1] + b.dir[1] * dist, ORIGIN[2] + b.dir[2] * dist];
  const radial = Math.hypot(p[0], p[1]);
  const wall = MODULE_R - 0.18;
  if (radial > wall) {
    const n: Vec3 = [p[0] / radial, p[1] / radial, 0];
    return {pos: [n[0] * (wall + 0.06), n[1] * (wall + 0.06), p[2]] as Vec3, splat: true, normal: n, tl};
  }
  return {pos: p, splat: false, normal: [0, 0, 0] as Vec3, tl};
};

const LensSplat: React.FC<{cam: Vec3; target: Vec3; offset: [number, number]; size: number; start: number; frame: number; fps: number; seed: number}> = ({
  cam,
  target,
  offset,
  size,
  start,
  frame,
  fps,
  seed,
}) => {
  if (frame < start) return null;
  const {forward, right, up} = cameraBasis(cam, target);
  const d = 0.11;
  const p: Vec3 = [
    cam[0] + forward[0] * d + right[0] * offset[0] + up[0] * offset[1],
    cam[1] + forward[1] * d + right[1] * offset[0] + up[1] * offset[1],
    cam[2] + forward[2] * d + right[2] * offset[0] + up[2] * offset[1],
  ];
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...right), new THREE.Vector3(...up), new THREE.Vector3(-forward[0], -forward[1], -forward[2]));
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  const impact = sp(frame, fps, start, {damping: 9, stiffness: 180, mass: 0.6}); // impacto con rebote
  const drip = ease(frame, [start + 20, start + 120], [0, 0.012]); // escurre lentamente
  const s = size * impact;
  return (
    <group position={[p[0] - up[0] * drip, p[1] - up[1] * drip, p[2] - up[2] * drip]} quaternion={q}>
      <mesh scale={[s, s * (0.85 + (seed % 3) * 0.06), s * 0.18]}>
        <sphereGeometry args={[1, 32, 24]} />
        <InkMaterial />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = seed * 1.7 + k * 1.6;
        return (
          <mesh key={k} position={[Math.cos(a) * s * 1.25, Math.sin(a) * s * 1.2, 0]} scale={[s * 0.22, s * 0.22, s * 0.06]}>
            <sphereGeometry args={[1, 16, 12]} />
            <InkMaterial />
          </mesh>
        );
      })}
    </group>
  );
};

export const Scene02: React.FC = () => {
  const frame = useDesignFrame('S02');
  const fps = DESIGN_FPS;
  const t = frame / fps;
  const blobs = useBlobs();
  const on = frame >= ON;

  // Órbita lenta de 90° en cámara lenta alrededor de la nube
  const orbit = ease(frame, [0, 420], [-0.35, -0.35 + Math.PI / 2], EASE.inOut);
  const radiusK = ease(frame, [110, 360], [1.45, 1.8], EASE.cine);
  const center: Vec3 = [ORIGIN[0], ORIGIN[1] + ease(frame, [100, 380], [0.05, 0.45]), ORIGIN[2]];
  const shake = on ? buzz(frame, 0.004 * ease(frame, [ON, ON + 20], [1, 0.35]), 3) : 0;
  const cam: Vec3 = [center[0] + Math.sin(orbit) * radiusK + shake, center[1] + 0.2 + ease(frame, [0, 420], [0.1, 0.35]), center[2] + Math.cos(orbit) * radiusK];

  // Máquina: aguja junto a la boquilla; al encender vibra y retrocede por la reacción
  const needle = on ? Math.abs(Math.sin(frame * 3.1)) * 0.035 : 0;
  const recoil = sp(frame, fps, ON, {damping: 10, stiffness: 90});
  const mPos: Vec3 = [ORIGIN[0] + 0.22 + recoil * 0.25 + buzz(frame, on ? 0.006 : 0), ORIGIN[1] + 0.78 + recoil * 0.12, ORIGIN[2] - 0.05];
  const mRot: Vec3 = [0.05, 0.4, 0.45 + recoil * 0.35 + (on ? buzz(frame, 0.01, 1) : 0)];

  const bottleRot: Vec3 = [Math.sin(t * 0.6) * 0.05, t * 0.15, Math.sin(t * 0.5) * 0.06 + (on ? buzz(frame, 0.004, 2) : 0)];

  return (
    <SceneCanvas background="#020203">
      <CameraRig position={cam} target={center} fov={42} />
      <StudioEnv intensity={0.18} tint="#5aa9e6" />
      <CabinLights cabin={0.1} earth={0.35} />
      {/* Luz lateral de alto contraste: dibuja el brillo especular de cada gota */}
      <AimedSpotLight
        position={[2.2, 1.2, 2.6]}
        target={ORIGIN}
        angle={0.55}
        penumbra={0.4}
        intensity={90}
        distance={8}
        decay={1.6}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-1.8, 1.4, 0.8]} intensity={6} distance={5} color={PALETTE.earth} />
      <ISSModule exterior={false} />

      <InkBottle position={[ORIGIN[0], ORIGIN[1] - 0.58, ORIGIN[2]]} rotation={bottleRot} />
      <TattooMachine position={mPos} rotation={mRot} needle={needle} on={on} />

      {/* Gotas de tinta: esferas líquidas que tiemblan y se aplastan al tocar los paneles */}
      {blobs.map((b, i) => {
        const st = blobState(b, frame, fps);
        if (!st) return null;
        if (st.splat) {
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-st.normal[0], -st.normal[1], 0));
          return (
            <mesh key={i} position={st.pos} quaternion={q} scale={[b.r * 2.1, b.r * 1.8, b.r * 0.25]} castShadow>
              <sphereGeometry args={[1, 24, 16]} />
              <InkMaterial />
            </mesh>
          );
        }
        const w = st.tl * 6 + b.phase;
        const grow = Math.min(1, sp(frame, fps, b.delay, {damping: 12, stiffness: 140}));
        return (
          <mesh key={i} position={st.pos} scale={[b.r * grow * (1 + Math.sin(w) * 0.14), b.r * grow * (1 - Math.sin(w) * 0.11), b.r * grow * (1 + Math.cos(w * 1.3) * 0.09)]} castShadow>
            <sphereGeometry args={[1, 32, 24]} />
            <InkMaterial />
          </mesh>
        );
      })}

      {/* Manchas en la lente */}
      <LensSplat cam={cam} target={center} offset={[-0.028, 0.034]} size={0.018} start={SPLAT} frame={frame} fps={fps} seed={1} />
      <LensSplat cam={cam} target={center} offset={[0.031, -0.02]} size={0.012} start={SPLAT + 34} frame={frame} fps={fps} seed={2} />
      <LensSplat cam={cam} target={center} offset={[0.012, 0.05]} size={0.008} start={SPLAT + 58} frame={frame} fps={fps} seed={4} />
    </SceneCanvas>
  );
};
