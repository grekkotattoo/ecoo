import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, useCurrentFrame } from "remotion";
import { Camara, clamp, DefsComunes, H, Niebla, Rotulo, suave, tex, W } from "../components/fx";
import { Cabana, Coche, Monje, Patrones } from "../components/personajes";
import { escena, palabra } from "../tiempos";

/* Interpolación sobre polilínea (camino serpenteante). */
const enCamino = (pts: [number, number][], t: number): [number, number, number] => {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const k = Math.min(1, d / seg[i]);
      const [a, b] = [pts[i], pts[i + 1]];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    d -= seg[i];
  }
  return [pts[0][0], pts[0][1], 0];
};

const CAMINO: [number, number][] = [
  [120, 2180],
  [640, 2010],
  [300, 1860],
  [780, 1730],
  [520, 1645],
  [690, 1578],
];

/* ---------------- 1A · PLANO DE ESTABLECIMIENTO ---------------- */
const Establecimiento: React.FC<{ dur: number }> = ({ dur }) => {
  const fr = useCurrentFrame();
  const p = fr / dur;
  const [cx, cy, ang] = enCamino(CAMINO, 0.25 + p * 0.55);
  const titulo = interpolate(fr, [4, 16, dur - 10, dur - 2], [0, 1, 1, 0], clamp);
  const capa = (vel: number): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: 1300,
    height: 2300,
    transform: `translateY(${-fr * vel}px)`,
  });
  return (
    <AbsoluteFill style={{ background: "#07090b" }}>
      <Camara dur={dur} zoom={[1.02, 1.1]} y={[30, -30]} temblor={0.6} seed={2} origen="55% 70%">
        <div style={{ position: "absolute", left: -110, top: -230, width: 1300, height: 2300 }}>
          <Img src={tex("sky.png")} style={capa(0.05)} />
          <Img src={tex("ridge_far.png")} style={{ ...capa(0.1), filter: "blur(1.2px)" }} />
          <div style={{ position: "absolute", left: 110, top: 0, transform: `translateY(${-fr * 0.14}px)` }}>
            <Niebla y={820} alto={700} opacidad={0.4} velocidad={0.5} variante={1} />
          </div>
          <Img src={tex("ridge_mid.png")} style={{ ...capa(0.18), filter: "blur(0.6px)" }} />
          <div style={{ position: "absolute", left: 110, top: 0, transform: `translateY(${-fr * 0.2}px)` }}>
            <Niebla y={1180} alto={600} opacidad={0.55} velocidad={0.8} variante={0} desfase={400} />
          </div>
          <div style={capa(0.26)}>
            <Img src={tex("ridge_near.png")} style={{ position: "absolute", left: 0, top: 0, width: 1300, height: 2300 }} />
            <svg width={1300} height={2300} style={{ position: "absolute", left: 0, top: 0 }}>
              <DefsComunes />
              <Patrones />
              {/* pista forestal apenas visible */}
              <polyline points={CAMINO.map((q) => q.join(",")).join(" ")} fill="none" stroke="#3b4248" strokeWidth={9} opacity={0.35} style={{ filter: "blur(1.5px)" }} />
              <Cabana x={700} y={1570} s={0.12} humo />
              {/* faros del coche subiendo */}
              <g transform={`translate(${cx} ${cy}) rotate(${(ang * 180) / Math.PI})`}>
                <path d="M 0 0 L 160 -38 L 160 38 Z" fill="#e9f3ff" opacity={0.22} style={{ filter: "blur(9px)" }} />
                <circle cx={4} cy={-5} r={3} fill="#fff" />
                <circle cx={4} cy={5} r={3} fill="#fff" />
                <circle cx={0} cy={0} r={22} fill="#dff0ff" opacity={0.4} style={{ filter: "blur(7px)" }} />
              </g>
            </svg>
          </div>
        </div>
        <Niebla y={1300} alto={900} opacidad={0.35} velocidad={1.6} variante={1} desenfoque={6} />
      </Camara>
      {/* título de documental */}
      <AbsoluteFill style={{ alignItems: "center", top: 470, opacity: titulo, color: "#efeadf", textShadow: "0 2px 24px rgba(0,0,0,0.9)" }}>
        <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 24, letterSpacing: 9, opacity: 0.8 }}>UN DOCUMENTAL</div>
        <div
          style={{
            fontFamily: "Garamond",
            fontSize: 74,
            letterSpacing: 6,
            textAlign: "center",
            lineHeight: 1.08,
            marginTop: 22,
            transform: `scale(${1 + fr * 0.0006})`,
          }}
        >
          EL RETIRO ESPIRITUAL
          <br />
          DE TATUADORES
        </div>
        <div style={{ width: 80, height: 2, background: "#efeadf", opacity: 0.7, margin: "26px 0 18px" }} />
        <div style={{ fontFamily: "Plex", fontSize: 26, letterSpacing: 3, opacity: 0.8 }}>PIRINEO ARAGONÉS · 2.140 m · 23:47</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------------- 1B · LLEGADA A LA CABAÑA ---------------- */
const Llegada: React.FC<{ dur: number }> = ({ dur }) => {
  const fr = useCurrentFrame();
  const parada = Math.round(dur * 0.62);
  const avance = interpolate(fr, [0, parada], [0, 1], { ...clamp, easing: suave });
  const carX = -380 + avance * 560;
  const frenazo = spring({ frame: fr - parada, fps: 30, config: { damping: 9, stiffness: 160 } });
  const rebote = fr > parada ? Math.sin(frenazo * Math.PI) * 5 : 0;
  const luzMonjes = interpolate(carX, [-380, 180], [0.12, 0.55], clamp);
  const xs = [300, 420, 540, 660, 780];
  return (
    <AbsoluteFill style={{ background: "#06080a" }}>
      <Camara dur={dur} zoom={[1.06, 1.02]} x={[25, -25]} temblor={1} seed={3}>
        <Img src={tex("sky.png")} style={{ position: "absolute", left: -110, top: -650, width: 1300, height: 2300 }} />
        <Img
          src={tex("ridge_far.png")}
          style={{ position: "absolute", left: -500, top: -900, width: 2100, height: 3715, filter: "blur(3px) brightness(0.7)" }}
        />
        <Niebla y={420} alto={900} opacidad={0.45} velocidad={0.7} variante={1} desenfoque={4} />
        <Img
          src={tex("ridge_near.png")}
          style={{ position: "absolute", left: -700, top: -1650, width: 2600, height: 4600, filter: "blur(2.5px) brightness(0.8)" }}
        />
        {/* suelo helado */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 1220,
            width: W,
            height: H - 1220,
            background: "linear-gradient(180deg, #1a1f22 0%, #0d1012 40%, #050607 100%)",
          }}
        />
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <DefsComunes />
          <Patrones />
          {[...Array(14)].map((_, i) => (
            <ellipse
              key={i}
              cx={(i * 197) % 1080}
              cy={1300 + ((i * 89) % 500)}
              rx={60 + (i % 4) * 40}
              ry={8 + (i % 3) * 5}
              fill="#8a949c"
              opacity={0.12}
              style={{ filter: "blur(4px)" }}
            />
          ))}
          <Cabana x={560} y={1262} s={0.95} />
          {xs.map((x, i) => (
            <Monje
              key={i}
              x={x}
              y={1395 + (i % 2) * 6}
              s={0.29}
              luz={luzMonjes * (1 - Math.abs(x - 540) / 900)}
              contraluz={0.55}
              cuchara={i === 2 ? 0 : null}
              seed={i}
              barba={i === 2}
            />
          ))}
          <Coche x={carX} y={1590} s={0.78} rebote={rebote} />
        </svg>
        <Niebla y={1050} alto={700} opacidad={0.3} velocidad={1.1} variante={0} desenfoque={3} />
      </Camara>
    </AbsoluteFill>
  );
};

/* ---------------- 1C · POV PARABRISAS ---------------- */
const GOTAS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 263.7) % 1080,
  y: 120 + ((i * 541.3) % 1300),
  r: 3 + ((i * 7) % 9),
  t: (i * 37) % 40,
}));

const Parabrisas: React.FC<{ dur: number; alzar: number; ojos: number }> = ({ dur, alzar, ojos }) => {
  const fr = useCurrentFrame();
  // limpiaparabrisas: una pasada
  const lp = interpolate(fr, [2, 14, 26], [0, 1, 0], { ...clamp, easing: suave });
  const angLimp = 82 - lp * 150; // 82° = reposo (tumbado a la derecha); barre hasta -68°
  const minAng = 82 - interpolate(fr, [2, 14], [0, 1], { ...clamp, easing: suave }) * 150;
  const alzado = spring({ frame: fr - alzar, fps: 30, config: { damping: 30, stiffness: 25, mass: 2 } });
  const brillo = interpolate(fr, [ojos, ojos + 6], [0, 1], clamp);
  const aprieta = interpolate(fr, [alzar - 4, alzar + 10], [0, 1], clamp);
  const xs = [150, 345, 540, 735, 930];
  const motor = Math.sin(fr * 2.3) * 0.8;
  return (
    <AbsoluteFill style={{ background: "#040506" }}>
      <Camara dur={dur} zoom={[1.0, 1.07]} temblor={0.5} seed={4} origen="50% 42%">
        <AbsoluteFill style={{ transform: `translateY(${motor}px)` }}>
          {/* exterior iluminado por los faros */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 55% at 50% 62%, #3a4650 0%, #11161a 55%, #050607 100%)" }} />
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <DefsComunes />
            <Patrones />
            <g style={{ filter: "blur(1.2px)" }}>
              <Cabana x={540} y={1430} s={1.75} luzVentanas={0.8} humo={false} />
            </g>
            {/* sombras proyectadas por los faros en la pared */}
            <g opacity={0.6} style={{ filter: "blur(9px)" }}>
              {xs.map((x, i) => (
                <g key={i} transform={`translate(${(x - 540) * 0.25} -70)`}>
                  <Monje x={x} y={1440} s={0.64} luz={0} cuchara={i === 2 ? -alzado * 28 : null} seed={i} />
                </g>
              ))}
            </g>
            {/* suelo de grava */}
            <rect x={0} y={1440} width={W} height={480} fill="#1c2226" />
            <ellipse cx={540} cy={1520} rx={700} ry={140} fill="#b9c6d0" opacity={0.18} style={{ filter: "blur(30px)" }} />
            {xs.map((x, i) => (
              <Monje
                key={i}
                x={x}
                y={1478 + (i % 2) * 10}
                s={0.56}
                luz={0.92}
                contraluz={0.25}
                cuchara={i === 2 ? -alzado * 28 : null}
                ojos={brillo * (i === 2 ? 1 : 0.7)}
                seed={i}
                barba={i === 2}
              />
            ))}
          </svg>
          <Niebla y={950} alto={800} opacidad={0.28} velocidad={1.2} variante={0} desenfoque={2} />
          {/* luz de faros en la niebla */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 30% at 50% 78%, rgba(220,235,250,0.16), rgba(0,0,0,0) 70%)" }} />
          {/* cristal: gotas y limpiaparabrisas */}
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            {GOTAS.map((g, i) => {
              const phi = (Math.atan2(g.x - 260, 1560 - g.y) * 180) / Math.PI;
              const limpia = phi >= minAng && Math.hypot(g.x - 260, g.y - 1560) < 1000;
              const reapar = interpolate(fr, [26 + g.t, 50 + g.t], [0, 1], clamp);
              const a = limpia ? reapar : 1;
              return (
                <g key={i} opacity={a * 0.75}>
                  <circle cx={g.x} cy={g.y} r={g.r} fill="#cfd8e0" opacity={0.18} />
                  <circle cx={g.x - g.r * 0.3} cy={g.y - g.r * 0.3} r={g.r * 0.35} fill="#fff" opacity={0.5} />
                </g>
              );
            })}
            <g transform={`rotate(${angLimp} 260 1560)`}>
              <g style={{ filter: "blur(5px)" }}>
                <rect x={254} y={620} width={12} height={940} fill="#050505" />
                <rect x={246} y={640} width={7} height={880} fill="#0d0d0d" />
              </g>
            </g>
          </svg>
          {/* montantes, retrovisor y salpicadero */}
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <path d="M 0 0 L 150 0 L -40 1600 L 0 1600 Z" fill="#030303" />
            <path d="M 1080 0 L 930 0 L 1120 1600 L 1080 1600 Z" fill="#030303" />
            <path d="M 0 0 L 1080 0 L 1080 90 C 700 120 380 120 0 90 Z" fill="#050505" />
            <rect x={690} y={110} width={260} height={90} rx={18} fill="#0a0b0c" />
            <rect x={700} y={120} width={240} height={70} rx={14} fill="#1b2126" />
            <rect x={808} y={70} width={22} height={50} fill="#0a0b0c" />
            <path d="M 0 1470 C 300 1420 780 1420 1080 1470 L 1080 1920 L 0 1920 Z" fill="#070808" />
            <path d="M 0 1470 C 300 1420 780 1420 1080 1470" stroke="#2b3238" strokeWidth={3} fill="none" opacity={0.6} />
            <rect x={150} y={1560} width={300} height={70} rx={12} fill="#ffb14a" opacity={0.08} style={{ filter: "blur(8px)" }} />
            <rect x={185} y={1585} width={60} height={16} rx={4} fill="#ffb14a" opacity={0.45} style={{ filter: "blur(1.5px)" }} />
            <rect x={280} y={1585} width={90} height={16} rx={4} fill="#79e1ff" opacity={0.35} style={{ filter: "blur(1.5px)" }} />
            {/* volante y manos */}
            <g transform={`translate(330 1960)`}>
              <circle cx={0} cy={0} r={390} fill="none" stroke="#0b0c0d" strokeWidth={54} />
              <circle cx={0} cy={0} r={390} fill="none" stroke="#2c3238" strokeWidth={3} opacity={0.5} transform="translate(0 -24)" />
              {[-1, 1].map((sg) => (
                <g key={sg} transform={`translate(${sg * 300} -250) rotate(${sg * 38}) scale(${1 + aprieta * 0.05})`}>
                  <path d="M -70 -10 C -60 -60 50 -70 70 -30 C 82 0 70 40 30 50 C -20 58 -78 40 -70 -10 Z" fill="#2a1d17" />
                  {[-40, -12, 16, 44].map((k) => (
                    <path key={k} d={`M ${k} -50 C ${k + 4} -64 ${k + 18} -64 ${k + 20} -44`} stroke="#c58f72" strokeWidth={3} opacity={0.25 + aprieta * 0.35} fill="none" />
                  ))}
                  <path d="M -70 -10 C -60 -60 50 -70 70 -30" stroke="#d6a07e" strokeWidth={3} opacity={0.3} fill="none" style={{ filter: "blur(1px)" }} />
                </g>
              ))}
            </g>
          </svg>
          {/* reflejo en el cristal */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.03) 60%, rgba(0,0,0,0) 80%)" }} />
        </AbsoluteFill>
      </Camara>
    </AbsoluteFill>
  );
};

export const Escena1Viaje: React.FC = () => {
  const e = escena("gancho");
  const c1 = palabra("gancho", "fueras") - 6; // "te fueras a una cabaña…"
  const c2 = palabra("gancho", "con") - 2; // "con cinco monjes divorciados"
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={c1}>
        <Establecimiento dur={c1} />
      </Sequence>
      <Sequence from={c1} durationInFrames={c2 - c1}>
        <Llegada dur={c2 - c1} />
      </Sequence>
      <Sequence from={c2} durationInFrames={e.duracion - c2}>
        <Parabrisas dur={e.duracion - c2} alzar={palabra("gancho", "monjes") - c2} ojos={palabra("gancho", "divorciados") - c2} />
      </Sequence>
      <Rotulo
        desde={palabra("gancho", "cinco")}
        hasta={e.duracion + 2}
        linea1="Comunidad de San Gerundio"
        linea2="5 monjes · 11 divorcios"
        y={250}
      />
    </AbsoluteFill>
  );
};
