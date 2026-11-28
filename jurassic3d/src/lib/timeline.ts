// Fuente única de verdad de tiempos. Si cambia la locución, ajusta SOLO aquí.
// Todo el código anima en UNIDADES DE TIMELINE (TL = 60 por segundo), independientes del fps de salida.
// Para exportar a 60 fps basta con cambiar FPS = 60.
export const FPS = 30;
export const TL = 60;
export const toFrames = (units: number) => Math.round((units * FPS) / TL);
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TOTAL_UNITS = 2160; // 36 s exactos

// Duraciones cuadradas con la locución real (ElevenLabs, 31 s): cada bloque de VO cae en su escena.
export const SCENES = [
  {id: 'S01-Gancho', from: 0, duration: 390}, // 6,5 s
  {id: 'S02-Tatuador', from: 390, duration: 420}, // 7 s
  {id: 'S03-Tinta', from: 810, duration: 420}, // 7 s (animación comprimida x480/420)
  {id: 'S04-Infeccion', from: 1230, duration: 480}, // 8 s (animación comprimida x540/480)
  {id: 'S05-Remate', from: 1710, duration: 450}, // 7,5 s (remate + 2 s de respiro)
] as const;

export type Cue = {
  from: number; // unidad global (inclusive)
  to: number; // unidad global (exclusive)
  text: string;
  keywords: string[]; // palabras resaltadas en amarillo neón
};

// Subtítulos sincronizados con las palabras de la VO (medido sobre el audio).
export const CUES: Cue[] = [
  {from: 3, to: 225, text: 'VIAJAS AL JURÁSICO', keywords: ['JURÁSICO']}, // "Imagina viajar… atrás"
  {from: 225, to: 390, text: '¿PARA HACERTE UN TRIBAL?', keywords: ['TRIBAL?']}, // "solo para hacerte un tribal…"
  {from: 396, to: 705, text: 'TU TATUADOR: UN ALLOSAURUS', keywords: ['ALLOSAURUS']}, // "Primer problema… centímetros"
  {from: 705, to: 810, text: 'CERO PULSO.', keywords: ['CERO', 'PULSO.']}, // "…y cero pulso"
  {from: 816, to: 1074, text: 'TINTA: HOLLÍN DE VOLCÁN', keywords: ['HOLLÍN', 'VOLCÁN']}, // "Segundo… hollín de volcán"
  {from: 1074, to: 1230, text: '+ CACA DE DIPLODOCUS.', keywords: ['CACA']}, // "mezclado con caca de Diplodocus"
  {from: 1378, to: 1503, text: 'BACTERIA PREHISTÓRICA', keywords: ['BACTERIA']}, // "tienes una bacteria prehistórica"
  {from: 1503, to: 1710, text: 'TU BRAZO ES UN FÓSIL.', keywords: ['FÓSIL.']}, // "que convierte tu brazo en un fósil"
  {from: 1716, to: 1966, text: 'AL MENOS ESTÁS EN UN MUSEO:', keywords: ['MUSEO:']}, // "Pero tranquilo… sección de…"
  {from: 1966, to: 2160, text: "'ARTE RUPESTRE'.", keywords: ["'ARTE", "RUPESTRE'."]}, // "Arte Rupestre"
];

// Locución: un único MP3 (public/audio). Cada bloque [srcFrom, srcTo] (segundos del MP3,
// cortado en mitad de las pausas) se coloca al inicio de su escena.
export const VO_FILE = 'audio/vo_jurasico.mp3';
export const VO_BLOCKS = [
  {scene: 0, srcFrom: 0, srcTo: 6.35, text: 'Imagina viajar 150 millones de años atrás... solo para hacerte un tribal en el Jurásico.'},
  {scene: 1, srcFrom: 6.35, srcTo: 12.94, text: 'Primer problema: tu tatuador es un Allosaurus con brazos de veinte centímetros y cero pulso.'},
  {scene: 2, srcFrom: 12.94, srcTo: 19.28, text: 'Segundo: no hay tinta homologada. Te van a inyectar hollín de volcán mezclado con caca de Diplodocus.'},
  {scene: 3, srcFrom: 19.28, srcTo: 25.51, text: 'Al día siguiente no tienes un tatuaje guapo: tienes una bacteria prehistórica que convierte tu brazo en un fósil.'},
  {scene: 4, srcFrom: 25.51, srcTo: 31.03, text: "Pero tranquilo, por lo menos en el museo te van a poner en la sección de 'Arte Rupestre'."},
];
