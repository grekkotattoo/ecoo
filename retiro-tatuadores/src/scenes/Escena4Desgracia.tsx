import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Camara, clamp, DefsComunes, H, Niebla, Rotulo, ruido, suave, tex, W } from "../components/fx";
import { Cabana, Monje, Patrones } from "../components/personajes";
import { escena, palabra, PAUSA_REMATE } from "../tiempos";

const DefsBrazo: React.FC = () => (
  <defs>
    <pattern id="patPiel4" patternUnits="userSpaceOnUse" width={700} height={700}>
      <image href={tex("skin.png")} width={700} height={700} />
    </pattern>
    <pattern id="patTinta4" patternUnits="userSpaceOnUse" width={1800} height={1800}>
      <image href={tex("ink.png")} width={1800} height={1800} />
    </pattern>
    <pattern id="patYeso" patternUnits="userSpaceOnUse" width={900} height={900}>
      <image href={tex("plaster.png")} width={900} height={900} />
    </pattern>
    <pattern id="patMesa4" patternUnits="userSpaceOnUse" width={1200} height={750}>
      <image href={tex("wood_table.png")} width={1200} height={750} />
    </pattern>
    <linearGradient id="volumenBrazo" x1="0" x2="1">
      <stop offset="0%" stopColor="#000" stopOpacity={0.75} />
      <stop offset="30%" stopColor="#000" stopOpacity={0.15} />
      <stop offset="60%" stopColor="#fff" stopOpacity={0.07} />
      <stop offset="100%" stopColor="#000" stopOpacity={0.8} />
    </linearGradient>
    <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#fff3c4" />
      <stop offset="35%" stopColor="#c9a04a" />
      <stop offset="70%" stopColor="#6e4f17" />
      <stop offset="100%" stopColor="#2a1c06" />
    </linearGradient>
    <linearGradient id="rendija" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffe2a0" stopOpacity={1} />
      <stop offset="100%" stopColor="#ff9a30" stopOpacity={0} />
    </linearGradient>
  </defs>
);

/* ---------------- 4A · SALIDA: BRAZO NEGRO ENVUELTO EN FILM ---------------- */
const Salida: React.FC<{ dur: number }> = ({ dur }) => {
  const fr = useCurrentFrame();
  const t = fr / 30;
  const paso = Math.sin(t * 5.2);
  const swing = paso * 3.5;
  const bob = Math.abs(Math.cos(t * 5.2)) * 14;
  return (
    <AbsoluteFill style={{ background: "#1b2127" }}>
      <Camara dur={dur} zoom={[1.0, 1.04]} temblor={1.4} seed={15} y={[0, -bob]}>
        {/* fondo: amanecer gris, cabaña y monjes en la niebla */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#59636c 0%,#7d878f 45%,#3a4249 70%,#1d2328 100%)" }} />
        <Img src={tex("ridge_near.png")} style={{ position: "absolute", left: -900, top: -2200, width: 2900, height: 5130, filter: "blur(7px) brightness(1.9) contrast(0.7)", opacity: 0.85 }} />
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: "blur(5px)" }}>
          <DefsComunes />
          <Patrones />
          <Cabana x={700} y={1280} s={0.55} luzVentanas={0.35} />
          {[560, 640, 720, 800, 880].map((x, i) => (
            <Monje key={x} x={x} y={1330} s={0.17} luz={0.3} cuchara={i === 2 ? -10 + Math.sin(t * 3) * 12 : null} seed={i} />
          ))}
          <rect x={0} y={1320} width={W} height={600} fill="#2b3238" />
        </svg>
        <Niebla y={700} alto={1100} opacidad={0.55} velocidad={1.2} variante={0} />
        {/* brazo en primer término */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsBrazo />
          <g transform={`rotate(${swing} 330 -100)`}>
            {/* manga de camiseta */}
            <path d="M 120 -40 L 560 -40 L 540 300 C 440 330 260 330 170 300 Z" fill="#20262b" />
            {/* brazo completo en negro */}
            <path d="M 190 290 C 250 310 470 310 520 290 C 520 600 500 900 470 1220 C 440 1260 300 1260 270 1220 C 230 900 200 600 190 290 Z" fill="url(#patTinta4)" />
            <path d="M 190 290 C 250 310 470 310 520 290 C 520 600 500 900 470 1220 C 440 1260 300 1260 270 1220 C 230 900 200 600 190 290 Z" fill="url(#volumenBrazo)" />
            {/* mano (piel normal, muñeca irritada) */}
            <path d="M 272 1220 C 300 1250 440 1250 468 1220 C 480 1300 470 1380 440 1440 C 410 1480 330 1480 300 1440 C 270 1380 262 1300 272 1220 Z" fill="url(#patPiel4)" />
            <path d="M 272 1222 C 320 1246 420 1246 468 1222" stroke="#b33a2a" strokeWidth={14} opacity={0.55} fill="none" style={{ filter: "blur(5px)" }} />
            <path d="M 272 1220 C 300 1250 440 1250 468 1220 C 480 1300 470 1380 440 1440 C 410 1480 330 1480 300 1440 C 270 1380 262 1300 272 1220 Z" fill="url(#volumenBrazo)" />
            {/* film transparente: reflejos y arrugas */}
            <path d="M 180 330 C 240 360 480 360 530 330 L 500 1180 C 440 1210 300 1210 260 1180 Z" fill="#cfe0ec" opacity={0.06} />
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M ${240 + i * 12} ${400 + i * 170} C ${300} ${420 + i * 170} ${420} ${380 + i * 170} ${490 - i * 6} ${430 + i * 170}`}
                stroke="#e6f2fb"
                strokeWidth={3}
                opacity={0.35 + 0.2 * Math.sin(t * 4 + i)}
                fill="none"
                style={{ filter: "blur(1px)" }}
              />
            ))}
            <path d="M 430 330 C 450 600 440 900 420 1180" stroke="#f4fbff" strokeWidth={10} opacity={0.22} fill="none" style={{ filter: "blur(4px)" }} />
          </g>
        </svg>
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 4B · CASA ---------------- */
const Casa: React.FC<{ dur: number }> = ({ dur }) => {
  const fr = useCurrentFrame();
  // fluorescente que arranca con parpadeos
  const tubo = fr < 4 ? 0 : fr < 6 ? 0.8 : fr < 8 ? 0.1 : fr < 11 ? 0.9 : fr < 12 ? 0.3 : 1;
  return (
    <AbsoluteFill style={{ background: "#05070a" }}>
      <Camara dur={dur} zoom={[1.05, 1.0]} temblor={0.7} seed={16}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsBrazo />
          <rect x={0} y={0} width={W} height={1350} fill="url(#patYeso)" />
          <rect x={0} y={0} width={W} height={1350} fill="#0a1016" opacity={1 - tubo * 0.45} />
          {/* azulejos */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={i} x1={i * 100} y1={900} x2={i * 100} y2={1350} stroke="#000" strokeWidth={3} opacity={0.25} />
          ))}
          {[1000, 1100, 1200, 1300].map((y) => (
            <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="#000" strokeWidth={3} opacity={0.25} />
          ))}
          {/* ventana con la ciudad */}
          <rect x={640} y={260} width={330} height={430} fill="#0a0e14" />
          {Array.from({ length: 24 }).map((_, i) => (
            <circle key={i} cx={660 + ((i * 97) % 300)} cy={480 + ((i * 53) % 190)} r={4 + (i % 3) * 3} fill={i % 4 ? "#ffb25a" : "#cfe4ff"} opacity={0.5} style={{ filter: "blur(3px)" }} />
          ))}
          <rect x={800} y={260} width={10} height={430} fill="#c9ccd0" opacity={0.3} />
          {/* nevera */}
          <rect x={30} y={420} width={280} height={930} rx={14} fill="#b9bec2" opacity={0.25 + tubo * 0.35} />
          <rect x={270} y={600} width={10} height={160} rx={4} fill="#666" />
          {/* tubo fluorescente */}
          <rect x={320} y={80} width={440} height={22} rx={10} fill={tubo > 0.5 ? "#eef6ff" : "#3a4048"} />
          <ellipse cx={540} cy={120} rx={500} ry={200} fill="#dfefff" opacity={0.18 * tubo} style={{ filter: "blur(40px)" }} />
          {/* mesa y paciente de espaldas */}
          <rect x={0} y={1350} width={W} height={570} fill="#0e0f11" />
          <path d="M 80 1330 L 1000 1330 L 1060 1480 L 20 1480 Z" fill="url(#patMesa4)" opacity={0.7} />
          <path d="M 80 1330 L 1000 1330 L 1060 1480 L 20 1480 Z" fill="#000" opacity={0.55 - tubo * 0.25} />
          <path d="M 260 1920 C 250 1640 300 1430 400 1360 C 460 1320 640 1320 700 1360 C 800 1440 840 1640 830 1920 Z" fill="#121519" />
          <path d="M 440 1360 C 430 1240 480 1170 550 1170 C 620 1170 670 1240 660 1360 Z" fill="#0c0807" />
          {/* el brazo negro sobre la mesa */}
          <path d="M 690 1400 C 780 1390 900 1380 990 1390 L 990 1440 C 900 1440 780 1440 690 1440 Z" fill="url(#patTinta4)" />
          <path d="M 990 1392 C 1020 1392 1040 1404 1040 1416 C 1040 1430 1020 1440 990 1440 Z" fill="#a37a64" />
        </svg>
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 4C/4D · LA PUERTA ---------------- */
const Puerta: React.FC<{
  dur: number;
  zoom: [number, number];
  revela: number; // frame en que se empieza a ver la puerta
  giro: number; // frame en que empieza a girar el pomo
  golpes: number[]; // frames de los tres golpes
  luzDentro: number; // frame en que aparece luz bajo la puerta
}> = ({ dur, zoom, revela, giro, golpes, luzDentro }) => {
  const fr = useCurrentFrame();
  const vis = interpolate(fr, [revela, revela + 30], [0, 1], { ...clamp, easing: suave });
  const barrido = interpolate(fr, [revela - 10, revela + 40], [-300, 1300], clamp);
  // giro del pomo: intenta abrir, no puede, vuelve
  const g1 = interpolate(fr, [giro, giro + 10, giro + 16, giro + 26], [0, 55, 55, 0], { ...clamp, easing: suave });
  const g2 = interpolate(fr, [giro + 30, giro + 36, giro + 42], [0, 30, 0], clamp);
  const anguloPomo = g1 + g2 + (fr > giro && fr < giro + 42 ? ruido(fr, 2) * 3 : 0);
  let empuje = 0;
  let polvo = 0;
  for (const gp of golpes) {
    const d = fr - gp;
    if (d >= 0 && d < 7) empuje = Math.max(empuje, Math.exp(-d / 1.6));
    if (d >= 0 && d < 22) polvo = Math.max(polvo, 1 - d / 22);
  }
  const luz = interpolate(fr, [luzDentro, luzDentro + 12], [0, 1], clamp) * (0.85 + 0.15 * ruido(fr * 0.8, 6));
  const pulso = luz * (1 + empuje * 0.6);
  // puerta (coordenadas en el antebrazo)
  const PX = 545;
  const PY = 820;
  return (
    <AbsoluteFill style={{ background: "#07090b" }}>
      <Camara dur={dur} zoom={zoom} temblor={0.5} seed={17} origen={`50% ${(PY / H) * 100}%`} sacudidas={golpes}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsBrazo />
          {/* mesa */}
          <rect x={0} y={0} width={W} height={H} fill="url(#patMesa4)" />
          <rect x={0} y={0} width={W} height={H} fill="#06080b" opacity={0.38} />
          <ellipse cx={540} cy={800} rx={620} ry={820} fill="#ffe2bf" opacity={0.12} style={{ filter: "blur(60px)" }} />
          {/* antebrazo vertical en negro + mano */}
          <path d="M 250 -50 C 320 -60 760 -60 830 -50 C 820 500 800 1100 760 1560 L 360 1560 C 310 1100 270 500 250 -50 Z" fill="#000" opacity={0.7} style={{ filter: "blur(28px)" }} transform="translate(34 30)" />
          <path d="M 362 1540 C 420 1570 700 1570 758 1540 C 790 1660 780 1800 740 1900 C 700 1990 420 1990 380 1900 C 340 1800 330 1660 362 1540 Z" fill="url(#patPiel4)" />
          <path d="M 362 1540 C 420 1570 700 1570 758 1540 C 790 1660 780 1800 740 1900 C 700 1990 420 1990 380 1900 C 340 1800 330 1660 362 1540 Z" fill="url(#volumenBrazo)" />
          <path d="M 364 1548 C 440 1576 690 1576 756 1548" stroke="#b33a2a" strokeWidth={16} opacity={0.6} fill="none" style={{ filter: "blur(6px)" }} />
          <path d="M 250 -50 C 320 -60 760 -60 830 -50 C 820 500 800 1100 760 1560 C 700 1575 420 1575 360 1560 C 310 1100 270 500 250 -50 Z" fill="url(#patTinta4)" />
          <path d="M 250 -50 C 320 -60 760 -60 830 -50 C 820 500 800 1100 760 1560 C 700 1575 420 1575 360 1560 C 310 1100 270 500 250 -50 Z" fill="url(#volumenBrazo)" />
          <path d="M 790 0 C 785 500 770 1100 735 1540" stroke="#e8eef4" strokeWidth={6} opacity={0.3} fill="none" style={{ filter: "blur(4px)" }} />
          <path d="M 300 0 C 310 500 340 1100 380 1540" stroke="#e8eef4" strokeWidth={4} opacity={0.12} fill="none" style={{ filter: "blur(4px)" }} />
          {/* brillo de vaselina que barre y revela relieves */}
          <rect x={barrido - 200} y={-100} width={140} height={2200} fill="#ffffff" opacity={0.05} transform={`rotate(14 ${barrido} 900)`} style={{ filter: "blur(30px)" }} />
          {/* luz que sale por debajo de la puerta */}
          <ellipse cx={PX} cy={PY + 150} rx={115 * (0.8 + pulso * 0.3)} ry={55} fill="#ffb24a" opacity={0.35 * pulso} style={{ filter: "blur(26px)" }} />
          <g opacity={vis} transform={`translate(${PX} ${PY}) scale(${0.58 * (1 + empuje * 0.035)})`}>
            {/* sombra del relieve */}
            <rect x={-150} y={-260} width={300} height={500} rx={6} fill="#000" opacity={0.55 + empuje * 0.2} style={{ filter: "blur(10px)" }} transform={`translate(${6 + empuje * 6} ${8 + empuje * 8})`} />
            {/* marco */}
            <rect x={-160} y={-270} width={320} height={520} rx={4} fill="none" stroke="#2a2c30" strokeWidth={14} />
            <rect x={-160} y={-270} width={320} height={520} rx={4} fill="none" stroke="#7a828a" strokeWidth={2} opacity={0.55} />
            {/* hoja de la puerta */}
            <rect x={-146} y={-256} width={292} height={492} fill="url(#patTinta4)" />
            <rect x={-146} y={-256} width={292} height={492} fill="#0b0c0e" opacity={0.25} />
            {/* cuarterones */}
            {[
              [-118, -228, 236, 190],
              [-118, -12, 100, 220],
              [18, -12, 100, 220],
            ].map(([x, y, w, h], i) => (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} fill="none" stroke="#000" strokeWidth={7} opacity={0.8} />
                <rect x={x + 3} y={y + 3} width={w} height={h} fill="none" stroke="#9aa3ab" strokeWidth={2} opacity={0.35} />
              </g>
            ))}
            {/* rendija de luz bajo la puerta */}
            <rect x={-146} y={232} width={292} height={8} fill="#ffd37a" opacity={pulso} />
            <rect x={-146} y={236} width={292} height={40} fill="url(#rendija)" opacity={0.5 * pulso} />
            {/* polvo de tinta en cada golpe */}
            {polvo > 0 &&
              Array.from({ length: 14 }).map((_, i) => {
                const a = (i / 14) * Math.PI * 2;
                const r = 170 + (1 - polvo) * 70;
                return (
                  <circle key={i} cx={Math.cos(a) * r * 0.65} cy={Math.sin(a) * r * 1.15} r={2 + (i % 3)} fill="#c8ced4" opacity={polvo * 0.5} />
                );
              })}
            {/* pomo de latón */}
            <g transform={`translate(96 10)`}>
              <circle cx={0} cy={0} r={30} fill="#1a1206" />
              <circle cx={0} cy={0} r={26} fill="url(#oro)" />
              <g transform={`rotate(${anguloPomo})`}>
                <circle cx={0} cy={0} r={19} fill="url(#oro)" />
                <circle cx={-6} cy={-7} r={6} fill="#fffbe8" opacity={0.85} />
                <rect x={-2} y={-19} width={4} height={14} fill="#3a2a0a" opacity={0.7} />
              </g>
              <path d="M -5 46 L 5 46 L 3 64 L -3 64 Z" fill="#0a0703" />
              <circle cx={0} cy={44} r={7} fill="#0a0703" />
            </g>
          </g>
        </svg>
      </Camara>
    </AbsoluteFill>
  );
};

export const Escena4Desgracia: React.FC = () => {
  const e = escena("final");
  const c1 = palabra("final", "pero") - 3;
  const c2 = palabra("final", "descubres") - 3;
  const c3 = palabra("final", "y") - 3;
  const g0 = e.finVoz + PAUSA_REMATE; // pausa antes del remate: después, tres golpes
  const golpes = [g0, g0 + 10, g0 + 20];
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={c1}>
        <Salida dur={c1} />
      </Sequence>
      <Sequence from={c1} durationInFrames={c2 - c1}>
        <Casa dur={c2 - c1} />
      </Sequence>
      <Sequence from={c2} durationInFrames={c3 - c2}>
        <Puerta dur={c3 - c2} zoom={[1.0, 1.35]} revela={palabra("final", "tatuado") - c2 - 12} giro={9999} golpes={[]} luzDentro={9999} />
      </Sequence>
      <Sequence from={c3} durationInFrames={e.duracion - c3}>
        <Puerta
          dur={e.duracion - c3}
          zoom={[1.6, 1.85]}
          revela={-60}
          giro={palabra("final", "llamando") - c3}
          golpes={golpes.map((g) => g - c3)}
          luzDentro={palabra("final", "alguien") - c3}
        />
      </Sequence>
      <Rotulo desde={c1 + 6} hasta={c2 - 2} linea1="Zaragoza" linea2="Dos días después" y={250} />
    </AbsoluteFill>
  );
};
