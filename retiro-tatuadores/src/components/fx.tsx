import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import type { Palabra } from "../tiempos";

export const W = 1080;
export const H = 1920;
export const tex = (n: string) => staticFile("tex/" + n);

/** Ruido suave determinista (suma de senos inconmensurables). Rango ≈ [-1, 1]. */
export const ruido = (t: number, seed = 0) =>
  (Math.sin(t * 0.91 + seed * 12.9898) * 0.5 +
    Math.sin(t * 2.17 + seed * 78.233) * 0.3 +
    Math.sin(t * 5.03 + seed * 3.71) * 0.2);

/** Intensidad de una vela (0.75–1.05) con parpadeo orgánico. */
export const vela = (frame: number, seed = 0) =>
  0.9 + 0.08 * ruido(frame * 0.35, seed) + 0.04 * ruido(frame * 1.7, seed + 3);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const suave = Easing.bezier(0.45, 0, 0.25, 1);

/* ------------------------------------------------------------------ */
/* CÁMARA: cámara en mano de documental + movimiento lento motivado     */
/* ------------------------------------------------------------------ */
export const Camara: React.FC<{
  children: React.ReactNode;
  dur: number;
  temblor?: number;
  zoom?: [number, number];
  x?: [number, number];
  y?: [number, number];
  origen?: string;
  sacudidas?: number[]; // frames con golpe seco de cámara
  seed?: number;
}> = ({ children, dur, temblor = 1, zoom = [1, 1], x = [0, 0], y = [0, 0], origen = "50% 50%", sacudidas = [], seed = 1 }) => {
  const fr = useCurrentFrame();
  const t = fr / 30;
  const p = interpolate(fr, [0, dur], [0, 1], { ...clamp, easing: suave });
  let jx = 0;
  let jy = 0;
  for (const s of sacudidas) {
    const d = fr - s;
    if (d >= 0 && d < 14) {
      const k = Math.exp(-d / 3.2);
      jx += Math.sin(d * 2.6) * 14 * k;
      jy += Math.cos(d * 3.1) * 18 * k;
    }
  }
  const hx = ruido(t * 1.3, seed) * 7 * temblor + jx;
  const hy = ruido(t * 1.1, seed + 5) * 6 * temblor + jy;
  const hr = ruido(t * 0.9, seed + 9) * 0.35 * temblor;
  const s = zoom[0] + (zoom[1] - zoom[0]) * p;
  const tx = x[0] + (x[1] - x[0]) * p + hx;
  const ty = y[0] + (y[1] - y[0]) * p + hy;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${tx}px, ${ty}px) rotate(${hr}deg) scale(${s * 1.04})`,
        transformOrigin: origen,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* ACABADO DE PELÍCULA                                                  */
/* ------------------------------------------------------------------ */
export const Grano: React.FC<{ opacidad?: number }> = ({ opacidad = 0.16 }) => {
  const fr = useCurrentFrame();
  const i = fr % 6;
  const ox = ((fr * 137) % 60) - 30;
  const oy = ((fr * 251) % 80) - 40;
  return (
    <AbsoluteFill style={{ opacity: opacidad, overflow: "hidden", pointerEvents: "none" }}>
      <Img
        src={tex(`grain_${i}.png`)}
        style={{ position: "absolute", left: -40 + ox, top: -40 + oy, width: W + 80, height: H + 80 }}
      />
    </AbsoluteFill>
  );
};

export const Vineta: React.FC<{ fuerza?: number }> = ({ fuerza = 0.75 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${fuerza}) 100%)`,
    }}
  />
);

/** Etalonaje frío de documental: sombras verdosas-azuladas, luces apagadas. */
export const Etalonaje: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: "rgba(20,40,48,0.16)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5) 100%)" }} />
  </>
);

/* ------------------------------------------------------------------ */
/* NIEBLA                                                               */
/* ------------------------------------------------------------------ */
export const Niebla: React.FC<{
  y: number;
  alto?: number;
  opacidad?: number;
  velocidad?: number;
  variante?: 0 | 1;
  desfase?: number;
  desenfoque?: number;
  tinte?: string;
}> = ({ y, alto = 1100, opacidad = 0.5, velocidad = 0.6, variante = 0, desfase = 0, desenfoque = 0, tinte }) => {
  const fr = useCurrentFrame();
  const x = -300 - desfase - fr * velocidad;
  const ancho = (2600 * alto) / 1100;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: W, height: alto, overflow: "visible", opacity: opacidad, pointerEvents: "none" }}>
      <Img
        src={tex(`fog_${variante}.png`)}
        style={{
          position: "absolute",
          left: x,
          top: 0,
          width: ancho,
          height: alto,
          filter: `${desenfoque ? `blur(${desenfoque}px)` : ""}${tinte ? ` ${tinte}` : ""}`,
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* LLAMA DE VELA                                                         */
/* ------------------------------------------------------------------ */
export const Llama: React.FC<{ x: number; y: number; s?: number; seed?: number; halo?: number }> = ({ x, y, s = 1, seed = 0, halo = 1 }) => {
  const fr = useCurrentFrame();
  const k = vela(fr, seed);
  const sway = ruido(fr * 0.4, seed + 2) * 4;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {halo > 0 && <circle cx={0} cy={-18} r={130 * k} fill="url(#haloVela)" opacity={0.55 * halo * k} />}
      <path
        d={`M0 0 C -9 -10 -8 -26 ${sway} -${44 * k} C 8 -26 9 -10 0 0 Z`}
        fill="url(#llamaGrad)"
        style={{ filter: "blur(1.2px)" }}
      />
      <ellipse cx={0} cy={-6} rx={3} ry={6} fill="#3a5cff" opacity={0.45} />
    </g>
  );
};

/** Definiciones SVG compartidas (degradados de vela, metal…). Incluir una vez por <svg>. */
export const DefsComunes: React.FC = () => (
  <defs>
    <radialGradient id="haloVela">
      <stop offset="0%" stopColor="#ffb866" stopOpacity={0.9} />
      <stop offset="35%" stopColor="#ff8a2a" stopOpacity={0.25} />
      <stop offset="100%" stopColor="#ff6a00" stopOpacity={0} />
    </radialGradient>
    <linearGradient id="llamaGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stopColor="#fff6d8" />
      <stop offset="45%" stopColor="#ffd37a" />
      <stop offset="100%" stopColor="#ff7a1a" stopOpacity={0.2} />
    </linearGradient>
    <linearGradient id="cera" x1="0" x2="1">
      <stop offset="0%" stopColor="#6d5a43" />
      <stop offset="45%" stopColor="#d9c7a4" />
      <stop offset="100%" stopColor="#5a4835" />
    </linearGradient>
    <linearGradient id="metal" x1="0" x2="1">
      <stop offset="0%" stopColor="#2a2d31" />
      <stop offset="30%" stopColor="#8c939b" />
      <stop offset="48%" stopColor="#e8edf2" />
      <stop offset="62%" stopColor="#6e757d" />
      <stop offset="100%" stopColor="#1d2024" />
    </linearGradient>
    <linearGradient id="metalV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#1d2024" />
      <stop offset="35%" stopColor="#9aa1a9" />
      <stop offset="50%" stopColor="#f2f5f8" />
      <stop offset="70%" stopColor="#5d646b" />
      <stop offset="100%" stopColor="#15171a" />
    </linearGradient>
  </defs>
);

/* ------------------------------------------------------------------ */
/* RÓTULOS DE DOCUMENTAL (lower thirds)                                  */
/* ------------------------------------------------------------------ */
export const Rotulo: React.FC<{
  desde: number;
  hasta: number;
  linea1: string;
  linea2?: string;
  y?: number;
}> = ({ desde, hasta, linea1, linea2, y = 250 }) => {
  const fr = useCurrentFrame();
  const a = interpolate(fr, [desde, desde + 10, hasta - 8, hasta], [0, 1, 1, 0], clamp);
  const barra = interpolate(fr, [desde, desde + 14], [0, 1], { ...clamp, easing: suave });
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 70, top: y, opacity: a, color: "#f2efe8", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
      <div style={{ width: 70 * barra, height: 3, background: "#e8e2d4", marginBottom: 18 }} />
      <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 34, letterSpacing: 4, textTransform: "uppercase" }}>{linea1}</div>
      {linea2 && (
        <div style={{ fontFamily: "Garamond", fontStyle: "italic", fontSize: 40, marginTop: 6, opacity: 0.92 }}>{linea2}</div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SUBTÍTULOS sobrios de documental, sincronizados por palabra          */
/* ------------------------------------------------------------------ */
type Trozo = { texto: string; inicio: number; fin: number };

export const trocear = (palabras: Palabra[], maxChars = 24): Trozo[] => {
  const out: Trozo[] = [];
  let act: Palabra[] = [];
  const cerrar = () => {
    if (!act.length) return;
    out.push({ texto: act.map((p) => p.texto).join(" "), inicio: act[0].inicio, fin: act[act.length - 1].fin });
    act = [];
  };
  for (const p of palabras) {
    const largo = act.map((x) => x.texto).join(" ").length + p.texto.length + 1;
    if (act.length && largo > maxChars) cerrar();
    act.push(p);
    if (/[.,?!]$/.test(p.texto)) cerrar();
  }
  cerrar();
  // cada trozo dura hasta que empieza el siguiente (máx. +0,6 s tras su última palabra)
  return out.map((t, i) => ({ ...t, fin: i + 1 < out.length ? Math.min(out[i + 1].inicio, t.fin + 18) : t.fin + 18 }));
};

export const Subtitulos: React.FC<{ palabras: Palabra[]; y?: number }> = ({ palabras, y = 1290 }) => {
  const fr = useCurrentFrame();
  const trozos = trocear(palabras);
  const t = trozos.find((x) => fr >= x.inicio && fr < x.fin);
  if (!t) return null;
  const a = interpolate(fr, [t.inicio, t.inicio + 3, t.fin - 3, t.fin], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: y,
        textAlign: "center",
        fontFamily: "Inter",
        fontWeight: 600,
        fontSize: 58,
        lineHeight: 1.18,
        color: "#f7f4ee",
        opacity: a,
        textShadow: "0 0 3px rgba(0,0,0,0.9), 0 3px 18px rgba(0,0,0,0.85)",
      }}
    >
      {t.texto}
    </div>
  );
};
