// Atrezo: máquina rotativa tipo pen, fuente de alimentación, bote de tinta.
import React from 'react';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {PALETTE} from '../config/timeline';
import {TITLE_FONT, useCanvasTexture} from './Stage';

/** Etiqueta del bote: tipografía propia, sin logotipo real. "Dynamic" es marca registrada de tintas: cámbialo aquí si vas a monetizar. */
export const INK_LABEL = {top: 'DYNAMIC', bottom: 'BLACK · ZERO-G'};

type Finish = 'standard' | 'gold';

const Metal: React.FC<{color: string; finish: Finish; roughness?: number}> = ({color, finish, roughness = 0.28}) =>
  finish === 'gold' ? (
    <meshPhysicalMaterial color={PALETTE.gold} metalness={1} roughness={0.15} clearcoat={0.6} clearcoatRoughness={0.1} />
  ) : (
    <meshPhysicalMaterial color={color} metalness={0.85} roughness={roughness} clearcoat={0.4} />
  );

/**
 * Máquina rotativa (pen). Eje local Y, punta de la aguja hacia −Y. Longitud ≈ 1.1 u.
 * @param needle desplazamiento de la aguja (vibración) en unidades
 * @param on LED de encendido
 */
export const TattooMachine: React.FC<{needle?: number; on?: boolean; finish?: Finish} & JSX.IntrinsicElements['group']> = ({
  needle = 0,
  on = false,
  finish = 'standard',
  ...props
}) => {
  const rubber = finish === 'gold' ? <Metal color="" finish="gold" /> : <meshStandardMaterial color="#1b1b1e" roughness={0.9} />;
  return (
    <group {...props}>
      {/* Cuerpo motor */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.115, 0.105, 0.5, 40]} />
        <Metal color="#3a0ca3" finish={finish} />
      </mesh>
      {/* Anillos decorativos */}
      {[0.08, 0.52].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.112, 0.018, 12, 40]} />
          <Metal color="#c0c0c0" finish={finish} roughness={0.15} />
        </mesh>
      ))}
      {/* Tapa superior + conector RCA */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.115, 0.08, 32]} />
        <Metal color="#adb5bd" finish={finish} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 16]} />
        <Metal color="#ffd166" finish={finish} roughness={0.2} />
      </mesh>
      {/* LED */}
      <mesh position={[0, 0.4, 0.112]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color={on ? '#00f5d4' : '#1f3b3a'} emissive={on ? '#00f5d4' : '#000000'} emissiveIntensity={on ? 4 : 0} toneMapped={!on} />
      </mesh>
      {/* Grip con estrías */}
      <mesh position={[0, -0.12, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.085, 0.34, 32]} />
        {rubber}
      </mesh>
      {[-0.24, -0.18, -0.12, -0.06, 0].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.094 - (y + 0.24) * 0.04, 0.012, 8, 32]} />
          {rubber}
        </mesh>
      ))}
      {/* Cartucho translúcido */}
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.2, 32]} />
        <meshPhysicalMaterial color="#e9f5ff" transmission={0.85} thickness={0.1} roughness={0.08} ior={1.45} transparent opacity={0.65} />
      </mesh>
      {/* Aguja */}
      <group position={[0, -0.5 - needle, 0]}>
        <mesh>
          <cylinderGeometry args={[0.007, 0.007, 0.12, 10]} />
          <meshStandardMaterial color="#dee2e6" metalness={1} roughness={0.12} />
        </mesh>
        <mesh position={[0, -0.075, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.007, 0.03, 10]} />
          <meshStandardMaterial color="#dee2e6" metalness={1} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
};

export const PowerSupply: React.FC<{on?: boolean; voltage?: string} & JSX.IntrinsicElements['group']> = ({on = false, voltage = '8.5V', ...props}) => {
  const screen = useCanvasTexture(
    256,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#021a14';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2bff88';
      ctx.font = `900 84px ${TITLE_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(voltage, w / 2, h / 2 + 4);
    },
    `900 84px Montserrat`,
    [voltage],
  );
  return (
    <group {...props}>
      <RoundedBox args={[0.8, 0.46, 0.4]} radius={0.06} smoothness={4} castShadow receiveShadow>
        <meshPhysicalMaterial color="#212529" metalness={0.6} roughness={0.35} clearcoat={0.5} />
      </RoundedBox>
      <mesh position={[-0.12, 0.04, 0.201]}>
        <planeGeometry args={[0.38, 0.19]} />
        <meshStandardMaterial map={screen} emissiveMap={screen} emissive="#ffffff" emissiveIntensity={on ? 1.6 : 0.15} toneMapped={false} />
      </mesh>
      {/* Potenciómetro */}
      <mesh position={[0.24, 0.04, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.075, 0.06, 32]} />
        <meshStandardMaterial color="#ced4da" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0.24, -0.15, 0.205]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial color="#ff006e" emissive="#ff006e" emissiveIntensity={on ? 3 : 0.2} toneMapped={false} />
      </mesh>
      {/* Bornes */}
      {[-0.28, -0.18].map((x) => (
        <mesh key={x} position={[x, -0.15, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 16]} />
          <meshStandardMaterial color={x < -0.2 ? '#e63946' : '#111'} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

export const InkBottle: React.FC<JSX.IntrinsicElements['group']> = (props) => {
  const label = useCanvasTexture(
    1024,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, 18);
      ctx.fillRect(0, h - 18, w, 18);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const cx of [w * 0.25, w * 0.75]) {
        ctx.font = `900 92px ${TITLE_FONT}`;
        ctx.fillText(INK_LABEL.top, cx, h * 0.42);
        ctx.font = `800 40px ${TITLE_FONT}`;
        ctx.fillText(INK_LABEL.bottom, cx, h * 0.74);
      }
    },
    `900 92px Montserrat`,
  );
  return (
    <group {...props}>
      {/* Cuerpo */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.6, 48]} />
        <meshPhysicalMaterial color={PALETTE.ink} roughness={0.08} clearcoat={1} clearcoatRoughness={0.03} metalness={0.1} />
      </mesh>
      {/* Etiqueta envolvente */}
      <mesh>
        <cylinderGeometry args={[0.243, 0.243, 0.34, 48, 1, true]} />
        <meshStandardMaterial map={label} roughness={0.6} side={THREE.FrontSide} />
      </mesh>
      {/* Hombro + boquilla */}
      <mesh position={[0, 0.3, 0]} scale={[1, 0.45, 1]} castShadow>
        <sphereGeometry args={[0.24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={PALETTE.ink} roughness={0.08} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.46, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.12, 24]} />
        <meshStandardMaterial color="#f1f3f5" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <coneGeometry args={[0.05, 0.12, 24]} />
        <meshStandardMaterial color="#f1f3f5" roughness={0.4} />
      </mesh>
    </group>
  );
};
