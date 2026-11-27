import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame } from "remotion";
import { Camara, clamp, DefsComunes, H, Llama, ruido, suave, tex, vela, W } from "../components/fx";
import { Humo, Monje, Patrones } from "../components/personajes";
import { escena, palabra, PAUSA_REMATE } from "../tiempos";

const DefsPiel: React.FC = () => (
  <defs>
    <pattern id="patPiel3" patternUnits="userSpaceOnUse" width={700} height={700}>
      <image href={tex("skin.png")} width={700} height={700} />
    </pattern>
    <pattern id="patTinta" patternUnits="userSpaceOnUse" width={700} height={700}>
      <image href={tex("ink.png")} width={700} height={700} />
    </pattern>
    <pattern id="patMesa" patternUnits="userSpaceOnUse" width={1000} height={625}>
      <image href={tex("wood_table.png")} width={1000} height={625} />
    </pattern>
    <linearGradient id="luzDerecha" x1="0" x2="1">
      <stop offset="0%" stopColor="#000" stopOpacity={0.99} />
      <stop offset="62%" stopColor="#000" stopOpacity={0.93} />
      <stop offset="88%" stopColor="#000" stopOpacity={0.55} />
      <stop offset="100%" stopColor="#000" stopOpacity={0.3} />
    </linearGradient>
    <radialGradient id="ranura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffd27a" />
      <stop offset="50%" stopColor="#ff6a10" />
      <stop offset="100%" stopColor="#4a0d00" />
    </radialGradient>
  </defs>
);

/* ---------------- 3A · PERFIL MEDITANDO ---------------- */
const Perfil: React.FC<{ dur: number; dolor: number }> = ({ dur, dolor }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 9);
  const tic = interpolate(fr, [dolor, dolor + 3, dolor + 9, dolor + 16], [0, 1, 1, 0], clamp); // mueca contenida
  const gota = interpolate(fr, [dolor + 4, dur], [0, 1], clamp);
  const resp = Math.sin((fr / 30) * 1.1) * 4;
  return (
    <AbsoluteFill style={{ background: "#030201" }}>
      <Camara dur={dur} zoom={[1.0, 1.08]} temblor={0.4} seed={10} origen="60% 45%">
        {/* bokeh de velas al fondo */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: "blur(22px)" }}>
          <DefsComunes />
          <Llama x={160} y={560} s={2.4} seed={1} halo={0.9} />
          <Llama x={300} y={1500} s={1.8} seed={2} halo={0.6} />
        </svg>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsComunes />
          <Patrones />
          <DefsPiel />
          <g transform={`translate(0 ${resp})`}>
            {/* sudadera y cuello */}
            <path d="M 260 1920 C 270 1600 330 1400 470 1330 C 560 1290 700 1300 760 1340 C 900 1430 980 1650 1000 1920 Z" fill="#101317" />
            <path d="M 470 1330 C 560 1290 700 1300 760 1340" stroke="#e39b63" strokeWidth={5} fill="none" opacity={0.35 * k} style={{ filter: "blur(3px)" }} />
            {/* cabeza de perfil mirando a la derecha */}
            <g style={{ filter: "blur(1.2px)" }}>
              <path
                d="M 420 760 C 400 600 520 480 660 490 C 760 498 820 560 830 640 C 834 690 826 720 838 760 C 850 800 890 840 900 868 C 906 886 884 896 862 900 C 866 920 860 936 846 944 C 856 964 846 980 828 986 C 836 1020 826 1060 790 1076 C 740 1096 700 1100 690 1150 L 690 1330 L 500 1330 C 500 1240 470 1170 450 1110 C 420 1020 430 900 420 760 Z"
                fill="url(#patPiel3)"
              />
              <path
                d="M 420 760 C 400 600 520 480 660 490 C 760 498 820 560 830 640 C 834 690 826 720 838 760 C 850 800 890 840 900 868 C 906 886 884 896 862 900 C 866 920 860 936 846 944 C 856 964 846 980 828 986 C 836 1020 826 1060 790 1076 C 740 1096 700 1100 690 1150 L 690 1330 L 500 1330 C 500 1240 470 1170 450 1110 C 420 1020 430 900 420 760 Z"
                fill="url(#luzDerecha)"
                opacity={1.05 - 0.12 * k}
              />
              {/* contorno iluminado por la vela */}
              <path
                d="M 830 640 C 834 690 826 720 838 760 C 850 800 890 840 900 868 C 906 886 884 896 862 900 C 866 920 860 936 846 944 C 856 964 846 980 828 986 C 836 1020 826 1060 790 1076"
                stroke="#ffb27a"
                strokeWidth={5}
                fill="none"
                opacity={0.7 * k}
                style={{ filter: "blur(2px)" }}
              />
              {/* pelo corto oscuro */}
              <path d="M 410 780 C 390 600 510 470 670 482 C 770 490 830 556 836 640 C 800 600 740 580 680 590 C 600 600 560 640 540 700 C 520 760 470 800 410 780 Z" fill="#0c0806" />
              {/* barba corta */}
              <path d="M 700 1000 C 760 1010 820 1000 834 990 C 838 1030 826 1062 790 1076 C 740 1096 700 1100 690 1150 L 600 1150 C 620 1080 650 1020 700 1000 Z" fill="#120b08" opacity={0.9} />
              {/* ojo cerrado */}
              <g transform={`translate(770 780) scale(1 ${1 + tic * 0.6})`}>
                <path d="M -40 0 C -20 10 10 12 30 4" stroke="#1b0d08" strokeWidth={5} fill="none" />
                {[-30, -18, -6, 6, 18].map((x) => (
                  <path key={x} d={`M ${x} ${6} l ${-4} ${10}`} stroke="#1b0d08" strokeWidth={2.2} />
                ))}
                <path d="M -44 -14 C -20 -24 10 -22 32 -10" stroke="#d48a5c" strokeWidth={3} fill="none" opacity={0.35 * k} />
              </g>
              {/* ceja que tiembla al decir "dolor" */}
              <path d={`M 720 ${735 - tic * 8} C 760 ${722 - tic * 10} 800 ${724 - tic * 6} 828 ${738}`} stroke="#120a06" strokeWidth={10} fill="none" strokeLinecap="round" />
              {/* gota de sudor */}
              <g opacity={gota > 0 ? 1 : 0} transform={`translate(${700} ${700 + gota * 120})`}>
                <ellipse cx={0} cy={0} rx={6} ry={9} fill="#ffd9b0" opacity={0.7 * k} />
              </g>
            </g>
          </g>
        </svg>
        <Humo x={900} y={1900} seed={4} escala={1.6} color="#5a5450" opacidad={0.18} subida={700} />
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 3B · LOS MONJES ASIENTEN ---------------- */
const Asienten: React.FC<{ dur: number; n1: number; n2: number }> = ({ dur, n1, n2 }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 11);
  const asiente = (t: number) => {
    const d = fr - t;
    if (d < 0 || d > 26) return 0;
    return Math.sin((d / 26) * Math.PI) * 11;
  };
  const cab = asiente(n1) + asiente(n2);
  return (
    <AbsoluteFill style={{ background: "#040302" }}>
      <Camara dur={dur} zoom={[1.0, 1.05]} temblor={0.6} seed={12}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsComunes />
          <Patrones />
          <rect x={0} y={0} width={W} height={H} fill="url(#patMadera)" />
          <rect x={0} y={0} width={W} height={H} fill="#000" opacity={0.72} />
          <circle cx={540} cy={1300} r={900} fill="url(#haloVela)" opacity={0.4 * k} />
          {[200, 540, 880].map((x, i) => (
            <Monje key={x} x={x} y={2050 + (i === 1 ? 30 : 0)} s={1.05 - (i === 1 ? 0 : 0.08)} luz={0.42} contraluz={0.4} cabeceo={cab} seed={20 + i} barba={i === 1} />
          ))}
          {/* mesa en primer término */}
          <rect x={-40} y={1560} width={1160} height={400} fill="url(#patMadera)" />
          <rect x={-40} y={1560} width={1160} height={400} fill="#000" opacity={0.55} />
          <rect x={-40} y={1560} width={1160} height={10} fill="#e89a5a" opacity={0.25 * k} />
        </svg>
        {/* el ego abandona el cuerpo */}
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <Humo x={520} y={1560} seed={7} escala={2.2} color="#8c8580" opacidad={0.34} n={12} subida={560} />
        </svg>
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 3C · PANEO POR EL CABLE HASTA LA TOSTADORA ---------------- */
const PANO = 3100;
const Panoramica: React.FC<{ dur: number; llegada: number; salta: number }> = ({ dur, llegada, salta }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 13);
  const px = interpolate(fr, [6, llegada], [0, -(PANO - W)], { ...clamp, easing: suave });
  const tost = spring({ frame: fr - salta, fps: 30, config: { damping: 11, stiffness: 180 } });
  const chispa = fr >= salta - 2 && fr < salta + 3;
  const presion = ruido(fr * 0.5, 4) * 3;
  return (
    <AbsoluteFill style={{ background: "#030201" }}>
      <Camara dur={dur} zoom={[1.06, 1.06]} temblor={0.7} seed={14} sacudidas={[salta]}>
        <svg width={PANO} height={H} style={{ position: "absolute", left: px, top: 0 }}>
          <DefsComunes />
          <Patrones />
          <DefsPiel />
          {/* pared y mesa */}
          <rect x={0} y={0} width={PANO} height={1200} fill="url(#patMadera)" />
          <rect x={0} y={0} width={PANO} height={1200} fill="#000" opacity={0.7} />
          <rect x={0} y={1200} width={2300} height={720} fill="url(#patMesa)" />
          <rect x={0} y={1200} width={2300} height={720} fill="#000" opacity={0.3} />
          <rect x={2300} y={1200} width={800} height={720} fill="#080504" />
          <circle cx={700} cy={1300} r={700} fill="url(#haloVela)" opacity={0.45 * k} />
          {/* brazo sobre la mesa */}
          <g>
            <path d="M -60 1250 C 200 1230 520 1240 760 1280 C 830 1292 860 1330 840 1370 C 820 1410 760 1420 700 1416 C 480 1410 200 1430 -60 1440 Z" fill="url(#patPiel3)" />
            <path d="M -60 1250 C 200 1230 520 1240 760 1280 C 830 1292 860 1330 840 1370 C 820 1410 760 1420 700 1416 C 480 1410 200 1430 -60 1440 Z" fill="#000" opacity={0.35} />
            {/* zona ya ennegrecida */}
            <path d="M -60 1250 C 120 1236 300 1236 420 1242 C 430 1300 440 1380 420 1420 C 300 1424 120 1432 -60 1440 Z" fill="url(#patTinta)" />
            <path d="M 420 1242 C 430 1300 440 1380 420 1420" stroke="#8a2a1a" strokeWidth={10} opacity={0.6} fill="none" style={{ filter: "blur(4px)" }} />
            <path d="M -60 1280 C 200 1262 520 1268 760 1300" stroke="#ffb27a" strokeWidth={3} opacity={0.4 * k} fill="none" style={{ filter: "blur(2px)" }} />
          </g>
          {/* cuchara sobre la piel + manga del maestro */}
          <g transform={`translate(${430 + presion} 1300) rotate(-28)`}>
            <ellipse cx={0} cy={0} rx={70} ry={46} fill="url(#metalV)" />
            <ellipse cx={0} cy={4} rx={60} ry={38} fill="#ff4a10" opacity={0.35} style={{ filter: "blur(8px)" }} />
            <rect x={60} y={-10} width={420} height={20} rx={9} fill="url(#metalV)" />
          </g>
          <path d="M 520 950 C 620 980 720 1080 760 1180 C 700 1220 600 1210 540 1170 C 500 1100 480 1010 520 950 Z" fill="url(#patTela)" />
          <path d="M 520 950 C 620 980 720 1080 760 1180 C 700 1220 600 1210 540 1170 C 500 1100 480 1010 520 950 Z" fill="#000" opacity={0.5} />
          <Humo x={440} y={1290} seed={9} escala={0.8} color="#7d7670" opacidad={0.3} />
          {/* empalme con cinta aislante */}
          <g transform="translate(838 1080) rotate(-28)">
            <rect x={-10} y={-18} width={90} height={36} rx={6} fill="#141414" />
            {[0, 18, 36, 54].map((x) => (
              <path key={x} d={`M ${x} -18 L ${x + 10} 18`} stroke="#2c2c2c" strokeWidth={3} />
            ))}
          </g>
          {/* cable trenzado */}
          {[0, 1].map((i) => (
            <path
              key={i}
              d={`M 900 1050 C 1100 ${1020 + i * 8} 1250 ${1190 + i * 6} 1500 ${1260 + i * 6} S 2100 ${1300 + i * 6} 2300 ${1250 + i * 4} C 2400 ${1260 + i * 6} 2440 ${1420 + i * 5} 2520 ${1480 + i * 5}`}
              stroke={i ? "#3a2412" : "#0d0b0a"}
              strokeWidth={13}
              fill="none"
              strokeDasharray={i ? "26 14" : undefined}
            />
          ))}
          <path d="M 1500 1250 S 2100 1290 2300 1240" stroke="#ffb27a" strokeWidth={2} opacity={0.18} fill="none" />
          <g transform="translate(1720 1270) rotate(4)">
            <rect x={-40} y={-16} width={80} height={32} rx={5} fill="#151515" />
          </g>
          {/* taburete con la tostadora */}
          <rect x={2420} y={1560} width={520} height={34} fill="#1a110b" />
          <rect x={2460} y={1594} width={26} height={330} fill="#140d08" />
          <rect x={2874} y={1594} width={26} height={330} fill="#140d08" />
          <g transform="translate(2680 1560)">
            {/* tostadas */}
            {[-70, 70].map((x) => (
              <g key={x} transform={`translate(${x} ${-tost * 170})`}>
                <rect x={-58} y={-300} width={116} height={140} rx={30} fill="#b4783e" />
                <rect x={-50} y={-292} width={100} height={124} rx={26} fill="#6a3a14" />
              </g>
            ))}
            <rect x={-230} y={-300} width={460} height={300} rx={70} fill="url(#metalV)" />
            <rect x={-230} y={-300} width={460} height={300} rx={70} fill="#000" opacity={0.25} />
            <ellipse cx={-80} cy={-230} rx={120} ry={20} fill="#fff" opacity={0.25} style={{ filter: "blur(6px)" }} />
            {[-70, 70].map((x) => (
              <g key={x}>
                <rect x={x - 62} y={-306} width={124} height={22} rx={10} fill="#140c08" />
                <rect x={x - 56} y={-302} width={112} height={14} rx={7} fill="url(#ranura)" opacity={0.9 * (1 - tost * 0.5)} />
              </g>
            ))}
            <circle cx={0} cy={-330} r={260} fill="#ff6a10" opacity={0.12 * k} style={{ filter: "blur(30px)" }} />
            <rect x={232} y={-170} width={34} height={18} rx={5} fill="#0c0c0c" transform={`translate(0 ${-tost * 60})`} />
            <ellipse cx={0} cy={4} rx={250} ry={18} fill="#000" opacity={0.6} />
          </g>
          {/* enchufe */}
          <rect x={2960} y={1020} width={90} height={120} rx={10} fill="#cfc8b8" opacity={0.65} />
          <rect x={2975} y={1060} width={60} height={60} rx={8} fill="#2a2a2a" />
          <path d="M 2910 1555 C 2960 1400 2990 1250 3005 1110" stroke="#0d0b0a" strokeWidth={11} fill="none" />
          {chispa && (
            <g transform="translate(3005 1090)">
              <circle r={50} fill="#bfe4ff" opacity={0.7} style={{ filter: "blur(10px)" }} />
              <path d="M 0 0 l 30 -40 l -14 4 l 22 -40" stroke="#fff" strokeWidth={4} fill="none" />
            </g>
          )}
        </svg>
      </Camara>
    </AbsoluteFill>
  );
};

export const Escena3Tecnica: React.FC = () => {
  const e = escena("tecnica");
  const c1 = palabra("tecnica", "ego") - 4;
  const c2 = palabra("tecnica", "aunque") - 3;
  const llegada = palabra("tecnica", "tostadora") + 4 - c2;
  const salta = e.finVoz + PAUSA_REMATE - c2;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={c1}>
        <Perfil dur={c1} dolor={palabra("tecnica", "dolor")} />
      </Sequence>
      <Sequence from={c1} durationInFrames={c2 - c1}>
        <Asienten dur={c2 - c1} n1={palabra("tecnica", "abandonando") - c1} n2={palabra("tecnica", "cuerpo") - c1} />
      </Sequence>
      <Sequence from={c2} durationInFrames={e.duracion - c2}>
        <Panoramica dur={e.duracion - c2} llegada={llegada} salta={salta} />
      </Sequence>
    </AbsoluteFill>
  );
};
