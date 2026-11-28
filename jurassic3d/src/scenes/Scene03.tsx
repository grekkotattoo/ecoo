import {RoundedBox} from '@react-three/drei';
import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {StudioEnv} from '../components/Env';
import {CameraRig, Stage3D} from '../components/Stage3D';
import {ease, HEAVY, mix, sp, wobble} from '../lib/anim';

const NEON = '#38b000';
const PURPLE = '#9d4edd';
const BG = '#050807';

const CUP_TOP = 0.42;
const JAR_H = 1.0;

const Glass = () => (
  <meshPhysicalMaterial
    color="#dff7ff"
    transparent
    opacity={0.28}
    roughness={0.04}
    metalness={0}
    clearcoat={1}
    clearcoatRoughness={0.02}
    ior={1.5}
    depthWrite={false}
    side={THREE.DoubleSide}
  />
);

/** Bote de laboratorio con tapón y etiqueta. `level` 0..1 de contenido. */
const LabJar: React.FC<{
  level: number;
  kind: 'soot' | 'toxic';
  t: number;
  lidOff: number;
}> = ({level, kind, t, lidOff}) => {
  const contentH = Math.max(0.001, (JAR_H - 0.15) * level);
  const sparkles = useMemo(
    () =>
      Array.from({length: 40}).map((_, i) => ({
        a: random(`sa${i}`) * Math.PI * 2,
        r: Math.sqrt(random(`sr${i}`)) * 0.3,
        y: random(`sy${i}`),
        s: random(`ss${i}`),
      })),
    [],
  );
  return (
    <group>
      {/* Vidrio */}
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, JAR_H, 48, 1, true]} />
        <Glass />
      </mesh>
      <mesh position={[0, -JAR_H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 48]} />
        <Glass />
      </mesh>
      <mesh position={[0, JAR_H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.035, 12, 48]} />
        <Glass />
      </mesh>
      {/* Tapón de corcho que sale disparado */}
      <mesh castShadow position={[lidOff * 0.25, JAR_H / 2 + 0.08 + lidOff * 1.2, 0]} rotation={[0, 0, lidOff * 2.4]}>
        <cylinderGeometry args={[0.3, 0.27, 0.16, 32]} />
        <meshStandardMaterial color="#a87b4f" roughness={0.9} />
      </mesh>
      {/* Etiqueta */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.386, 0.386, 0.32, 48, 1, true, -0.7, 1.4]} />
        <meshStandardMaterial color={kind === 'soot' ? '#f1e9d2' : '#ffe14d'} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* Contenido */}
      <group position={[0, -JAR_H / 2 + 0.02, 0]}>
        {kind === 'soot' ? (
          <mesh position={[0, contentH / 2, 0]}>
            <cylinderGeometry args={[0.34, 0.34, contentH, 40]} />
            <meshPhysicalMaterial color="#08080a" roughness={0.28} metalness={0.85} clearcoat={0.6} />
          </mesh>
        ) : (
          <mesh position={[0, contentH / 2, 0]}>
            <cylinderGeometry args={[0.345, 0.345, contentH, 40]} />
            <meshPhysicalMaterial
              color="#2b8a00"
              emissive={NEON}
              emissiveIntensity={2.4}
              roughness={0.12}
              transparent
              opacity={0.88}
              clearcoat={1}
            />
          </mesh>
        )}
        {kind === 'soot'
          ? sparkles.map((p, i) =>
              p.y < level * 0.95 ? (
                <mesh
                  key={i}
                  position={[Math.cos(p.a) * p.r, p.y * contentH / Math.max(level, 0.01), Math.sin(p.a) * p.r + 0.02]}
                  rotation={[t * 2 + i, t * 3 + i, 0]}
                  scale={0.012 + 0.012 * Math.abs(Math.sin(t * 6 + i))}
                >
                  <octahedronGeometry args={[1, 0]} />
                  <meshStandardMaterial color="#ffffff" emissive="#cfd8ff" emissiveIntensity={3} metalness={1} roughness={0.1} toneMapped={false} />
                </mesh>
              ) : null,
            )
          : sparkles.slice(0, 26).map((p, i) => {
              const yy = ((p.y + t * (0.25 + p.s * 0.3)) % 1) * contentH;
              return (
                <mesh key={i} position={[Math.cos(p.a) * p.r * 0.9, yy, Math.sin(p.a) * p.r * 0.9]} scale={0.02 + p.s * 0.035}>
                  <sphereGeometry args={[1, 12, 8]} />
                  <meshPhysicalMaterial color="#b6ff8a" emissive="#7dff3a" emissiveIntensity={1.5} transparent opacity={0.55} roughness={0} />
                </mesh>
              );
            })}
      </group>
    </group>
  );
};

/** Chorro vertido desde la boca del bote hasta el vaso. */
const Stream: React.FC<{from: THREE.Vector3; to: THREE.Vector3; width: number; t: number; kind: 'soot' | 'toxic'}> = ({
  from,
  to,
  width,
  t,
  kind,
}) => {
  if (width < 0.003) return null;
  const dir = to.clone().sub(from);
  const len = dir.length();
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <mesh position={mid} quaternion={quat} scale={[1 + Math.sin(t * 30) * 0.08, 1, 1 + Math.cos(t * 27) * 0.08]}>
      <cylinderGeometry args={[width * 0.7, width, len, 16, 1]} />
      {kind === 'soot' ? (
        <meshPhysicalMaterial color="#0a0a0c" metalness={0.8} roughness={0.25} />
      ) : (
        <meshPhysicalMaterial color="#2b8a00" emissive={NEON} emissiveIntensity={3} transparent opacity={0.9} roughness={0.1} />
      )}
    </mesh>
  );
};

const JAR_CENTER = 1.75;
// Boca del bote (local) rotada por la inclinación: posición mundial.
const mouthOf = (cx: number, cy: number, angle: number) => {
  const v = new THREE.Vector3(0, JAR_H / 2 + 0.02, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  return new THREE.Vector3(cx + v.x, cy + v.y, v.z);
};

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // Entrada flotante
  const enter = sp(frame, fps, 0, {damping: 13, stiffness: 70});
  const floatA = Math.sin(t * 1.6) * 0.06;
  const floatB = Math.sin(t * 1.6 + 1.7) * 0.06;

  // Bote A (hollín) – izquierda, se inclina hacia el centro
  const tiltA = sp(frame, fps, 50, {damping: 16, stiffness: 55});
  const backA = sp(frame, fps, 190, {damping: 14, stiffness: 60});
  const angA = -2.05 * (tiltA - backA);
  const xA = mix(-0.85, -0.52, tiltA - backA);
  const yA = mix(-0.6, JAR_CENTER, enter) + floatA;
  const pourA = Math.max(0, ease(frame, [75, 105], [0, 1]) - ease(frame, [172, 198], [0, 1]));
  const levelA = 1 - ease(frame, [80, 190], [0, 0.92]);
  const lidA = sp(frame, fps, 48, {damping: 12, stiffness: 120});

  // Bote B (caca de Diplodocus) – derecha
  const tiltB = sp(frame, fps, 198, {damping: 16, stiffness: 55});
  const backB = sp(frame, fps, 335, {damping: 14, stiffness: 60});
  const angB = 2.05 * (tiltB - backB);
  const xB = mix(0.85, 0.52, tiltB - backB);
  const yB = mix(-0.6, JAR_CENTER, sp(frame, fps, 8, {damping: 13, stiffness: 70})) + floatB;
  const pourB = Math.max(0, ease(frame, [222, 252], [0, 1]) - ease(frame, [315, 342], [0, 1]));
  const levelB = 1 - ease(frame, [228, 335], [0, 0.92]);
  const lidB = sp(frame, fps, 186, {damping: 12, stiffness: 120});

  const mA = mouthOf(xA, yA, angA);
  const mB = mouthOf(xB, yB, angB);
  const cupTarget = (side: number) => new THREE.Vector3(side * 0.05, CUP_TOP - 0.15, 0);

  // Vaso de plástico: nivel y color de la mezcla
  const fill = ease(frame, [90, 345], [0.05, 0.86]);
  const mixT = ease(frame, [215, 360], [0, 1]);
  const liquidColor = new THREE.Color('#0b0b0b').lerp(new THREE.Color('#3d1a4f'), mixT);
  const liquidEmissive = new THREE.Color(NEON).lerp(new THREE.Color(PURPLE), mixT);
  const cupH = 0.85;
  const liquidH = cupH * fill;
  const boil = ease(frame, [240, 350], [0, 1]);

  // Humo tóxico morado
  const puffs = useMemo(
    () =>
      Array.from({length: 34}).map((_, i) => ({
        birth: 250 + i * 7,
        x: (random(`px${i}`) - 0.5) * 0.4,
        z: (random(`pz${i}`) - 0.5) * 0.4,
        s: 0.6 + random(`ps${i}`) * 0.8,
        seed: i,
      })),
    [],
  );

  // CÁMARA: órbita de 180º con muelle + zoom final al humo
  const orbit = sp(frame, fps, 10, {damping: 30, stiffness: 14, mass: 2.2}, 420);
  const zoom = sp(frame, fps, 340, HEAVY);
  const angle = mix(-0.15, Math.PI - 0.15, orbit);
  const radius = mix(7.2, 4.4, zoom);
  const camY = mix(1.9, 2.3, zoom) + Math.sin(t * 0.8) * 0.05;
  const target: [number, number, number] = [0, mix(1.05, 1.75, zoom), 0];
  const pos: [number, number, number] = [Math.sin(angle) * radius, camY, Math.cos(angle) * radius];
  const fov = mix(40, 36, zoom);

  return (
    <Stage3D background={BG} exposure={1}>
      <CameraRig position={pos} target={target} fov={fov} />
      <fog attach="fog" args={[BG, 6, 18]} />
      <StudioEnv intensity={0.6} warm="#ffffff" cool="#b6ffa1" />

      {/* Luz verde neón del líquido tóxico */}
      <pointLight color={NEON} intensity={12 + 4 * Math.sin(t * 7)} distance={6} decay={2} position={[xB, yB, 0.2]} />
      <pointLight color={mixT > 0.5 ? PURPLE : NEON} intensity={8 + 10 * boil} distance={5} decay={2} position={[0, CUP_TOP + 0.4, 0]} />
      <spotLight castShadow color="#d8fff0" intensity={30} angle={0.5} penumbra={0.8} position={[0, 6, 2]} distance={12} decay={2} />
      <ambientLight intensity={0.05} />

      {/* Peana minimalista */}
      <mesh receiveShadow position={[0, -0.46, 0]}>
        <cylinderGeometry args={[1.4, 1.5, 0.1, 64]} />
        <meshStandardMaterial color="#0e1210" roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.405, 0]}>
        <ringGeometry args={[1.36, 1.4, 64]} />
        <meshBasicMaterial color={NEON} toneMapped={false} />
      </mesh>

      {/* Botes */}
      <group position={[xA, yA, 0]} rotation={[0, 0, angA]}>
        <LabJar level={levelA} kind="soot" t={t} lidOff={lidA} />
      </group>
      <group position={[xB, yB, 0]} rotation={[0, 0, angB]}>
        <LabJar level={levelB} kind="toxic" t={t} lidOff={lidB} />
      </group>
      <Stream from={mA} to={cupTarget(-1)} width={0.05 * pourA} t={t} kind="soot" />
      <Stream from={mB} to={cupTarget(1)} width={0.055 * pourB} t={t} kind="toxic" />

      {/* Vaso de plástico */}
      <group position={[0, CUP_TOP - cupH, 0]}>
        <mesh castShadow position={[0, cupH / 2, 0]}>
          <cylinderGeometry args={[0.46, 0.33, cupH, 48, 1, true]} />
          <meshPhysicalMaterial color="#f4f7fb" transparent opacity={0.42} roughness={0.25} clearcoat={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, cupH, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.46, 0.015, 8, 48]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        {/* Líquido */}
        <mesh position={[0, liquidH / 2 + 0.01, 0]}>
          <cylinderGeometry args={[0.33 + 0.13 * fill - 0.01, 0.32, liquidH, 40]} />
          <meshPhysicalMaterial color={liquidColor} emissive={liquidEmissive} emissiveIntensity={0.6 + 1.8 * mixT} roughness={0.2} clearcoat={1} />
        </mesh>
        {/* Burbujas en la superficie */}
        {Array.from({length: 10}).map((_, i) => {
          const life = ((t * 1.4 + i * 0.37) % 1);
          const a = i * 2.4;
          const r = 0.12 + (i % 3) * 0.08;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * r, liquidH + 0.01, Math.sin(a) * r]}
              scale={boil * (0.02 + 0.05 * Math.sin(life * Math.PI))}
            >
              <sphereGeometry args={[1, 14, 10]} />
              <meshPhysicalMaterial color="#c77dff" emissive={PURPLE} emissiveIntensity={1.5} transparent opacity={0.7} roughness={0} />
            </mesh>
          );
        })}
      </group>

      {/* Humo tóxico */}
      {puffs.map((p) => {
        const age = frame - p.birth;
        if (age < 0) return null;
        const life = (age % 160) / 160;
        const rise = 1 - Math.pow(1 - life, 2.2);
        const scale = (0.08 + rise * 0.38) * p.s;
        const opacity = Math.sin(life * Math.PI) * 0.3;
        return (
          <mesh
            key={p.seed}
            position={[
              p.x + wobble(t * 0.9 + p.seed, p.seed) * 0.35 * rise,
              CUP_TOP + 0.05 + rise * 2.2,
              p.z + wobble(t * 0.7 + p.seed, p.seed + 3) * 0.35 * rise,
            ]}
            scale={scale}
          >
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial
              color="#6a1b9a"
              emissive={PURPLE}
              emissiveIntensity={1.4}
              transparent
              opacity={opacity}
              depthWrite={false}
              roughness={1}
            />
          </mesh>
        );
      })}

      {/* Rótulo de laboratorio de fondo (prop 3D) */}
      <RoundedBox args={[3.4, 0.08, 0.08]} radius={0.03} position={[0, 3.6, -3]}>
        <meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={2} toneMapped={false} />
      </RoundedBox>
    </Stage3D>
  );
};
