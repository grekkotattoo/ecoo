import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {random} from 'remotion';
import * as THREE from 'three';

/** Partículas deterministas (ceniza / chispas) con InstancedMesh. */
export const Particles: React.FC<{
  count: number;
  t: number;
  box: [number, number, number];
  center?: [number, number, number];
  fall: number;
  size: number;
  seed: string;
  children: React.ReactNode; // material
  geometry?: 'tetra' | 'sphere';
}> = ({count, t, box, center = [0, 0, 0], fall, size, seed, children, geometry = 'tetra'}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({length: count}).map((_, i) => ({
        x: random(`${seed}x${i}`),
        y: random(`${seed}y${i}`),
        z: random(`${seed}z${i}`),
        s: 0.4 + random(`${seed}s${i}`) * 0.9,
        r: random(`${seed}r${i}`) * 6,
        sp: 0.6 + random(`${seed}v${i}`) * 0.8,
      })),
    [count, seed],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    data.forEach((p, i) => {
      const yy = (((p.y - (t * fall * p.sp) / box[1]) % 1) + 1) % 1;
      dummy.position.set(
        center[0] + (p.x - 0.5) * box[0] + Math.sin(t * 0.7 + p.r) * 0.25,
        center[1] + yy * box[1],
        center[2] + (p.z - 0.5) * box[2] + Math.cos(t * 0.5 + p.r) * 0.2,
      );
      dummy.rotation.set(p.r + t * p.sp, p.r * 2 + t, 0);
      dummy.scale.setScalar(size * p.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      {geometry === 'tetra' ? <tetrahedronGeometry args={[1, 0]} /> : <sphereGeometry args={[1, 8, 6]} />}
      {children}
    </instancedMesh>
  );
};
