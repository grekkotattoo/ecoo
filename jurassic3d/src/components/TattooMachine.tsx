import {RoundedBox} from '@react-three/drei';
import React, {useMemo} from 'react';
import * as THREE from 'three';

/** Máquina de bobinas clásica. Eje de la aguja = -Z local (apunta hacia delante). */
export const TattooMachine: React.FC<
  JSX.IntrinsicElements['group'] & {needle: number; ledOn: number}
> = ({needle, ledOn, ...props}) => {
  const cable = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.02, 0.2),
          new THREE.Vector3(0.05, -0.05, 0.38),
          new THREE.Vector3(0.18, -0.45, 0.45),
          new THREE.Vector3(0.5, -1.4, 0.3),
          new THREE.Vector3(0.8, -2.8, -0.2),
        ]),
        48,
        0.012,
        8,
        false,
      ),
    [],
  );
  const chrome = <meshPhysicalMaterial color="#f2f4f7" metalness={1} roughness={0.1} clearcoat={1} />;
  const copper = <meshStandardMaterial color="#b8622b" metalness={0.9} roughness={0.28} />;
  return (
    <group {...props}>
      {/* Tubo / grip */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, -0.08]}>
        <cylinderGeometry args={[0.032, 0.036, 0.36, 24]} />
        {chrome}
      </mesh>
      {Array.from({length: 7}).map((_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0.02 - i * 0.025]}>
          <torusGeometry args={[0.037, 0.005, 8, 24]} />
          <meshStandardMaterial color="#151515" roughness={0.6} />
        </mesh>
      ))}
      {/* Puntera + aguja */}
      <mesh castShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -0.29]}>
        <coneGeometry args={[0.03, 0.08, 20]} />
        {chrome}
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, -0.34 - needle * 0.025]}>
        <cylinderGeometry args={[0.003, 0.003, 0.07, 6]} />
        <meshStandardMaterial color="#101010" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Bastidor */}
      <RoundedBox castShadow args={[0.06, 0.05, 0.3]} radius={0.015} position={[0, 0.03, 0.05]}>
        <meshPhysicalMaterial color="#0d0d10" metalness={0.6} roughness={0.25} clearcoat={1} />
      </RoundedBox>
      {/* Bobinas */}
      {[0.02, 0.12].map((z) => (
        <group key={z} position={[0, 0.11, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.042, 0.042, 0.13, 24]} />
            {copper}
          </mesh>
          {[-0.05, 0, 0.05].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.043, 0.005, 8, 24]} />
              {copper}
            </mesh>
          ))}
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.046, 0.046, 0.012, 24]} />
            {chrome}
          </mesh>
        </group>
      ))}
      {/* Armadura vibrante */}
      <RoundedBox args={[0.03, 0.012, 0.22]} radius={0.004} position={[0, 0.19 + needle * 0.012, -0.0]}>
        {chrome}
      </RoundedBox>
      {/* LED */}
      <mesh position={[0, 0.06, 0.2]}>
        <sphereGeometry args={[0.012, 12, 10]} />
        <meshStandardMaterial color="#ff1b1b" emissive="#ff1b1b" emissiveIntensity={4 * ledOn} toneMapped={false} />
      </mesh>
      <mesh geometry={cable} castShadow>
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>
    </group>
  );
};
