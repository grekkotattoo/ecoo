// ESCENA 1 — EL GANCHO (frames 0–300). Dolly zoom atravesando la escotilla hasta la máquina flotante.
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import type {Vec3} from '../config/physics';
import {PALETTE} from '../config/timeline';
import {EASE, easeKeys, lerp3} from '../lib/motion';
import {CabinLights, Cable, Earth, ISSModule, Starfield, StudioEnv} from '../three/ISS';
import {PowerSupply, TattooMachine} from '../three/Props';
import {CameraRig, SceneCanvas} from '../three/Stage';

const MACHINE_POS: Vec3 = [0, 0, 0];

/** Punto local de la máquina → mundo (para enganchar el cable aunque gire). */
const toWorld = (local: Vec3, pos: Vec3, rot: Vec3): Vec3 => {
  const v = new THREE.Vector3(...local).applyEuler(new THREE.Euler(...rot));
  return [v.x + pos[0], v.y + pos[1], v.z + pos[2]];
};

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Empuje de cámara con muelle sobreamortiguado (entrada) y sin rebote (no atraviesa la máquina).
  const push = spring({frame: frame - 18, fps, durationInFrames: 215, config: {damping: 200, mass: 1.4}});
  const camA: Vec3 = [0.0, 1.4, 27];
  const camHatch: Vec3 = [0.05, 0.15, 8.6];
  const camEnd: Vec3 = [0.6, 0.3, 2.3];
  const pos = push < 0.62 ? lerp3(camA, camHatch, EASE.inOut(push / 0.62)) : lerp3(camHatch, camEnd, EASE.out((push - 0.62) / 0.38));
  // Dolly zoom: el FOV se abre mientras la cámara avanza (vértigo) y se recoge al llegar al primer plano.
  const fov = easeKeys(push, [0, 0.55, 0.75, 1], [24, 58, 64, 38], EASE.inOut);
  const target: Vec3 = lerp3([0, 0, 8], [MACHINE_POS[0], MACHINE_POS[1] + 0.12, MACHINE_POS[2]], EASE.inOut(Math.min(1, push * 1.25)));
  const roll = Math.sin(t * 0.8) * 0.04 * (1 - push) + easeKeys(push, [0.5, 0.7, 1], [0, 0.08, 0.02]);

  // Máquina flotando en ingravidez
  const mRot: Vec3 = [0.5 + Math.sin(t * 0.7) * 0.2, t * 0.45, 0.9 + Math.sin(t * 0.5) * 0.15];
  const mPos: Vec3 = [MACHINE_POS[0] + Math.sin(t * 0.9) * 0.04, MACHINE_POS[1] + Math.sin(t * 1.3) * 0.06, MACHINE_POS[2]];
  const psPos: Vec3 = [-1.15, -0.65 + Math.sin(t * 0.8 + 1) * 0.05, -1.6];
  const psRot: Vec3 = [0.2 + t * 0.06, 0.6 + t * 0.1, -0.15];
  const plug = toWorld([0, 0.7, 0], mPos, mRot);
  const socket = toWorld([-0.28, -0.15, 0.24], psPos, psRot);
  const cablePts: Vec3[] = [
    plug,
    [plug[0] - 0.15, plug[1] + 0.35, plug[2] - 0.2],
    [-0.55 + Math.sin(t) * 0.08, 0.55, -0.9],
    [-1.1, 0.15 + Math.sin(t * 1.1) * 0.06, -1.2],
    [socket[0] + 0.05, socket[1] + 0.25, socket[2] + 0.2],
    socket,
  ];

  return (
    <SceneCanvas>
      <CameraRig position={pos} target={target} fov={fov} roll={roll} />
      <StudioEnv intensity={0.55} />
      <CabinLights />
      {/* Sol exterior (solo ilumina el casco al principio) */}
      <directionalLight position={[18, 12, 20]} intensity={2.2} color="#fff4e0" />
      <Starfield />
      <Earth rotation={t * 0.02} />
      {/* Curvatura terrestre bajo la estación (solo visible desde fuera, en el arranque) */}
      <Earth position={[0, -76, 4]} radius={70} rotation={1.3 + t * 0.01} />
      <ISSModule />
      <TattooMachine position={mPos} rotation={mRot} />
      <PowerSupply position={psPos} rotation={psRot} />
      <Cable points={cablePts} radius={0.018} color="#0d0d0d" segments={80} />
      {/* Relleno frío sobre la máquina para separarla del fondo */}
      <pointLight position={[0.8, 0.6, 1.2]} intensity={2.5} distance={3} color={PALETTE.cabin} />
    </SceneCanvas>
  );
};
