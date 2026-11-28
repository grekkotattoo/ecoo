import {RoundedBox} from '@react-three/drei';
import React from 'react';
import {Limb} from './Limb';
import {TattooMachine} from './TattooMachine';
import {wobble} from '../lib/anim';

type V3 = [number, number, number];

const Skin = () => (
  <meshPhysicalMaterial
    color="#6f8f3a"
    roughness={0.5}
    clearcoat={0.4}
    clearcoatRoughness={0.35}
    sheen={0.35}
    sheenColor="#c6e27a"
  />
);
const Belly = () => <meshPhysicalMaterial color="#e3c68c" roughness={0.55} clearcoat={0.25} />;
const Tooth = () => <meshPhysicalMaterial color="#fff6e0" roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />;
const Glove = () => (
  <meshPhysicalMaterial
    color="#2f6bff"
    roughness={0.28}
    metalness={0}
    clearcoat={1}
    clearcoatRoughness={0.12}
    sheen={0.6}
    sheenColor="#a8c4ff"
  />
);
const Claw = () => <meshStandardMaterial color="#2b2420" roughness={0.35} />;

const teethRow = (side: number, down: boolean, zFrom: number, zTo: number, n: number, y: number, x: number) =>
  Array.from({length: n}).map((_, i) => {
    const z = zFrom + ((zTo - zFrom) * i) / (n - 1);
    const big = i % 2 === 0 ? 1.15 : 0.8;
    return (
      <mesh key={`${side}-${down}-${i}`} castShadow position={[side * x, y, z]} rotation={[down ? Math.PI : 0, 0, side * (down ? -0.12 : 0.12)]}>
        <coneGeometry args={[0.05 * big, 0.24 * big, 10]} />
        <Tooth />
      </mesh>
    );
  });

/** Allosaurus estilo toy/clay. Mira hacia +Z. `buzz` 0..1 = máquina encendida. */
export const Allosaurus: React.FC<{
  t: number;
  frame: number;
  buzz: number;
  jaw: number;
  panic: number;
}> = ({t, frame, buzz, jaw, panic}) => {
  const jitter = (frame % 2 === 0 ? 1 : -1) * buzz;
  // Brazos sin pulso: temblor lento enorme + vibración de la máquina
  const tremble: V3 = [
    wobble(t * 9, 1) * 0.03 * (0.4 + panic) + jitter * 0.012,
    wobble(t * 11, 2) * 0.025 * (0.4 + panic) + jitter * 0.01,
    wobble(t * 7, 3) * 0.02 * (0.4 + panic),
  ];
  const machinePos: V3 = [0.02 + tremble[0], 2.95 + tremble[1], 2.38 + tremble[2]];
  const breathe = Math.sin(t * 2.2) * 0.015;
  const headNod = Math.sin(t * 1.4) * 0.04 + buzz * 0.03 * Math.sin(frame * 1.7);

  const shoulderL: V3 = [-0.42, 3.15, 1.72];
  const shoulderR: V3 = [0.42, 3.15, 1.72];
  const elbowL: V3 = [-0.38, 2.98, 2.0];
  const elbowR: V3 = [0.38, 2.98, 2.0];
  const handL: V3 = [machinePos[0] - 0.14, machinePos[1] - 0.02, machinePos[2] - 0.02];
  const handR: V3 = [machinePos[0] + 0.14, machinePos[1] + 0.01, machinePos[2] + 0.04];

  const glove = (hand: V3, side: number) => (
    <group position={hand}>
      <mesh castShadow scale={[1, 0.85, 1.1]}>
        <sphereGeometry args={[0.085, 24, 18]} />
        <Glove />
      </mesh>
      {/* Puño del guante estirado al límite */}
      <mesh position={[side * 0.07, 0.02, -0.05]} rotation={[0.4, side * 0.9, 0]}>
        <torusGeometry args={[0.075, 0.016, 10, 28]} />
        <Glove />
      </mesh>
      {[-0.045, 0, 0.045].map((dz, i) => (
        <group key={i} position={[-side * 0.06, 0, dz + 0.03]} rotation={[0.2, 0, side * 1.2]}>
          <mesh castShadow position={[0, 0.05, 0]}>
            <capsuleGeometry args={[0.022, 0.07, 6, 12]} />
            <Glove />
          </mesh>
          {/* Garra perforando el nitrilo */}
          <mesh castShadow position={[0, 0.12, 0]}>
            <coneGeometry args={[0.014, 0.05, 8]} />
            <Claw />
          </mesh>
        </group>
      ))}
    </group>
  );

  return (
    <group>
      {/* Cuerpo */}
      <group position={[0, breathe, 0]}>
        <mesh castShadow receiveShadow position={[0, 2.6, 0]} rotation={[-0.3, 0, 0]} scale={[1.05, 1.15, 1.7]}>
          <sphereGeometry args={[1, 48, 36]} />
          <Skin />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 2.5, 0.42]} rotation={[-0.3, 0, 0]} scale={[0.82, 0.95, 1.38]}>
          <sphereGeometry args={[1, 48, 36]} />
          <Belly />
        </mesh>
        {/* Púas dorsales */}
        {Array.from({length: 9}).map((_, i) => (
          <mesh key={i} castShadow position={[0, 3.55 - i * 0.05 + (i < 3 ? 0.25 : 0), 0.9 - i * 0.42]} rotation={[-0.4, 0, 0]}>
            <coneGeometry args={[0.1, 0.32 - i * 0.015, 6]} />
            <meshStandardMaterial color="#c2411d" roughness={0.45} />
          </mesh>
        ))}
        {/* Cola */}
        {Array.from({length: 9}).map((_, i) => {
          const k = i / 8;
          return (
            <mesh
              key={i}
              castShadow
              position={[wobble(t * 1.2 - i * 0.3, 5) * 0.25 * k, 2.45 - k * 0.9, -1.3 - i * 0.55]}
              scale={[1, 0.9, 1.25]}
            >
              <sphereGeometry args={[0.62 * (1 - k * 0.82), 24, 18]} />
              <Skin />
            </mesh>
          );
        })}
        {/* Cuello */}
        <mesh castShadow position={[0, 3.55, 1.25]} rotation={[0.55, 0, 0]}>
          <cylinderGeometry args={[0.38, 0.5, 1.0, 32]} />
          <Skin />
        </mesh>

        {/* Cabeza */}
        <group position={[0, 4.12, 1.7]} rotation={[0.22 + headNod, Math.sin(t * 0.8) * 0.06, 0]}>
          <RoundedBox castShadow args={[0.98, 0.72, 1.02]} radius={0.28} smoothness={6} position={[0, 0.1, 0]}>
            <Skin />
          </RoundedBox>
          <RoundedBox castShadow args={[0.82, 0.48, 0.95]} radius={0.2} smoothness={6} position={[0, -0.02, 0.78]}>
            <Skin />
          </RoundedBox>
          {/* Crestas nasales */}
          {[0.35, 0.6, 0.85, 1.05].map((z) => (
            <mesh key={z} position={[0, 0.24, z]} scale={[1, 0.7, 1.4]}>
              <sphereGeometry args={[0.06, 12, 10]} />
              <Skin />
            </mesh>
          ))}
          {/* Cuernos lacrimales (marca de la casa Allosaurus) */}
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[s * 0.3, 0.5, 0.42]} rotation={[0.3, 0, -s * 0.35]}>
              <coneGeometry args={[0.08, 0.22, 10]} />
              <meshStandardMaterial color="#c2411d" roughness={0.4} />
            </mesh>
          ))}
          {/* Fosas nasales */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.16, 0.1, 1.25]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color="#1a1208" roughness={0.8} />
            </mesh>
          ))}
          {/* Ojos */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.33, 0.28, 0.5]}>
              <mesh>
                <sphereGeometry args={[0.13, 24, 18]} />
                <meshPhysicalMaterial color="#ffe066" roughness={0.1} clearcoat={1} />
              </mesh>
              <mesh
                position={[s * 0.02 + wobble(t * 6, s) * 0.01 * panic, 0, 0.11]}
                scale={[0.35, 1, 0.4]}
              >
                <sphereGeometry args={[0.06, 16, 12]} />
                <meshStandardMaterial color="#050505" roughness={0.1} />
              </mesh>
              {/* Gafas de protección DIMINUTAS */}
              <group position={[0, 0, 0.16]}>
                <mesh>
                  <torusGeometry args={[0.065, 0.016, 10, 28]} />
                  <meshPhysicalMaterial color="#ff9f1c" roughness={0.3} clearcoat={1} />
                </mesh>
                <mesh>
                  <circleGeometry args={[0.062, 24]} />
                  <meshPhysicalMaterial color="#d8f3ff" transparent opacity={0.35} roughness={0.02} clearcoat={1} />
                </mesh>
              </group>
            </group>
          ))}
          <mesh position={[0, 0.28, 0.66]}>
            <boxGeometry args={[0.5, 0.018, 0.018]} />
            <meshStandardMaterial color="#ff9f1c" />
          </mesh>
          {/* Goma de las gafas */}
          <mesh position={[0, 0.27, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.12, 1]}>
            <torusGeometry args={[0.52, 0.02, 8, 48]} />
            <meshStandardMaterial color="#141414" roughness={0.7} />
          </mesh>

          {/* Dientes superiores */}
          {teethRow(-1, true, 0.35, 1.08, 7, -0.27, 0.34)}
          {teethRow(1, true, 0.35, 1.08, 7, -0.27, 0.34)}
          {[-0.18, 0, 0.18].map((x) => (
            <mesh key={x} castShadow position={[x, -0.27, 1.18]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.05, 0.22, 10]} />
              <Tooth />
            </mesh>
          ))}
          {/* Interior de la boca */}
          <mesh position={[0, -0.28, 0.65]}>
            <boxGeometry args={[0.62, 0.05, 0.9]} />
            <meshStandardMaterial color="#5a0f14" roughness={0.6} />
          </mesh>

          {/* Mandíbula */}
          <group position={[0, -0.24, 0.12]} rotation={[0.08 + jaw, 0, 0]}>
            <RoundedBox castShadow args={[0.76, 0.2, 1.12]} radius={0.09} smoothness={5} position={[0, -0.12, 0.55]}>
              <Skin />
            </RoundedBox>
            <mesh position={[0, -0.02, 0.5]}>
              <boxGeometry args={[0.56, 0.04, 0.9]} />
              <meshStandardMaterial color="#7a1820" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.0, 0.62]} scale={[1, 0.35, 1.6]}>
              <sphereGeometry args={[0.2, 20, 14]} />
              <meshPhysicalMaterial color="#e0566a" roughness={0.35} clearcoat={0.6} />
            </mesh>
            {teethRow(-1, false, 0.3, 1.0, 6, 0.06, 0.3)}
            {teethRow(1, false, 0.3, 1.0, 6, 0.06, 0.3)}
          </group>
        </group>

        {/* Bracitos ridículos (20 cm) con guantes de nitrilo */}
        <Limb from={shoulderL} to={elbowL} radius={0.07}>
          <Skin />
        </Limb>
        <Limb from={shoulderR} to={elbowR} radius={0.07}>
          <Skin />
        </Limb>
        <Limb from={elbowL} to={handL} radius={0.055}>
          <Glove />
        </Limb>
        <Limb from={elbowR} to={handR} radius={0.055}>
          <Glove />
        </Limb>
        {glove(handL, -1)}
        {glove(handR, 1)}
        <TattooMachine
          position={machinePos}
          rotation={[0.5 + tremble[1] * 2, Math.PI + tremble[0] * 3, tremble[2] * 4]}
          scale={1.25}
          needle={frame % 2 === 0 ? buzz : 0}
          ledOn={buzz > 0.05 ? 1 : 0.2}
        />
      </group>

      {/* Piernas */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh castShadow position={[s * 0.68, 1.85, -0.35]} scale={[0.5, 0.85, 0.72]}>
            <sphereGeometry args={[1, 32, 24]} />
            <Skin />
          </mesh>
          <Limb from={[s * 0.72, 1.3, -0.25]} to={[s * 0.74, 0.35, 0.05]} radius={0.2}>
            <Skin />
          </Limb>
          <RoundedBox castShadow receiveShadow args={[0.5, 0.22, 0.85]} radius={0.1} position={[s * 0.75, 0.12, 0.32]}>
            <Skin />
          </RoundedBox>
          {[-0.16, 0, 0.16].map((dx) => (
            <mesh key={dx} castShadow position={[s * 0.75 + dx, 0.1, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.05, 0.2, 8]} />
              <Claw />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};
