// Capa HUD: marca de serie, "REC" de cámara de misión, timecode e icono de escena (lucide-react).
import React from 'react';
import {Droplets, Orbit, Radiation, Rocket, Trophy, type LucideIcon} from 'lucide-react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {PALETTE, SCENE_LIST, type SceneId} from '../config/timeline';
import {FONT_FAMILY} from '../lib/fonts';

const ICONS: Record<SceneId, {icon: LucideIcon; label: string; color: string}> = {
  S01: {icon: Rocket, label: 'ÓRBITA BAJA', color: PALETTE.earth},
  S02: {icon: Droplets, label: 'FUGA DE TINTA', color: '#ffffff'},
  S03: {icon: Orbit, label: 'NEWTON 3', color: PALETTE.alarm},
  S04: {icon: Radiation, label: 'RADIACIÓN', color: '#7dff4f'},
  S05: {icon: Trophy, label: 'GANADOR', color: PALETTE.neonYellow},
};

const chip: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 24px',
  borderRadius: 999,
  background: 'rgba(0,0,0,0.55)',
  border: '3px solid rgba(255,255,255,0.25)',
  fontFamily: FONT_FAMILY,
  fontWeight: 900,
  fontSize: 34,
  color: '#fff',
  letterSpacing: 1,
};

export const HUD: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scene = SCENE_LIST.find((s) => frame >= s.from && frame < s.to) ?? SCENE_LIST[SCENE_LIST.length - 1];
  const {icon: Icon, label, color} = ICONS[scene.id];
  const enter = spring({frame: frame - scene.from, fps, config: {damping: 14, stiffness: 160}});
  const secs = Math.floor(frame / fps);
  const tc = `T+00:${String(secs).padStart(2, '0')}:${String(frame % fps).padStart(2, '0')}`;
  const recOn = Math.floor(frame / 30) % 2 === 0;
  const intro = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3)});
  return (
    <AbsoluteFill style={{pointerEvents: 'none', padding: '110px 56px', opacity: intro}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{...chip, fontSize: 36}}>
          <span style={{color: PALETTE.neonYellow}}>¿QUÉ PASARÍA SI...?</span>
        </div>
        <div style={chip}>
          <span style={{width: 22, height: 22, borderRadius: 11, background: recOn ? '#ff2d55' : 'transparent', border: '3px solid #ff2d55'}} />
          <span>REC</span>
          <span style={{opacity: 0.8, fontVariantNumeric: 'tabular-nums'}}>{tc}</span>
        </div>
      </div>
      <div style={{marginTop: 22, display: 'flex', justifyContent: 'flex-end'}}>
        <div style={{...chip, color, transform: `translateX(${(1 - enter) * 420}px)`}}>
          <Icon size={40} strokeWidth={3} color={color} />
          <span>{label}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
