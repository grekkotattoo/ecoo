// ESCENA 5 — EL REMATE MEME (frames 1740–2160). Pull back épico desde el trofeo de oro.
import React, {useMemo} from 'react';
import {RoundedBox} from '@react-three/drei';
import {useDesignFrame} from '../lib/time';
import * as THREE from 'three';
import type {Vec3} from '../config/physics';
import {DESIGN_FPS, PALETTE} from '../config/timeline';
import {ease, EASE, lerp3, rnd, rndRange, sp} from '../lib/motion';
import {Astronaut} from '../three/Astronaut';
import {StudioEnv} from '../three/ISS';
import {TattooMachine} from '../three/Props';
import {AimedSpotLight, CameraRig, SceneCanvas, TITLE_FONT, useCanvasTexture} from '../three/Stage';

export const SIGN_TEXT = ['1º PREMIO:', 'EL CHAPUZAS', 'DE LA NASA'];
const PODIUM_TOP = 1.35;
const TROPHY_POS: Vec3 = [0, PODIUM_TOP + 0.45, 0];

const Gold: React.FC<{rough?: number}> = ({rough = 0.15}) => <meshPhysicalMaterial color={PALETTE.gold} metalness={1} roughness={rough} clearcoat={0.5} clearcoatRoughness={0.08} />;

const Sign: React.FC<{frame: number} & JSX.IntrinsicElements['group']> = ({frame, ...props}) => {
  const tex = useCanvasTexture(
    1024,
    640,
    (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a0633');
      g.addColorStop(1, '#3c096c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const lines: [string, number, string][] = [
        [SIGN_TEXT[0], 120, PALETTE.neonYellow],
        [SIGN_TEXT[1], 132, '#ffffff'],
        [SIGN_TEXT[2], 132, '#ffffff'],
      ];
      lines.forEach(([txt, size, color], i) => {
        ctx.font = `900 ${size}px ${TITLE_FONT}`;
        const y = 140 + i * 180;
        ctx.lineWidth = 18;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(txt, w / 2, y);
        ctx.shadowColor = color;
        ctx.shadowBlur = 30;
        ctx.fillStyle = color;
        ctx.fillText(txt, w / 2, y);
        ctx.shadowBlur = 0;
      });
    },
    '900 132px Montserrat',
  );
  // Bombillas de marquesina con persecución
  const bulbs = useMemo(() => {
    const out: {p: Vec3; k: number}[] = [];
    const W = 2.6;
    const H = 1.62;
    let k = 0;
    for (let i = 0; i <= 12; i++) out.push({p: [-W / 2 + (i / 12) * W, H / 2, 0.14], k: k++});
    for (let i = 1; i <= 7; i++) out.push({p: [W / 2, H / 2 - (i / 8) * H, 0.14], k: k++});
    for (let i = 12; i >= 0; i--) out.push({p: [-W / 2 + (i / 12) * W, -H / 2, 0.14], k: k++});
    for (let i = 7; i >= 1; i--) out.push({p: [-W / 2, H / 2 - (i / 8) * H, 0.14], k: k++});
    return out;
  }, []);
  return (
    <group {...props}>
      <RoundedBox args={[2.8, 1.82, 0.22]} radius={0.06} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#111" metalness={0.8} roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0, 0.115]}>
        <planeGeometry args={[2.5, 1.56]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={1.35} toneMapped={false} />
      </mesh>
      {bulbs.map((b) => {
        const lit = (Math.floor(frame / 5) + b.k) % 3 === 0;
        return (
          <mesh key={b.k} position={b.p}>
            <sphereGeometry args={[0.04, 12, 10]} />
            <meshStandardMaterial color="#fff1c1" emissive="#ffcf6b" emissiveIntensity={lit ? 5 : 0.6} toneMapped={false} />
          </mesh>
        );
      })}
      {/* Patas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.1, -1.35, -0.05]}>
          <cylinderGeometry args={[0.04, 0.04, 1.0, 12]} />
          <meshStandardMaterial color="#2b2b2b" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

const Confetti: React.FC<{frame: number}> = ({frame}) => {
  const bits = useMemo(
    () =>
      new Array(240).fill(0).map((_, i) => ({
        x: rndRange(`cx${i}`, -4.5, 4.5),
        z: rndRange(`cz${i}`, -3, 4),
        y0: rndRange(`cy${i}`, 0, 9),
        speed: rndRange(`cs${i}`, 0.25, 0.7),
        spin: rndRange(`cr${i}`, 2, 6),
        sway: rndRange(`cw${i}`, 0.5, 1.6),
        color: i % 4 === 0 ? '#ffd60a' : i % 4 === 1 ? '#fff3b0' : PALETTE.gold,
        ph: rnd(`cp${i}`) * 10,
      })),
    [],
  );
  const t = frame / 60;
  return (
    <group>
      {bits.map((b, i) => {
        const y = 8 - ((b.y0 + t * b.speed * 1.6) % 9);
        return (
          <mesh key={i} position={[b.x + Math.sin(t * b.sway + b.ph) * 0.25, y, b.z]} rotation={[t * b.spin + b.ph, t * b.spin * 0.6, b.ph]}>
            <boxGeometry args={[0.09, 0.05, 0.004]} />
            <meshPhysicalMaterial color={b.color} metalness={0.95} roughness={0.2} side={THREE.DoubleSide} emissive={b.color} emissiveIntensity={0.15} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Scene05: React.FC = () => {
  const frame = useDesignFrame('S05');
  const fps = DESIGN_FPS;
  const t = frame / fps;

  // Pull back épico (muelle largo) + ligera órbita
  const pull = sp(frame, fps, 8, {damping: 200, mass: 7, stiffness: 14});
  const orbit = ease(frame, [0, 420], [0.35, -0.12], EASE.inOut);
  const dist = 1.15 + pull * 6.6;
  const height = TROPHY_POS[1] + 0.25 + pull * 0.5;
  const camPos: Vec3 = [Math.sin(orbit) * dist, height, Math.cos(orbit) * dist];
  const target = lerp3([TROPHY_POS[0], TROPHY_POS[1] + 0.35, 0], [0, 1.85, 0], pull);

  // Entrada del trofeo: rebote con muelle + giro lento de exhibición
  const drop = sp(frame, fps, 0, {damping: 9, stiffness: 120});
  const signIn = sp(frame, fps, 70, {damping: 11, stiffness: 110});
  const winner = sp(frame, fps, 150, {damping: 12, stiffness: 90});

  return (
    <SceneCanvas background="#07030d" exposure={1.05}>
      <CameraRig position={camPos} target={target} fov={ease(frame, [0, 300], [34, 46], EASE.inOut)} />
      <StudioEnv intensity={0.9} warm />
      <fog attach="fog" args={['#07030d', 9, 26]} />
      <ambientLight intensity={0.12} color="#ffcf9e" />
      {/* Foco teatral cenital */}
      <AimedSpotLight
        position={[0, 9, 1.2]}
        target={[0, PODIUM_TOP, 0]}
        angle={0.36}
        penumbra={0.55}
        intensity={420}
        distance={16}
        decay={1.6}
        color="#ffd29d"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
      />
      <AimedSpotLight position={[-5, 4, 4]} target={[0, 1.5, 0]} angle={0.5} penumbra={0.9} intensity={60} distance={14} color="#c77dff" />
      <AimedSpotLight position={[5, 4, 4]} target={[0, 1.5, 0]} angle={0.5} penumbra={0.9} intensity={60} distance={14} color="#48cae4" />

      {/* Haz volumétrico falso */}
      <mesh position={[0, 5.2, 0.6]} rotation={[0.12, 0, 0]}>
        <coneGeometry args={[1.6, 7.6, 48, 1, true]} />
        <meshBasicMaterial color="#ffd29d" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Suelo de escenario brillante */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshPhysicalMaterial color="#120a18" roughness={0.18} metalness={0.4} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      {/* Telón de terciopelo */}
      <mesh position={[0, 4, -1]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry args={[7, 7, 9, 64, 1, true, -Math.PI * 0.4, Math.PI * 0.8]} />
        <meshPhysicalMaterial color="#5a0b1a" roughness={0.85} sheen={1} sheenColor="#ff4d6d" sheenRoughness={0.5} side={THREE.BackSide} />
      </mesh>
      {Array.from({length: 18}).map((_, i) => {
        const a = -Math.PI * 0.4 + (i / 17) * Math.PI * 0.8;
        return (
          <mesh key={i} position={[Math.sin(a) * 6.85, 4, -1 - Math.cos(a) * 6.85]}>
            <cylinderGeometry args={[0.12, 0.12, 9, 12]} />
            <meshPhysicalMaterial color="#6d0f22" roughness={0.8} sheen={1} sheenColor="#ff758f" />
          </mesh>
        );
      })}

      {/* Podio dorado escalonado */}
      {[
        [1.9, 0.45, 0.22],
        [1.45, 0.45, 0.67],
        [1.0, 0.45, 1.12],
      ].map(([r, h, y], i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[r, r + 0.05, h, 64]} />
            <meshPhysicalMaterial color={i === 2 ? '#1c1c1c' : '#140f1f'} roughness={0.3} metalness={0.6} clearcoat={1} />
          </mesh>
          <mesh position={[0, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.035, 12, 64]} />
            <Gold rough={0.2} />
          </mesh>
        </group>
      ))}

      {/* Trofeo: máquina de tatuar de oro puro sobre peana */}
      <group position={[TROPHY_POS[0], PODIUM_TOP + (1 - drop) * 2.2, TROPHY_POS[2]]} rotation={[0, t * 0.5, 0]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.5, 0.24, 48]} />
          <meshPhysicalMaterial color="#0d0d0d" roughness={0.12} metalness={0.3} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.3, 0.14, 32]} />
          <Gold />
        </mesh>
        <TattooMachine finish="gold" position={[0, 1.6, 0]} rotation={[0, 0, 0.18]} scale={2.1} />
        {/* Asas de copa */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.35, 1.9, 0]} rotation={[0, 0, s * Math.PI / 2]}>
            <torusGeometry args={[0.22, 0.035, 12, 32, Math.PI]} />
            <Gold />
          </mesh>
        ))}
      </group>

      {/* Cartel luminoso */}
      <Sign frame={frame} position={[1.1, 3.45 - (1 - signIn) * 3, -0.9]} rotation={[0, -0.25, 0.04 * (1 - signIn)]} scale={0.52} />

      {/* El ganador: astronauta con el tatuaje radiactivo brillando */}
      <group position={[-1.55, 0.95 - (1 - winner) * 0.6, 0.9]} rotation={[0, 0.45, 0]}>
        <Astronaut
          accent="#4361ee"
          pose={{
            shoulderL: [-2.7 + Math.sin(t * 6) * 0.15 * winner, 0, 0.3],
            elbowL: -0.25,
            shoulderR: [0, 0, -0.35],
            elbowR: -0.4,
            kneeL: 0.05,
            kneeR: 0.05,
          }}
        />
        <pointLight position={[-0.5, 1.6, 0.3]} intensity={6 * winner} distance={2.5} color={PALETTE.radGreen} />
        <mesh position={[-0.55, 1.45, 0.12]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color="#7dff4f" transparent opacity={0.55 * winner} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>

      {/* Público en silueta (primer término) */}
      {Array.from({length: 14}).map((_, i) => (
        <group key={i} position={[-4.6 + i * 0.72 + (i % 2) * 0.2, 0, 4.2 + (i % 3) * 0.35]}>
          <mesh position={[0, 0.55 + Math.max(0, Math.sin(t * 5 + i)) * 0.06 * winner, 0]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshStandardMaterial color="#050308" roughness={1} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <capsuleGeometry args={[0.3, 0.3, 4, 12]} />
            <meshStandardMaterial color="#050308" roughness={1} />
          </mesh>
        </group>
      ))}

      <Confetti frame={frame} />
    </SceneCanvas>
  );
};
