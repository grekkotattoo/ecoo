import React from "react";
import { random } from "remotion";
import { C, FONT_IMPACT, ROCKET_LOGO } from "../constants";
import { Layer } from "./Layer";

const OUT = C.out;

// Sistema de coordenadas local del cohete (morro hacia ABAJO):
//   · toberas arriba (y≈40), llamas hacia arriba (y<40)
//   · punta de la aguja en (150, 1060) ← punto de anclaje
export const NEEDLE_TIP = { x: 150, y: 1060 };

const flamePath = (cx: number, baseY: number, halfW: number, len: number, wob: number) =>
  `M${cx - halfW},${baseY} ` +
  `C${cx - halfW * 1.25},${baseY - len * 0.35} ${cx - halfW * 0.45 + wob},${baseY - len * 0.75} ${cx + wob * 0.5},${baseY - len} ` +
  `C${cx + halfW * 0.45 + wob},${baseY - len * 0.75} ${cx + halfW * 1.25},${baseY - len * 0.35} ${cx + halfW},${baseY} Z`;

/** Llama supersónica azul con diamantes de choque (mach diamonds). */
const Flame: React.FC<{ cx: number; baseY: number; halfW: number; len: number; frame: number; seed: string }> = ({
  cx,
  baseY,
  halfW,
  len,
  frame,
  seed,
}) => {
  const flick = 0.85 + 0.15 * Math.sin(frame * 1.9 + random(seed) * 6) + 0.12 * (random(`${seed}-${frame}`) - 0.5);
  const L = len * flick;
  const wob = Math.sin(frame * 1.3 + random(seed) * 4) * halfW * 0.25;
  const diamonds = [0.18, 0.36, 0.54];
  return (
    <g>
      <path d={flamePath(cx, baseY, halfW * 1.25, L * 1.1, wob)} fill="#1E5BFF" opacity={0.55} stroke={OUT} strokeWidth={6} />
      <path d={flamePath(cx, baseY, halfW, L, wob)} fill="#3FD0FF" />
      <path d={flamePath(cx, baseY, halfW * 0.5, L * 0.72, wob * 0.6)} fill="#EFFFFF" />
      {diamonds.map((d, i) => {
        const y = baseY - L * d;
        const s = halfW * (0.42 - i * 0.1);
        return <path key={i} d={`M${cx},${y - s * 1.6} L${cx + s},${y} L${cx},${y + s * 1.6} L${cx - s},${y} Z`} fill="#fff" />;
      })}
    </g>
  );
};

/** Cinta americana con los bordes rasgados, mal puesta. */
export const DuctTape: React.FC<{ cx: number; cy: number; w: number; h: number; angle: number; seed: string }> = ({
  cx,
  cy,
  w,
  h,
  angle,
  seed,
}) => {
  const x0 = -w / 2;
  const x1 = w / 2;
  const teeth = 5;
  let right = "";
  let left = "";
  for (let i = 0; i <= teeth; i++) {
    const y = -h / 2 + (h * i) / teeth;
    right += ` L${x1 + (random(`${seed}-r${i}`) - 0.5) * 14},${y}`;
    left = ` L${x0 + (random(`${seed}-l${i}`) - 0.5) * 14},${y}` + left;
  }
  const d = `M${x0},${-h / 2}${right}${left} Z`;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle})`}>
      <path d={d} fill={C.tape} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
      <rect x={x0 + 6} y={-h / 2 + 4} width={w - 14} height={h * 0.28} fill="#c3c8cc" opacity={0.8} />
      <rect x={x0 + 6} y={h / 2 - h * 0.25} width={w - 14} height={h * 0.2} fill={C.tapeShade} opacity={0.8} />
      {[0.2, 0.45, 0.7].map((k, i) => (
        <line key={i} x1={x0 + w * k} y1={-h / 2 + 3} x2={x0 + w * k + 8} y2={h / 2 - 3} stroke="#80868b" strokeWidth={2} />
      ))}
    </g>
  );
};

/** Un núcleo cilíndrico (central o booster lateral). */
const Core: React.FC<{ x: number; w: number; top: number; bottom: number; band?: number }> = ({ x, w, top, bottom, band }) => (
  <g>
    <rect x={x} y={top} width={w} height={bottom - top} fill="url(#rk-metal)" />
    <rect x={x + w * 0.62} y={top} width={w * 0.38} height={bottom - top} fill="#000" opacity={0.22} />
    {[0.2, 0.4, 0.6, 0.8].map((k) => (
      <line key={k} x1={x} y1={top + (bottom - top) * k} x2={x + w} y2={top + (bottom - top) * k} stroke="#000" strokeOpacity={0.18} strokeWidth={3} />
    ))}
    {band !== undefined ? <rect x={x} y={band} width={w} height={46} fill="#16171c" /> : null}
    <rect x={x} y={top} width={w} height={bottom - top} fill="none" stroke={OUT} strokeWidth={8} />
  </g>
);

const Nozzle: React.FC<{ cx: number; w: number }> = ({ cx, w }) => (
  <path
    d={`M${cx - w * 0.22},110 L${cx - w * 0.5},42 L${cx + w * 0.5},42 L${cx + w * 0.22},110 Z`}
    fill="#2b2d33"
    stroke={OUT}
    strokeWidth={7}
    strokeLinejoin="round"
  />
);

export const Rocket: React.FC<{
  frame: number;
  tipX: number;
  tipY: number;
  scale: number;
  rotation: number;
  callout: number; // 0..1 animación del marcador "AGUJA"
}> = ({ frame, tipX, tipY, scale, rotation, callout }) => {
  const nozzleY = tipY - (NEEDLE_TIP.y - 42) * scale;
  return (
    <Layer>
      <defs>
        <linearGradient id="rk-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d6470" />
          <stop offset="0.3" stopColor="#f4f6fa" />
          <stop offset="0.6" stopColor="#c4cad3" />
          <stop offset="1" stopColor="#59606b" />
        </linearGradient>
        <radialGradient id="rk-blue">
          <stop offset="0" stopColor="#3FA9FF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#1E5BFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Luz azul que baña la escena */}
      <ellipse cx={tipX} cy={(nozzleY + tipY) / 2} rx={560} ry={720} fill="url(#rk-blue)" opacity={0.4} />

      <g transform={`translate(${tipX} ${tipY}) rotate(${rotation}) scale(${scale}) translate(${-NEEDLE_TIP.x} ${-NEEDLE_TIP.y})`}>
        {/* Llamas (detrás de las toberas) */}
        <Flame cx={45} baseY={46} halfW={30} len={260} frame={frame} seed="fl-l" />
        <Flame cx={255} baseY={46} halfW={30} len={260} frame={frame} seed="fl-r" />
        <Flame cx={150} baseY={46} halfW={46} len={360} frame={frame} seed="fl-c" />

        {/* Toberas */}
        <Nozzle cx={45} w={56} />
        <Nozzle cx={255} w={56} />
        <Nozzle cx={150} w={86} />

        {/* Boosters laterales (Heavy = 3 núcleos) con su cono */}
        <Core x={10} w={70} top={110} bottom={740} band={600} />
        <Core x={220} w={70} top={110} bottom={740} band={600} />
        <path d="M10,738 Q10,800 45,840 Q80,800 80,738 Z" fill="url(#rk-metal)" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
        <path d="M220,738 Q220,800 255,840 Q290,800 290,738 Z" fill="url(#rk-metal)" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />

        {/* Núcleo central + logo */}
        <Core x={85} w={130} top={110} bottom={720} band={610} />
        <rect x={80} y={102} width={140} height={20} fill="#16171c" stroke={OUT} strokeWidth={6} />
        <text
          transform="translate(152 360) rotate(90)"
          x={0}
          y={16}
          textAnchor="middle"
          fontFamily={FONT_IMPACT}
          fontWeight={900}
          fontSize={50}
          fill="#11131a"
          textLength={430}
          lengthAdjust="spacingAndGlyphs"
        >
          {ROCKET_LOGO}
        </text>

        {/* Aletas */}
        <path d="M10,130 L-30,110 L-30,175 L10,190 Z" fill="#16171c" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
        <path d="M290,130 L330,110 L330,175 L290,190 Z" fill="#16171c" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />

        {/* Cofia / cono de la punta */}
        <rect x={72} y={700} width={156} height={70} fill="url(#rk-metal)" stroke={OUT} strokeWidth={8} />
        <path d="M72,768 Q70,890 150,975 Q230,890 228,768 Z" fill="url(#rk-metal)" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
        <path d="M168,780 Q196,860 160,950" stroke="#000" strokeOpacity={0.2} strokeWidth={18} fill="none" />

        {/* Aguja de tatuar diminuta… */}
        <line x1={150} y1={900} x2={150} y2={1050} stroke={OUT} strokeWidth={11} strokeLinecap="round" />
        <line x1={150} y1={900} x2={150} y2={1050} stroke={C.steel} strokeWidth={5} strokeLinecap="round" />
        <path d="M145,1046 L155,1046 L150,1062 Z" fill={C.steel} stroke={OUT} strokeWidth={3} />
        <circle cx={150} cy={1066} r={4} fill="#3b2b5a" />

        {/* …pegada con 2 tiras de cinta americana mal puestas */}
        <DuctTape cx={146} cy={928} w={150} h={34} angle={24} seed="tp-a" />
        <DuctTape cx={158} cy={952} w={128} h={30} angle={-17} seed="tp-b" />
      </g>

      {/* Marcador meme alrededor de la aguja */}
      {callout > 0.01 ? (
        <g opacity={Math.min(1, callout * 2)}>
          <circle
            cx={tipX}
            cy={tipY - 55}
            r={88}
            fill="none"
            stroke={C.red}
            strokeWidth={9}
            strokeDasharray={560}
            strokeDashoffset={560 * (1 - callout)}
            strokeLinecap="round"
            transform={`rotate(-90 ${tipX} ${tipY - 55})`}
          />
          <path d={`M${tipX + 100},${tipY - 70} L${tipX + 175},${tipY - 140}`} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
          <g transform={`translate(${tipX + 175} ${tipY - 190}) scale(${callout}) rotate(-6)`}>
            <rect x={0} y={-34} width={250} height={88} rx={12} fill={C.yellow} stroke={OUT} strokeWidth={6} />
            <text x={125} y={2} textAnchor="middle" fontFamily={FONT_IMPACT} fontWeight={900} fontSize={36} fill={OUT}>
              AGUJA 3RL
            </text>
            <text x={125} y={38} textAnchor="middle" fontFamily={FONT_IMPACT} fontWeight={900} fontSize={24} fill={OUT}>
              (0,35 mm)
            </text>
          </g>
        </g>
      ) : null}
    </Layer>
  );
};
