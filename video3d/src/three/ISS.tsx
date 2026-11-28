// Módulo cilíndrico de la Estación Espacial + Tierra + estrellas. Todo primitivas 3D con materiales físicos.
import React, {useMemo} from 'react';
import {Environment, Lightformer, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import type {Vec3} from '../config/physics';
import {PALETTE} from '../config/timeline';
import {fbm3, rnd} from '../lib/motion';

export const MODULE_R = 2.6;
export const MODULE_L = 16; // z ∈ [-8, 8]
const HALF = MODULE_L / 2;
export const HATCH_R = 1.15;
export const WINDOW_R = 0.95;

// ---------------------------------------------------------------- Iluminación ambiental (IBL sin descargas)
export const StudioEnv: React.FC<{intensity?: number; tint?: string; warm?: boolean}> = ({intensity = 0.6, tint = PALETTE.earth, warm = false}) => (
  <Environment resolution={256} frames={1} environmentIntensity={intensity}>
    <Lightformer form="rect" intensity={warm ? 3 : 2.2} color={warm ? '#ffd9a0' : PALETTE.cabin} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
    <Lightformer form="rect" intensity={1.6} color={tint} position={[0, -5, -4]} rotation={[-Math.PI / 2, 0, 0]} scale={[12, 6, 1]} />
    <Lightformer form="ring" intensity={2.5} color={warm ? '#ffb347' : '#ffffff'} position={[5, 1, 3]} scale={3} />
    <Lightformer form="rect" intensity={1} color="#ffffff" position={[-6, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6, 4, 1]} />
  </Environment>
);

// ---------------------------------------------------------------- Cables (TubeGeometry)
export const Cable: React.FC<{points: Vec3[]; radius?: number; color?: string; segments?: number; roughness?: number}> = ({
  points,
  radius = 0.025,
  color = '#111',
  segments = 96,
  roughness = 0.45,
}) => {
  const key = JSON.stringify(points);
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, segments, radius, 10, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, radius, segments]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.1} />
    </mesh>
  );
};

const polar = (theta: number, r: number, z: number): Vec3 => [Math.cos(theta) * r, Math.sin(theta) * r, z];

// ---------------------------------------------------------------- Módulo
export const ISSModule: React.FC<{exterior?: boolean; panelTint?: string}> = ({exterior = true, panelTint = '#f1f3f5'}) => {
  const panels = useMemo(() => {
    const out: {pos: Vec3; rotZ: number; color: string; velcro: boolean; key: string}[] = [];
    const rings = 7;
    for (let i = 0; i < rings; i++) {
      const z = -HALF + 1.3 + i * ((MODULE_L - 2.6) / (rings - 1));
      for (let k = 0; k < 8; k++) {
        if (k === 2 && i % 3 === 1) continue; // huecos para luminarias del techo
        const theta = (k / 8) * Math.PI * 2 + Math.PI / 8;
        const shade = rnd(`p${i}-${k}`);
        out.push({
          pos: polar(theta, MODULE_R - 0.12, z),
          rotZ: theta - Math.PI / 2,
          color: shade > 0.85 ? '#d8dde2' : shade > 0.7 ? '#e9ecef' : panelTint,
          velcro: shade < 0.35,
          key: `${i}-${k}`,
        });
      }
    }
    return out;
  }, [panelTint]);

  const cables = useMemo(() => {
    const colors = ['#141414', '#c1121f', '#f4a261', '#1d3557', '#2a9d8f', '#141414'];
    return colors.map((color, c) => {
      const base = Math.PI * 0.78 + c * 0.07;
      const pts: Vec3[] = [];
      for (let j = 0; j <= 10; j++) {
        const z = -HALF + 0.3 + (j / 10) * (MODULE_L - 0.6);
        const sag = Math.sin(j * 1.7 + c) * 0.12 + (j % 3 === 0 ? 0.2 : 0);
        pts.push(polar(base + Math.sin(j + c) * 0.05, MODULE_R - 0.32 - sag, z));
      }
      return {color, pts, r: 0.022 + (c % 3) * 0.006};
    });
  }, []);

  const handrails = useMemo(
    () =>
      [-5.5, -2, 1.5, 5].flatMap((z, i) => [
        {pos: polar(Math.PI * 0.25, MODULE_R - 0.3, z), rot: Math.PI * 0.25, key: `h${i}a`},
        {pos: polar(Math.PI * 1.25, MODULE_R - 0.3, z + 0.8), rot: Math.PI * 1.25, key: `h${i}b`},
      ]),
    [],
  );

  return (
    <group>
      {/* Casco interior */}
      <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[MODULE_R, MODULE_R, MODULE_L, 64, 1, true]} />
        <meshStandardMaterial color="#aeb6bf" roughness={0.85} metalness={0.2} side={THREE.BackSide} />
      </mesh>

      {/* Paneles acolchados blancos */}
      {panels.map((p) => (
        <group key={p.key} position={p.pos} rotation={[0, 0, p.rotZ]}>
          <RoundedBox args={[1.72, 0.16, 1.72]} radius={0.07} smoothness={3} castShadow receiveShadow>
            <meshPhysicalMaterial color={p.color} roughness={0.62} sheen={0.6} sheenRoughness={0.8} sheenColor="#ffffff" />
          </RoundedBox>
          {/* Costura del acolchado */}
          <mesh position={[0, 0.085, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.55, 0.012, 6, 32]} />
            <meshStandardMaterial color="#c9ced3" roughness={0.9} />
          </mesh>
          {p.velcro && (
            <mesh position={[0.45, 0.09, -0.4]}>
              <boxGeometry args={[0.32, 0.02, 0.18]} />
              <meshStandardMaterial color="#3a3f44" roughness={1} />
            </mesh>
          )}
        </group>
      ))}

      {/* Luminarias de techo */}
      {[-4.6, 0, 4.6].map((z) => (
        <mesh key={z} position={polar(Math.PI * 0.625, MODULE_R - 0.08, z)} rotation={[0, 0, Math.PI * 0.625 - Math.PI / 2]}>
          <boxGeometry args={[1.3, 0.04, 1.4]} />
          <meshStandardMaterial color={PALETTE.cabin} emissive={PALETTE.cabin} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}

      {/* Mazos de cables */}
      {cables.map((c, i) => (
        <Cable key={i} points={c.pts} radius={c.r} color={c.color} />
      ))}

      {/* Asideros */}
      {handrails.map((h) => (
        <mesh key={h.key} position={h.pos} rotation={[Math.PI / 2, h.rot, 0]} castShadow>
          <torusGeometry args={[0.22, 0.03, 10, 24, Math.PI]} />
          <meshStandardMaterial color="#5c7ea6" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {/* Costillas estructurales */}
      {[-HALF + 0.05, -2.7, 2.7, HALF - 0.05].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[MODULE_R - 0.02, 0.09, 12, 64]} />
          <meshStandardMaterial color="#8d99a6" metalness={0.75} roughness={0.3} />
        </mesh>
      ))}

      {/* Escotilla de entrada (+z): anillo con hueco y compuerta abierta */}
      <group position={[0, 0, HALF]}>
        <mesh>
          <ringGeometry args={[HATCH_R, MODULE_R + 0.1, 64]} />
          <meshStandardMaterial color="#c7cdd3" metalness={0.5} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <torusGeometry args={[HATCH_R + 0.04, 0.1, 16, 64]} />
          <meshStandardMaterial color="#6c757d" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Compuerta abatida */}
        <group position={[HATCH_R + 0.12, 0, 0.05]} rotation={[0, -1.9, 0]}>
          <mesh position={[HATCH_R, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[HATCH_R, HATCH_R, 0.14, 48]} />
            <meshStandardMaterial color="#adb5bd" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[HATCH_R, 0, 0.09]}>
            <torusGeometry args={[0.32, 0.035, 10, 32]} />
            <meshStandardMaterial color="#ffb703" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Fondo (−z): tapa con ojo de buey hacia la Tierra */}
      <group position={[0, 0, -HALF]}>
        <mesh>
          <ringGeometry args={[WINDOW_R, MODULE_R + 0.1, 64]} />
          <meshStandardMaterial color="#d3d8dd" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <torusGeometry args={[WINDOW_R + 0.03, 0.12, 16, 64]} />
          <meshStandardMaterial color="#495057" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh>
          <circleGeometry args={[WINDOW_R, 48]} />
          <meshPhysicalMaterial color="#9fd8ff" transparent opacity={0.12} roughness={0.02} clearcoat={1} metalness={0} />
        </mesh>
      </group>

      {/* Casco exterior (aislante MLI) */}
      {exterior && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[MODULE_R + 0.1, MODULE_R + 0.1, MODULE_L, 64, 1, true]} />
            <meshStandardMaterial color="#e8e2d0" roughness={0.75} metalness={0.15} />
          </mesh>
          {[-6, -3, 0, 3, 6].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <torusGeometry args={[MODULE_R + 0.12, 0.05, 8, 64]} />
              <meshStandardMaterial color="#b8b2a0" metalness={0.5} roughness={0.5} />
            </mesh>
          ))}
          {/* Paneles solares */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * (MODULE_R + 4.2), 0, -2]}>
              <mesh castShadow>
                <boxGeometry args={[7, 0.06, 3.2]} />
                <meshStandardMaterial color="#14213d" metalness={0.8} roughness={0.25} emissive="#0b2545" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[-s * 2.5, 0, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 3.6, 12]} />
                <meshStandardMaterial color="#adb5bd" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
};

// ---------------------------------------------------------------- Tierra con nubes procedurales
const earthTexture = () => {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x / w) * Math.PI * 2;
      const v = (y / h) * Math.PI;
      const nx = Math.cos(u) * Math.sin(v);
      const ny = Math.cos(v);
      const nz = Math.sin(u) * Math.sin(v);
      const land = fbm3(nx * 2.2 + 3, ny * 2.2, nz * 2.2);
      const cloud = fbm3(nx * 4 + 9, ny * 6, nz * 4);
      let r = 10, g = 70, b = 150; // océano
      if (land > 0.12) {
        r = 40 + land * 80;
        g = 110 + land * 60;
        b = 60;
      }
      if (cloud > 0.18) {
        const k = Math.min(1, (cloud - 0.18) * 3);
        r += (245 - r) * k;
        g += (250 - g) * k;
        b += (255 - b) * k;
      }
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const Earth: React.FC<{position?: Vec3; radius?: number; rotation?: number}> = ({position = [0, -62, -95], radius = 70, rotation = 0}) => {
  const map = useMemo(earthTexture, []);
  return (
    <group position={position}>
      <mesh rotation={[0.35, rotation, 0.1]}>
        <sphereGeometry args={[radius, 96, 64]} />
        <meshStandardMaterial map={map} roughness={0.85} metalness={0} emissive={PALETTE.earth} emissiveIntensity={0.18} />
      </mesh>
      {/* Atmósfera */}
      <mesh scale={1.025}>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshBasicMaterial color={PALETTE.earth} transparent opacity={0.28} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshBasicMaterial color="#48cae4" transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Starfield: React.FC<{count?: number; radius?: number}> = ({count = 1800, radius = 400}) => {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rnd(`su${i}`) * 2 - 1;
      const t = rnd(`st${i}`) * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(t) * s * radius;
      pos[i * 3 + 1] = u * radius;
      pos[i * 3 + 2] = Math.sin(t) * s * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, radius]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={1.1} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
};

/** Luces estándar de cabina: fría + reflejo azulado de la Tierra. */
export const CabinLights: React.FC<{cabin?: number; earth?: number}> = ({cabin = 1, earth = 1}) => (
  <>
    <ambientLight intensity={0.25 * cabin} color={PALETTE.cabin} />
    <pointLight position={[0, 1.6, 3.5]} intensity={9 * cabin} distance={12} decay={1.6} color={PALETTE.cabin} />
    <pointLight position={[0, 1.6, -3.5]} intensity={7 * cabin} distance={12} decay={1.6} color={PALETTE.cabin} />
    <spotLight
      position={[0, 2.2, 1]}
      angle={0.9}
      penumbra={0.7}
      intensity={30 * cabin}
      distance={14}
      decay={1.5}
      color={PALETTE.cabin}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0004}
    />
    <directionalLight position={[0, -3, -12]} intensity={2.4 * earth} color={PALETTE.earth} />
    <pointLight position={[0, -0.5, -7]} intensity={14 * earth} distance={14} decay={1.4} color={PALETTE.earth} />
  </>
);
