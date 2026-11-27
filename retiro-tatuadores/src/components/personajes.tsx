import React from "react";
import { useCurrentFrame } from "remotion";
import { tex, ruido, vela } from "./fx";

/* Patrones de textura fotográfica (incluir dentro de cada <svg>). */
export const Patrones: React.FC = () => (
  <defs>
    <pattern id="patTela" patternUnits="userSpaceOnUse" width={400} height={400}>
      <image href={tex("cloth.png")} width={400} height={400} />
    </pattern>
    <pattern id="patMadera" patternUnits="userSpaceOnUse" width={600} height={600}>
      <image href={tex("wood_wall.png")} width={600} height={600} />
    </pattern>
    <pattern id="patPiedra" patternUnits="userSpaceOnUse" width={420} height={210}>
      <image href={tex("stone.png")} width={420} height={210} />
    </pattern>
    <linearGradient id="sombraTela" x1="0" x2="1">
      <stop offset="0%" stopColor="#000" stopOpacity={0.85} />
      <stop offset="55%" stopColor="#000" stopOpacity={0.35} />
      <stop offset="100%" stopColor="#000" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="sombraTelaV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#000" stopOpacity={0.15} />
      <stop offset="100%" stopColor="#000" stopOpacity={0.75} />
    </linearGradient>
    <radialGradient id="capuchaInterior" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#000" />
      <stop offset="70%" stopColor="#030202" />
      <stop offset="100%" stopColor="#120c08" />
    </radialGradient>
    <radialGradient id="cuencoCuchara" cx="42%" cy="38%" r="70%">
      <stop offset="0%" stopColor="#f4f7fa" />
      <stop offset="18%" stopColor="#a9b0b8" />
      <stop offset="55%" stopColor="#3b4046" />
      <stop offset="100%" stopColor="#0f1113" />
    </radialGradient>
    <radialGradient id="ventanaCalida" cx="50%" cy="60%" r="70%">
      <stop offset="0%" stopColor="#ffcf8a" />
      <stop offset="60%" stopColor="#e88a32" />
      <stop offset="100%" stopColor="#7a3a10" />
    </radialGradient>
    <radialGradient id="haloCalido">
      <stop offset="0%" stopColor="#ffae55" stopOpacity={0.55} />
      <stop offset="100%" stopColor="#ff8a20" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="sombraSuelo">
      <stop offset="0%" stopColor="#000" stopOpacity={0.75} />
      <stop offset="100%" stopColor="#000" stopOpacity={0} />
    </radialGradient>
  </defs>
);

/* ------------------------------------------------------------------ */
/* MONJE (de pie). Origen: pies (0,0). Alto ≈ 1000 u.                   */
/* ------------------------------------------------------------------ */
export const Monje: React.FC<{
  x: number;
  y: number;
  s: number;
  luz?: number; // 0 → silueta, 1 → iluminado de frente
  contraluz?: number; // borde cálido por detrás
  cabeceo?: number; // grados de asentimiento
  inclina?: number; // ladeo del cuerpo
  cuchara?: number | null; // ángulo de la cuchara gigante (null = sin cuchara)
  ojos?: number; // brillo de ojos dentro de la capucha
  respira?: number;
  seed?: number;
  barba?: boolean;
}> = ({ x, y, s, luz = 0.3, contraluz = 0, cabeceo = 0, inclina = 0, cuchara = null, ojos = 0, seed = 0, barba = false }) => {
  const fr = useCurrentFrame();
  const resp = 1 + Math.sin(fr / 30 * 1.4 + seed) * 0.006;
  const sway = ruido(fr / 30 * 0.6, seed) * 0.4;
  const cuerpo =
    "M -128 -760 C -215 -722 -246 -652 -238 -560 L -276 -18 C -200 8 200 8 276 -18 L 238 -560 C 246 -652 215 -722 128 -760 Z";
  const capucha = "M -132 -712 C -158 -800 -130 -930 -40 -992 C -8 -1012 30 -1008 58 -984 C 128 -920 156 -810 132 -712 C 70 -686 -70 -686 -132 -712 Z";
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${inclina + sway})`}>
      <ellipse cx={20} cy={0} rx={330} ry={42} fill="url(#sombraSuelo)" />
      <g transform={`scale(1 ${resp})`}>
        {/* cuerpo */}
        <path d={cuerpo} fill="url(#patTela)" />
        <path d={cuerpo} fill="url(#sombraTelaV)" />
        <path d={cuerpo} fill="#000" opacity={1 - luz} />
        {/* pliegues */}
        {[-170, -95, -30, 40, 110, 180].map((px, i) => (
          <path
            key={i}
            d={`M ${px * 0.7} -440 C ${px * 0.85} -300 ${px * 1.05} -150 ${px * 1.12} -12`}
            stroke="#000"
            strokeWidth={14 + (i % 3) * 6}
            opacity={0.35 + luz * 0.2}
            fill="none"
            style={{ filter: "blur(5px)" }}
          />
        ))}
        {[-130, -60, 70, 140].map((px, i) => (
          <path
            key={"l" + i}
            d={`M ${px * 0.72} -430 C ${px * 0.88} -290 ${px * 1.05} -150 ${px * 1.1} -14`}
            stroke="#a88a66"
            strokeWidth={6}
            opacity={0.08 + luz * 0.12}
            fill="none"
            style={{ filter: "blur(4px)" }}
          />
        ))}
        {/* mangas juntas sobre el vientre */}
        <path
          d="M -236 -572 C -160 -470 160 -470 236 -572 L 214 -410 C 120 -372 -120 -372 -214 -410 Z"
          fill="url(#patTela)"
        />
        <path d="M -236 -572 C -160 -470 160 -470 236 -572 L 214 -410 C 120 -372 -120 -372 -214 -410 Z" fill="#000" opacity={0.55 - luz * 0.25} />
        <path d="M -60 -470 C -20 -440 20 -440 60 -470" stroke="#000" strokeWidth={22} opacity={0.6} fill="none" style={{ filter: "blur(4px)" }} />
        {/* cordón */}
        <path d="M -232 -392 C -120 -360 120 -360 232 -392" stroke="#6f6248" strokeWidth={9} fill="none" opacity={0.35 + luz * 0.45} />
        <path d="M 40 -372 L 52 -230 M 60 -372 L 78 -250" stroke="#6f6248" strokeWidth={7} opacity={0.3 + luz * 0.4} />
        {/* cabeza/capucha con asentimiento */}
        <g transform={`rotate(${cabeceo} 0 -720)`}>
          <path d={capucha} fill="url(#patTela)" />
          <path d={capucha} fill="#000" opacity={1 - luz * 0.85} />
          <path d="M -70 -760 C -82 -830 -60 -900 2 -912 C 62 -900 84 -830 72 -760 C 40 -742 -40 -742 -70 -760 Z" fill="url(#capuchaInterior)" style={{ filter: "blur(6px)" }} />
          <path d="M -58 -770 C -66 -830 -46 -880 2 -890 C 50 -880 68 -830 60 -770 C 30 -756 -30 -756 -58 -770 Z" fill="#000" opacity={0.92} style={{ filter: "blur(3px)" }} />
          {barba && (
            <path d="M -44 -778 C -50 -720 -20 -650 2 -630 C 24 -650 52 -720 46 -778 C 20 -790 -20 -790 -44 -778 Z" fill="#8f8a80" opacity={0.2 + luz * 0.35} style={{ filter: "blur(4px)" }} />
          )}
          {ojos > 0 && (
            <g opacity={ojos}>
              <circle cx={-22} cy={-826} r={4.5} fill="#e8e2d0" style={{ filter: "blur(1px)" }} />
              <circle cx={22} cy={-826} r={4.5} fill="#e8e2d0" style={{ filter: "blur(1px)" }} />
            </g>
          )}
          <path d="M -70 -900 C -40 -930 40 -930 70 -900" stroke="#000" strokeWidth={18} opacity={0.5} fill="none" style={{ filter: "blur(6px)" }} />
        </g>
        {/* contraluz cálido (borde) */}
        {contraluz > 0 && (
          <g opacity={contraluz * 0.7} style={{ filter: "blur(7px)" }}>
            <path d="M -150 -760 C -150 -880 -110 -960 -40 -995 C 0 -1012 40 -1004 64 -984" fill="none" stroke="#ffb06a" strokeWidth={9} />
            <path d="M -232 -600 C -222 -680 -190 -720 -132 -742" fill="none" stroke="#ff9e55" strokeWidth={8} opacity={0.7} />
            <path d="M 232 -600 C 222 -680 190 -720 132 -742" fill="none" stroke="#ff9e55" strokeWidth={6} opacity={0.4} />
          </g>
        )}
        {/* iluminación frontal fría (faros) */}
        {luz > 0.45 && (
          <g opacity={(luz - 0.45) * 1.2}>
            <path d={cuerpo} fill="#b8c8d8" opacity={0.12} />
            <path d={capucha} fill="#c8d6e4" opacity={0.12} />
          </g>
        )}
      </g>
      {cuchara !== null && <CucharaGigante angulo={cuchara} luz={luz} />}
    </g>
  );
};

/* Cuchara gigante sostenida con la mano derecha del monje. */
const CucharaGigante: React.FC<{ angulo: number; luz: number }> = ({ angulo, luz }) => (
  <g transform={`translate(205 -470) rotate(${angulo})`}>
    <g>
      <rect x={-16} y={-760} width={32} height={980} rx={14} fill="url(#metal)" />
      <path d="M -16 -740 C -14 -800 -60 -850 -60 -880 L 60 -880 C 60 -850 14 -800 16 -740 Z" fill="url(#metal)" />
      <ellipse cx={0} cy={-1060} rx={118} ry={196} fill="url(#metal)" />
      <ellipse cx={0} cy={-1060} rx={100} ry={176} fill="url(#cuencoCuchara)" />
      <ellipse cx={-34} cy={-1130} rx={16} ry={52} fill="#fff" opacity={0.25 + luz * 0.5} style={{ filter: "blur(5px)" }} />
      <rect x={-16} y={-760} width={32} height={980} rx={14} fill="#000" opacity={0.55 - luz * 0.45} />
      <ellipse cx={0} cy={-1060} rx={118} ry={196} fill="#000" opacity={0.5 - luz * 0.42} />
    </g>
    {/* mano */}
    <path d="M -34 -30 C -40 -70 30 -80 38 -40 C 44 -5 36 30 0 34 C -30 30 -30 0 -34 -30 Z" fill="#6b4a3a" />
    <path d="M -34 -30 C -40 -70 30 -80 38 -40 C 44 -5 36 30 0 34 C -30 30 -30 0 -34 -30 Z" fill="#000" opacity={0.75 - luz * 0.5} />
  </g>
);

/* ------------------------------------------------------------------ */
/* CABAÑA (fachada). Origen: centro de la base. Ancho ≈ 760 u.          */
/* ------------------------------------------------------------------ */
export const Cabana: React.FC<{ x: number; y: number; s: number; luzVentanas?: number; humo?: boolean; seed?: number }> = ({
  x,
  y,
  s,
  luzVentanas = 1,
  humo = true,
}) => {
  const fr = useCurrentFrame();
  const k = vela(fr, 4) * luzVentanas;
  const pared = "M -370 -90 L -370 -440 L 370 -440 L 370 -90 Z";
  const tejado = "M -450 -420 C -300 -470 -120 -640 6 -700 C 130 -642 300 -476 456 -428 L 440 -396 C 300 -440 130 -590 6 -650 C -120 -588 -300 -432 -434 -390 Z";
  const tejadoRelleno = "M -440 -408 C -300 -456 -120 -628 6 -688 C 130 -630 300 -462 450 -416 L 370 -430 L -370 -430 Z";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* chimenea */}
      <rect x={200} y={-700} width={70} height={200} fill="url(#patPiedra)" />
      <rect x={200} y={-700} width={70} height={200} fill="#000" opacity={0.55} />
      {humo && <Humo x={235} y={-705} seed={2} escala={1.4} />}
      {/* pared de tablones */}
      <path d={pared} fill="url(#patMadera)" />
      <path d={pared} fill="#000" opacity={0.45} />
      {/* frontón */}
      <path d="M -370 -430 L 6 -660 L 370 -430 Z" fill="url(#patMadera)" />
      <path d="M -370 -430 L 6 -660 L 370 -430 Z" fill="#000" opacity={0.6} />
      {/* tejado combado con nieve vieja */}
      <path d={tejadoRelleno} fill="#121416" opacity={0.0} />
      <path d={tejado} fill="#0c0d0e" />
      <path d="M -440 -404 C -300 -452 -120 -624 6 -684" stroke="#c6ccd2" strokeWidth={7} opacity={0.35} fill="none" style={{ filter: "blur(2px)" }} />
      <path d="M 6 -684 C 130 -626 300 -458 450 -412" stroke="#c6ccd2" strokeWidth={6} opacity={0.22} fill="none" style={{ filter: "blur(2px)" }} />
      {/* zócalo de piedra */}
      <rect x={-385} y={-95} width={770} height={95} fill="url(#patPiedra)" />
      <rect x={-385} y={-95} width={770} height={95} fill="#000" opacity={0.5} />
      {/* ventanas cálidas */}
      {[-230, 230].map((vx, i) => (
        <g key={i}>
          <circle cx={vx} cy={-280} r={210} fill="url(#haloCalido)" opacity={0.5 * k} />
          <rect x={vx - 62} y={-345} width={124} height={130} fill="#120b06" />
          <rect x={vx - 54} y={-337} width={108} height={114} fill="url(#ventanaCalida)" opacity={0.85 * k} />
          <rect x={vx - 4} y={-337} width={8} height={114} fill="#140c06" />
          <rect x={vx - 54} y={-284} width={108} height={7} fill="#140c06" />
          <rect x={vx - 70} y={-212} width={140} height={12} fill="#1a120c" />
        </g>
      ))}
      {/* puerta entreabierta */}
      <rect x={-78} y={-345} width={156} height={250} fill="#0b0705" />
      <rect x={-70} y={-337} width={14} height={242} fill="#ffb15e" opacity={0.75 * k} style={{ filter: "blur(3px)" }} />
      <rect x={-56} y={-337} width={126} height={242} fill="url(#patMadera)" />
      <rect x={-56} y={-337} width={126} height={242} fill="#000" opacity={0.62} />
      {/* farol junto a la puerta */}
      <circle cx={-120} cy={-300} r={150} fill="url(#haloCalido)" opacity={0.7 * k} />
      <rect x={-130} y={-318} width={20} height={30} rx={3} fill="#ffd9a0" opacity={0.9 * k} />
      {/* manchas y desgaste */}
      <path d="M 120 -440 L 140 -90" stroke="#000" strokeWidth={30} opacity={0.35} style={{ filter: "blur(10px)" }} />
      <path d="M -330 -440 L -300 -90" stroke="#000" strokeWidth={40} opacity={0.3} style={{ filter: "blur(14px)" }} />
      {/* luz del farol en el suelo */}
      <ellipse cx={-60} cy={10} rx={360} ry={50} fill="#ff9a40" opacity={0.18 * k} style={{ filter: "blur(18px)" }} />
    </g>
  );
};

/* Humo/vapor que asciende. */
export const Humo: React.FC<{ x: number; y: number; seed?: number; escala?: number; color?: string; opacidad?: number; n?: number; subida?: number }> = ({
  x,
  y,
  seed = 0,
  escala = 1,
  color = "#9aa3ab",
  opacidad = 0.5,
  n = 9,
  subida = 260,
}) => {
  const fr = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y})`} style={{ filter: `blur(${10 * escala}px)` }}>
      {Array.from({ length: n }).map((_, i) => {
        const vida = 70;
        const t = ((fr + i * (vida / n) + seed * 13) % vida) / vida;
        const yy = -t * subida * escala;
        const xx = ruido(t * 4 + i, seed + i) * 40 * escala + t * 50 * escala;
        const r = (16 + t * 70) * escala;
        const a = Math.sin(Math.PI * t) * opacidad;
        return <circle key={i} cx={xx} cy={yy} r={r} fill={color} opacity={a} />;
      })}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* COCHE (perfil, avanza hacia la derecha). Origen: centro del suelo.   */
/* ------------------------------------------------------------------ */
export const Coche: React.FC<{ x: number; y: number; s: number; faros?: number; rebote?: number }> = ({ x, y, s, faros = 1, rebote = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {/* haces de luz */}
    <g opacity={faros} style={{ filter: "blur(18px)" }}>
      <path d="M 250 -92 L 1500 -330 L 1500 120 Z" fill="#dfe9f2" opacity={0.18} />
      <path d="M 250 -92 L 1100 -190 L 1100 40 Z" fill="#eef5fb" opacity={0.22} />
    </g>
    <ellipse cx={0} cy={4} rx={300} ry={22} fill="url(#sombraSuelo)" />
    <g transform={`translate(0 ${rebote})`}>
      <path
        d="M -265 -40 C -268 -80 -258 -105 -230 -112 L -150 -120 C -110 -170 -60 -190 10 -192 L 120 -190 C 160 -186 190 -150 220 -122 L 252 -112 C 270 -104 274 -70 270 -40 C 265 -30 -258 -28 -265 -40 Z"
        fill="#15181b"
      />
      <path d="M -140 -124 C -100 -165 -55 -180 10 -182 L 110 -180 C 140 -176 165 -150 190 -124 Z" fill="#243039" />
      <path d="M -140 -124 C -100 -165 -55 -180 10 -182 L 110 -180 C 140 -176 165 -150 190 -124 Z" fill="url(#metal)" opacity={0.12} />
      <rect x={20} y={-182} width={8} height={60} fill="#15181b" />
      <path d="M -262 -78 L 268 -80" stroke="#5c6670" strokeWidth={2} opacity={0.4} />
      {/* faro y piloto */}
      <ellipse cx={258} cy={-88} rx={10} ry={8} fill="#f4fbff" opacity={faros} />
      <circle cx={258} cy={-88} r={40} fill="#e6f2ff" opacity={0.35 * faros} style={{ filter: "blur(10px)" }} />
      <rect x={-268} y={-96} width={10} height={14} fill="#d01010" opacity={0.85} />
      <circle cx={-266} cy={-89} r={24} fill="#ff1a1a" opacity={0.35} style={{ filter: "blur(8px)" }} />
      {/* ruedas */}
      {[-160, 165].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy={-28} r={48} fill="#070808" />
          <circle cx={wx} cy={-28} r={26} fill="#2a2e32" />
          <circle cx={wx} cy={-28} r={26} fill="url(#metal)" opacity={0.25} />
        </g>
      ))}
    </g>
  </g>
);
