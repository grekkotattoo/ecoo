import {RoundedBox} from '@react-three/drei';
import React from 'react';
import {useCurrentFrame, useVideoConfig, random} from 'remotion';
import {Arm} from '../components/Arm';
import {StudioEnv} from '../components/Env';
import {CameraRig, Stage3D} from '../components/Stage3D';
import {ease, mix, sp, SNAPPY} from '../lib/anim';
import {Easing} from 'remotion';

const ALARM = '#d00000';
const ARM_X = -2.15; // hombro en coordenadas mundiales
const TABLE_Y = 0;
const ARM_Y = TABLE_Y + 0.36;
const TRIGGER = 105;

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Cambio brusco clínica → alarma
  const alarm = sp(frame, fps, TRIGGER, {damping: 7, stiffness: 300, mass: 0.4});
  const clinical = 1 - alarm * 0.55;
  const blink = frame >= TRIGGER ? Math.pow(Math.max(0, Math.sin((frame - TRIGGER) * 0.21)), 0.6) : 0;
  const strobe = frame >= TRIGGER && frame < TRIGGER + 10 ? (frame % 4 < 2 ? 1 : 0.2) : 1;

  // Frente de petrificación: hombro → mano
  const front = mix(ARM_X - 0.3, ARM_X + 4.75, ease(frame, [TRIGGER + 10, 455], [0, 1], Easing.inOut(Easing.quad)));
  const stoneFront = frame < TRIGGER + 10 ? -Infinity : front;

  // Ondas expansivas (shockwaves) que recorren el brazo
  const waves = [0, 18, 36, 54].map((delay) => {
    const local = frame - TRIGGER - 6 - delay;
    if (local < 0) return null;
    const cycle = (local % 72) / 72;
    const x = front + 0.15 + cycle * 1.4;
    const r = 0.42 + Math.sin(cycle * Math.PI) * 0.18;
    return {x, r, o: Math.sin(cycle * Math.PI), key: delay};
  });

  // CÁMARA: tracking lateral del hombro a la mano siguiendo el frente
  const dolly = ease(frame, [0, 500], [0, 1], Easing.inOut(Easing.sin));
  const follow = sp(frame, fps, TRIGGER, {damping: 26, stiffness: 30, mass: 1.6});
  const camX = mix(ARM_X + 0.6 + dolly * 0.3, Math.min(front + 0.45, ARM_X + 4.2), follow);
  const jolt = frame >= TRIGGER ? (1 - sp(frame, fps, TRIGGER, SNAPPY)) * 0.06 : 0;
  const jx = (random(`j${frame}`) - 0.5) * jolt;
  const jy = (random(`k${frame}`) - 0.5) * jolt;
  const pos: [number, number, number] = [camX + jx, ARM_Y + 1.75 + jy + ease(frame, [440, 540], [0, 0.4]), 3.3 + ease(frame, [440, 540], [0, 0.8])];
  const target: [number, number, number] = [camX + 0.25, ARM_Y + 0.05, 0];

  return (
    <Stage3D background="#06070a" exposure={1}>
      <CameraRig position={pos} target={target} fov={50} roll={jx} />
      <StudioEnv intensity={0.5 * clinical + 0.1} />

      {/* Luz clínica blanca */}
      <directionalLight
        castShadow
        color="#f4fbff"
        intensity={3.2 * clinical * strobe}
        position={[0.5, 6, 3]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0004}
      />
      <ambientLight color="#dfefff" intensity={0.5 * clinical + 0.04} />
      {/* Alarma roja parpadeante */}
      <spotLight
        castShadow
        color={ALARM}
        intensity={alarm * (25 + 60 * blink)}
        position={[camX - 1.5, 4, 2.5]}
        angle={0.9}
        penumbra={0.7}
        distance={14}
        decay={1.8}
      />
      <pointLight color={ALARM} intensity={alarm * 8 * blink} distance={8} decay={2} position={[camX + 1, 1.8, -1.2]} />
      {/* Baliza giratoria al fondo */}
      <group position={[camX + 0.4, 2.4, -2.6]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.18, 0.28, 24]} />
          <meshStandardMaterial
            color="#3a0000"
            emissive={ALARM}
            emissiveIntensity={alarm * (0.4 + 4 * blink)}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 24]} />
          <meshStandardMaterial color="#222" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Sala clínica */}
      <mesh position={[0, 2, -3]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial color="#c9d3da" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#8d969c" roughness={0.8} />
      </mesh>
      {/* Mesa de acero inoxidable */}
      <RoundedBox args={[9, 0.12, 2.2]} radius={0.04} position={[0.2, TABLE_Y - 0.06, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial color="#d7dde2" metalness={0.9} roughness={0.28} clearcoat={0.4} />
      </RoundedBox>
      {[-4, 4.4].map((x) =>
        [-0.9, 0.9].map((z) => (
          <mesh key={`${x}${z}`} position={[x, TABLE_Y - 0.6, z]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1, 12]} />
            <meshStandardMaterial color="#b9c0c6" metalness={1} roughness={0.25} />
          </mesh>
        )),
      )}
      {/* Paño quirúrgico bajo el brazo */}
      <RoundedBox args={[5.4, 0.02, 1.1]} radius={0.01} position={[ARM_X + 2.3, TABLE_Y + 0.01, 0]} receiveShadow>
        <meshStandardMaterial color="#5fa8a0" roughness={0.95} />
      </RoundedBox>

      {/* Brazo */}
      <group position={[ARM_X, ARM_Y, 0]}>
        <Arm stoneFront={stoneFront} />
      </group>

      {/* Shockwaves rojas */}
      {waves.map((w) =>
        w && w.x < ARM_X + 4.6 ? (
          <mesh key={w.key} position={[w.x, ARM_Y - 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[w.r, 0.025 + 0.03 * w.o, 12, 64]} />
            <meshStandardMaterial
              color={ALARM}
              emissive="#ff1e1e"
              emissiveIntensity={6 * w.o}
              transparent
              opacity={0.85 * w.o}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        ) : null,
      )}
      {/* Anillo incandescente en el frente de petrificación */}
      {frame > TRIGGER + 10 && front < ARM_X + 4.6 ? (
        <mesh position={[front, ARM_Y - 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.36, 0.05, 12, 64]} />
          <meshStandardMaterial color="#ff5a1f" emissive="#ff3b0f" emissiveIntensity={8} toneMapped={false} />
        </mesh>
      ) : null}
      {frame > TRIGGER + 10 ? (
        <pointLight color="#ff2a00" intensity={10} distance={2.5} decay={2} position={[front, ARM_Y + 0.6, 0.5]} />
      ) : null}
    </Stage3D>
  );
};
