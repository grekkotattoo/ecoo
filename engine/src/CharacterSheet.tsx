import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Defs, Overlay, useFonts} from './Episode';
import {RigView} from './rig/Rig';
import type {SheetSpec} from './types';

/** Hoja de personaje: pose principal + rejilla de expresiones + poses. Se usa en la presentación de aprobación. */
export const CharacterSheet: React.FC<{sheet: SheetSpec}> = ({sheet}) => {
  useFonts(sheet.style);
  const {rig, width: W, height: H, style} = sheet;
  const base: Record<string, string> = {};
  for (const p of rig.parts) if (p.variants) base[p.id] = p.defaultVariant ?? Object.keys(p.variants)[0];
  const cells = [
    ...sheet.expressions.map((e) => ({label: e.label, variants: {...base, ...e.set}, tracks: {} as Record<string, number>})),
    ...sheet.poses.map((p) => ({label: p.label, variants: base, tracks: p.tracks})),
  ];
  const cols = 3;
  const cellW = (W - 120) / cols;
  const rows = Math.ceil(cells.length / cols);
  const gridTop = H * 0.45;
  const cellH = (H - gridTop - 60) / Math.max(1, rows);
  // encuadre por la silueta real (bbox) en lugar del lienzo completo del rig
  const bb = (rig.meta?.bbox as number[] | undefined) ?? [0, 0, rig.width, rig.height];
  const bw0 = bb[2] - bb[0];
  const bh0 = bb[3] - bb[1];
  const fit = (bw: number, bh: number) => Math.min(bw / bw0, bh / bh0) * 0.92;
  const toTracks = (t: Record<string, number>) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, [{f: 0, v}]]));
  const heroS = fit(W * 0.8, H * 0.36);
  return (
    <AbsoluteFill style={{background: style.palette.paper ?? '#f3e9d2'}}>
      <Defs style={style} f={0} />
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', fontFamily: style.fonts.title, fontSize: 72, color: style.palette.ink}}>{sheet.title}</div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${W / 2 - ((bb[0] + bw0 / 2) * heroS)} ${H * 0.08 - bb[1] * heroS}) scale(${heroS})`}>
          <RigView rig={rig} frame={0} fps={30} variants={base} />
        </g>
        {cells.map((c, i) => {
          const cx = 60 + (i % cols) * cellW;
          const cy = gridTop + Math.floor(i / cols) * cellH;
          const s = fit(cellW, cellH - 50);
          return (
            <g key={i}>
              <rect x={cx + 8} y={cy + 8} width={cellW - 16} height={cellH - 16} rx={18} fill="none" stroke={style.palette.ink} strokeWidth={4} strokeDasharray="14 10" />
              <g transform={`translate(${cx + cellW / 2 - (bb[0] + bw0 / 2) * s} ${cy + 20 - bb[1] * s}) scale(${s})`}>
                <RigView rig={rig} frame={0} fps={30} variants={c.variants} tracks={toTracks(c.tracks)} />
              </g>
              <text x={cx + cellW / 2} y={cy + cellH - 26} textAnchor="middle" fontFamily={style.fonts.subtitle} fontSize={34} fill={style.palette.ink}>{c.label}</text>
            </g>
          );
        })}
      </svg>
      <Overlay style={style} w={W} h={H} />
    </AbsoluteFill>
  );
};
