import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Camara, clamp, DefsComunes, H, Llama, Rotulo, ruido, tex, vela, W } from "../components/fx";
import { Humo, Monje, Patrones } from "../components/personajes";
import { escena, palabra } from "../tiempos";

/* Generador pseudoaleatorio determinista */
const rnd = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------------- 2A · PRIMER PLANO DEL MAESTRO ---------------- */
const PELOS = Array.from({ length: 260 }, (_, i) => {
  const x0 = 400 + rnd(i, 1) * 290;
  const y0 = 1010 + rnd(i, 2) * 120;
  const largo = 180 + rnd(i, 3) * 330;
  const curva = (rnd(i, 4) - 0.5) * 70;
  const hacia = (x0 - 545) * 0.35;
  return { d: `M ${x0} ${y0} q ${curva} ${largo * 0.5} ${hacia + curva * 0.4} ${largo}`, w: 1.2 + rnd(i, 5) * 2.2, lit: x0 > 540 };
});

export const CaraMaestro: React.FC<{ k: number; parpadeo?: number }> = ({ k, parpadeo = 0 }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: "brightness(0.72) contrast(1.1)" }}>
    <DefsComunes />
    <Patrones />
    <defs>
      <pattern id="patPiel" patternUnits="userSpaceOnUse" width={700} height={700}>
        <image href={tex("skin.png")} width={700} height={700} />
      </pattern>
      <linearGradient id="luzVelaCara" x1="0" x2="1" y1="0" y2="0.3">
        <stop offset="0%" stopColor="#000" stopOpacity={0.99} />
        <stop offset="48%" stopColor="#000" stopOpacity={0.93} />
        <stop offset="70%" stopColor="#000" stopOpacity={0.6} />
        <stop offset="100%" stopColor="#000" stopOpacity={0.32} />
      </linearGradient>
      <linearGradient id="sombraCapucha" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" stopOpacity={1} />
        <stop offset="35%" stopColor="#000" stopOpacity={0.75} />
        <stop offset="60%" stopColor="#000" stopOpacity={0} />
      </linearGradient>
      <radialGradient id="calidoMejilla">
        <stop offset="0%" stopColor="#ff9a4a" stopOpacity={0.45} />
        <stop offset="100%" stopColor="#ff7a2a" stopOpacity={0} />
      </radialGradient>
    </defs>
    {/* capucha exterior */}
    <path d="M 60 1920 C 40 1300 120 640 330 380 C 430 250 650 250 760 380 C 960 640 1040 1300 1020 1920 Z" fill="url(#patTela)" />
    <path d="M 60 1920 C 40 1300 120 640 330 380 C 430 250 650 250 760 380 C 960 640 1040 1300 1020 1920 Z" fill="#000" opacity={0.88} />
    <path d="M 760 380 C 960 640 1040 1300 1020 1920" stroke="#c9773a" strokeWidth={10} fill="none" opacity={0.35 * k} style={{ filter: "blur(9px)" }} />
    {/* hueco de la capucha */}
    <path d="M 300 1500 C 270 1100 300 640 430 520 C 500 460 610 460 680 520 C 800 640 830 1100 800 1500 Z" fill="#050302" />
    {/* rostro */}
    <g style={{ filter: "blur(1.4px)" }}>
      <path d="M 408 820 C 400 700 450 600 545 590 C 640 600 690 700 684 820 C 690 930 660 1040 600 1090 C 570 1110 520 1110 490 1090 C 430 1040 405 930 408 820 Z" fill="url(#patPiel)" />
      <path d="M 408 820 C 400 700 450 600 545 590 C 640 600 690 700 684 820 C 690 930 660 1040 600 1090 C 570 1110 520 1110 490 1090 C 430 1040 405 930 408 820 Z" fill="url(#luzVelaCara)" opacity={1.05 - 0.15 * k} />
      <ellipse cx={640} cy={930} rx={70} ry={90} fill="url(#calidoMejilla)" opacity={k} />
      {/* frente con arrugas */}
      {[680, 712, 742].map((y, i) => (
        <g key={y} opacity={0.55}>
          <path d={`M ${470 + i * 6} ${y} C 520 ${y - 10} 590 ${y - 12} ${650 - i * 8} ${y + 2}`} stroke="#1a0c06" strokeWidth={4} fill="none" style={{ filter: "blur(1.5px)" }} />
          <path d={`M ${560} ${y + 5} C 600 ${y - 4} 630 ${y - 2} ${650 - i * 8} ${y + 7}`} stroke="#d99a70" strokeWidth={2} fill="none" opacity={0.5 * k} style={{ filter: "blur(1px)" }} />
        </g>
      ))}
      {/* cuencas profundas */}
      <ellipse cx={478} cy={840} rx={60} ry={36} fill="#000" opacity={0.85} style={{ filter: "blur(9px)" }} />
      <ellipse cx={612} cy={840} rx={56} ry={34} fill="#000" opacity={0.7} style={{ filter: "blur(9px)" }} />
      {/* ojos: mirada fija a cámara */}
      {[478, 612].map((ex, i) => (
        <g key={ex} transform={`translate(${ex} 846) scale(1 ${1 - parpadeo})`}>
          <ellipse cx={0} cy={0} rx={26} ry={10} fill="#8a7a6c" opacity={i ? 0.5 : 0.18} />
          <circle cx={2} cy={0} r={9} fill="#120a06" />
          <circle cx={6} cy={-3} r={2.6} fill="#ffe2b8" opacity={0.95 * k} />
        </g>
      ))}
      {/* cejas canosas */}
      {Array.from({ length: 46 }).map((_, i) => {
        const izq = i < 23;
        const j = i % 23;
        const bx = (izq ? 430 : 572) + j * 4.4;
        const by = 806 - Math.sin((j / 22) * Math.PI) * 14;
        return (
          <path
            key={i}
            d={`M ${bx} ${by} l ${8 + rnd(i, 7) * 10} ${-4 - rnd(i, 8) * 8}`}
            stroke={izq ? "#6f675f" : "#d8d0c4"}
            strokeWidth={2.2}
            opacity={izq ? 0.35 : 0.75 * k}
          />
        );
      })}
      {/* nariz */}
      <path d="M 560 860 C 566 920 578 975 590 1000" stroke="#e2a57c" strokeWidth={6} fill="none" opacity={0.55 * k} style={{ filter: "blur(3px)" }} />
      <ellipse cx={580} cy={1006} rx={26} ry={18} fill="#d89a72" opacity={0.35 * k} style={{ filter: "blur(4px)" }} />
      <path d="M 520 1018 C 540 1030 580 1030 600 1018" stroke="#000" strokeWidth={10} opacity={0.7} fill="none" style={{ filter: "blur(4px)" }} />
      {/* boca: línea recta, absolutamente seria */}
      <path d="M 500 1068 L 600 1066" stroke="#1a0b06" strokeWidth={5} opacity={0.8} style={{ filter: "blur(1px)" }} />
      {/* sombra de la capucha sobre la frente */}
      <rect x={380} y={560} width={340} height={360} fill="url(#sombraCapucha)" />
    </g>
    {/* barba blanca */}
    <path d="M 420 1010 C 410 1200 450 1430 545 1540 C 640 1430 690 1200 676 1010 C 630 1070 460 1070 420 1010 Z" fill="#4d4740" style={{ filter: "blur(3px)" }} />
    <path d="M 420 1010 C 410 1200 450 1430 545 1540 C 640 1430 690 1200 676 1010 C 630 1070 460 1070 420 1010 Z" fill="url(#luzVelaCara)" />
    <g style={{ filter: "blur(1.1px)" }}>
      {PELOS.map((p, i) => (
        <path key={i} d={p.d} stroke={p.lit ? "#cfc5b5" : "#6d665c"} strokeWidth={p.w} fill="none" opacity={p.lit ? 0.3 * k : 0.07} />
      ))}
    </g>
    <path d="M 420 1010 C 410 1200 450 1430 545 1540 C 640 1430 690 1200 676 1010 Z" fill="url(#sombraCapucha)" opacity={0} />
    {/* bigote */}
    <path d="M 470 1046 C 500 1030 530 1036 545 1050 C 560 1036 600 1030 630 1048 C 600 1066 560 1062 545 1056 C 530 1062 490 1066 470 1046 Z" fill="#cfc6b8" opacity={0.55 * k} style={{ filter: "blur(1.2px)" }} />
  </svg>
);

const PrimerPlano: React.FC<{ dur: number }> = ({ dur }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 1);
  const parp = fr > dur - 30 && fr < dur - 26 ? 0.9 : 0; // un único parpadeo lento
  return (
    <AbsoluteFill style={{ background: "#020101" }}>
      <Camara dur={dur} zoom={[1.0, 1.12]} temblor={0.45} seed={6} origen="52% 45%">
        <CaraMaestro k={k} parpadeo={parp} />
        {/* vela desenfocada en primer término */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: "blur(16px)" }}>
          <DefsComunes />
          <Llama x={930} y={1760} s={3.2} seed={1} halo={1.3} />
        </svg>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 45% at 85% 85%, rgba(255,140,50,${0.18 * k}), rgba(0,0,0,0) 70%)` }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 38% 30% at 58% 46%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)" }} />
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 2B · LA CAMILLA IMPROVISADA ---------------- */
const Camilla: React.FC<{ dur: number }> = ({ dur }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 2);
  const acerca = interpolate(fr, [0, dur], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#050302" }}>
      <Camara dur={dur} zoom={[1.08, 1.0]} x={[-30, 30]} temblor={0.8} seed={7}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsComunes />
          <Patrones />
          {/* pared */}
          <rect x={0} y={0} width={W} height={1380} fill="url(#patMadera)" />
          <rect x={0} y={0} width={W} height={1380} fill="#000" opacity={0.6} />
          {/* ventanuco nocturno */}
          <rect x={120} y={360} width={190} height={240} fill="#0c1218" />
          <rect x={132} y={372} width={166} height={216} fill="#2d3c4a" />
          <rect x={132} y={372} width={166} height={216} fill="url(#metal)" opacity={0.07} />
          <rect x={210} y={372} width={10} height={216} fill="#0c0806" />
          <rect x={132} y={474} width={166} height={10} fill="#0c0806" />
          {/* estante con velas y tarros */}
          <rect x={540} y={560} width={440} height={18} fill="#1c120b" />
          {[600, 700, 880].map((x, i) => (
            <rect key={x} x={x - 20} y={500 - i * 10} width={40} height={60 + i * 10} rx={6} fill="#22201b" opacity={0.9} />
          ))}
          <rect x={775} y={490} width={22} height={70} fill="url(#cera)" />
          <Llama x={786} y={490} s={0.9} seed={3} />
          {/* suelo */}
          <rect x={0} y={1380} width={W} height={540} fill="#0d0805" />
          <rect x={0} y={1380} width={W} height={10} fill="#000" opacity={0.6} />
          {/* luz cálida general */}
          <circle cx={780} cy={900} r={700} fill="url(#haloVela)" opacity={0.35 * k} />
          {/* monjes al fondo (desenfocados) */}
          <g style={{ filter: "blur(3px)" }}>
            <Monje x={150} y={1400} s={0.5} luz={0.15} contraluz={0.25} seed={11} />
            <Monje x={330} y={1395} s={0.47} luz={0.12} contraluz={0.2} seed={12} cabeceo={4} />
          </g>
          {/* caballetes + puerta vieja como camilla */}
          {[260, 760].map((x) => (
            <g key={x}>
              <path d={`M ${x - 60} 1560 L ${x - 10} 1300 L ${x + 10} 1300 L ${x + 60} 1560`} stroke="#1a110a" strokeWidth={16} fill="none" />
              <rect x={x - 70} y={1296} width={140} height={16} fill="#24170e" />
            </g>
          ))}
          <rect x={120} y={1250} width={790} height={48} fill="url(#patMadera)" />
          <rect x={120} y={1250} width={790} height={48} fill="#000" opacity={0.45} />
          <rect x={150} y={1258} width={300} height={6} fill="#000" opacity={0.6} />
          <circle cx={860} cy={1274} r={8} fill="#8a7a52" opacity={0.6} />
          {/* paciente tumbado (perfil) */}
          <g>
            <rect x={150} y={1212} width={120} height={40} rx={18} fill="#3a3430" />
            <path d="M 260 1238 C 300 1180 380 1170 520 1176 L 820 1190 C 860 1194 880 1214 880 1236 L 880 1252 L 260 1252 Z" fill="#14181c" />
            <path d="M 520 1180 L 880 1196" stroke="#2c3e52" strokeWidth={30} opacity={0.6} />
            {/* cabeza: perfil boca arriba, ojos cerrados */}
            <path d="M 190 1210 C 188 1160 230 1138 262 1150 C 270 1140 284 1136 292 1146 C 300 1158 296 1172 300 1186 C 310 1196 300 1210 290 1214 Z" fill="#6c4a39" />
            <path d="M 190 1210 C 188 1160 230 1138 262 1150" stroke="#e8a06c" strokeWidth={4} fill="none" opacity={0.55 * k} style={{ filter: "blur(1.5px)" }} />
            <path d="M 186 1190 C 180 1150 214 1128 252 1134 C 232 1140 214 1160 210 1190 Z" fill="#1a120c" />
            {/* brazo extendido sobre la tabla */}
            <path d="M 470 1210 C 560 1218 640 1226 700 1236 L 700 1250 L 470 1250 Z" fill="#8a5d48" />
            <path d="M 470 1210 C 560 1218 640 1226 700 1236" stroke="#f0aa78" strokeWidth={3} opacity={0.6 * k} fill="none" />
          </g>
          {/* el maestro se acerca */}
          <Monje x={800 - acerca * 30} y={1440} s={0.6} luz={0.3} contraluz={0.85 * k} inclina={-6 - acerca * 4} seed={13} barba />
          <circle cx={430} cy={1150} r={360} fill="url(#haloVela)" opacity={0.55 * k} />
          <rect x={420} y={1170} width={24} height={70} fill="url(#cera)" />
          <Llama x={432} y={1170} s={0.8} seed={5} />
        </svg>
        <Humo x={432} y={1100} seed={3} escala={0.6} color="#3b3430" opacidad={0.25} />
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 2C · LA CUCHARA CALIENTE (macro) ---------------- */
const CucharaMacro: React.FC<{ dur: number; calor: number }> = ({ dur, calor }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 8);
  const rojo = interpolate(fr, [calor - 6, calor + 18], [0.15, 1], clamp);
  const giro = ruido(fr / 30, 3) * 1.2;
  return (
    <AbsoluteFill style={{ background: "#030201" }}>
      <Camara dur={dur} zoom={[1.12, 1.2]} temblor={0.6} seed={8} origen="55% 55%">
        {/* mesa en perspectiva real (CSS 3D) */}
        <div style={{ position: "absolute", left: -500, top: 900, width: 2100, height: 1500, perspective: 1100 }}>
          <Img
            src={tex("wood_table.png")}
            style={{ width: "100%", height: "100%", transform: "rotateX(62deg)", transformOrigin: "50% 0%", filter: "brightness(0.55)" }}
          />
        </div>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 35% at 58% 64%, rgba(255,130,40,${0.32 * k}), rgba(0,0,0,0.92) 75%)` }} />
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsComunes />
          <Patrones />
          <defs>
            <radialGradient id="rojoVivo" cx="50%" cy="60%" r="60%">
              <stop offset="0%" stopColor="#fff1b0" />
              <stop offset="25%" stopColor="#ff9a2a" />
              <stop offset="60%" stopColor="#d62a00" />
              <stop offset="100%" stopColor="#3a0800" stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* vela bajo la cuchara */}
          <rect x={595} y={1180} width={90} height={420} fill="url(#cera)" />
          <ellipse cx={640} cy={1180} rx={45} ry={10} fill="#e8d6b4" opacity={0.7} />
          <Llama x={640} y={1172} s={2.2} seed={8} halo={1.4} />
          {/* cuchara sostenida desde arriba */}
          <g transform={`rotate(${-18 + giro} 640 1000)`}>
            <rect x={-200} y={985} width={720} height={30} rx={14} fill="url(#metalV)" />
            <ellipse cx={660} cy={1000} rx={165} ry={108} fill="url(#metalV)" />
            <ellipse cx={660} cy={1000} rx={150} ry={95} fill="url(#cuencoCuchara)" />
            <ellipse cx={660} cy={1015} rx={150} ry={92} fill="url(#rojoVivo)" opacity={rojo} />
            <ellipse cx={620} cy={968} rx={40} ry={12} fill="#fff" opacity={0.35} style={{ filter: "blur(4px)" }} />
            <ellipse cx={660} cy={1005} rx={190} ry={130} fill="#ff4a10" opacity={rojo * 0.35} style={{ filter: "blur(30px)" }} />
          </g>
        </svg>
        <Humo x={700} y={930} seed={5} escala={0.9} color="#6b625b" opacidad={0.28 * rojo + 0.08} subida={420} />
      </Camara>
    </AbsoluteFill>
  );
};

export const Escena2Maestro: React.FC = () => {
  const e = escena("maestro");
  const c1 = palabra("maestro", "te") - 3; // "Te hace meditar…"
  const c2 = palabra("maestro", "con") - 2; // "con una cuchara caliente"
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={c1}>
        <PrimerPlano dur={c1} />
      </Sequence>
      <Sequence from={c1} durationInFrames={c2 - c1}>
        <Camilla dur={c2 - c1} />
      </Sequence>
      <Sequence from={c2} durationInFrames={e.duracion - c2}>
        <CucharaMacro dur={e.duracion - c2} calor={palabra("maestro", "caliente") - c2} />
      </Sequence>
      <Rotulo desde={8} hasta={c1 - 2} linea1="Hno. Anselmo" linea2="Maestro tatuador. Divorciado (3 veces)" y={250} />
    </AbsoluteFill>
  );
};
