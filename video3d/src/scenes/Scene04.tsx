// ESCENA 4 — LA CICATRIZACIÓN CÓSMICA (frames 1200–1740). La línea fina muta en un borrón radiactivo.
import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import type {Vec3} from '../config/physics';
import {BEATS, PALETTE, SCENES} from '../config/timeline';
import {ease, EASE, fbm3, lerp3, rnd, rndRange, sp} from '../lib/motion';
import {CabinLights, ISSModule} from '../three/ISS';
import {CameraRig, SceneCanvas, TITLE_FONT, useCanvasTexture} from '../three/Stage';

const RAD_START = BEATS.radiationStart - SCENES.S04.from; // 60
const MUT_START = BEATS.mutationStart - SCENES.S04.from; // 120
const MUT_PEAK = BEATS.mutationPeak - SCENES.S04.from; // 440

const ARM_R = 0.42;
const ARM_POS: Vec3 = [0, -0.35, 0];
const THETA0 = 0.75; // ángulo del tatuaje alrededor del eje (entre arriba y frente)
const TAT_SCALE = 0.36;
const TATTOO_CENTER: Vec3 = [ARM_POS[0], ARM_POS[1] + Math.cos(THETA0) * ARM_R, ARM_POS[2] + Math.sin(THETA0) * ARM_R];

// ---------------------------------------------------------------- Diseño del tatuaje (2D: u a lo largo del brazo, v perpendicular)
type Stroke = {pts: [number, number][]; closed?: boolean};
const circle = (cx: number, cy: number, r: number, n = 14): [number, number][] =>
  new Array(n).fill(0).map((_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);

const ROCKET: Stroke[] = [
  {pts: [[-0.55, 0.17], [0.0, 0.22], [0.4, 0.2], [0.72, 0.1], [0.92, 0], [0.72, -0.1], [0.4, -0.2], [0.0, -0.22], [-0.55, -0.17]], closed: true},
  {pts: circle(0.3, 0, 0.085), closed: true},
  {pts: [[-0.28, 0.2], [-0.52, 0.44], [-0.66, 0.42], [-0.56, 0.17]]},
  {pts: [[-0.28, -0.2], [-0.52, -0.44], [-0.66, -0.42], [-0.56, -0.17]]},
  {pts: [[-0.57, 0.11], [-0.78, 0.14], [-0.72, 0.05], [-1.0, 0.0], [-0.72, -0.05], [-0.78, -0.14], [-0.57, -0.11]]},
  {pts: [[0.62, 0.52], [0.62, 0.38]]},
  {pts: [[0.55, 0.45], [0.69, 0.45]]},
  {pts: [[-0.15, -0.55], [-0.15, -0.43]]},
  {pts: [[-0.21, -0.49], [-0.09, -0.49]]},
];

/** (u,v) del diseño → punto 3D sobre la piel, con mutación procedural. */
const skinPoint = (u: number, v: number, m: number, frame: number, lift: number): THREE.Vector3 => {
  const n1 = fbm3(u * 2.3 + 1.7, v * 2.3, frame * 0.012);
  const n2 = fbm3(u * 2.3 - 4.1, v * 2.3 + 2, frame * 0.012 + 5);
  const grow = 1 + m * 0.3; // las líneas se expanden
  const uu = (u * grow + n1 * m * 0.38) * TAT_SCALE;
  const vv = (v * grow + n2 * m * 0.38) * TAT_SCALE;
  const theta = THETA0 + vv / ARM_R;
  const r = ARM_R + lift + Math.max(0, n1) * m * 0.02; // relieve del borrón
  return new THREE.Vector3(ARM_POS[0] + uu, ARM_POS[1] + Math.cos(theta) * r, ARM_POS[2] + Math.sin(theta) * r);
};

const strokeGeometry = (s: Stroke, m: number, frame: number, radius: number, lift: number) => {
  const pts = s.pts.map(([u, v]) => skinPoint(u, v, m, frame, lift));
  const curve = new THREE.CatmullRomCurve3(pts, !!s.closed, 'centripetal');
  return new THREE.TubeGeometry(curve, s.closed ? 90 : 40, radius, 8, !!s.closed);
};

const Tattoo: React.FC<{m: number; frame: number}> = ({m, frame}) => {
  // Geometría regenerada por frame (ruido animado). Se libera la anterior para no fugar memoria.
  const geos = useMemo(() => {
    const core = ROCKET.map((s, i) => strokeGeometry(s, m, frame + i * 3, 0.0042 + m * 0.017, 0.003));
    const halo = m > 0.02 ? ROCKET.map((s, i) => strokeGeometry(s, m, frame + i * 3, (0.0042 + m * 0.017) * 1.9, 0.004)) : [];
    return {core, halo};
  }, [m, frame]);
  React.useEffect(() => () => [...geos.core, ...geos.halo].forEach((g) => g.dispose()), [geos]);
  const ink = new THREE.Color('#0b0b0b').lerp(new THREE.Color('#0f3d0a'), m);
  return (
    <group>
      {geos.core.map((g, i) => (
        <mesh key={`c${i}`} geometry={g}>
          <meshStandardMaterial color={ink} roughness={0.55} emissive={PALETTE.radGreen} emissiveIntensity={m * 1.4} />
        </mesh>
      ))}
      {geos.halo.map((g, i) => (
        <mesh key={`h${i}`} geometry={g}>
          <meshBasicMaterial color="#7dff4f" transparent opacity={m * 0.14} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {/* Gotas de "sangrado" radiactivo que brotan sobre el trazo */}
      {m > 0.35 &&
        [0, 2, 4, 6, 8, 11].map((k) => {
          const s = ROCKET[0].pts[k % ROCKET[0].pts.length];
          const p = skinPoint(s[0], s[1], m, frame, 0.01);
          const g = ease(m, [0.35, 1], [0, 1], EASE.out) * (0.02 + rnd(`blot${k}`) * 0.03);
          return (
            <mesh key={k} position={p} scale={[g * 1.4, g, g * 1.2]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial color="#174d0f" emissive={PALETTE.radGreen} emissiveIntensity={1.2} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------------------------------------------------------------- Partículas cósmicas
interface Ray {
  start: number;
  dur: number;
  from: Vec3;
  to: Vec3;
  color: string;
}
const useRays = () =>
  useMemo<Ray[]>(
    () =>
      new Array(64).fill(0).map((_, i) => {
        const a = rnd(`ra${i}`) * Math.PI * 2;
        const e = rndRange(`re${i}`, 0.15, 1.2);
        const d = rndRange(`rd${i}`, 3.5, 6);
        const to: Vec3 = [TATTOO_CENTER[0] + rndRange(`tu${i}`, -0.35, 0.35), TATTOO_CENTER[1] + rndRange(`tv${i}`, -0.04, 0.06), TATTOO_CENTER[2] + rndRange(`tw${i}`, -0.12, 0.12)];
        return {
          start: RAD_START + Math.floor(Math.pow(i / 64, 1.25) * 380),
          dur: Math.floor(rndRange(`rt${i}`, 34, 70)),
          from: [to[0] + Math.cos(a) * Math.cos(e) * d, to[1] + Math.sin(e) * d, to[2] + Math.sin(a) * Math.cos(e) * d],
          to,
          color: i % 2 === 0 ? PALETTE.radViolet : PALETTE.radGreen,
        };
      }),
    [],
  );

const RayView: React.FC<{ray: Ray; frame: number; fps: number}> = ({ray, frame, fps}) => {
  const end = ray.start + ray.dur;
  if (frame < ray.start || frame > end + 26) return null;
  if (frame <= end) {
    const k = ease(frame, [ray.start, end], [0, 1], EASE.in); // acelera hacia la piel
    const p = lerp3(ray.from, ray.to, k);
    const dir = new THREE.Vector3(ray.to[0] - ray.from[0], ray.to[1] - ray.from[1], ray.to[2] - ray.from[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return (
      <group position={p} quaternion={q}>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.012, 0.24 + k * 0.2, 4, 8]} />
          <meshBasicMaterial color={ray.color} transparent opacity={0.9} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.026, 12, 10]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>
    );
  }
  // Impacto: onda que se expande con muelle
  const burst = sp(frame, fps, end, {damping: 20, stiffness: 160});
  return (
    <mesh position={ray.to} scale={0.02 + burst * 0.1}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color={ray.color} transparent opacity={(1 - (frame - end) / 26) * 0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// ---------------------------------------------------------------- Gag: la pomada que se escapa flotando
const CreamTube: React.FC<JSX.IntrinsicElements['group']> = (props) => {
  const label = useCanvasTexture(
    512,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0077b6';
      ctx.font = `900 74px ${TITLE_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POMADA', w / 2, h * 0.42);
      ctx.font = `800 34px ${TITLE_FONT}`;
      ctx.fillText('(INÚTIL AQUÍ)', w / 2, h * 0.75);
    },
    '900 74px Montserrat',
  );
  return (
    <group {...props}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 0.6, 32]} />
        <meshStandardMaterial map={label} roughness={0.4} />
      </mesh>
      <RoundedBox args={[0.08, 0.04, 0.26]} radius={0.015} position={[-0.33, 0, 0]}>
        <meshStandardMaterial color="#e9ecef" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0.36, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.07, 0.12, 20]} />
        <meshStandardMaterial color="#0077b6" roughness={0.35} />
      </mesh>
    </group>
  );
};

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const rays = useRays();

  const m = ease(frame, [MUT_START, MUT_PEAK], [0, 1], EASE.cine);
  const dark = ease(frame, [0, 90], [1, 0.08], EASE.inOut); // oscurecimiento dramático

  // Zoom progresivo con entrada de muelle hacia la piel iluminada
  const push = sp(frame, fps, 0, {damping: 200, mass: 6, stiffness: 18});
  const zoom = ease(frame, [60, 520], [0, 1], EASE.cine);
  const camPos = lerp3(lerp3([0.9, 2.6, 4.2], [0.4, 2.0, 2.9], push), [0.1, 1.42, 1.62], zoom);
  // Barrel roll de ingravidez: el brazo queda vertical en el 9:16 y el cohete apunta hacia arriba.
  const roll = ease(frame, [0, 240], [0.35, Math.PI / 2], EASE.cine);
  const target = lerp3([0.2, -0.2, 0], TATTOO_CENTER, Math.min(1, push * 1.1));
  const tremor: Vec3 = [Math.sin(frame * 0.9) * 0.002 * m, Math.cos(frame * 1.1) * 0.002 * m, 0];

  return (
    <SceneCanvas background="#010102">
      <CameraRig position={[camPos[0] + tremor[0], camPos[1] + tremor[1], camPos[2]]} target={target} roll={roll} fov={ease(frame, [0, 540], [40, 32], EASE.inOut)} />
      <CabinLights cabin={dark} earth={dark * 0.8 + 0.08} />
      {/* Luz de recorte violeta + tatuaje como fuente de luz verde */}
      <pointLight position={[-1.5, 1.5, -1]} intensity={3 + m * 4} distance={6} color={PALETTE.radViolet} />
      <pointLight position={[TATTOO_CENTER[0], TATTOO_CENTER[1] + 0.25, TATTOO_CENTER[2] + 0.2]} intensity={0.2 + m * 4} distance={4} decay={1.6} color={PALETTE.radGreen} />
      <spotLight position={[0.5, 2.5, 1.5]} angle={0.5} penumbra={0.8} intensity={6 * (1 - m * 0.6)} distance={6} color="#dfe7ff" castShadow />

      <ISSModule exterior={false} />

      {/* Antebrazo de maniquí */}
      <group position={ARM_POS}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <capsuleGeometry args={[ARM_R, 2.4, 16, 48]} />
          <meshPhysicalMaterial color="#e8cdb5" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.4} sheen={0.3} sheenColor="#ffd8c2" />
        </mesh>
        {/* Muñeca + mano estilizada */}
        <mesh position={[1.75, 0, 0]} scale={[1.1, 0.55, 0.85]} castShadow>
          <sphereGeometry args={[0.38, 32, 24]} />
          <meshPhysicalMaterial color="#e8cdb5" roughness={0.42} clearcoat={0.35} />
        </mesh>
        {/* Junta de maniquí en el codo */}
        <mesh position={[-1.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[ARM_R * 0.98, 0.03, 12, 48]} />
          <meshStandardMaterial color="#8d6e63" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>

      <Tattoo m={m} frame={frame} />
      {rays.map((r, i) => (
        <RayView key={i} ray={r} frame={frame} fps={fps} />
      ))}

      <CreamTube position={[-1.2 + t * 0.12, 0.9 + Math.sin(t) * 0.05, -1.4 - t * 0.15]} rotation={[0.3 + t * 0.2, t * 0.35, 0.4]} />
    </SceneCanvas>
  );
};
