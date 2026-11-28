import {RoundedBox} from '@react-three/drei';
import React from 'react';

const Chrome = () => <meshPhysicalMaterial color="#e8edf2" metalness={1} roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} />;
const Leather = () => (
  <meshPhysicalMaterial
    color="#040405"
    roughness={0.5}
    metalness={0}
    clearcoat={0.3}
    clearcoatRoughness={0.4}
    sheen={0.6}
    sheenColor="#3a3a48"
  />
);

/** Silla de tatuador moderna: cuero negro + cromo. Origen = suelo de la silla. */
export const TattooChair: React.FC<JSX.IntrinsicElements['group']> = (props) => {
  const sh = {castShadow: true, receiveShadow: true};
  const buttons: [number, number][] = [
    [-0.18, 0.2], [0, 0.2], [0.18, 0.2],
    [-0.18, -0.12], [0, -0.12], [0.18, -0.12],
  ];
  return (
    <group {...props}>
      {/* Base y columna hidráulica */}
      <mesh {...sh} position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.46, 0.5, 0.07, 48]} />
        <Chrome />
      </mesh>
      <mesh {...sh} position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.6, 32]} />
        <Chrome />
      </mesh>
      <mesh {...sh} position={[0, 0.2, 0]}>
        <torusGeometry args={[0.13, 0.03, 16, 40]} />
        <Chrome />
      </mesh>
      {/* Bastidor */}
      <RoundedBox {...sh} args={[0.62, 0.05, 0.74]} radius={0.02} position={[0, 0.67, 0]}>
        <Chrome />
      </RoundedBox>
      {/* Asiento */}
      <RoundedBox {...sh} args={[0.7, 0.16, 0.82]} radius={0.07} smoothness={6} position={[0, 0.78, 0]}>
        <Leather />
      </RoundedBox>
      {/* Respaldo reclinado */}
      <group position={[0, 0.84, -0.4]} rotation={[-0.38, 0, 0]}>
        <RoundedBox {...sh} args={[0.7, 1.0, 0.15]} radius={0.07} smoothness={6} position={[0, 0.5, 0]}>
          <Leather />
        </RoundedBox>
        {buttons.map(([x, y], i) => (
          <mesh key={i} position={[x, 0.5 + y, 0.078]}>
            <sphereGeometry args={[0.018, 12, 10]} />
            <Chrome />
          </mesh>
        ))}
        {/* Cabezal */}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} {...sh} position={[x, 1.07, -0.02]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 12]} />
            <Chrome />
          </mesh>
        ))}
        <RoundedBox {...sh} args={[0.44, 0.22, 0.13]} radius={0.06} smoothness={5} position={[0, 1.2, 0]}>
          <Leather />
        </RoundedBox>
      </group>
      {/* Reposapiés */}
      <group position={[0, 0.76, 0.42]} rotation={[0.55, 0, 0]}>
        <RoundedBox {...sh} args={[0.62, 0.13, 0.72]} radius={0.06} smoothness={5} position={[0, -0.02, 0.36]}>
          <Leather />
        </RoundedBox>
        <mesh {...sh} position={[0, -0.1, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 12]} />
          <Chrome />
        </mesh>
      </group>
      {/* Reposabrazos + brazo de tatuaje extensible */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.42, 0.98, -0.02]}>
          <mesh {...sh} position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.26, 12]} />
            <Chrome />
          </mesh>
          <RoundedBox {...sh} args={[0.12, 0.07, s > 0 ? 0.95 : 0.55]} radius={0.03} position={[0, 0.02, s > 0 ? 0.22 : 0]}>
            <Leather />
          </RoundedBox>
          <mesh {...sh} position={[0, -0.02, s > 0 ? 0.22 : 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, s > 0 ? 0.9 : 0.5, 10]} />
            <Chrome />
          </mesh>
        </group>
      ))}
      {/* Pistón y palanca */}
      <mesh {...sh} position={[0.3, 0.3, 0.2]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 10]} />
        <Chrome />
      </mesh>
      <mesh position={[0.4, 0.13, 0.28]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#d00000" roughness={0.3} />
      </mesh>
    </group>
  );
};
