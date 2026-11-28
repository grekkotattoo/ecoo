import {SpotLight} from '@react-three/drei';
import React, {useMemo} from 'react';
import {random} from 'remotion';
import * as THREE from 'three';
import {Allosaurus} from '../components/Allosaurus';
import {StudioEnv} from '../components/Env';
import {Particles} from '../components/Particles';
import {CameraRig, Stage3D} from '../components/Stage3D';
import {mix, mix3, sp, SNAPPY, wobble} from '../lib/anim';
import {useTimeline} from '../lib/anim';

const LAVA = '#ff5400';
const BG = '#140805';

export const Scene02: React.FC = () => {
  const {frame, fps, tick} = useTimeline();
  const t = frame / fps;

  // Zumbido de la máquina: ráfagas con muelle. Local 260 ≈ "CERO PULSO".
  const buzz = Math.max(
    0,
    sp(frame, fps, 40, SNAPPY) - 0.8 * sp(frame, fps, 175, SNAPPY) + 1.0 * sp(frame, fps, 245, SNAPPY),
  );
  const panic = sp(frame, fps, 250, {damping: 10, stiffness: 90});
  const jaw = 0.12 + 0.25 * sp(frame, fps, 255, {damping: 9, stiffness: 120}) + Math.sin(t * 3) * 0.03;

  // CÁMARA contrapicada que se acerca (muelle lento) + camera shake sincronizado al zumbido.
  const approach = sp(frame, fps, 0, {damping: 24, stiffness: 28, mass: 1.6});
  const basePos = mix3([0.2, 0.3, 8.6], [1.0, 0.55, 6.3], approach);
  const baseTarget = mix3([0, 3.0, 1.2], [0.05, 3.35, 1.6], approach);
  const kick = sp(frame, fps, 245, {damping: 6, stiffness: 260, mass: 0.4}); // golpe al arrancar fuerte
  const amp = buzz * 0.035 + (1 - kick) * (frame > 245 ? 0.08 : 0);
  const jitter = (n: number) => (random(`shake-${frame}-${n}`) - 0.5) * 2;
  const shake: [number, number, number] = [
    amp * (jitter(1) * 0.6 + wobble(t * 25, 1) * 0.4),
    amp * (jitter(2) * 0.6 + wobble(t * 29, 2) * 0.4),
    amp * 0.4 * jitter(3),
  ];
  const pos: [number, number, number] = [basePos[0] + shake[0], basePos[1] + shake[1], basePos[2] + shake[2]];
  const target: [number, number, number] = [baseTarget[0] + shake[0] * 0.5, baseTarget[1] + shake[1] * 0.5, baseTarget[2]];
  const fov = mix(46, 48, approach) + buzz * 0.6 * jitter(4);

  const keyTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 3.8, 1.6);
    return o;
  }, []);
  const lavaPulse = 1 + Math.sin(t * 2.3) * 0.12 + Math.sin(t * 5.1) * 0.06;

  return (
    <Stage3D background={BG} exposure={1.1}>
      <CameraRig position={pos} target={target} fov={fov} roll={shake[0] * 0.6} />
      <fog attach="fog" args={[BG, 8, 34]} />
      <StudioEnv intensity={0.45} warm="#ff8a3d" cool="#4cc9f0" />

      {/* Luz lateral naranja volcánica (key) */}
      <primitive object={keyTarget} />
      <SpotLight
        castShadow
        target={keyTarget}
        position={[5.5, 4.2, 3.2]}
        color={LAVA}
        intensity={95 * lavaPulse}
        angle={0.55}
        penumbra={0.6}
        distance={22}
        decay={1.7}
        attenuation={9}
        anglePower={4}
        opacity={0.18}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
      />
      {/* Contra fría y relleno bajo */}
      <directionalLight color="#4cc9f0" intensity={1.6} position={[-4, 6, -5]} />
      <directionalLight color="#fff1e0" intensity={0.9} position={[-3, 3, 6]} />
      <pointLight color="#ff7b2e" intensity={14} distance={9} decay={2} position={[1.5, 0.6, 3.5]} />
      <ambientLight intensity={0.12} color="#ffb38a" />

      {/* Suelo volcánico */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1b120e" roughness={0.95} />
      </mesh>
      {/* Volcán de fondo */}
      <group position={[-7, 0, -26]}>
        <mesh>
          <coneGeometry args={[11, 16, 9, 1, true]} />
          <meshStandardMaterial color="#120a08" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 7.4, 0]}>
          <cylinderGeometry args={[1.6, 2.2, 1.4, 12]} />
          <meshStandardMaterial color={LAVA} emissive={LAVA} emissiveIntensity={4 * lavaPulse} toneMapped={false} />
        </mesh>
        <pointLight color={LAVA} intensity={400} distance={40} decay={1.8} position={[0, 9, 2]} />
      </group>

      <group position={[0, 0, 0]} rotation={[0, -0.12, 0]}>
        <Allosaurus t={t} frame={tick} buzz={buzz} jaw={jaw} panic={panic} />
      </group>

      {/* Ceniza flotando + brasas */}
      <Particles count={260} t={t} box={[9, 7, 8]} center={[0, 0, 1]} fall={0.35} size={0.022} seed="ash">
        <meshStandardMaterial color="#6d6561" roughness={1} />
      </Particles>
      <Particles count={60} t={t} box={[8, 7, 7]} center={[0, 0, 1]} fall={-0.5} size={0.018} seed="ember" geometry="sphere">
        <meshBasicMaterial color="#ff8c2e" toneMapped={false} />
      </Particles>
    </Stage3D>
  );
};
