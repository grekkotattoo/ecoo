import React from "react";
import { random } from "remotion";
import { C, FONT_IMPACT, IMPACT, IMPACT_POINT, REVEAL } from "../constants";
import { lerpF, pop } from "../lib/anim";
import { Layer } from "./Layer";
import { DuctTape } from "./Rocket";

const OUT = C.out;
const CHAR = "#6b4a3a";
const CHAR_SHADE = "#4b3328";
const SOOT = "#241813";

/** Cráter humeante sobre la camilla. */
export const Crater: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < IMPACT) return null;
  const { x, y } = IMPACT_POINT;
  const ember = lerpF(frame, [IMPACT, IMPACT + 70], [1, 0.25]) * (0.75 + 0.25 * Math.sin(frame * 0.8));
  const n = 18;
  const rim = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 0.85 + 0.3 * random(`cr-${i}`);
    return `${(x + Math.cos(a) * 128 * k).toFixed(1)},${(y + 4 + Math.sin(a) * 32 * k).toFixed(1)}`;
  });
  return (
    <Layer>
      <ellipse cx={x} cy={y + 6} rx={175} ry={46} fill="#120b08" opacity={0.85} />
      <path d={`M${rim.join(" L")} Z`} fill="#000" stroke="#FF7A2F" strokeWidth={10} strokeOpacity={ember} strokeLinejoin="round" />
      <path d={`M${rim.join(" L")} Z`} fill="none" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
      {/* Trozos de espuma alrededor del borde */}
      {Array.from({ length: 7 }, (_, i) => {
        const px = x - 150 + i * 50 + random(`cf-${i}`) * 20;
        const py = y - 12 - random(`cg-${i}`) * 14;
        return <circle key={i} cx={px} cy={py} r={9 + random(`ch-${i}`) * 8} fill="#2b221d" stroke={OUT} strokeWidth={4} />;
      })}
    </Layer>
  );
};

/** Mano chamuscada que sale del cráter con el pulgar arriba. */
export const ThumbsUp: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const start = REVEAL + 5;
  if (frame < start - 1) return null;
  const rise = pop(frame, fps, start, { damping: 9, stiffness: 110 });
  const ty = (1 - rise) * 400;
  const rot = (1 - rise) * -22 + Math.sin(frame * 0.22) * 3;
  const pump = 1 + 0.08 * pop(frame, fps, start + 22, { damping: 6, stiffness: 300 }) * Math.max(0, Math.sin((frame - start - 22) * 0.5));
  const { x, y } = IMPACT_POINT;
  const sparkle = frame > start + 18;

  return (
    <Layer>
      <defs>
        <clipPath id="tu-clip">
          <rect x={x - 400} y={-400} width={800} height={y + 400 + 2} />
        </clipPath>
      </defs>
      <g clipPath="url(#tu-clip)">
        <g transform={`translate(${x} ${y + ty}) rotate(${rot}) scale(${pump * 1.3})`}>
          {/* Antebrazo */}
          <rect x={-36} y={-180} width={72} height={200} rx={22} fill={CHAR} stroke={OUT} strokeWidth={7} />
          <rect x={10} y={-172} width={20} height={186} rx={10} fill={CHAR_SHADE} />
          <circle cx={-14} cy={-40} r={14} fill={SOOT} opacity={0.75} />
          <circle cx={12} cy={-140} r={10} fill={SOOT} opacity={0.75} />
          {/* El tatuaje… quedó perfecto */}
          <path
            d="M0,-78 C-26,-94 -22,-118 -9,-118 C-3,-118 0,-112 0,-108 C0,-112 3,-118 9,-118 C22,-118 26,-94 0,-78 Z"
            fill="#E03A3A"
            stroke={OUT}
            strokeWidth={4}
          />
          {/* Restos de la manga */}
          <path d="M-40,-6 L-30,-28 L-18,-10 L-6,-30 L6,-10 L18,-30 L28,-8 L40,-26 L42,16 L-42,16 Z" fill="#0f2f2c" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />

          {/* Puño */}
          <rect x={-50} y={-272} width={98} height={104} rx={30} fill={CHAR} stroke={OUT} strokeWidth={7} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-4} y={-266 + i * 24} width={58} height={26} rx={13} fill={i % 2 ? CHAR_SHADE : CHAR} stroke={OUT} strokeWidth={5} />
          ))}
          <circle cx={-26} cy={-200} r={12} fill={SOOT} opacity={0.7} />

          {/* Pulgar arriba */}
          <rect x={-46} y={-356} width={40} height={110} rx={20} fill={CHAR} stroke={OUT} strokeWidth={7} />
          <rect x={-38} y={-348} width={22} height={22} rx={8} fill="#8f6a58" stroke={OUT} strokeWidth={3} />
          <path d="M-30,-300 q8,6 16,0" stroke={OUT} strokeWidth={4} fill="none" strokeLinecap="round" />
          <path d="M-40,-260 Q-32,-252 -20,-258" stroke="#9c6f55" strokeWidth={4} fill="none" strokeLinecap="round" />

          {/* Humito de la punta del pulgar */}
          {[0, 1, 2].map((i) => {
            const ph = ((frame * 1.2 + i * 11) % 32) / 32;
            return (
              <circle key={i} cx={-26 + Math.sin(ph * 6 + i) * 10} cy={-370 - ph * 90} r={6 + ph * 16} fill="#8a8696" opacity={(1 - ph) * 0.8} />
            );
          })}
        </g>
      </g>

      {/* Destellos */}
      {sparkle
        ? [
            [-120, -300],
            [110, -380],
            [140, -180],
          ].map(([sx, sy], i) => {
            const s = 0.6 + 0.6 * Math.abs(Math.sin(frame * 0.35 + i * 1.7));
            return (
              <path
                key={i}
                transform={`translate(${x + sx} ${y + sy}) scale(${s})`}
                d="M0,-26 L7,-7 L26,0 L7,7 L0,26 L-7,7 L-26,0 L-7,-7 Z"
                fill={C.yellow}
                stroke={OUT}
                strokeWidth={4}
              />
            );
          })
        : null}
    </Layer>
  );
};

/** Cartelito meme "10/10 no duele nada" (con su cinta americana, claro). */
export const MemeSign: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const start = REVEAL + 18;
  if (frame < start) return null;
  const s = pop(frame, fps, start, { damping: 10, stiffness: 190 });
  const bob = Math.sin((frame - start) * 0.18) * 6;
  const cx = 742;
  const cy = 790;
  return (
    <Layer>
      <g transform={`translate(${cx} ${cy + bob}) scale(${s}) rotate(-6)`}>
        <path d="M-120,90 L-175,170 L-60,90 Z" fill="#fff" stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
        <rect x={-205} y={-100} width={410} height={196} rx={18} fill={OUT} transform="translate(0 12)" />
        <rect x={-205} y={-100} width={410} height={196} rx={18} fill="#fff" stroke={OUT} strokeWidth={8} />
        <rect x={-122} y={86} width={66} height={14} fill="#fff" />
        <text x={0} y={-2} textAnchor="middle" fontFamily={FONT_IMPACT} fontWeight={900} fontSize={104} fill={OUT}>
          10/10
        </text>
        <text
          x={0}
          y={66}
          textAnchor="middle"
          fontFamily={FONT_IMPACT}
          fontWeight={900}
          fontSize={48}
          fill={C.red}
          textLength={350}
          lengthAdjust="spacingAndGlyphs"
        >
          NO DUELE NADA
        </text>
        <DuctTape cx={-190} cy={-92} w={110} h={30} angle={-38} seed="sg-a" />
        <DuctTape cx={192} cy={-90} w={100} h={28} angle={32} seed="sg-b" />
      </g>
    </Layer>
  );
};
