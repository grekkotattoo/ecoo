import {SpotLight} from '@react-three/drei';
import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {CameraRig, Stage3D} from '../components/Stage3D';
import {StudioEnv} from '../components/Env';
import {TattooChair} from '../components/TattooChair';
import {ease, mix, mix3, sp, wobble} from '../lib/anim';
import {makeBarkTexture} from '../lib/textures';

const FOG = '#0d3437';
const MOON = '#4cc9f0';

const FrondSegment: React.FC<{children?: React.ReactNode; w: number; seg: number; color: string; sway: number}> = ({
  children,
  w,
  seg,
  color,
  sway,
}) => (
  <group rotation={[0.32 + sway, 0, 0]}>
    <mesh castShadow receiveShadow position={[0, seg / 2, 0]} scale={[1, 1, 0.18]}>
      <coneGeometry args={[w, seg, 4, 1]} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading side={THREE.DoubleSide} />
    </mesh>
    <group position={[0, seg * 0.9, 0]}>{children}</group>
  </group>
);

const Frond: React.FC<{angle: number; tilt: number; length: number; color: string; sway: number}> = ({
  angle,
  tilt,
  length,
  color,
  sway,
}) => {
  const p = {seg: length / 3, color, sway};
  return (
    <group rotation={[0, angle, 0]}>
      <group rotation={[tilt, 0, 0]}>
        <FrondSegment w={0.34} {...p}>
          <FrondSegment w={0.3} {...p}>
            <FrondSegment w={0.22} {...p} />
          </FrondSegment>
        </FrondSegment>
      </group>
    </group>
  );
};

const Fern: React.FC<{position: [number, number, number]; scale: number; seed: number; t: number}> = ({
  position,
  scale,
  seed,
  t,
}) => {
  const n = 7 + Math.floor(random(`fern-n-${seed}`) * 4);
  const colors = ['#1f5a2e', '#2a6b33', '#174a2a', '#33773a'];
  return (
    <group position={position} scale={scale}>
      {Array.from({length: n}).map((_, i) => (
        <Frond
          key={i}
          angle={(i / n) * Math.PI * 2 + random(`fa-${seed}-${i}`)}
          tilt={0.25 + random(`ft-${seed}-${i}`) * 0.35}
          length={1.6 + random(`fl-${seed}-${i}`) * 1.2}
          color={colors[i % colors.length]}
          sway={wobble(t * 0.9, seed + i) * 0.05}
        />
      ))}
    </group>
  );
};

const Rock: React.FC<{position: [number, number, number]; scale: number; seed: number}> = ({position, scale, seed}) => (
  <mesh
    castShadow
    receiveShadow
    position={position}
    scale={[scale, scale * (0.55 + random(`rs-${seed}`) * 0.4), scale * 0.9]}
    rotation={[random(`rx-${seed}`), random(`ry-${seed}`) * 3, 0]}
  >
    <dodecahedronGeometry args={[1, 0]} />
    <meshStandardMaterial color="#17161a" roughness={0.88} metalness={0.05} flatShading />
  </mesh>
);

const Tree: React.FC<{position: [number, number, number]; h: number; r: number; seed: number}> = ({position, h, r, seed}) => (
  <group position={position} rotation={[0, random(`tr-${seed}`) * 3, (random(`tz-${seed}`) - 0.5) * 0.12]}>
    <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
      <cylinderGeometry args={[r * 0.7, r, h, 7, 4]} />
      <meshStandardMaterial color="#2a2019" roughness={0.95} flatShading />
    </mesh>
    {/* Corona de cícada */}
    {Array.from({length: 9}).map((_, i) => (
      <group key={i} position={[0, h, 0]} rotation={[0, (i / 9) * Math.PI * 2, 0]}>
        <mesh castShadow position={[0, 0.2, 1.2]} rotation={[1.15, 0, 0]} scale={[1, 1, 0.15]}>
          <coneGeometry args={[0.35, 3.2, 4]} />
          <meshStandardMaterial color="#1c4d2a" roughness={0.9} flatShading side={THREE.DoubleSide} />
        </mesh>
      </group>
    ))}
  </group>
);

const LightStand: React.FC<{position: [number, number, number]; target: [number, number, number]}> = ({
  position,
  target,
}) => {
  const metal = <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.35} />;
  const head = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...position);
    o.lookAt(...target);
    return o.quaternion.clone();
  }, [position, target]);
  return (
    <group>
      <mesh castShadow position={[position[0], position[1] / 2, position[2]]}>
        <cylinderGeometry args={[0.03, 0.04, position[1], 10]} />
        {metal}
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} castShadow position={[position[0], 0.3, position[2]]} rotation={[0, (i / 3) * Math.PI * 2, 0.6]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
          {metal}
        </mesh>
      ))}
      <group position={position} quaternion={head}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.22, 0.45, 24, 1, true]} />
          <meshStandardMaterial color="#111" metalness={0.7} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <circleGeometry args={[0.3, 24]} />
          <meshStandardMaterial color="#fff2d6" emissive="#ffb36b" emissiveIntensity={6} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const bark = useMemo(() => makeBarkTexture(), []);

  const ferns = useMemo(
    () =>
      Array.from({length: 42}).map((_, i) => {
        const a = random(`fa${i}`) * Math.PI * 2;
        const d = 2.6 + random(`fd${i}`) * 16;
        let x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (z > 0 && Math.abs(x) < 2.2) x = Math.sign(x || 1) * (2.2 + random(`fx${i}`) * 2);
        return {pos: [x, 0, z] as [number, number, number], s: 0.7 + random(`fs${i}`) * 1.1, seed: i};
      }),
    [],
  );
  const rocks = useMemo(
    () =>
      Array.from({length: 16}).map((_, i) => {
        const a = random(`ra${i}`) * Math.PI * 2;
        const d = 3 + random(`rd${i}`) * 14;
        let x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (z > 0 && Math.abs(x) < 2.4) x = Math.sign(x || 1) * 2.6;
        return {pos: [x, 0.1, z] as [number, number, number], s: 0.4 + random(`rsz${i}`) * 1.2, seed: i};
      }),
    [],
  );
  const trees = useMemo(
    () =>
      Array.from({length: 12}).map((_, i) => {
        const x = (random(`tx${i}`) - 0.5) * 34;
        const z = -4 - random(`tz${i}`) * 20;
        return {pos: [x, 0, z] as [number, number, number], h: 7 + random(`th${i}`) * 6, r: 0.35 + random(`trr${i}`) * 0.4, seed: i};
      }),
    [],
  );

  // CÁMARA: empuje rápido con muelle (plano general → primer plano) + dolly zoom real al final.
  const push = sp(frame, fps, 14, {damping: 21, stiffness: 52, mass: 1.25});
  const target = mix3([0, 2.4, 0], [0, 1.85, 0], push);
  const close: [number, number, number] = [1.7, 2.6, 5.0];
  let pos = mix3([0.4, 7.5, 25], close, push);
  let fov = mix(58, 30, push);
  const vertigo = ease(frame, [185, 300], [0, 1]);
  if (vertigo > 0) {
    const fov2 = mix(30, 21, vertigo);
    const k = Math.tan(THREE.MathUtils.degToRad(30 / 2)) / Math.tan(THREE.MathUtils.degToRad(fov2 / 2));
    pos = [target[0] + (close[0] - target[0]) * k, target[1] + (close[1] - target[1]) * k, target[2] + (close[2] - target[2]) * k];
    fov = fov2;
  }
  const roll = mix(0.05, -0.02, push);

  // Foco de estudio: se enciende con un golpe (muelle) al llegar la cámara.
  const lampOn = sp(frame, fps, 4, {damping: 8, stiffness: 140, mass: 0.6});
  const flicker = 0.9 + 0.1 * Math.sin(frame * 1.3) * Math.sin(frame * 0.37);
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 1.7, 0);
    return o;
  }, []);

  const spores = useMemo(
    () =>
      Array.from({length: 40}).map((_, i) => ({
        base: [(random(`sx${i}`) - 0.5) * 14, 0.5 + random(`sy${i}`) * 4, (random(`sz${i}`) - 0.5) * 14] as [number, number, number],
        seed: i,
      })).filter(({base}) => !(base[2] > 0.8 && Math.abs(base[0]) < 3)),
    [],
  );

  return (
    <Stage3D background={FOG} exposure={1.05}>
      <CameraRig position={pos} target={target} fov={fov} roll={roll} />
      <fogExp2 attach="fog" args={[FOG, 0.034]} />
      <StudioEnv intensity={0.15} warm="#ffb36b" cool={MOON} />

      {/* Luna fría cenital */}
      <directionalLight
        castShadow
        color={MOON}
        intensity={2.4}
        position={[-5, 16, -6]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <hemisphereLight args={['#3aa6c9', '#05140f', 0.35]} />
      <mesh position={[-22, 46, -70]}>
        <sphereGeometry args={[4, 32, 24]} />
        <meshBasicMaterial color="#d8f6ff" fog={false} toneMapped={false} />
      </mesh>

      {/* Foco cálido de estudio con cono volumétrico */}
      <primitive object={spotTarget} />
      <SpotLight
        castShadow
        target={spotTarget}
        position={[2.6, 5.6, 3.1]}
        color="#ffb36b"
        intensity={160 * lampOn * flicker}
        angle={0.3}
        penumbra={0.45}
        distance={16}
        decay={1.6}
        attenuation={7}
        anglePower={5}
        opacity={0.55 * lampOn}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
      />
      <LightStand position={[2.6, 5.6, 3.1]} target={[0, 1.7, 0]} />

      {/* Suelo */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#0b1813" roughness={1} />
      </mesh>

      {/* Charcos de lava (luz ambiental volcánica) */}
      {[[-6, -9], [7, -12], [-3.5, 6]].map(([x, z], i) => (
        <group key={i} position={[x, 0.02, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 1, 1]}>
            <circleGeometry args={[0.9, 20]} />
            <meshStandardMaterial color="#ff5400" emissive="#ff5400" emissiveIntensity={3 + Math.sin(t * 2 + i) * 0.6} toneMapped={false} />
          </mesh>
          <pointLight color="#ff5400" intensity={6} distance={6} decay={2} position={[0, 0.6, 0]} />
        </group>
      ))}

      {trees.map((tr) => (
        <Tree key={tr.seed} position={tr.pos} h={tr.h} r={tr.r} seed={tr.seed} />
      ))}
      {rocks.map((r) => (
        <Rock key={r.seed} position={r.pos} scale={r.s} seed={r.seed} />
      ))}
      {ferns.map((f) => (
        <Fern key={f.seed} position={f.pos} scale={f.s} seed={f.seed} t={t} />
      ))}

      {/* Tronco caído + silla */}
      <group position={[0, 0.55, 0]}>
        <mesh castShadow receiveShadow rotation={[0, 0.15, Math.PI / 2]}>
          <cylinderGeometry args={[0.52, 0.6, 5.2, 14, 3]} />
          <meshStandardMaterial map={bark} color="#6b5040" roughness={0.95} flatShading />
        </mesh>
        {[-2.5, 2.55].map((x) => (
          <mesh key={x} position={[x, 0, x * 0.15 * -1]} rotation={[0, 0.15, Math.PI / 2]}>
            <cylinderGeometry args={[0.5, 0.5, 0.02, 14]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
          </mesh>
        ))}
        <mesh castShadow position={[-1.4, 0.45, 0.25]} rotation={[0.3, 0.4, 0.5]}>
          <cylinderGeometry args={[0.06, 0.12, 1, 6]} />
          <meshStandardMaterial color="#3a2a1e" roughness={0.95} flatShading />
        </mesh>
      </group>
      <TattooChair position={[0, 1.08, 0]} rotation={[0, 0.25, 0]} />

      {/* Esporas bioluminiscentes */}
      {spores.map(({base, seed}) => (
        <mesh key={seed} position={[base[0] + wobble(t * 0.6, seed) * 0.5, base[1] + wobble(t * 0.4, seed + 9) * 0.4, base[2]]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial color="#9bf6ff" toneMapped={false} />
        </mesh>
      ))}
    </Stage3D>
  );
};
