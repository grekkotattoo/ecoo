import React from "react";
import { Easing } from "remotion";
import { C, FONT_IMPACT, THRUST_LABEL } from "../constants";
import { lerpF, pop } from "../lib/anim";

const OUT = C.out;

const CheckIcon: React.FC<{ s: number }> = ({ s }) => (
  <svg width={86} height={86} viewBox="0 0 86 86" style={{ transform: `scale(${s})` }}>
    <circle cx={43} cy={43} r={36} fill={C.green} stroke={OUT} strokeWidth={6} />
    <path d="M25,44 L38,57 L62,30" stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DangerIcon: React.FC<{ s: number }> = ({ s }) => (
  <svg width={92} height={86} viewBox="0 0 92 86" style={{ transform: `scale(${s})` }}>
    <path d="M46,6 L86,78 L6,78 Z" fill={C.yellow} stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
    <rect x={41} y={30} width={10} height={28} rx={4} fill={OUT} />
    <circle cx={46} cy={67} r={6} fill={OUT} />
  </svg>
);

const cardBase: React.CSSProperties = {
  width: 470,
  height: 330,
  borderRadius: 30,
  borderWidth: 7,
  borderStyle: "solid",
  boxShadow: `0 14px 0 ${OUT}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingTop: 22,
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
  fontFamily: FONT_IMPACT,
  fontWeight: 900,
  textAlign: "center",
  color: "#fff",
};

/** Comparativa superior: rotativa (OK) vs. cohete (PELIGRO). */
export const SplitBadge: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame > 126) return null;
  const inL = pop(frame, fps, 4, { damping: 13, stiffness: 170 });
  const inR = pop(frame, fps, 12, { damping: 13, stiffness: 170 });
  const vs = pop(frame, fps, 20, { damping: 8, stiffness: 230 });
  const iconL = pop(frame, fps, 14, { damping: 8, stiffness: 220 });
  const iconR = pop(frame, fps, 22, { damping: 8, stiffness: 220 });
  const exit = lerpF(frame, [110, 124], [0, 1], Easing.in(Easing.back(1.7)));
  const danger = 0.5 + 0.5 * Math.sin(frame * 0.5);
  const jitter = Math.sin(frame * 3.1) * 2;

  return (
    <div
      style={{
        position: "absolute",
        top: 96,
        left: 40,
        width: 1000,
        height: 360,
        display: "flex",
        justifyContent: "space-between",
        transform: `translateY(${-exit * 700}px) rotate(${-exit * 10}deg)`,
      }}
    >
      {/* Rotativa */}
      <div
        style={{
          ...cardBase,
          background: "linear-gradient(180deg, #123d26 0%, #0a1f14 100%)",
          borderColor: C.green,
          transform: `translateX(${(1 - inL) * -720}px) rotate(${(1 - inL) * -14 - 2}deg)`,
        }}
      >
        <CheckIcon s={iconL} />
        <div style={{ fontSize: 42, lineHeight: 1.05, marginTop: 10, letterSpacing: 1 }}>MÁQUINA ROTATIVA</div>
        <div style={{ fontSize: 86, lineHeight: 1, color: C.green, WebkitTextStroke: `4px ${OUT}`, paintOrder: "stroke fill" }}>120 Hz</div>
        <div style={{ fontSize: 22, opacity: 0.8, marginTop: 4, letterSpacing: 2 }}>PRECISIÓN QUIRÚRGICA</div>
      </div>

      {/* Cohete */}
      <div
        style={{
          ...cardBase,
          background: "linear-gradient(180deg, #4a0f0c 0%, #1e0605 100%)",
          borderColor: C.red,
          boxShadow: `0 14px 0 ${OUT}, 0 0 ${20 + 40 * danger}px rgba(255,59,48,${0.4 + 0.4 * danger})`,
          transform: `translateX(${(1 - inR) * 720 + jitter}px) rotate(${(1 - inR) * 14 + 2}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 18,
            background: `repeating-linear-gradient(45deg, ${C.yellow} 0 18px, ${OUT} 18px 36px)`,
          }}
        />
        <DangerIcon s={iconR} />
        <div style={{ fontSize: 34, lineHeight: 1.05, marginTop: 8, letterSpacing: 1 }}>
          COHETE SPACEX
          <br />
          FALCON HEAVY
        </div>
        <div style={{ fontSize: 76, lineHeight: 1, color: C.yellow, WebkitTextStroke: `4px ${OUT}`, paintOrder: "stroke fill" }}>
          {THRUST_LABEL}
        </div>
        <div style={{ fontSize: 22, opacity: 0.85, letterSpacing: 2 }}>DE EMPUJE</div>
      </div>

      {/* VS */}
      <div
        style={{
          position: "absolute",
          left: 500 - 70,
          top: 120,
          width: 140,
          height: 140,
          borderRadius: 70,
          background: C.yellow,
          border: `8px solid ${OUT}`,
          boxSizing: "border-box",
          boxShadow: `0 10px 0 ${OUT}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_IMPACT,
          fontSize: 64,
          fontWeight: 900,
          color: OUT,
          transform: `scale(${vs}) rotate(${(1 - vs) * 180 - 8}deg)`,
        }}
      >
        VS
      </div>
    </div>
  );
};
