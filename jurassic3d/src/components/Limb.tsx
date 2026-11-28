import React, {useMemo} from 'react';
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

/** Cápsula orientada entre dos puntos (huesos de extremidades). */
export const Limb: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  children: React.ReactNode; // material
  castShadow?: boolean;
}> = ({from, to, radius, children, castShadow = true}) => {
  const {mid, quat, len} = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const l = dir.length();
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
      len: l,
    };
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);
  return (
    <mesh castShadow={castShadow} receiveShadow position={mid} quaternion={quat}>
      <capsuleGeometry args={[radius, Math.max(0.001, len), 8, 20]} />
      {children}
    </mesh>
  );
};
