import React from "react";
import { random } from "remotion";
import { C, CEILING_BREAK, FONT_IMPACT, IMPACT, WHISTLE } from "../constants";
import { lerpF, pop } from "../lib/anim";
import { Layer } from "./Layer";

const OUT = C.out;

/** Línea gruesa con contorno (estilo cartoon) para brazos y piernas. */
const Limb: React.FC<{
  pts: [number, number][];
  width: number;
  color: string;
  outline?: number;
}> = ({ pts, width, color, outline = 7 }) => {
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <g>
      <path d={d} stroke={OUT} strokeWidth={width + outline * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FONDO: pared, neón cálido, cuadros flash, suelo en perspectiva
// ════════════════════════════════════════════════════════════════════════════
export const StudioBackground: React.FC<{ frame: number }> = ({ frame }) => {
  // Parpadeo determinista del neón
  const f = frame % 53;
  const flicker = f === 7 || f === 9 ? 0.8 : f === 8 ? 0.7 : 1;
  const afterImpact = frame >= IMPACT ? 0.8 + 0.2 * Math.cos((frame - IMPACT) * 0.2) : 1;
  const neon = flicker * afterImpact;

  const planks = Array.from({ length: 17 }, (_, i) => i - 8);
  return (
    <Layer>
      <defs>
        <linearGradient id="bg-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2034" />
          <stop offset="1" stopColor="#140f1b" />
        </linearGradient>
        <radialGradient id="bg-neonGlow">
          <stop offset="0" stopColor="#FF8A3D" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF8A3D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bg-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241b2a" />
          <stop offset="1" stopColor="#0b090f" />
        </linearGradient>
        <pattern id="bg-bricks" width="140" height="64" patternUnits="userSpaceOnUse">
          <path d="M0,0 H140 M0,32 H140 M70,0 V32 M0,32 V64 M140,32 V64" stroke="#000" strokeOpacity="0.28" strokeWidth="3" fill="none" />
        </pattern>
      </defs>

      {/* Pared */}
      <rect x={0} y={0} width={1080} height={1340} fill="url(#bg-wall)" />
      <rect x={0} y={0} width={1080} height={1340} fill="url(#bg-bricks)" />

      {/* Halo del neón */}
      <ellipse cx={540} cy={610} rx={470} ry={230} fill="url(#bg-neonGlow)" opacity={neon} />

      {/* Neón "TATTOO" */}
      <g fontFamily={FONT_IMPACT} fontWeight={900} fontSize={150} textAnchor="middle" letterSpacing={10}>
        <text x={540} y={668} fill="none" stroke={C.neon} strokeWidth={34} strokeLinejoin="round" opacity={0.18 * neon}>
          TATTOO
        </text>
        <text x={540} y={668} fill="none" stroke={C.neon} strokeWidth={20} strokeLinejoin="round" opacity={0.3 * neon}>
          TATTOO
        </text>
        <text x={540} y={668} fill="none" stroke={C.neon} strokeWidth={9} opacity={0.4 + 0.6 * neon}>
          TATTOO
        </text>
        <text x={540} y={668} fill="none" stroke={C.neonCore} strokeWidth={3.5} opacity={0.3 + 0.7 * neon}>
          TATTOO
        </text>
      </g>
      <text
        x={540}
        y={722}
        fontFamily={FONT_IMPACT}
        fontSize={40}
        textAnchor="middle"
        letterSpacing={14}
        fill="none"
        stroke={C.pink}
        strokeWidth={3}
        opacity={0.5 + 0.5 * neon}
      >
        INK · & · SOUL
      </text>

      {/* Cuadros flash en la pared */}
      <g>
        <rect x={70} y={790} width={150} height={190} rx={6} fill="#efe3cf" stroke={OUT} strokeWidth={7} />
        <rect x={88} y={808} width={114} height={154} fill="#f7efe2" stroke="#d8c7ab" strokeWidth={3} />
        {/* Golondrina */}
        <path d="M110,900 Q140,850 185,860 Q160,880 165,905 Q140,895 110,900 Z" fill="#2f6fd6" stroke={OUT} strokeWidth={5} />
        <path d="M150,885 L120,930 L160,905 Z" fill="#c0392b" stroke={OUT} strokeWidth={4} />

        <rect x={865} y={1000} width={140} height={150} rx={6} fill="#efe3cf" stroke={OUT} strokeWidth={7} />
        {/* Calavera */}
        <circle cx={935} cy={1060} r={34} fill="#fff" stroke={OUT} strokeWidth={5} />
        <circle cx={922} cy={1058} r={8} fill={OUT} />
        <circle cx={948} cy={1058} r={8} fill={OUT} />
        <rect x={918} y={1088} width={34} height={20} rx={4} fill="#fff" stroke={OUT} strokeWidth={5} />
      </g>

      {/* Zócalo */}
      <rect x={0} y={1326} width={1080} height={18} fill="#0d0a12" />

      {/* Suelo con perspectiva */}
      <rect x={0} y={1340} width={1080} height={580} fill="url(#bg-floor)" />
      {planks.map((i) => (
        <line key={i} x1={540 + i * 45} y1={1340} x2={540 + i * 290} y2={1920} stroke="#fff" strokeOpacity={0.05} strokeWidth={4} />
      ))}
      {[1390, 1460, 1560, 1700, 1880].map((y) => (
        <line key={y} x1={0} y1={y} x2={1080} y2={y} stroke="#fff" strokeOpacity={0.035} strokeWidth={4} />
      ))}
      <ellipse cx={520} cy={1480} rx={470} ry={110} fill="#FFB060" opacity={0.09} />
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TECHO que se rompe y deja ver el cielo nocturno
// ════════════════════════════════════════════════════════════════════════════
const HOLE_C = { x: 540, y: 150 };
const holePath = (open: number) => {
  const n = 16;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.72 + 0.4 * random(`hole-${i}`);
    const rx = 300 * open * k;
    const ry = 190 * open * k;
    pts.push(`${(HOLE_C.x + Math.cos(a) * rx).toFixed(1)},${(HOLE_C.y + Math.sin(a) * ry).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

export const Ceiling: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const crack = lerpF(frame, [CEILING_BREAK, CEILING_BREAK + 5], [0, 1]);
  const open = pop(frame, fps, CEILING_BREAK + 4, { damping: 13, stiffness: 170 });
  const cracks = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + random(`ca-${i}`) * 0.5;
    let x = HOLE_C.x;
    let y = HOLE_C.y;
    let d = `M${x},${y}`;
    for (let s = 0; s < 4; s++) {
      const len = 60 + random(`cl-${i}-${s}`) * 50;
      const j = (random(`cj-${i}-${s}`) - 0.5) * 0.9;
      x += Math.cos(a + j) * len;
      y += Math.sin(a + j) * len * 0.6;
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  });
  const stars = Array.from({ length: 26 }, (_, i) => ({
    x: 240 + random(`sx-${i}`) * 600,
    y: -40 + random(`sy-${i}`) * 360,
    r: 1.5 + random(`sr-${i}`) * 3.5,
  }));

  return (
    <Layer>
      <defs>
        <linearGradient id="ce-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050a26" />
          <stop offset="1" stopColor="#1a2a6b" />
        </linearGradient>
        <clipPath id="ce-hole">
          <path d={holePath(Math.max(open, 0.001))} />
        </clipPath>
        <clipPath id="ce-band">
          <rect x={-200} y={-400} width={1480} height={686} />
        </clipPath>
      </defs>

      {/* Placa del techo */}
      <rect x={-200} y={-400} width={1480} height={686} fill="#120e17" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={-20 + i * 180} y={-400} width={34} height={680} fill="#1d1724" />
          <rect x={-20 + i * 180} y={-400} width={8} height={680} fill="#2c2335" />
        </g>
      ))}
      <rect x={-200} y={270} width={1480} height={22} fill="#0a080d" />
      <rect x={-200} y={266} width={1480} height={6} fill="#3a2e44" />

      {/* Grietas */}
      <g clipPath="url(#ce-band)">
        {cracks.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="#000"
            strokeWidth={7}
            fill="none"
            strokeLinejoin="round"
            strokeDasharray={420}
            strokeDashoffset={420 * (1 - crack)}
          />
        ))}
      </g>

      {/* Agujero → cielo nocturno con estrellas */}
      {open > 0.01 ? (
        <g>
          <path d={holePath(open)} fill="url(#ce-sky)" />
          <g clipPath="url(#ce-hole)">
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.5 + 0.5 * Math.abs(Math.sin(frame * 0.3 + i))} />
            ))}
          </g>
          <path d={holePath(open)} fill="none" stroke="#4a3f55" strokeWidth={20} strokeLinejoin="round" />
          <path d={holePath(open)} fill="none" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
        </g>
      ) : null}
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// LÁMPARA colgante con péndulo físico
// ════════════════════════════════════════════════════════════════════════════
export const Lamp: React.FC<{ frame: number }> = ({ frame }) => {
  const t1 = frame - CEILING_BREAK;
  const t2 = frame - IMPACT;
  let angle = 1.5 * Math.sin(frame / 18);
  if (t1 >= 0) angle += 30 * Math.exp(-t1 / 35) * Math.sin(t1 * 0.32);
  if (t2 >= 0) angle += 40 * Math.exp(-t2 / 25) * Math.sin(t2 * 0.45);
  const flick = t2 >= 0 && t2 < 45 ? 0.75 + 0.25 * Math.cos(t2 * 0.3) : 1;

  return (
    <Layer>
      <defs>
        <linearGradient id="lp-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC87A" stopOpacity="0.34" />
          <stop offset="1" stopColor="#FFC87A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${angle} 540 290)`}>
        <polygon points="495,470 585,470 900,1340 180,1340" fill="url(#lp-cone)" opacity={flick} />
        <line x1={540} y1={290} x2={540} y2={425} stroke={OUT} strokeWidth={6} />
        <path d="M505,425 L575,425 L612,474 L468,474 Z" fill="#1d1a22" stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
        <path d="M512,432 L540,432 L548,468 L480,468 Z" fill="#3a3346" />
        <ellipse cx={540} cy={476} rx={66} ry={9} fill="#FFC27A" opacity={flick} />
        <circle cx={540} cy={482} r={15} fill="#FFF3D6" stroke={OUT} strokeWidth={4} opacity={0.4 + 0.6 * flick} />
      </g>
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CAMILLA
// ════════════════════════════════════════════════════════════════════════════
export const Bed: React.FC<{ frame: number }> = ({ frame }) => {
  const burnt = frame >= IMPACT;
  return (
    <Layer>
      <defs>
        <linearGradient id="bd-chrome" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5d6670" />
          <stop offset="0.4" stopColor="#e6ebf0" />
          <stop offset="1" stopColor="#5d6670" />
        </linearGradient>
        <radialGradient id="bd-burn">
          <stop offset="0" stopColor="#000" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#1a0f08" stopOpacity="0.7" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={430} cy={1428} rx={320} ry={26} fill="#000" opacity={0.55} />
      <rect x={290} y={1398} width={280} height={24} rx={10} fill="url(#bd-chrome)" stroke={OUT} strokeWidth={6} />
      <rect x={405} y={1240} width={50} height={162} fill="url(#bd-chrome)" stroke={OUT} strokeWidth={6} />
      <rect x={130} y={1232} width={600} height={20} rx={6} fill="#0f0e14" stroke={OUT} strokeWidth={6} />
      {/* Cojín */}
      <rect x={100} y={1178} width={660} height={62} rx={26} fill={C.leather} stroke={OUT} strokeWidth={7} />
      <rect x={118} y={1186} width={624} height={10} rx={5} fill={C.leatherHi} />
      <line x1={130} y1={1220} x2={730} y2={1220} stroke="#000" strokeWidth={3} strokeDasharray="10 8" opacity={0.6} />
      {/* Reposacabezas */}
      <g transform="rotate(-7 170 1170)">
        <rect x={92} y={1146} width={160} height={42} rx={18} fill={C.leather} stroke={OUT} strokeWidth={7} />
        <rect x={104} y={1152} width={136} height={8} rx={4} fill={C.leatherHi} />
      </g>
      {burnt ? <ellipse cx={505} cy={1205} rx={230} ry={56} fill="url(#bd-burn)" /> : null}
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CLIENTE tumbado, mirando el móvil (se evapora en el impacto)
// ════════════════════════════════════════════════════════════════════════════
export const Client: React.FC<{ frame: number }> = ({ frame }) => {
  const evaporated = frame >= IMPACT;
  const breath = Math.sin(frame / 9) * 2.2;
  const glow = 0.3 + 0.08 * Math.sin(frame * 0.9);

  // Las zapatillas sobreviven (humeantes) tras el impacto
  const shoes = (
    <g>
      <path d="M690,1086 Q690,1070 712,1070 Q738,1072 738,1100 L736,1180 L692,1180 Z" fill={evaporated ? "#2a2522" : "#F4F4F4"} stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
      <path d="M694,1150 L734,1150" stroke={evaporated ? "#111" : "#E74C3C"} strokeWidth={8} />
      <rect x={732} y={1080} width={10} height={100} rx={4} fill={evaporated ? "#111" : "#cfcfcf"} stroke={OUT} strokeWidth={4} />
    </g>
  );

  if (evaporated) {
    return <Layer>{shoes}</Layer>;
  }

  return (
    <Layer>
      <defs>
        <radialGradient id="cl-glow">
          <stop offset="0" stopColor="#49E0FF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#49E0FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Piernas */}
      <rect x={500} y={1126} width={205} height={54} rx={22} fill={C.jeans} stroke={OUT} strokeWidth={7} />
      <rect x={506} y={1156} width={192} height={18} rx={9} fill={C.jeansShade} />
      {shoes}

      {/* Torso (respira) */}
      <g transform={`translate(0 ${-breath})`}>
        <rect x={240} y={1106} width={292} height={76} rx={32} fill={C.teal} />
        <rect x={248} y={1150} width={276} height={28} rx={14} fill={C.tealShade} />
        <rect x={240} y={1106} width={292} height={76} rx={32} fill="none" stroke={OUT} strokeWidth={7} />
      </g>

      {/* Cabeza */}
      <circle cx={190} cy={1094} r={56} fill="#4A2C1D" stroke={OUT} strokeWidth={7} />
      <circle cx={206} cy={1102} r={50} fill={C.skin} stroke={OUT} strokeWidth={7} />
      <path d="M160,1070 Q190,1040 236,1058 Q205,1060 184,1080 Z" fill="#4A2C1D" />
      <circle cx={194} cy={1108} r={10} fill={C.skinShade} stroke={OUT} strokeWidth={4} />
      <circle cx={252} cy={1097} r={9} fill={C.skin} stroke={OUT} strokeWidth={4} />
      {/* Ojo mirando el móvil + ceja relajada */}
      <circle cx={232} cy={1084} r={5.5} fill={OUT} />
      <path d="M222,1070 Q232,1064 242,1068" stroke={OUT} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M228,1118 Q240,1126 252,1114" stroke={OUT} strokeWidth={4.5} fill="none" strokeLinecap="round" />

      {/* Brillo del móvil en la cara */}
      <circle cx={250} cy={1010} r={130} fill="url(#cl-glow)" opacity={glow * 0.8} />

      {/* Brazo del móvil */}
      <Limb pts={[[275, 1122], [322, 1046], [272, 992]]} width={28} color={C.skin} />
      <circle cx={280} cy={1120} r={26} fill={C.teal} stroke={OUT} strokeWidth={6} />
      <g transform="rotate(-14 262 962)">
        <rect x={228} y={946} width={70} height={34} rx={8} fill="#111" stroke={OUT} strokeWidth={5} />
        <rect x={234} y={972} width={58} height={5} rx={2} fill="#49E0FF" />
      </g>
      <circle cx={270} cy={987} r={17} fill={C.skin} stroke={OUT} strokeWidth={6} />

      {/* Brazo a tatuar, apoyado sobre la camilla */}
      <Limb pts={[[290, 1152], [420, 1176], [588, 1186]]} width={34} color={C.skin} />
      <path d="M430,1194 L585,1198" stroke={C.skinShade} strokeWidth={9} strokeLinecap="round" />
      <circle cx={614} cy={1186} r={20} fill={C.skin} stroke={OUT} strokeWidth={6} />
      {/* Stencil del tatuaje pendiente (corazón) */}
      <path
        d="M505,1196 C485,1184 488,1170 498,1171 C503,1171 505,1176 505,1178 C505,1176 507,1171 512,1171 C522,1170 525,1184 505,1196 Z"
        fill="none"
        stroke="#8E44FF"
        strokeWidth={3}
        strokeDasharray="4 3"
      />
      <circle cx={300} cy={1150} r={24} fill={C.teal} stroke={OUT} strokeWidth={6} />
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TATUADOR con barba, guantes negros y rotativa; entra en pánico y sale volando
// ════════════════════════════════════════════════════════════════════════════
export const Tattooist: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const panic = pop(frame, fps, WHISTLE + 4, { damping: 9, stiffness: 170 });
  const tremble = panic * Math.sin(frame * 2.3) * 2.6;

  // Vuelo balístico por la onda expansiva
  const t = frame - IMPACT;
  const dx = t >= 0 ? 24 * t + 1.3 * t * t : 0;
  const dy = t >= 0 ? -24 * t + 1.4 * t * t : 0;
  const rot = t >= 0 ? 19 * t : 0;
  if (dx > 900) return null;

  // Mano (sube un poco al asustarse)
  const hx = 640 + 10 * panic;
  const hy = 1085 - 34 * panic;
  const ex = 758;
  const ey = 1068 - 24 * panic;
  const buzz = frame % 2 === 0 ? 1.2 : -1.2; // 120 Hz (simulado)
  const eyeR = 5 + 10 * panic;
  const headTilt = -14 * panic;

  return (
    <Layer>
      <g transform={`translate(${dx + tremble} ${dy}) rotate(${rot} 880 1150)`}>
        {/* Cable de la máquina */}
        <path d={`M${hx + 22},${hy - 30} Q900,1010 1000,1240 T1120,1400`} stroke="#111" strokeWidth={7} fill="none" />

        {/* Piernas y zapatos */}
        <rect x={828} y={1170} width={48} height={300} rx={18} fill="#2B3250" stroke={OUT} strokeWidth={7} />
        <rect x={884} y={1170} width={48} height={300} rx={18} fill="#232a44" stroke={OUT} strokeWidth={7} />
        <path d="M800,1478 Q805,1452 840,1452 L878,1452 L878,1486 L806,1486 Z" fill="#111" stroke={OUT} strokeWidth={6} />
        <path d="M858,1478 Q862,1452 896,1452 L934,1452 L934,1486 L862,1486 Z" fill="#111" stroke={OUT} strokeWidth={6} />

        {/* Torso */}
        <path d="M800,935 Q880,905 960,935 L948,1190 L812,1190 Z" fill="#1F1C26" />
        <path d="M884,915 Q930,918 960,935 L948,1190 L888,1190 Z" fill="#15131b" />
        <path d="M800,935 Q880,905 960,935 L948,1190 L812,1190 Z" fill="none" stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
        <path d="M808,948 L818,1180" stroke={C.neon} strokeWidth={5} opacity={0.75} strokeLinecap="round" />
        <rect x={812} y={1164} width={136} height={14} fill="#0d0c11" />
        {/* Logo de la camiseta */}
        <circle cx={872} cy={1030} r={24} fill="none" stroke="#3a3646" strokeWidth={5} />
        <path d="M860,1030 L884,1030 M872,1018 L872,1042" stroke="#3a3646" strokeWidth={5} />

        {/* Cuello */}
        <rect x={860} y={876} width={40} height={44} fill={C.skinB} stroke={OUT} strokeWidth={6} />

        {/* Cabeza */}
        <g transform={`rotate(${headTilt} 880 900)`}>
          <circle cx={880} cy={818} r={66} fill={C.skinB} stroke={OUT} strokeWidth={7} />
          <circle cx={942} cy={826} r={14} fill={C.skinBShade} stroke={OUT} strokeWidth={5} />
          {/* Gorro */}
          <path d="M812,792 Q814,719 880,714 Q946,719 950,792 Z" fill="#C0392B" stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
          <rect x={808} y={772} width={146} height={26} rx={12} fill="#A93226" stroke={OUT} strokeWidth={6} />
          {/* Barba */}
          <path
            d="M818,824 Q816,908 868,948 Q910,958 938,904 Q948,862 942,826 Q904,852 880,850 Q850,852 818,824 Z"
            fill="#3B2416"
            stroke={OUT}
            strokeWidth={6}
            strokeLinejoin="round"
          />
          <path d="M846,862 Q866,850 878,862 Q892,850 912,862" stroke="#24150c" strokeWidth={9} fill="none" strokeLinecap="round" />
          {/* Boca: concentrado → grito */}
          {panic > 0.15 ? (
            <ellipse cx={878} cy={884} rx={4 + 10 * panic} ry={3 + 15 * panic} fill="#2a0d0d" stroke={OUT} strokeWidth={4} />
          ) : (
            <path d="M866,882 L890,880" stroke={OUT} strokeWidth={5} strokeLinecap="round" />
          )}
          {/* Nariz */}
          <path d="M860,830 Q844,848 862,852" stroke={OUT} strokeWidth={5} fill={C.skinB} strokeLinecap="round" />
          {/* Ojos */}
          {panic > 0.15 ? (
            <g>
              <circle cx={848} cy={820} r={eyeR} fill="#fff" stroke={OUT} strokeWidth={4} />
              <circle cx={895} cy={820} r={eyeR} fill="#fff" stroke={OUT} strokeWidth={4} />
              <circle cx={846} cy={820 - eyeR * 0.5} r={4.5} fill={OUT} />
              <circle cx={893} cy={820 - eyeR * 0.5} r={4.5} fill={OUT} />
            </g>
          ) : (
            <g>
              <ellipse cx={846} cy={822} rx={7} ry={4} fill={OUT} />
              <ellipse cx={892} cy={822} rx={7} ry={4} fill={OUT} />
            </g>
          )}
          {/* Cejas */}
          <path d={`M832,${808 - 14 * panic} L862,${805 - 9 * panic}`} stroke={OUT} strokeWidth={7} strokeLinecap="round" />
          <path d={`M880,${805 - 9 * panic} L910,${808 - 14 * panic}`} stroke={OUT} strokeWidth={7} strokeLinecap="round" />
        </g>

        {/* Gotas de sudor */}
        {panic > 0.2
          ? [0, 1, 2].map((i) => {
              const ph = ((frame * 2.5 + i * 17) % 40) / 40;
              const x = [952, 812, 968][i];
              const y = [770, 780, 840][i] + ph * 60;
              return (
                <path
                  key={i}
                  d={`M${x},${y - 18} Q${x + 12},${y} ${x},${y + 8} Q${x - 12},${y} ${x},${y - 18} Z`}
                  fill="#7FD6FF"
                  stroke={OUT}
                  strokeWidth={3}
                  opacity={panic * (1 - ph)}
                />
              );
            })
          : null}

        {/* ¡¡!! */}
        <g transform={`translate(950 700) scale(${panic}) rotate(12)`}>
          <text
            x={0}
            y={0}
            fontFamily={FONT_IMPACT}
            fontSize={110}
            fontWeight={900}
            fill={C.yellow}
            stroke={OUT}
            strokeWidth={8}
            textAnchor="middle"
            style={{ paintOrder: "stroke fill" }}
          >
            !!
          </text>
        </g>

        {/* Brazo con tatuajes + guante negro + rotativa */}
        <Limb pts={[[812, 960], [ex, ey], [hx, hy]]} width={34} color={C.skinB} />
        <path d={`M${ex - 10},${ey - 30} l12,-14 M${ex + 18},${ey - 52} l10,10 M${(ex + hx) / 2},${(ey + hy) / 2 - 4} l14,0`} stroke={OUT} strokeWidth={4} strokeLinecap="round" />
        <circle cx={816} cy={962} r={32} fill="#1F1C26" stroke={OUT} strokeWidth={6} />
        <g transform={`translate(${hx + buzz * (1 - panic)} ${hy}) rotate(${40 - 25 * panic})`}>
          <rect x={-16} y={-78} width={32} height={100} rx={13} fill="#7B8794" stroke={OUT} strokeWidth={5} />
          <rect x={-8} y={-72} width={8} height={88} rx={4} fill="#c6ced7" />
          <rect x={-13} y={20} width={26} height={44} rx={6} fill="#2C2F36" stroke={OUT} strokeWidth={5} />
          <path d="M-10,32 H10 M-10,42 H10 M-10,52 H10" stroke="#555" strokeWidth={3} />
          <line x1={0} y1={64} x2={0} y2={90} stroke={OUT} strokeWidth={7} />
          <line x1={0} y1={64} x2={0} y2={90} stroke={C.steel} strokeWidth={3} />
        </g>
        <circle cx={hx} cy={hy} r={25} fill="#121212" stroke={OUT} strokeWidth={6} />
        <path d={`M${hx - 12},${hy - 12} Q${hx - 4},${hy - 20} ${hx + 6},${hy - 16}`} stroke="#5a5a5a" strokeWidth={5} fill="none" strokeLinecap="round" />
        {/* Líneas de vibración (120 Hz) mientras trabaja tranquilo */}
        {panic < 0.3
          ? [0, 1].map((i) => (
              <path
                key={i}
                d={`M${hx - 80 - i * 14},${hy + 50 + i * 8} q-10,10 0,20`}
                stroke={C.yellow}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                opacity={(frame + i) % 4 < 2 ? 0.9 : 0.3}
              />
            ))
          : null}
      </g>
    </Layer>
  );
};
