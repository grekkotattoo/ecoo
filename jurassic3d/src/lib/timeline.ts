// Fuente única de verdad de tiempos (60 fps). Si cambia la locución, ajusta SOLO aquí.
export const FPS = 60;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TOTAL_FRAMES = 2160; // 36 s exactos

export const SCENES = [
  {id: 'S01-Gancho', from: 0, duration: 300},
  {id: 'S02-Tatuador', from: 300, duration: 420},
  {id: 'S03-Tinta', from: 720, duration: 480},
  {id: 'S04-Infeccion', from: 1200, duration: 540},
  {id: 'S05-Remate', from: 1740, duration: 420},
] as const;

export type Cue = {
  from: number; // frame global (inclusive)
  to: number; // frame global (exclusive)
  text: string;
  keywords: string[]; // palabras resaltadas en amarillo neón
};

// Golpes cortos de subtítulo, en frames globales.
export const CUES: Cue[] = [
  {from: 6, to: 148, text: 'VIAJAS AL JURÁSICO', keywords: ['JURÁSICO']},
  {from: 150, to: 296, text: '¿PARA HACERTE UN TRIBAL?', keywords: ['TRIBAL?']},
  {from: 306, to: 560, text: 'TU TATUADOR: UN ALLOSAURUS', keywords: ['ALLOSAURUS']},
  {from: 560, to: 716, text: 'CERO PULSO.', keywords: ['CERO', 'PULSO.']},
  {from: 726, to: 960, text: 'TINTA: HOLLÍN DE VOLCÁN', keywords: ['HOLLÍN', 'VOLCÁN']},
  {from: 960, to: 1196, text: '+ CACA DE DIPLODOCUS.', keywords: ['CACA']},
  {from: 1206, to: 1470, text: 'BACTERIA PREHISTÓRICA', keywords: ['BACTERIA']},
  {from: 1470, to: 1736, text: 'TU BRAZO ES UN FÓSIL.', keywords: ['FÓSIL.']},
  {from: 1746, to: 1950, text: 'AL MENOS ESTÁS EN UN MUSEO:', keywords: ['MUSEO:']},
  {from: 1950, to: 2160, text: "'ARTE RUPESTRE'.", keywords: ["'ARTE", "RUPESTRE'."]},
];

// Locución (referencia para el montaje de audio).
export const VO = [
  {scene: 1, from: 0, text: 'Imagina viajar 150 millones de años atrás... solo para hacerte un tribal en el Jurásico.'},
  {scene: 2, from: 300, text: 'Primer problema: tu tatuador es un Allosaurus con brazos de veinte centímetros y cero pulso.'},
  {scene: 3, from: 720, text: 'Segundo: no hay tinta homologada. Te van a inyectar hollín de volcán mezclado con caca de Diplodocus.'},
  {scene: 4, from: 1200, text: 'Al día siguiente no tienes un tatuaje guapo: tienes una bacteria prehistórica que convierte tu brazo en un fósil.'},
  {scene: 5, from: 1740, text: "Pero tranquilo, por lo menos en el museo te van a poner en la sección de 'Arte Rupestre'."},
];
