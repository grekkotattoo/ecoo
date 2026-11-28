// ESCENA 3 — EL PULSO SIN GRAVEDAD (frames 720–1200). Tercera ley de Newton: salen girando como peonzas.
import React from 'react';
import {useDesignFrame} from '../lib/time';
import type {Vec3} from '../config/physics';
import {ASTRO_SIM, DESIGN_BEATS, DESIGN_FPS, PALETTE, WALL_HITS_DESIGN} from '../config/timeline';
import {ease, EASE, lerp3, sp} from '../lib/motion';
import {Astronaut} from '../three/Astronaut';
import {CabinLights, ISSModule, MODULE_R, StudioEnv} from '../three/ISS';
import {TattooMachine} from '../three/Props';
import {CameraRig, SceneCanvas} from '../three/Stage';

const IMPULSE = DESIGN_BEATS.S03.needleContact; // 120 (diseño)
const HITS_LOCAL = WALL_HITS_DESIGN;

/** Intensidad de alarma: destello con caída exponencial en cada choque + latido suave tras el primero. */
const alarmLevel = (frame: number) => {
  let flash = 0;
  for (const h of [IMPULSE, ...HITS_LOCAL]) if (frame >= h) flash = Math.max(flash, Math.exp(-(frame - h) / 16));
  const pulse = frame > IMPULSE ? (0.5 + 0.5 * Math.sin((frame - IMPULSE) * 0.16)) * 0.35 : 0;
  return Math.min(1.3, flash + pulse);
};

/** Aplastamiento elástico (muelle) al chocar. */
const squash = (frame: number, fps: number, hits: number[]) => {
  let s = 0;
  for (const h of hits) if (frame >= h && frame < h + 40) s = Math.max(s, Math.sin(sp(frame, fps, h, {damping: 7, stiffness: 260, mass: 0.5}) * Math.PI) * (1 - (frame - h) / 40));
  return s;
};

export const Scene03: React.FC = () => {
  const frame = useDesignFrame('S03');
  const fps = DESIGN_FPS;
  const t = frame / fps;
  const a = ASTRO_SIM.a[Math.min(Math.round(frame), ASTRO_SIM.a.length - 1)];
  const b = ASTRO_SIM.b[Math.min(Math.round(frame), ASTRO_SIM.b.length - 1)];
  const flying = frame >= IMPULSE;

  // Aproximación del tatuador al brazo (antes del impulso)
  const reach = ease(frame, [10, IMPULSE], [0, 1], EASE.inOut);
  // Agitación de extremidades tras el empujón (muelle que crece y oscila)
  const flail = flying ? sp(frame, fps, IMPULSE, {damping: 10, stiffness: 50}) : 0;
  const wob = (k: number) => Math.sin(t * 7 + k) * 0.9 * flail;

  const sqA = squash(frame, fps, [IMPULSE, ...HITS_LOCAL]);
  const sqB = squash(frame, fps, [IMPULSE, ...HITS_LOCAL.map((h) => h + 2)]);

  // Cámara: plano cercano del contacto → plano general con seguimiento del giro
  const wide = sp(frame, fps, IMPULSE - 6, {damping: 22, stiffness: 55, mass: 1.3});
  const mid = lerp3(a.pos, b.pos, 0.5);
  const follow: Vec3 = lerp3([0.05, -0.05, 0], lerp3(mid, a.pos, 0.35), wide);
  const camPos: Vec3 = lerp3([0.5, 0.45, 3.9], [follow[0] * 0.45, follow[1] * 0.35 + 0.2, 6.6], wide);
  const dutch = flying ? Math.sin((frame - IMPULSE) * 0.05) * 0.09 * wide + alarmLevel(frame) * 0.02 : 0.02;

  const alarm = alarmLevel(frame);

  const machineInHand = (
    <TattooMachine position={[0.02, -0.08, 0.12]} rotation={[Math.PI / 2 + 0.25, 0, 0]} scale={0.55} needle={flying ? 0 : Math.abs(Math.sin(frame * 3)) * 0.02} on />
  );

  return (
    <SceneCanvas background="#030305">
      <CameraRig position={camPos} target={follow} fov={ease(frame, [IMPULSE - 10, IMPULSE + 60], [40, 58], EASE.out)} roll={dutch} />
      <StudioEnv intensity={0.55} />
      <CabinLights cabin={0.45} earth={0.6} />

      {/* Alarma ámbar: balizas + luz que baña la cabina */}
      {[0, Math.PI].map((ang, i) => (
        <group key={i} position={[Math.cos(ang + Math.PI / 2) * (MODULE_R - 0.15), Math.sin(ang + Math.PI / 2) * (MODULE_R - 0.15), -1.5 + i * 3]}>
          <mesh>
            <sphereGeometry args={[0.16, 24, 16]} />
            <meshStandardMaterial color={PALETTE.alarm} emissive={PALETTE.alarm} emissiveIntensity={0.3 + alarm * 6} toneMapped={false} />
          </mesh>
          <pointLight intensity={alarm * 26} distance={9} decay={1.4} color={PALETTE.alarm} />
        </group>
      ))}
      <ambientLight intensity={alarm * 0.25} color={PALETTE.alarm} />

      <ISSModule exterior={false} />

      {/* Tatuador (A) */}
      <group position={a.pos} rotation={a.rot} scale={[1 + sqA * 0.12, 1 - sqA * 0.14, 1 + sqA * 0.12]}>
        <Astronaut
          rotation={[0, Math.PI / 2, 0]}
          accent="#e63946"
          rightHand={machineInHand}
          pose={{
            shoulderR: [-1.25 - reach * 0.25 + wob(1), 0.15, -0.35 + wob(2) * 0.4],
            elbowR: -0.55 + reach * 0.35 + wob(3) * 0.5,
            shoulderL: [-0.4 + wob(4), 0, 0.5 + wob(5) * 0.6],
            elbowL: -0.6 + wob(6) * 0.4,
            hipL: [-0.3 + wob(7) * 0.6, 0, 0.1],
            hipR: [0.15 + wob(8) * 0.6, 0, -0.1],
            kneeL: 0.5 + Math.abs(wob(9)) * 0.6,
            kneeR: 0.3 + Math.abs(wob(10)) * 0.6,
            head: [0.15 - reach * 0.2, 0, 0],
          }}
        />
      </group>

      {/* Tatuado (B) — ofrece el antebrazo */}
      <group position={b.pos} rotation={b.rot} scale={[1 + sqB * 0.12, 1 - sqB * 0.14, 1 + sqB * 0.12]}>
        <Astronaut
          rotation={[0, -Math.PI / 2, 0]}
          accent="#4361ee"
          pose={{
            shoulderL: [-1.45 + wob(11), 0, 0.35 + wob(12) * 0.4],
            elbowL: -0.25 + wob(13) * 0.5,
            shoulderR: [-0.3 + wob(14), 0, -0.5 + wob(15) * 0.6],
            elbowR: -0.8 + wob(16) * 0.4,
            hipL: [0.2 + wob(17) * 0.6, 0, 0.1],
            hipR: [-0.25 + wob(18) * 0.6, 0, -0.1],
            kneeL: 0.4 + Math.abs(wob(19)) * 0.6,
            kneeR: 0.6 + Math.abs(wob(20)) * 0.6,
            head: [0.1, 0.35 * (1 - flail), 0],
          }}
        />
      </group>

      {/* Chispa de contacto de la aguja */}
      {frame >= IMPULSE && frame < IMPULSE + 24 && (
        <mesh position={[0, 0.25, 0.1]} scale={0.02 + sp(frame, fps, IMPULSE, {damping: 30, stiffness: 300}) * 0.14}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#fff3b0" transparent opacity={1 - (frame - IMPULSE) / 24} toneMapped={false} />
        </mesh>
      )}
    </SceneCanvas>
  );
};
