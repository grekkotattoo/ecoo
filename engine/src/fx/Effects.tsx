import React from 'react';
import {hash, smoothNoise} from '../lib/anim';
import type {Effect} from '../types';

/** Sacudida de cámara agregada de todos los efectos 'shake' activos. */
export const shakeOffset = (effects: Effect[] | undefined, f: number) => {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const e of effects ?? []) {
    if (e.type !== 'shake') continue;
    const t = f - e.start;
    if (t < 0 || t > e.dur) continue;
    const k = (1 - t / e.dur) * (e.intensity ?? 1);
    x += smoothNoise(t * 0.9, (e.seed ?? 1) + 1) * 40 * k;
    y += smoothNoise(t * 0.9, (e.seed ?? 1) + 2) * 40 * k;
    r += smoothNoise(t * 0.7, (e.seed ?? 1) + 3) * 2 * k;
  }
  return {x, y, r};
};

const Particles: React.FC<{e: Effect; t: number; kind: 'smoke' | 'sparks' | 'confetti'}> = ({e, t, kind}) => {
  const n = Math.round(14 * (e.intensity ?? 1));
  const cx = e.x ?? 540;
  const cy = e.y ?? 960;
  const seed = e.seed ?? 3;
  const u = t / e.dur;
  const items = [];
  for (let i = 0; i < n; i++) {
    const a = hash(i + seed) * Math.PI * 2;
    const sp = 0.5 + hash(i * 3 + seed);
    if (kind === 'smoke') {
      const r = 30 + u * 160 * sp;
      items.push(
        <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r * 0.5 - u * 120 * sp} r={30 + u * 70 * sp}
          fill={e.color ?? '#d9d2c3'} opacity={(1 - u) * 0.55} stroke="#2b2320" strokeWidth={3} strokeOpacity={(1 - u) * 0.5} />,
      );
    } else if (kind === 'sparks') {
      const r = u * 420 * sp;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r + u * u * 200;
      items.push(<line key={i} x1={x} y1={y} x2={x - Math.cos(a) * 30} y2={y - Math.sin(a) * 30} stroke={e.color ?? '#ffd23f'} strokeWidth={7} strokeLinecap="round" opacity={1 - u} />);
    } else {
      const x = cx + (hash(i + seed * 2) - 0.5) * 1000 + Math.sin(t * 0.2 + i) * 30;
      const y = cy - 900 + ((t * 14 * sp + hash(i) * 1800) % 1900);
      const colors = ['#ff4f5e', '#ffd23f', '#3ec1d3', '#9b5de5', '#f15bb5'];
      items.push(<rect key={i} x={x} y={y} width={22} height={12} fill={colors[i % colors.length]} transform={`rotate(${t * 9 * sp + i * 40} ${x} ${y})`} />);
    }
  }
  return <g>{items}</g>;
};

export const WorldEffects: React.FC<{effects?: Effect[]; f: number; w: number; h: number}> = ({effects, f, w, h}) => (
  <g>
    {(effects ?? []).map((e, i) => {
      const t = f - e.start;
      if (t < 0 || t > e.dur || e.type === 'shake') return null;
      const u = t / e.dur;
      const cx = e.x ?? w / 2;
      const cy = e.y ?? h / 2;
      switch (e.type) {
        case 'smoke':
        case 'sparks':
        case 'confetti':
          return <Particles key={i} e={e} t={t} kind={e.type} />;
        case 'impact': {
          const pts = [];
          const spikes = 14;
          for (let k = 0; k < spikes * 2; k++) {
            const a = (k / (spikes * 2)) * Math.PI * 2;
            const r = (k % 2 === 0 ? 260 : 120) * (0.6 + u * 0.6) * (0.85 + hash(k + (e.seed ?? 0)) * 0.3);
            pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
          }
          return <polygon key={i} points={pts.join(' ')} fill={e.color ?? '#ffd23f'} stroke="#1d1a17" strokeWidth={8} strokeLinejoin="round" opacity={1 - u * u} />;
        }
        case 'speedlines': {
          const lines = [];
          for (let k = 0; k < 28; k++) {
            const a = hash(k + (e.seed ?? 0) + Math.floor(t / 2)) * Math.PI * 2;
            const r0 = 380 + hash(k * 7) * 200;
            lines.push(<line key={k} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * 1500} y2={cy + Math.sin(a) * 1500}
              stroke={e.color ?? '#ffffff'} strokeWidth={4 + hash(k) * 10} opacity={0.7 * (e.intensity ?? 1)} />);
          }
          return <g key={i}>{lines}</g>;
        }
        case 'rain': {
          const drops = [];
          for (let k = 0; k < 60; k++) {
            const x = hash(k) * w;
            const y = ((hash(k * 5) * h + t * 45) % (h + 100)) - 50;
            drops.push(<line key={k} x1={x} y1={y} x2={x - 8} y2={y + 40} stroke={e.color ?? '#a9c4dd'} strokeWidth={3} opacity={0.6} />);
          }
          return <g key={i}>{drops}</g>;
        }
        case 'textPop': {
          const s = u < 0.2 ? (u / 0.2) * 1.15 : u < 0.3 ? 1.15 - ((u - 0.2) / 0.1) * 0.15 : 1;
          return (
            <g key={i} transform={`translate(${cx} ${cy}) scale(${s}) rotate(-6)`} opacity={u > 0.85 ? (1 - u) / 0.15 : 1}>
              <text textAnchor="middle" fontFamily="var(--font-title)" fontSize={150} fill={e.color ?? '#ffd23f'} stroke="#1d1a17" strokeWidth={14} paintOrder="stroke" style={{letterSpacing: 2}}>
                {e.text ?? '!'}
              </text>
            </g>
          );
        }
        default:
          return null;
      }
    })}
  </g>
);

/** Efectos de pantalla (no afectados por cámara). */
export const ScreenEffects: React.FC<{effects?: Effect[]; f: number; w: number; h: number}> = ({effects, f, w, h}) => (
  <g>
    {(effects ?? []).map((e, i) => {
      const t = f - e.start;
      if (t < 0 || t > e.dur) return null;
      const u = t / e.dur;
      if (e.type === 'flash') return <rect key={i} width={w} height={h} fill={e.color ?? '#ffffff'} opacity={(1 - u) * (e.intensity ?? 0.9)} />;
      if (e.type === 'vignettePulse')
        return <rect key={i} width={w} height={h} fill="url(#vignette)" opacity={Math.sin(u * Math.PI) * (e.intensity ?? 0.8)} />;
      return null;
    })}
  </g>
);
