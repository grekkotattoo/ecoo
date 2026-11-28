// Fuente única de verdad de tiempos. Si cambia la locución, ajusta SOLO aquí.
// Todo el código anima en UNIDADES DE TIMELINE (TL = 60 por segundo), independientes del fps de salida.
// Para exportar a 60 fps basta con cambiar FPS = 60.
export const FPS = 30;
export const TL = 60;
export const toFrames = (units: number) => Math.round((units * FPS) / TL);
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TOTAL_UNITS = 2160; // 36 s exactos

export const SCENES = [
  {id: 'S01-Gancho', from: 0, duration: 360}, // 6 s: la VO de apertura no cabe en 5 s
  {id: 'S02-Tatuador', from: 360, duration: 420},
  {id: 'S03-Tinta', from: 780, duration: 420}, // 7 s (su animación se comprime x480/420)
  {id: 'S04-Infeccion', from: 1200, duration: 540},
  {id: 'S05-Remate', from: 1740, duration: 420},
] as const;

export type Cue = {
  from: number; // unidad global (inclusive)
  to: number; // unidad global (exclusive)
  text: string;
  keywords: string[]; // palabras resaltadas en amarillo neón
};

// Golpes cortos de subtítulo, en frames globales.
export const CUES: Cue[] = [
  {from: 6, to: 178, text: 'VIAJAS AL JURÁSICO', keywords: ['JURÁSICO']},
  {from: 180, to: 356, text: '¿PARA HACERTE UN TRIBAL?', keywords: ['TRIBAL?']},
  {from: 366, to: 620, text: 'TU TATUADOR: UN ALLOSAURUS', keywords: ['ALLOSAURUS']},
  {from: 620, to: 776, text: 'CERO PULSO.', keywords: ['CERO', 'PULSO.']},
  {from: 786, to: 990, text: 'TINTA: HOLLÍN DE VOLCÁN', keywords: ['HOLLÍN', 'VOLCÁN']},
  {from: 990, to: 1196, text: '+ CACA DE DIPLODOCUS.', keywords: ['CACA']},
  {from: 1206, to: 1470, text: 'BACTERIA PREHISTÓRICA', keywords: ['BACTERIA']},
  {from: 1470, to: 1736, text: 'TU BRAZO ES UN FÓSIL.', keywords: ['FÓSIL.']},
  {from: 1746, to: 1950, text: 'AL MENOS ESTÁS EN UN MUSEO:', keywords: ['MUSEO:']},
  {from: 1950, to: 2160, text: "'ARTE RUPESTRE'.", keywords: ["'ARTE", "RUPESTRE'."]},
];

// Locución (referencia para el montaje de audio).
export const VO = [
  {scene: 1, from: 0, text: 'Imagina viajar 150 millones de años atrás... solo para hacerte un tribal en el Jurásico.'},
  {scene: 2, from: 360, text: 'Primer problema: tu tatuador es un Allosaurus con brazos de veinte centímetros y cero pulso.'},
  {scene: 3, from: 780, text: 'Segundo: no hay tinta homologada. Te van a inyectar hollín de volcán mezclado con caca de Diplodocus.'},
  {scene: 4, from: 1200, text: 'Al día siguiente no tienes un tatuaje guapo: tienes una bacteria prehistórica que convierte tu brazo en un fósil.'},
  {scene: 5, from: 1740, text: "Pero tranquilo, por lo menos en el museo te van a poner en la sección de 'Arte Rupestre'."},
];
