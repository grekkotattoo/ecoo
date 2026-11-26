import React from "react";
import { C, FONT_IMPACT } from "../constants";
import { pop } from "../lib/anim";

/** Palabras entre *asteriscos* se resaltan en amarillo neón. */
type Phrase = { from: number; to: number; text: string };

export const CAPTIONS: Phrase[] = [
  // Escena 1 (0–110)
  { from: 0, to: 55, text: "¿Por qué tatuarte con una *máquina* *profesional*..." },
  { from: 55, to: 111, text: "...y no con un propulsor *SpaceX* *Falcon* *Heavy*?" },
  // Escena 2 (111–190)
  { from: 111, to: 150, text: "Aunque le pegues una *aguja* con *cinta* *americana* en la punta," },
  { from: 150, to: 191, text: "la precisión baja *un* *poquito*." },
  // Escena 3 (191–300)
  { from: 191, to: 250, text: "Además, el cliente tiende a *evaporarse*" },
  { from: 250, to: 300, text: "antes de *pagar* *la* *sesión*." },
];

const parse = (text: string) =>
  text.split(" ").map((w) => {
    const hl = w.startsWith("*");
    return { word: w.replace(/\*/g, "").toUpperCase(), hl };
  });

/** Subtítulos estilo TikTok/Reels: pop por frase + entrada escalonada por palabra. */
export const ViralCaptions: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const idx = CAPTIONS.findIndex((p) => frame >= p.from && frame < p.to);
  if (idx < 0) return null;
  const phrase = CAPTIONS[idx];
  const words = parse(phrase.text);
  const phrasePop = pop(frame, fps, phrase.from, { damping: 12, stiffness: 200 });
  const tilt = idx % 2 === 0 ? -2 : 2;

  return (
    <div
      style={{
        position: "absolute",
        left: 30,
        right: 30,
        bottom: 320,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "flex-end",
        transform: `scale(${0.55 + 0.45 * phrasePop}) rotate(${tilt}deg)`,
        transformOrigin: "50% 100%",
      }}
    >
      {words.map((w, i) => {
        const raw = pop(frame, fps, phrase.from + i * 2, { damping: 12, stiffness: 200 });
        // El rebote se suaviza por encima de 1 para que las palabras no se pisen
        const s = raw > 1 ? 1 + (raw - 1) * 0.4 : raw;
        return (
          <span
            key={`${idx}-${i}`}
            style={{
              display: "inline-block",
              margin: "0 16px",
              whiteSpace: "nowrap",
              fontFamily: FONT_IMPACT,
              fontWeight: 900,
              fontSize: 84,
              lineHeight: 1.08,
              letterSpacing: 1,
              color: w.hl ? C.yellow : "#ffffff",
              WebkitTextStroke: "6px black",
              paintOrder: "stroke fill",
              textShadow: "0 7px 0 #000",
              transform: `scale(${s}) translateY(${(1 - s) * 40}px) rotate(${w.hl ? (i % 2 ? 3 : -3) : 0}deg)`,
              opacity: s > 0.02 ? 1 : 0,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
