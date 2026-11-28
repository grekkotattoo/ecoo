import {RoundedBox} from '@react-three/drei';
import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {makeSkinTexture, makeStoneTextures} from '../lib/textures';

/**
 * Brazo humano estilizado (hombro en x=0, mano hacia +x), apoyado en su eje.
 * `stoneFront`: coordenada X MUNDIAL del frente de petrificación.
 *   Todo lo que queda a la izquierda (x < stoneFront) es piedra; a la derecha, piel.
 *   Usa +Infinity para un brazo 100 % fósil y -Infinity para piel intacta.
 */
export const Arm: React.FC<{
  stoneFront: number;
  castShadow?: boolean;
  withSleeve?: boolean;
  fingerCurl?: number;
}> = ({stoneFront, castShadow = true, withSleeve = true, fingerCurl = 0.15}) => {
  const skinPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);
  const stonePlane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), []);

  useLayoutEffect(() => {
    const f = Number.isFinite(stoneFront) ? stoneFront : stoneFront > 0 ? 1e4 : -1e4;
    // piel visible donde x >= f ; piedra visible donde x <= f
    skinPlane.constant = -f;
    stonePlane.constant = f;
  });

  const mats = useMemo(() => {
    const skinTex = makeSkinTexture();
    const stoneTattoo = makeStoneTextures(true);
    const stonePlain = makeStoneTextures(false);
    const skinCommon = {
      roughness: 0.55,
      clearcoat: 0.15,
      clearcoatRoughness: 0.6,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffb59a'),
      sheenRoughness: 0.7,
      clippingPlanes: [skinPlane],
      clipShadows: true,
    };
    const stoneCommon = {
      roughness: 0.92,
      metalness: 0.02,
      bumpScale: 3,
      clippingPlanes: [stonePlane],
      clipShadows: true,
    };
    return {
      skinTattoo: new THREE.MeshPhysicalMaterial({...skinCommon, map: skinTex}),
      skin: new THREE.MeshPhysicalMaterial({...skinCommon, color: '#d6977a'}),
      stoneTattoo: new THREE.MeshStandardMaterial({
        ...stoneCommon,
        map: stoneTattoo.map,
        bumpMap: stoneTattoo.bump,
      }),
      stone: new THREE.MeshStandardMaterial({
        ...stoneCommon,
        map: stonePlain.map,
        bumpMap: stonePlain.bump,
      }),
      sleeve: new THREE.MeshPhysicalMaterial({
        color: '#1d1d24',
        roughness: 0.95,
        sheen: 1,
        sheenColor: new THREE.Color('#5a5a70'),
      }),
    };
  }, [skinPlane, stonePlane]);

  const parts = (variant: 'skin' | 'stone') => {
    const tattooMat = variant === 'skin' ? mats.skinTattoo : mats.stoneTattoo;
    const m = variant === 'skin' ? mats.skin : mats.stone;
    const sh = {castShadow, receiveShadow: true};
    const fingers = [-0.17, -0.06, 0.05, 0.16];
    return (
      <group>
        {/* Brazo superior (bíceps con el tatuaje) */}
        <group position={[0.95, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          {/* Cilindro (UV lineal a lo largo) para que el tatuaje no se deforme */}
          <mesh {...sh} rotation={[0, -Math.PI / 2 - 0.5, 0]} material={tattooMat}>
            <cylinderGeometry args={[0.34, 0.33, 1.45, 48, 1, true]} />
          </mesh>
        </group>
        {/* Hombro */}
        <mesh {...sh} position={[0.225, 0, 0]} material={m}>
          <sphereGeometry args={[0.34, 32, 24]} />
        </mesh>
        {/* Codo */}
        <mesh {...sh} position={[1.92, -0.02, 0]} material={m}>
          <sphereGeometry args={[0.3, 32, 24]} />
        </mesh>
        {/* Antebrazo cónico */}
        <mesh {...sh} position={[2.72, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]} material={m}>
          <cylinderGeometry args={[0.2, 0.29, 1.6, 36, 1]} />
        </mesh>
        {/* Muñeca */}
        <mesh {...sh} position={[3.52, -0.06, 0]} scale={[0.9, 0.7, 1.05]} material={m}>
          <sphereGeometry args={[0.21, 28, 20]} />
        </mesh>
        {/* Mano */}
        <RoundedBox {...sh} args={[0.62, 0.2, 0.56]} radius={0.09} smoothness={4} position={[3.88, -0.1, 0]} material={m} />
        {fingers.map((z, i) => (
          <group key={i} position={[4.2, -0.1, z * 1.25]} rotation={[0, (z * 0.4), -fingerCurl * (1 + i * 0.15)]}>
            <mesh {...sh} position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={m}>
              <capsuleGeometry args={[0.055, 0.32 - Math.abs(z) * 0.4, 6, 14]} />
            </mesh>
          </group>
        ))}
        {/* Pulgar */}
        <group position={[3.75, -0.05, 0.3]} rotation={[0, -0.9, 0]}>
          <mesh {...sh} position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={m}>
            <capsuleGeometry args={[0.065, 0.24, 6, 14]} />
          </mesh>
        </group>
      </group>
    );
  };

  return (
    <group>
      {parts('skin')}
      {parts('stone')}
      {withSleeve ? (
        <mesh castShadow={castShadow} position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={mats.sleeve}>
          <cylinderGeometry args={[0.43, 0.47, 0.5, 36, 1, true]} />
        </mesh>
      ) : null}
    </group>
  );
};
