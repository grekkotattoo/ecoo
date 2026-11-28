import {MeshReflectorMaterial, RoundedBox, SpotLight} from '@react-three/drei';
import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig, random} from 'remotion';
import * as THREE from 'three';
import {Arm} from '../components/Arm';
import {StudioEnv} from '../components/Env';
import {CameraRig, Stage3D} from '../components/Stage3D';
import {mix, mix3, sp, wobble} from '../lib/anim';
import {makeMarbleTexture, makePlaqueTexture} from '../lib/textures';

const BG = '#040406';
const PED_H = 1.05;
const CASE = {w: 2.3, h: 1.25, d: 1.25};
const FLASHES = [205, 238, 262, 300, 318, 352, 384, 401];

const Stanchion: React.FC<{position: [number, number, number]}> = ({position}) => (
  <group position={position}>
    <mesh castShadow position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.17, 0.19, 0.04, 32]} />
      <meshPhysicalMaterial color="#d9b25a" metalness={1} roughness={0.18} clearcoat={1} />
    </mesh>
    <mesh castShadow position={[0, 0.5, 0]}>
      <cylinderGeometry args={[0.028, 0.028, 0.95, 16]} />
      <meshPhysicalMaterial color="#d9b25a" metalness={1} roughness={0.18} clearcoat={1} />
    </mesh>
    <mesh castShadow position={[0, 1.0, 0]}>
      <sphereGeometry args={[0.055, 20, 14]} />
      <meshPhysicalMaterial color="#d9b25a" metalness={1} roughness={0.15} clearcoat={1} />
    </mesh>
  </group>
);

const Rope: React.FC<{a: THREE.Vector3; b: THREE.Vector3}> = ({a, b}) => {
  const geo = useMemo(() => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= 0.28;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    return new THREE.TubeGeometry(curve, 40, 0.032, 12, false);
  }, [a, b]);
  return (
    <mesh geometry={geo} castShadow>
      <meshPhysicalMaterial color="#8d0b16" roughness={0.75} sheen={1} sheenColor="#ff4d5e" sheenRoughness={0.4} />
    </mesh>
  );
};

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const marble = useMemo(() => makeMarbleTexture(), []);
  const plaque = useMemo(() => makePlaqueTexture(['Idiota del Jurásico', '(150M a.C.)']), []);
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, PED_H, 0);
    return o;
  }, []);

  // CÁMARA: plano detalle de la placa → pull back lento revelando la vitrina
  const pull = sp(frame, fps, 25, {damping: 30, stiffness: 16, mass: 2.4}, 380);
  const plaqueY = PED_H * 0.62;
  const plaqueZ = 0.56;
  const pos = mix3([0.08, plaqueY + 0.05, plaqueZ + 1.05], [1.1, 1.85, 7.6], pull);
  const target = mix3([0, plaqueY, plaqueZ], [0, 1.15, 0], pull);
  const fov = mix(34, 42, pull);
  const drift: [number, number, number] = [pos[0] + wobble(t * 0.4, 1) * 0.02, pos[1] + wobble(t * 0.3, 2) * 0.015, pos[2]];

  // Destellos de flash de cámaras del público (muelle muy rápido)
  const flash = FLASHES.reduce((acc, f, i) => {
    if (frame < f) return acc;
    const k = Math.exp(-(frame - f) / 3.2);
    return Math.max(acc, k * (0.7 + random(`fl${i}`) * 0.3));
  }, 0);
  const lastFlash = [...FLASHES].reverse().find((f) => frame >= f) ?? FLASHES[0];
  const flashIndex = FLASHES.indexOf(lastFlash);
  const flashPos: [number, number, number] = [
    (random(`fx${flashIndex}`) - 0.5) * 5,
    1.4 + random(`fy${flashIndex}`) * 0.6,
    3.5 + random(`fz${flashIndex}`) * 2,
  ];

  const ropePts = useMemo(
    () => ({
      l: new THREE.Vector3(-1.7, 0.98, 1.7),
      c: new THREE.Vector3(0, 0.98, 1.95),
      r: new THREE.Vector3(1.7, 0.98, 1.7),
      bl: new THREE.Vector3(-1.9, 0.98, -0.2),
      br: new THREE.Vector3(1.9, 0.98, -0.2),
    }),
    [],
  );

  return (
    <Stage3D background={BG} exposure={1.05}>
      <CameraRig position={drift} target={target} fov={fov} />
      <fog attach="fog" args={[BG, 6, 22]} />
      <StudioEnv intensity={0.25} warm="#ffe2b0" cool="#c7d6ff" />

      {/* Cenital dramática con cono de luz visible */}
      <primitive object={spotTarget} />
      <SpotLight
        castShadow
        target={spotTarget}
        position={[0, 6.2, 0.4]}
        color="#fff1d6"
        intensity={220}
        angle={0.32}
        penumbra={0.35}
        distance={11}
        decay={1.6}
        attenuation={7.5}
        anglePower={4.5}
        opacity={0.5}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <spotLight color="#ffd9a0" intensity={14} position={[0, 2.2, 3]} angle={0.25} penumbra={1} distance={6} decay={2} target={spotTarget} />
      <ambientLight intensity={0.04} />
      <pointLight color="#ffffff" intensity={flash * 260} distance={14} decay={2} position={flashPos} />
      {flash > 0.05 ? (
        <mesh position={flashPos}>
          <sphereGeometry args={[0.025 + flash * 0.04, 16, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={flash} />
        </mesh>
      ) : null}

      {/* Suelo de mármol reflectante */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          map={marble}
          color="#9a9a9e"
          blur={[300, 80]}
          resolution={1024}
          mixBlur={0.8}
          mixStrength={6}
          mirror={0.6}
          roughness={0.35}
          metalness={0.2}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
      {/* Pared del fondo con paneles */}
      <mesh position={[0, 4, -5]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#111014" roughness={0.85} />
      </mesh>
      {[-4.5, 4.5].map((x) => (
        <group key={x} position={[x, 2.1, -4.95]}>
          <RoundedBox args={[1.8, 2.4, 0.06]} radius={0.02}>
            <meshStandardMaterial color="#1d1a16" roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[1.5, 2.1]} />
            <meshStandardMaterial color="#2a2620" emissive="#3a2c18" emissiveIntensity={0.4} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Pedestal iluminado */}
      <RoundedBox args={[1.5, PED_H, 1.1]} radius={0.03} position={[0, PED_H / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#efeeea" roughness={0.4} clearcoat={0.6} />
      </RoundedBox>
      <mesh position={[0, PED_H + 0.006, 0]}>
        <boxGeometry args={[1.52, 0.012, 1.12]} />
        <meshStandardMaterial color="#fff4dc" emissive="#ffe0a8" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Placa dorada */}
      <group position={[0, plaqueY, plaqueZ]}>
        <RoundedBox args={[0.78, 0.4, 0.03]} radius={0.01} castShadow>
          <meshPhysicalMaterial color="#d4a73c" metalness={1} roughness={0.25} clearcoat={1} />
        </RoundedBox>
        <mesh position={[0, 0, 0.0155]}>
          <planeGeometry args={[0.74, 0.37]} />
          <meshPhysicalMaterial map={plaque} metalness={0.85} roughness={0.28} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sy) => (
            <mesh key={`${sx}${sy}`} position={[sx * 0.35, sy * 0.16, 0.02]}>
              <sphereGeometry args={[0.012, 10, 8]} />
              <meshStandardMaterial color="#8a6a20" metalness={1} roughness={0.3} />
            </mesh>
          )),
        )}
      </group>

      {/* Brazo fósil sobre soportes */}
      <group position={[-0.95, PED_H + 0.22, 0]} scale={0.42}>
        <Arm stoneFront={Infinity} withSleeve={false} />
      </group>
      {[-0.55, 0.45].map((x) => (
        <mesh key={x} position={[x, PED_H + 0.07, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 0.14, 12]} />
          <meshStandardMaterial color="#222" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}

      {/* Vitrina de cristal blindado */}
      <group position={[0, PED_H + CASE.h / 2 + 0.012, 0]}>
        <mesh>
          <boxGeometry args={[CASE.w, CASE.h, CASE.d]} />
          <meshPhysicalMaterial
            color="#e6f4ff"
            transparent
            opacity={0.16}
            roughness={0.02}
            clearcoat={1}
            ior={1.52}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Aristas metálicas */}
        {[
          [CASE.w, 0.03, 0.03, 0, CASE.h / 2, CASE.d / 2],
          [CASE.w, 0.03, 0.03, 0, CASE.h / 2, -CASE.d / 2],
          [CASE.w, 0.03, 0.03, 0, -CASE.h / 2, CASE.d / 2],
          [CASE.w, 0.03, 0.03, 0, -CASE.h / 2, -CASE.d / 2],
          [0.03, CASE.h, 0.03, CASE.w / 2, 0, CASE.d / 2],
          [0.03, CASE.h, 0.03, -CASE.w / 2, 0, CASE.d / 2],
          [0.03, CASE.h, 0.03, CASE.w / 2, 0, -CASE.d / 2],
          [0.03, CASE.h, 0.03, -CASE.w / 2, 0, -CASE.d / 2],
          [0.03, 0.03, CASE.d, CASE.w / 2, CASE.h / 2, 0],
          [0.03, 0.03, CASE.d, -CASE.w / 2, CASE.h / 2, 0],
          [0.03, 0.03, CASE.d, CASE.w / 2, -CASE.h / 2, 0],
          [0.03, 0.03, CASE.d, -CASE.w / 2, -CASE.h / 2, 0],
        ].map(([w, h, d, x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#2a2a2e" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* Postes y cordones de terciopelo rojo */}
      {[ropePts.l, ropePts.c, ropePts.r, ropePts.bl, ropePts.br].map((p, i) => (
        <Stanchion key={i} position={[p.x, 0, p.z]} />
      ))}
      <Rope a={ropePts.l} b={ropePts.c} />
      <Rope a={ropePts.c} b={ropePts.r} />
      <Rope a={ropePts.l} b={ropePts.bl} />
      <Rope a={ropePts.r} b={ropePts.br} />
    </Stage3D>
  );
};
