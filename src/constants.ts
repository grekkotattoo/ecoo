// ─── Formato ────────────────────────────────────────────────────────────────
export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 300; // 10 s exactos

// ─── Timing (frames) ────────────────────────────────────────────────────────
export const SCENE1 = { from: 0, to: 110 };
export const SCENE2 = { from: 111, to: 190 };
export const SCENE3 = { from: 191, to: 300 };
export const WHISTLE = 58; // el tatuador oye el silbido
export const CEILING_BREAK = 114;
export const ROCKET_IN = 120;
export const PLUNGE = 191;
export const IMPACT = 210;
export const REVEAL = 245;

// Punto exacto del antebrazo del cliente (coordenadas de mundo 1080x1920)
export const IMPACT_POINT = { x: 505, y: 1186 };

// Escala del cohete en el mundo
export const ROCKET_SCALE = 0.72;

// ─── Copy ───────────────────────────────────────────────────────────────────
// Dato real: el Falcon Heavy genera ~22.800 kN al despegue ≈ 2.300 toneladas-fuerza.
export const THRUST_LABEL = "2.300 t";
export const ROCKET_LOGO = "SPACEX FALCON-X";

// ─── Tipografía (solo fuentes del sistema) ──────────────────────────────────
export const FONT_IMPACT =
  'Impact, Anton, "Arial Black", "Inter Display", Inter, system-ui, sans-serif';
export const FONT_UI = '"Arial Black", "Inter Display", Inter, system-ui, sans-serif';

// ─── Paleta ─────────────────────────────────────────────────────────────────
export const C = {
  out: "#0b0910",
  yellow: "#FFE600",
  neon: "#FF7A2F",
  neonCore: "#FFE2C4",
  pink: "#FF3E8A",
  green: "#19E36B",
  red: "#FF3B30",
  skin: "#F2B48C",
  skinShade: "#D18B68",
  skinB: "#E9A97F",
  skinBShade: "#C98660",
  teal: "#2EC4B6",
  tealShade: "#1E8F86",
  jeans: "#3D5A98",
  jeansShade: "#2C4275",
  leather: "#1b1a22",
  leatherHi: "#3a3846",
  chrome: "#9aa3ad",
  steel: "#d8dde3",
  tape: "#9da3a8",
  tapeShade: "#6d7378",
  smoke: "#4a4755",
  smokeShade: "#2e2b36",
  smokeHi: "#8a8696",
} as const;
