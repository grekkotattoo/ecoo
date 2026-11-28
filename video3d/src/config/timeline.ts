// ============================================================================
// MANIFEST DE PRODUCCIÓN — fuente ÚNICA de verdad del corto
// "¿Qué pasaría si te tatuaras en gravedad cero en el espacio?"
// Todas las escenas, subtítulos y audio consumen estas constantes.
// ============================================================================
import {simulateAstronauts} from './physics';

export const COMPOSITION_ID = 'GravedadCero';
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SECONDS = 36;
export const DURATION_IN_FRAMES = FPS * DURATION_SECONDS; // 2160

/** Convierte segundos a frames (redondeo entero, sin derivas). */
export const sec = (s: number) => Math.round(s * FPS);

// ---------------------------------------------------------------- Escenas
export type SceneId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05';

export interface SceneRange {
  id: SceneId;
  title: string;
  from: number; // frame global inclusivo
  to: number; // frame global exclusivo
  durationInFrames: number;
}

const range = (id: SceneId, title: string, from: number, to: number): SceneRange => ({
  id,
  title,
  from,
  to,
  durationInFrames: to - from,
});

export const SCENES = {
  S01: range('S01', 'El gancho', 0, 300),
  S02: range('S02', 'La tinta flotante', 300, 720),
  S03: range('S03', 'El pulso sin gravedad', 720, 1200),
  S04: range('S04', 'La cicatrización cósmica', 1200, 1740),
  S05: range('S05', 'El remate meme', 1740, 2160),
} as const satisfies Record<SceneId, SceneRange>;

export const SCENE_LIST: SceneRange[] = Object.values(SCENES);

// Comprobación de integridad en carga: las escenas cubren 0..2160 sin huecos ni solapes.
SCENE_LIST.reduce((cursor, s) => {
  if (s.from !== cursor) throw new Error(`timeline: hueco/solape antes de ${s.id} (${cursor} ≠ ${s.from})`);
  return s.to;
}, 0);
if (SCENE_LIST[SCENE_LIST.length - 1].to !== DURATION_IN_FRAMES) throw new Error('timeline: la última escena no termina en DURATION_IN_FRAMES');

/** Pasa un frame global a local de escena. */
export const local = (scene: SceneRange, globalFrame: number) => globalFrame - scene.from;

// ---------------------------------------------------------------- Beats clave (frames GLOBALES)
export const BEATS = {
  machineOn: 420, // S02: se enciende la máquina → explota la nube de tinta
  lensSplat: 600, // S02: primera gota impacta en la lente
  needleContact: 840, // S03: la aguja toca la piel → reacción de Newton
  radiationStart: 1260, // S04: primeras partículas cósmicas
  mutationStart: 1320, // S04: la línea fina empieza a mutar
  mutationPeak: 1640, // S04: borrón radiactivo completo
  trophyReveal: 1740, // S05: corte al podio
} as const;

// ---------------------------------------------------------------- Voz en off
export interface VoiceLine {
  scene: SceneId;
  from: number;
  to: number;
  text: string;
}

export const VOICE_OVER: VoiceLine[] = [
  {scene: 'S01', from: 10, to: 295, text: 'Imagina pagar tres mil millones por viajar al espacio... solo para hacerte un tatuaje en gravedad cero.'},
  {scene: 'S02', from: 310, to: 715, text: 'Primer problema: sin gravedad, la tinta no baja por la aguja. Se convierte en una nube negra asesina.'},
  {scene: 'S03', from: 730, to: 1195, text: 'Segundo: por cada empujón de la aguja, salís los dos volando contra el techo de la nave.'},
  {scene: 'S04', from: 1210, to: 1735, text: 'Y olvídate de echarle Bepanthol: la radiación cósmica muta tu línea fina en un borrón radiactivo.'},
  {scene: 'S05', from: 1750, to: 2150, text: "Eso sí, cuando bajes a la Tierra, nadie te va a ganar en el concurso de 'tatuaje con mejor historia'."},
];

// ---------------------------------------------------------------- Subtítulos
export interface SubtitleCue {
  id: string;
  scene: SceneId;
  from: number; // frame global
  to: number; // frame global (exclusivo)
  text: string;
  /** Palabras/fragmentos en amarillo neón (#ffd60a). Coincidencia exacta en mayúsculas. */
  highlight: string[];
}

export const SUBTITLES: SubtitleCue[] = [
  {id: 'c01', scene: 'S01', from: 12, to: 140, text: 'VIAJAS AL ESPACIO', highlight: ['ESPACIO']},
  {id: 'c02', scene: 'S01', from: 140, to: 296, text: '¿PARA TATUARTE EN GRAVEDAD CERO?', highlight: ['TATUARTE', 'GRAVEDAD CERO?']},
  {id: 'c03', scene: 'S02', from: 310, to: 470, text: 'SIN GRAVEDAD:', highlight: ['GRAVEDAD:']},
  {id: 'c04', scene: 'S02', from: 470, to: 716, text: 'NUBE DE TINTA ASESINA.', highlight: ['ASESINA.']},
  {id: 'c05', scene: 'S03', from: 730, to: 900, text: 'TERCERA LEY DE NEWTON:', highlight: ['NEWTON:']},
  {id: 'c06', scene: 'S03', from: 900, to: 1196, text: 'SALÍS VOLANDO.', highlight: ['VOLANDO.']},
  {id: 'c07', scene: 'S04', from: 1210, to: 1450, text: 'RADIACIÓN CÓSMICA:', highlight: ['RADIACIÓN']},
  {id: 'c08', scene: 'S04', from: 1450, to: 1736, text: 'ADIÓS A TU LÍNEA FINA.', highlight: ['LÍNEA FINA.']},
  {id: 'c09', scene: 'S05', from: 1750, to: 1930, text: 'GANADOR ABSOLUTO:', highlight: ['GANADOR']},
  {id: 'c10', scene: 'S05', from: 1930, to: 2156, text: "'MEJOR HISTORIA DE TATUAJE'.", highlight: ["'MEJOR", 'HISTORIA']},
];

// ---------------------------------------------------------------- Física de la escena 3 (compartida)
export const S03_IMPULSE_LOCAL = BEATS.needleContact - SCENES.S03.from; // 120
export const ASTRO_SIM = simulateAstronauts(SCENES.S03.durationInFrames, S03_IMPULSE_LOCAL, FPS);
/** Frames GLOBALES de choque contra la pared (alarma ámbar + bonk). */
export const WALL_HITS: number[] = ASTRO_SIM.hits
  .map((h) => h.frame + SCENES.S03.from)
  .sort((x, y) => x - y)
  .filter((f, i, arr) => i === 0 || f - arr[i - 1] > 6); // choques simultáneos = un solo golpe

// ---------------------------------------------------------------- SFX
export type SfxFile = 'buzz.mp3' | 'liquid_pop.mp3' | 'bonk.mp3' | 'geiger.mp3' | 'fanfare.mp3';

export interface SfxMarker {
  id: string;
  file: SfxFile; // en public/sfx/
  from: number; // frame global de entrada
  durationInFrames: number;
  volume: number; // 0..1
}

const sfx = (id: string, file: SfxFile, from: number, durationInFrames: number, volume = 0.8): SfxMarker => ({id, file, from, durationInFrames, volume});

export const sfxMarkers: SfxMarker[] = [
  sfx('s02-buzz', 'buzz.mp3', BEATS.machineOn, 300, 0.55),
  sfx('s02-pop-1', 'liquid_pop.mp3', BEATS.machineOn + 8, 40, 0.7),
  sfx('s02-pop-2', 'liquid_pop.mp3', BEATS.machineOn + 36, 40, 0.6),
  sfx('s02-pop-3', 'liquid_pop.mp3', BEATS.machineOn + 74, 40, 0.6),
  sfx('s02-splat-lens', 'liquid_pop.mp3', BEATS.lensSplat, 50, 0.9),
  sfx('s03-contact', 'bonk.mp3', BEATS.needleContact, 45, 0.9),
  ...WALL_HITS.map((f, i) => sfx(`s03-wall-${i + 1}`, 'bonk.mp3', f, 45, 0.75)),
  sfx('s04-geiger', 'geiger.mp3', BEATS.radiationStart, SCENES.S04.to - BEATS.radiationStart, 0.6),
  sfx('s05-fanfare', 'fanfare.mp3', BEATS.trophyReveal, SCENES.S05.durationInFrames, 0.85),
];

export const VOICE_FILE = 'voz.mp3'; // en public/

// ---------------------------------------------------------------- Paleta (biblia de arte)
export const PALETTE = {
  earth: '#00b4d8',
  cabin: '#edf2f4',
  alarm: '#ffb703',
  radViolet: '#7209b7',
  radGreen: '#38b000',
  neonYellow: '#ffd60a',
  gold: '#d4a017',
  ink: '#050505',
} as const;
