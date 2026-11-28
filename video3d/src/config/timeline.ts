// ============================================================================
// MANIFEST DE PRODUCCIÓN — fuente ÚNICA de verdad del corto
// "¿Qué pasaría si te tatuaras en gravedad cero en el espacio?"
// Todas las escenas, subtítulos y audio consumen estas constantes.
//
// Dos bases de tiempo:
//  · REAL  → FPS (30): frames del vídeo final (Sequences, subtítulos, SFX).
//  · DISEÑO → DESIGN_FPS (60): cada escena se anima en su propio reloj de diseño.
//    Cada escena declara qué tramo de diseño se muestra [designStart, designEnd]
//    y se reproduce comprimido en su duración real. Recortar = tocar solo este fichero.
// ============================================================================
import {simulateAstronauts} from './physics';

export const COMPOSITION_ID = 'GravedadCero';
export const FPS = 30;
export const DESIGN_FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_SECONDS = 18;
export const DURATION_IN_FRAMES = FPS * DURATION_SECONDS; // 540

/** Convierte segundos a frames reales. */
export const sec = (s: number) => Math.round(s * FPS);

// ---------------------------------------------------------------- Escenas
export type SceneId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05';

export interface SceneRange {
  id: SceneId;
  title: string;
  from: number; // frame REAL global inclusivo
  to: number; // frame REAL global exclusivo
  durationInFrames: number;
  designStart: number; // frame de diseño (60 fps) mostrado al empezar la escena
  designEnd: number; // frame de diseño mostrado al acabar
  /** Frames de diseño que avanzan por cada frame real. */
  designPerFrame: number;
}

const range = (id: SceneId, title: string, from: number, to: number, designStart: number, designEnd: number): SceneRange => ({
  id,
  title,
  from,
  to,
  durationInFrames: to - from,
  designStart,
  designEnd,
  designPerFrame: (designEnd - designStart) / (to - from),
});

export const SCENES = {
  S01: range('S01', 'El gancho', 0, 90, 0, 300), // 3 s
  S02: range('S02', 'La tinta flotante', 90, 210, 60, 420), // 4 s
  S03: range('S03', 'El pulso sin gravedad', 210, 330, 60, 420), // 4 s
  S04: range('S04', 'La cicatrización cósmica', 330, 450, 40, 520), // 4 s
  S05: range('S05', 'El remate meme', 450, 540, 0, 300), // 3 s
} as const satisfies Record<SceneId, SceneRange>;

export const SCENE_LIST: SceneRange[] = Object.values(SCENES);

// Integridad en carga: escenas contiguas que cubren 0..DURATION_IN_FRAMES.
SCENE_LIST.reduce((cursor, s) => {
  if (s.from !== cursor) throw new Error(`timeline: hueco/solape antes de ${s.id} (${cursor} ≠ ${s.from})`);
  return s.to;
}, 0);
if (SCENE_LIST[SCENE_LIST.length - 1].to !== DURATION_IN_FRAMES) throw new Error('timeline: la última escena no termina en DURATION_IN_FRAMES');

/** Frame real local de escena → frame de diseño (puede ser fraccionario). */
export const toDesign = (scene: SceneRange, localFrame: number) => scene.designStart + localFrame * scene.designPerFrame;
/** Frame de diseño de una escena → frame REAL global (para SFX y subtítulos). */
export const designToGlobal = (scene: SceneRange, designFrame: number) => Math.round(scene.from + (designFrame - scene.designStart) / scene.designPerFrame);

// ---------------------------------------------------------------- Beats clave (frames de DISEÑO, locales a su escena)
export const DESIGN_BEATS = {
  S02: {machineOn: 120, lensSplat: 300},
  S03: {needleContact: 120},
  S04: {radiationStart: 60, mutationStart: 120, mutationPeak: 440},
  S05: {trophyReveal: 0},
} as const;

/** Los mismos beats en frames REALES globales. */
export const BEATS = {
  machineOn: designToGlobal(SCENES.S02, DESIGN_BEATS.S02.machineOn),
  lensSplat: designToGlobal(SCENES.S02, DESIGN_BEATS.S02.lensSplat),
  needleContact: designToGlobal(SCENES.S03, DESIGN_BEATS.S03.needleContact),
  radiationStart: designToGlobal(SCENES.S04, DESIGN_BEATS.S04.radiationStart),
  mutationStart: designToGlobal(SCENES.S04, DESIGN_BEATS.S04.mutationStart),
  mutationPeak: designToGlobal(SCENES.S04, DESIGN_BEATS.S04.mutationPeak),
  trophyReveal: SCENES.S05.from,
} as const;

// ---------------------------------------------------------------- Voz en off (≈2,9 palabras/s, ritmo de short)
export interface VoiceLine {
  scene: SceneId;
  from: number;
  to: number;
  text: string;
}

export const VOICE_OVER: VoiceLine[] = [
  {scene: 'S01', from: 2, to: 88, text: 'Cincuenta millones por subir al espacio... para tatuarte.'},
  {scene: 'S02', from: 92, to: 208, text: 'Sin gravedad, la tinta no baja por la aguja: nube negra asesina.'},
  {scene: 'S03', from: 212, to: 328, text: 'Cada pinchazo, salís los dos volando contra el techo. Gracias, Newton.'},
  {scene: 'S04', from: 332, to: 448, text: 'Y la radiación cósmica convierte tu línea fina en un borrón radiactivo.'},
  {scene: 'S05', from: 452, to: 538, text: "Eso sí: concurso de 'mejor historia de tatuaje'... ganado."},
];

// ---------------------------------------------------------------- Subtítulos (frames REALES)
export interface SubtitleCue {
  id: string;
  scene: SceneId;
  from: number;
  to: number; // exclusivo
  text: string;
  /** Palabras en amarillo neón (#ffd60a). Coincidencia exacta en mayúsculas. */
  highlight: string[];
}

export const SUBTITLES: SubtitleCue[] = [
  {id: 'c01', scene: 'S01', from: 3, to: 42, text: 'VIAJAS AL ESPACIO', highlight: ['ESPACIO']},
  {id: 'c02', scene: 'S01', from: 42, to: 89, text: '¿PARA TATUARTE EN GRAVEDAD CERO?', highlight: ['TATUARTE', 'GRAVEDAD CERO?']},
  {id: 'c03', scene: 'S02', from: 92, to: 138, text: 'SIN GRAVEDAD:', highlight: ['GRAVEDAD:']},
  {id: 'c04', scene: 'S02', from: 138, to: 209, text: 'NUBE DE TINTA ASESINA.', highlight: ['ASESINA.']},
  {id: 'c05', scene: 'S03', from: 212, to: 262, text: 'TERCERA LEY DE NEWTON:', highlight: ['NEWTON:']},
  {id: 'c06', scene: 'S03', from: 262, to: 329, text: 'SALÍS VOLANDO.', highlight: ['VOLANDO.']},
  {id: 'c07', scene: 'S04', from: 332, to: 385, text: 'RADIACIÓN CÓSMICA:', highlight: ['RADIACIÓN']},
  {id: 'c08', scene: 'S04', from: 385, to: 449, text: 'ADIÓS A TU LÍNEA FINA.', highlight: ['LÍNEA', 'FINA.']},
  {id: 'c09', scene: 'S05', from: 452, to: 492, text: 'GANADOR ABSOLUTO:', highlight: ['GANADOR']},
  {id: 'c10', scene: 'S05', from: 492, to: 539, text: "'MEJOR HISTORIA DE TATUAJE'.", highlight: ["'MEJOR", 'HISTORIA']},
];

// ---------------------------------------------------------------- Física de la escena 3 (en frames de diseño)
export const ASTRO_SIM = simulateAstronauts(480, DESIGN_BEATS.S03.needleContact, DESIGN_FPS);
/** Choques contra la pared en frames de DISEÑO (dentro del tramo visible), sin duplicados simultáneos. */
export const WALL_HITS_DESIGN: number[] = ASTRO_SIM.hits
  .map((h) => h.frame)
  .sort((x, y) => x - y)
  .filter((f, i, arr) => i === 0 || f - arr[i - 1] > 6)
  .filter((f) => f >= SCENES.S03.designStart && f < SCENES.S03.designEnd);
/** Los mismos choques en frames REALES globales (alarma ámbar + bonk). */
export const WALL_HITS: number[] = WALL_HITS_DESIGN.map((f) => designToGlobal(SCENES.S03, f));

// ---------------------------------------------------------------- SFX (frames REALES)
export type SfxFile = 'buzz.mp3' | 'liquid_pop.mp3' | 'bonk.mp3' | 'geiger.mp3' | 'fanfare.mp3';

export interface SfxMarker {
  id: string;
  file: SfxFile; // en public/sfx/
  from: number; // frame real global de entrada
  durationInFrames: number;
  volume: number; // 0..1
}

const sfx = (id: string, file: SfxFile, from: number, durationInFrames: number, volume = 0.8): SfxMarker => ({id, file, from, durationInFrames, volume});

export const sfxMarkers: SfxMarker[] = [
  sfx('s02-buzz', 'buzz.mp3', BEATS.machineOn, SCENES.S02.to - BEATS.machineOn, 0.55),
  sfx('s02-pop-1', 'liquid_pop.mp3', BEATS.machineOn + 3, sec(0.7), 0.7),
  sfx('s02-pop-2', 'liquid_pop.mp3', BEATS.machineOn + 12, sec(0.7), 0.6),
  sfx('s02-pop-3', 'liquid_pop.mp3', BEATS.machineOn + 24, sec(0.7), 0.6),
  sfx('s02-splat-lens', 'liquid_pop.mp3', BEATS.lensSplat, sec(0.8), 0.9),
  sfx('s03-contact', 'bonk.mp3', BEATS.needleContact, sec(0.75), 0.9),
  ...WALL_HITS.map((f, i) => sfx(`s03-wall-${i + 1}`, 'bonk.mp3', f, sec(0.75), 0.75)),
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
