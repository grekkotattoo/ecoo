// Astronauta estilizado: traje blanco, casco con visor dorado reflectante, articulaciones animables.
import React from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {PALETTE} from '../config/timeline';

export interface AstroPose {
  shoulderL?: [number, number, number];
  shoulderR?: [number, number, number];
  elbowL?: number;
  elbowR?: number;
  hipL?: [number, number, number];
  hipR?: [number, number, number];
  kneeL?: number;
  kneeR?: number;
  head?: [number, number, number];
}

const Suit: React.FC<{tone?: string}> = ({tone = '#f8f9fa'}) => <meshPhysicalMaterial color={tone} roughness={0.72} sheen={0.5} sheenColor="#ffffff" sheenRoughness={0.6} />;

const Limb: React.FC<{
  upper: number;
  lower: number;
  radius: number;
  root: [number, number, number];
  joint: number;
  end: 'glove' | 'boot';
  accent: string;
  children?: React.ReactNode;
}> = ({upper, lower, radius, root, joint, end, accent, children}) => (
  <group rotation={root}>
    <mesh position={[0, -upper / 2, 0]} castShadow>
      <capsuleGeometry args={[radius, upper, 6, 16]} />
      <Suit />
    </mesh>
    {/* Junta articulada */}
    <mesh position={[0, -upper, 0]} castShadow>
      <torusGeometry args={[radius * 1.02, radius * 0.25, 8, 20]} />
      <meshStandardMaterial color="#ced4da" metalness={0.6} roughness={0.35} />
    </mesh>
    <group position={[0, -upper, 0]} rotation={[joint, 0, 0]}>
      <mesh position={[0, -lower / 2, 0]} castShadow>
        <capsuleGeometry args={[radius * 0.92, lower, 6, 16]} />
        <Suit />
      </mesh>
      <mesh position={[0, -lower * 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.98, radius * 0.18, 8, 20]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {end === 'glove' ? (
        <group position={[0, -lower - radius * 0.9, 0]}>
          <mesh castShadow scale={[1, 1.15, 0.8]}>
            <sphereGeometry args={[radius * 1.15, 20, 16]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.6} />
          </mesh>
          {children}
        </group>
      ) : (
        <group position={[0, -lower - radius * 0.6, radius * 0.35]}>
          <RoundedBox args={[radius * 2.3, radius * 1.4, radius * 3.4]} radius={radius * 0.4} smoothness={3} castShadow>
            <meshStandardMaterial color="#dee2e6" roughness={0.55} />
          </RoundedBox>
        </group>
      )}
    </group>
  </group>
);

/**
 * Altura ≈ 1.9 u (origen en el centro de masa). La mano derecha expone un slot (`rightHand`) para objetos.
 */
export const Astronaut: React.FC<
  {pose?: AstroPose; accent?: string; rightHand?: React.ReactNode; visorTint?: string} & JSX.IntrinsicElements['group']
> = ({pose = {}, accent = '#e63946', rightHand, visorTint = PALETTE.gold, ...props}) => {
  const {shoulderL = [0, 0, 0.25], shoulderR = [0, 0, -0.25], elbowL = -0.3, elbowR = -0.3, hipL = [0, 0, 0.06], hipR = [0, 0, -0.06], kneeL = 0.2, kneeR = 0.2, head = [0, 0, 0]} = pose;
  return (
    <group {...props}>
      {/* Torso */}
      <RoundedBox args={[0.74, 0.86, 0.46]} radius={0.16} smoothness={4} position={[0, 0.2, 0]} castShadow receiveShadow>
        <Suit />
      </RoundedBox>
      {/* Mochila PLSS */}
      <RoundedBox args={[0.64, 0.78, 0.3]} radius={0.08} smoothness={3} position={[0, 0.24, -0.36]} castShadow>
        <Suit tone="#e9ecef" />
      </RoundedBox>
      {/* Módulo de control pectoral */}
      <group position={[0, 0.05, 0.26]}>
        <RoundedBox args={[0.42, 0.2, 0.1]} radius={0.03} smoothness={3} castShadow>
          <meshStandardMaterial color="#adb5bd" metalness={0.4} roughness={0.4} />
        </RoundedBox>
        {['#e63946', '#ffb703', '#2a9d8f', '#4361ee'].map((c, i) => (
          <mesh key={c} position={[-0.13 + i * 0.087, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.02, 14]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
      {/* Parche de misión */}
      <mesh position={[0.24, 0.42, 0.235]}>
        <cylinderGeometry args={[0.07, 0.07, 0.01, 24]} />
        <meshStandardMaterial color={accent} roughness={0.6} />
      </mesh>
      {/* Anillo de cuello */}
      <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.05, 12, 32]} />
        <meshStandardMaterial color="#adb5bd" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Casco */}
      <group position={[0, 0.92, 0]} rotation={head}>
        <mesh castShadow>
          <sphereGeometry args={[0.34, 40, 28]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.25} clearcoat={1} clearcoatRoughness={0.05} />
        </mesh>
        {/* Visor dorado reflectante */}
        <mesh>
          <sphereGeometry args={[0.345, 40, 28, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.22, Math.PI * 0.42]} />
          <meshPhysicalMaterial color={visorTint} metalness={1} roughness={0.12} clearcoat={1} clearcoatRoughness={0.02} emissive="#8a5a00" emissiveIntensity={0.35} side={THREE.DoubleSide} />
        </mesh>
        {/* Focos del casco */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.26, 0.18, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.05, 14]} />
            <meshStandardMaterial color="#f8f9fa" emissive="#fff3c4" emissiveIntensity={1.5} />
          </mesh>
        ))}
      </group>
      {/* Brazos */}
      <group position={[-0.47, 0.5, 0]}>
        <Limb upper={0.34} lower={0.3} radius={0.1} root={shoulderL} joint={elbowL} end="glove" accent={accent} />
      </group>
      <group position={[0.47, 0.5, 0]}>
        <Limb upper={0.34} lower={0.3} radius={0.1} root={shoulderR} joint={elbowR} end="glove" accent={accent}>
          {rightHand}
        </Limb>
      </group>
      {/* Piernas */}
      <group position={[-0.18, -0.26, 0]}>
        <Limb upper={0.4} lower={0.38} radius={0.12} root={hipL} joint={kneeL} end="boot" accent={accent} />
      </group>
      <group position={[0.18, -0.26, 0]}>
        <Limb upper={0.4} lower={0.38} radius={0.12} root={hipR} joint={kneeR} end="boot" accent={accent} />
      </group>
    </group>
  );
};
