import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { Crater, MemeSign, ThumbsUp } from "./components/Aftermath";
import { ViralCaptions } from "./components/Captions";
import {
  BoomText,
  CeilingDebris,
  CraterWisps,
  Fireball,
  ImpactFlash,
  ImpactParticles,
  Shockwave,
  SmokeCloud,
  Vignette,
  WhistleText,
} from "./components/Effects";
import { Rocket } from "./components/Rocket";
import { SplitBadge } from "./components/SplitBadge";
import { Bed, Ceiling, Client, Lamp, StudioBackground, Tattooist } from "./components/TattooStudio";
import { H, IMPACT, IMPACT_POINT, PLUNGE, REVEAL, ROCKET_IN, ROCKET_SCALE, W } from "./constants";
import { decay, lerpF, mix, pop } from "./lib/anim";

// ─── Cámara virtual: escala + punto de foco, con clamp para no ver bordes ──
const getCamera = (frame: number, fps: number) => {
  // Escena 1: push-in lento
  let s = lerpF(frame, [0, 110], [1, 1.06]);
  let fx = 540;
  let fy = lerpF(frame, [0, 110], [960, 920]);

  // Escena 2: zoom dramático al techo y seguimiento del cohete
  const z = pop(frame, fps, 111, { damping: 16, stiffness: 110 });
  s = mix(s, 1.55, z);
  fy = mix(fy, 300, z);
  const follow = lerpF(frame, [138, 176], [0, 1], Easing.inOut(Easing.cubic));
  s = mix(s, 1.2, follow);
  fy = mix(fy, 620, follow);

  // Escena 3: plano general para el impacto
  const wide = pop(frame, fps, PLUNGE, { damping: 20, stiffness: 160 });
  s = mix(s, 1.03, wide);
  fy = mix(fy, 960, wide);
  // Punch-in del impacto
  s += 0.14 * decay(frame, IMPACT, 6);

  // Remate: acercamiento al cráter
  const fin = lerpF(frame, [REVEAL, 300], [0, 1], Easing.out(Easing.cubic));
  s = mix(s, 1.28, fin);
  fx = mix(fx, 560, fin);
  fy = mix(fy, 1010, fin);

  let tx = W / 2 - fx * s;
  let ty = H / 2 - fy * s;
  tx = Math.min(0, Math.max(W - W * s, tx));
  ty = Math.min(0, Math.max(H - H * s, ty));
  return { s, tx, ty };
};

// ─── CameraShake: Math.sin + decaimiento exponencial ──────────────────────
const getShake = (frame: number) => {
  let x = 0;
  let y = 0;
  let r = 0;
  // Retumbar del motor mientras baja el cohete
  if (frame >= ROCKET_IN && frame < IMPACT) {
    const a = lerpF(frame, [ROCKET_IN, IMPACT], [3, 11]);
    x += a * Math.sin(frame * 4.1);
    y += a * Math.cos(frame * 5.3);
  }
  // Impacto (frame 210)
  if (frame >= IMPACT) {
    const d = frame - IMPACT;
    const amp = 52 * Math.exp(-d / 7);
    x += amp * Math.sin(d * 2.9);
    y += amp * 0.8 * Math.cos(d * 3.7);
    r += amp * 0.05 * Math.sin(d * 2.1);
  }
  const cover = 1 + (Math.abs(x) + Math.abs(y)) / 500; // evita bordes vacíos
  return { x, y, r, cover };
};

// ─── Trayectoria del cohete ───────────────────────────────────────────────
const getRocket = (frame: number, fps: number) => {
  if (frame < ROCKET_IN || frame > IMPACT + 1) return null;
  const dive = pop(frame, fps, ROCKET_IN, { damping: 11, stiffness: 90, mass: 0.9 });
  let tipY = mix(-160, 770, dive);
  tipY += lerpF(frame, [148, PLUNGE], [0, 70]); // cámara lenta
  const plunge = lerpF(frame, [PLUNGE, IMPACT], [0, 1], Easing.in(Easing.cubic));
  tipY = mix(tipY, IMPACT_POINT.y, plunge);
  const jitter = Math.sin(frame * 9.7) * 3;
  const tipX = mix(540, IMPACT_POINT.x, plunge) + jitter;
  const rotation = Math.sin(frame * 0.7) * 1.8 * (1 - plunge) + (1 - dive) * 8;
  const callout = lerpF(frame, [150, 162], [0, 1]) * lerpF(frame, [186, 192], [1, 0]);
  return { tipX, tipY, rotation, callout };
};

export const TattooRocketViral: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // TODO: Audio cue — frame 0: ambiente de estudio + zumbido de rotativa (120 Hz) + voz narrador.
  // TODO: Audio cue — frame 58: silbido agudo descendente (FIIIUUU).
  // TODO: Audio cue — frame 111: techo rompiéndose + rugido de motores.
  // TODO: Audio cue — frame 210: IMPACTO (explosión grave + pitido de acúfeno).
  // TODO: Audio cue — frame 250: "ding" cómico al salir el pulgar.

  const cam = getCamera(frame, fps);
  const shake = getShake(frame);
  const rocket = getRocket(frame, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#07050a", overflow: "hidden" }}>
      {/* Contenedor principal con CameraShake */}
      <AbsoluteFill
        style={{
          transform: `translate(${shake.x}px, ${shake.y}px) rotate(${shake.r}deg) scale(${shake.cover})`,
        }}
      >
        {/* ── MUNDO (afectado por la cámara) ── */}
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`,
          }}
        >
          <StudioBackground frame={frame} />
          <Ceiling frame={frame} fps={fps} />
          <Lamp frame={frame} />
          <Bed frame={frame} />
          <Crater frame={frame} />
          <Client frame={frame} />
          <ThumbsUp frame={frame} fps={fps} />
          <Tattooist frame={frame} fps={fps} />
          {rocket ? (
            <Rocket
              frame={frame}
              tipX={rocket.tipX}
              tipY={rocket.tipY}
              scale={ROCKET_SCALE}
              rotation={rocket.rotation}
              callout={rocket.callout}
            />
          ) : null}
          <CeilingDebris frame={frame} />
          <Fireball frame={frame} />
          <SmokeCloud frame={frame} />
          <Shockwave frame={frame} />
          <ImpactParticles frame={frame} />
          <CraterWisps frame={frame} />
          <MemeSign frame={frame} fps={fps} />
        </AbsoluteFill>

        {/* ── UI (pantalla) ── */}
        <SplitBadge frame={frame} fps={fps} />
        <WhistleText frame={frame} fps={fps} />
        <BoomText frame={frame} fps={fps} />
        <ViralCaptions frame={frame} fps={fps} />
      </AbsoluteFill>

      <Vignette />
      <ImpactFlash frame={frame} />
    </AbsoluteFill>
  );
};
