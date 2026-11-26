import React from "react";
import { AbsoluteFill, Easing, random } from "remotion";
import { C, CEILING_BREAK, FONT_IMPACT, IMPACT, IMPACT_POINT, REVEAL, WHISTLE } from "../constants";
import { lerpF, pop } from "../lib/anim";
import { Layer } from "./Layer";

const OUT = C.out;

/** Polígono irregular determinista (escombros, trozos). */
const chunkPath = (seed: string, size: number) => {
  const n = 6;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = size * (0.6 + 0.5 * random(`${seed}-${i}`));
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
};

// ════════════════════════════════════════════════════════════════════════════
// Escombros del techo (física: velocidad + gravedad + giro)
// ════════════════════════════════════════════════════════════════════════════
export const CeilingDebris: React.FC<{ frame: number }> = ({ frame }) => {
  const start = CEILING_BREAK + 4;
  const t = frame - start;
  if (t < 0 || t > 70) return null;
  return (
    <Layer>
      {Array.from({ length: 24 }, (_, i) => {
        const x0 = 320 + random(`db-x-${i}`) * 440;
        const y0 = 40 + random(`db-y-${i}`) * 230;
        const vx = (random(`db-vx-${i}`) - 0.5) * 18;
        const vy = random(`db-vy-${i}`) * 8 - 3;
        const g = 1.5 + random(`db-g-${i}`) * 0.6;
        const x = x0 + vx * t;
        const y = y0 + vy * t + 0.5 * g * t * t;
        const rot = (random(`db-r-${i}`) - 0.5) * 34 * t;
        const size = 14 + random(`db-s-${i}`) * 34;
        if (y > 2100) return null;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <path d={chunkPath(`db-${i}`, size)} fill={i % 3 === 0 ? "#4a3f55" : "#2a2433"} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
          </g>
        );
      })}
      {/* Polvo alrededor del agujero */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = random(`du-a-${i}`) * Math.PI;
        const d = 40 + t * (4 + random(`du-s-${i}`) * 3);
        const r = (30 + random(`du-r-${i}`) * 40) * (1 + t / 25);
        const op = lerpF(t, [0, 45], [0.75, 0]);
        return <circle key={`d${i}`} cx={540 + Math.cos(a) * d * 1.6 - 0} cy={170 + Math.sin(a) * d * 0.6} r={r} fill="#6d6577" opacity={op} />;
      })}
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Onomatopeya del silbido (pantalla)
// ════════════════════════════════════════════════════════════════════════════
export const WhistleText: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < WHISTLE || frame > 116) return null;
  const s = pop(frame, fps, WHISTLE, { damping: 10, stiffness: 160 });
  const grow = lerpF(frame, [WHISTLE, 110], [0.8, 1.25]);
  const letters = "FIIIIIUUUUU…".split("");
  return (
    <div
      style={{
        position: "absolute",
        top: 450,
        fontWeight: 900,
        width: "100%",
        textAlign: "center",
        transform: `scale(${s * grow}) rotate(-4deg)`,
        fontFamily: FONT_IMPACT,
        fontSize: 92,
        fontStyle: "italic",
        color: "#fff",
        WebkitTextStroke: `6px ${OUT}`,
        paintOrder: "stroke fill",
        textShadow: "0 0 24px #49E0FF",
      }}
    >
      {letters.map((l, i) => (
        <span key={i} style={{ display: "inline-block", transform: `translateY(${Math.sin(frame * 0.6 + i * 0.8) * 10}px)` }}>
          {l}
        </span>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// IMPACTO: bola de fuego, onda expansiva, humo cartoon y partículas
// ════════════════════════════════════════════════════════════════════════════
export const Fireball: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - IMPACT;
  if (t < 0 || t > 22) return null;
  const grow = lerpF(t, [0, 10], [0.2, 1], Easing.out(Easing.cubic));
  const fade = lerpF(t, [12, 22], [1, 0]);
  const blobs = Array.from({ length: 9 }, (_, i) => ({
    a: (i / 9) * Math.PI * 2,
    d: 70 + random(`fb-d-${i}`) * 70,
    r: 90 + random(`fb-r-${i}`) * 70,
  }));
  const { x, y } = IMPACT_POINT;
  return (
    <Layer>
      <g opacity={fade}>
        {blobs.map((b, i) => (
          <circle key={`o${i}`} cx={x + Math.cos(b.a) * b.d * grow} cy={y - 60 + Math.sin(b.a) * b.d * grow * 0.7} r={b.r * grow + 8} fill={OUT} />
        ))}
        {blobs.map((b, i) => (
          <circle key={`a${i}`} cx={x + Math.cos(b.a) * b.d * grow} cy={y - 60 + Math.sin(b.a) * b.d * grow * 0.7} r={b.r * grow} fill="#FF5A1F" />
        ))}
        {blobs.map((b, i) => (
          <circle key={`b${i}`} cx={x + Math.cos(b.a) * b.d * grow * 0.6 - 10} cy={y - 75 + Math.sin(b.a) * b.d * grow * 0.4} r={b.r * grow * 0.7} fill="#FFB020" />
        ))}
        <circle cx={x - 10} cy={y - 80} r={110 * grow} fill="#FFF6B0" />
      </g>
    </Layer>
  );
};

export const Shockwave: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - IMPACT;
  if (t < 0 || t > 30) return null;
  const { x, y } = IMPACT_POINT;
  const ring = (delay: number, color: string, maxR: number) => {
    const tt = t - delay;
    if (tt < 0) return null;
    const r = lerpF(tt, [0, 22], [30, maxR], Easing.out(Easing.cubic));
    const sw = lerpF(tt, [0, 22], [70, 4]);
    const op = lerpF(tt, [10, 24], [1, 0]);
    return <circle cx={x} cy={y - 40} r={r} fill="none" stroke={color} strokeWidth={sw} opacity={op} />;
  };
  const gr = lerpF(t, [0, 26], [40, 1300], Easing.out(Easing.quad));
  return (
    <Layer>
      {ring(0, "#ffffff", 1500)}
      {ring(3, C.neon, 1200)}
      {/* Onda de polvo a ras de suelo */}
      <ellipse cx={x} cy={1420} rx={gr} ry={gr * 0.12} fill="none" stroke="#bfb6c9" strokeWidth={lerpF(t, [0, 26], [40, 6])} opacity={lerpF(t, [8, 28], [0.8, 0])} />
    </Layer>
  );
};

type Puff = { cx: number; cy: number; r: number; op: number };

const puffsAt = (frame: number): Puff[] => {
  const t = frame - IMPACT;
  const { x, y } = IMPACT_POINT;
  return Array.from({ length: 30 }, (_, i) => {
    const a = -Math.PI * (0.02 + 0.96 * random(`sm-a-${i}`));
    const dist = 60 + random(`sm-d-${i}`) * 300;
    const spread = lerpF(t, [0, 14], [0, 1], Easing.out(Easing.cubic));
    const rise = t * (0.8 + random(`sm-u-${i}`) * 1.6);
    const base = 60 + random(`sm-r-${i}`) * 85;
    const grow = lerpF(t, [0, 8], [0.2, 1], Easing.out(Easing.back(1.8))) * (1 + t * 0.009);
    const fadeStart = REVEAL - 8 + random(`sm-f-${i}`) * 12;
    const op = lerpF(frame, [fadeStart, fadeStart + 26], [1, 0]);
    const thin = lerpF(frame, [fadeStart, fadeStart + 26], [1, 1.35]);
    return {
      cx: x + Math.cos(a) * dist * spread * 1.35,
      cy: y - 40 + Math.sin(a) * dist * spread * 0.85 - rise,
      r: base * grow * thin,
      op,
    };
  });
};

export const SmokeCloud: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - IMPACT;
  if (t < 0 || frame > REVEAL + 32) return null;
  const puffs = puffsAt(frame);
  return (
    <Layer>
      {/* 1) contorno exterior unificado  2) relleno  3) sombra plana  4) luz */}
      {puffs.map((p, i) => (
        <circle key={`o${i}`} cx={p.cx} cy={p.cy} r={p.r + 8} fill={OUT} opacity={p.op} />
      ))}
      {puffs.map((p, i) => (
        <circle key={`f${i}`} cx={p.cx} cy={p.cy} r={p.r} fill={C.smoke} opacity={p.op} />
      ))}
      {puffs.map((p, i) => (
        <circle key={`s${i}`} cx={p.cx + p.r * 0.18} cy={p.cy + p.r * 0.22} r={p.r * 0.72} fill={C.smokeShade} opacity={p.op} />
      ))}
      {puffs.map((p, i) => (
        <circle key={`h${i}`} cx={p.cx - p.r * 0.28} cy={p.cy - p.r * 0.3} r={p.r * 0.42} fill={C.smokeHi} opacity={p.op} />
      ))}
    </Layer>
  );
};

export const ImpactParticles: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - IMPACT;
  if (t < 0 || t > 60) return null;
  const { x, y } = IMPACT_POINT;
  return (
    <Layer>
      {Array.from({ length: 52 }, (_, i) => {
        const a = -Math.PI * (0.03 + 0.94 * random(`pt-a-${i}`));
        const sp = 16 + random(`pt-s-${i}`) * 34;
        const g = 1.3;
        const drag = Math.pow(0.97, t);
        const px = x + Math.cos(a) * sp * t * drag;
        const py = y - 30 + Math.sin(a) * sp * t * drag + 0.5 * g * t * t;
        const vx = Math.cos(a) * sp * drag;
        const vy = Math.sin(a) * sp * drag + g * t;
        const kind = i % 3; // 0 chispa, 1 trozo oscuro, 2 espuma de la camilla
        if (kind === 0) {
          const life = 12 + random(`pt-l-${i}`) * 14;
          if (t > life) return null;
          const k = 0.9;
          return (
            <line
              key={i}
              x1={px}
              y1={py}
              x2={px - vx * k}
              y2={py - vy * k}
              stroke={i % 2 ? C.yellow : "#FFB020"}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={1 - t / life}
            />
          );
        }
        const size = 10 + random(`pt-z-${i}`) * 22;
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${(random(`pt-r-${i}`) - 0.5) * 40 * t})`}>
            <path d={chunkPath(`pt-${i}`, size)} fill={kind === 1 ? "#1b1a22" : "#E8C77A"} stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
          </g>
        );
      })}
      {/* El móvil del cliente sale disparado girando */}
      <g transform={`translate(${262 - 16 * t} ${960 - 34 * t + 0.6 * t * t}) rotate(${-38 * t})`}>
        <rect x={-35} y={-17} width={70} height={34} rx={8} fill="#111" stroke={OUT} strokeWidth={5} />
        <rect x={-29} y={9} width={58} height={5} rx={2} fill="#49E0FF" />
      </g>
    </Layer>
  );
};

/** Hilos de humo que siguen saliendo del cráter tras disiparse la nube. */
export const CraterWisps: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < REVEAL - 5) return null;
  const fadeIn = lerpF(frame, [REVEAL - 5, REVEAL + 10], [0, 1]);
  const { x, y } = IMPACT_POINT;
  return (
    <Layer>
      {Array.from({ length: 7 }, (_, i) => {
        const ph = (((frame - REVEAL) + i * 7 + 70) % 48) / 48;
        const cx = x - 90 + i * 30 + Math.sin(ph * 6 + i) * 22;
        const cy = y - 10 - ph * 320;
        const r = 14 + 34 * ph;
        return (
          <g key={i} opacity={fadeIn * (1 - ph) * 0.85}>
            <circle cx={cx} cy={cy} r={r + 5} fill={OUT} />
            <circle cx={cx} cy={cy} r={r} fill="#6f6b7a" />
            <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.4} fill="#9a96a6" />
          </g>
        );
      })}
      {/* Humito de las zapatillas supervivientes */}
      {[0, 1].map((i) => {
        const ph = (((frame - IMPACT) + i * 12) % 30) / 30;
        return <circle key={`s${i}`} cx={714 + Math.sin(ph * 5) * 8} cy={1060 - ph * 120} r={8 + 16 * ph} fill="#6f6b7a" opacity={(1 - ph) * 0.8} />;
      })}
    </Layer>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Capas de pantalla: texto BOOM, flash blanco, viñeta
// ════════════════════════════════════════════════════════════════════════════
export const BoomText: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const t = frame - IMPACT;
  if (t < 1 || t > 30) return null;
  const s = pop(frame, fps, IMPACT + 1, { damping: 7, stiffness: 240 });
  const op = lerpF(t, [20, 30], [1, 0]);
  return (
    <div
      style={{
        position: "absolute",
        top: 360,
        width: "100%",
        textAlign: "center",
        transform: `scale(${0.3 + s * 0.72}) rotate(-9deg)`,
        opacity: op,
        fontFamily: FONT_IMPACT,
        fontWeight: 900,
        fontSize: 150,
        letterSpacing: 4,
        color: C.yellow,
        WebkitTextStroke: `12px ${OUT}`,
        paintOrder: "stroke fill",
        textShadow: `0 14px 0 ${C.red}, 0 22px 0 ${OUT}`,
      }}
    >
      ¡KABOOM!
    </div>
  );
};

/** Destello blanco de 3 frames exactos (210, 211, 212) + cola corta. */
export const ImpactFlash: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame - IMPACT;
  if (t < 0 || t > 6) return null;
  const op = t <= 2 ? 1 : lerpF(t, [3, 6], [0.55, 0]);
  return <AbsoluteFill style={{ backgroundColor: "#fff", opacity: op }} />;
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
      pointerEvents: "none",
    }}
  />
);
