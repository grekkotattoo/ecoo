// Contrato de datos entre el orquestador (Python) y el motor 2D.
// Toda escena es DATOS: el motor no contiene contenido creativo.

export type EaseName = 'linear' | 'in' | 'out' | 'inOut' | 'back' | 'elastic' | 'bounce' | 'step';
export type Key = {f: number; v: number; e?: EaseName};
export type Track = Key[];

export type RigPart = {
  id: string;
  parent?: string | null;
  pivot: [number, number]; // en coordenadas del rig
  z: number;
  svg?: string; // markup SVG en coordenadas absolutas del rig
  variants?: Record<string, string>; // p.ej. bocas (visemas), ojos, cejas
  defaultVariant?: string;
};

export type Rig = {
  id: string;
  version: number;
  name: string;
  width: number;
  height: number;
  anchor: [number, number]; // punto de apoyo (pies) en coordenadas del rig
  parts: RigPart[];
  meta?: Record<string, unknown>;
};

export type Action = {
  type: string; // ver rig/actions.ts
  start: number; // frame relativo al plano
  dur: number;
  params?: Record<string, number | string | boolean>;
};

export type ExpressionKey = {f: number; set: Record<string, string>}; // partId -> variante
export type VisemeKey = {f: number; v: string};

export type Actor = {
  id: string;
  rig: string;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  z?: number;
  tracks?: Record<string, Track>; // "root.x", "root.y", "root.scale", "<part>.rot", "<part>.tx", "<part>.ty", "<part>.sx", "<part>.sy"
  actions?: Action[];
  expressions?: ExpressionKey[];
  visemes?: VisemeKey[];
  blink?: boolean;
  idle?: boolean;
  look?: 'normal' | 'charred'; // charred = silueta carbonizada con halo radiactivo
};

export type BgLayer = {
  id: string;
  svg?: string;
  image?: string; // URL (servida por el orquestador durante el render)
  depth: number; // 0 = infinito (no se mueve con cámara), 1 = plano de actores
  anim?: {type: 'sway' | 'drift' | 'flicker' | 'bob' | 'spin'; amount?: number; speed?: number; cx?: number; cy?: number};
};

export type Background = {id: string; width: number; height: number; layers: BgLayer[]};

export type PropItem = {id: string; svg: string; x: number; y: number; z?: number; tracks?: Record<string, Track>; anim?: BgLayer['anim']};

export type Effect = {
  type: 'flash' | 'speedlines' | 'impact' | 'smoke' | 'sparks' | 'shake' | 'rain' | 'confetti' | 'vignettePulse' | 'textPop';
  start: number;
  dur: number;
  x?: number;
  y?: number;
  color?: string;
  intensity?: number;
  text?: string;
  seed?: number;
};

export type Transition = {type: 'cut' | 'fade' | 'wipe' | 'iris' | 'whip' | 'smash'; dur: number};

export type Shot = {
  id: string;
  start: number;
  dur: number;
  kind?: 'scene' | 'title' | 'end';
  background?: string;
  bgColor?: string;
  camera?: {x?: Track; y?: Track; zoom?: Track; rot?: Track; yaw?: Track; pitch?: Track; persp?: Track; focus?: Track; dof?: Track};
  actors?: Actor[];
  props?: PropItem[];
  effects?: Effect[];
  transitionIn?: Transition;
  title?: {kicker?: string; text: string; sub?: string};
  lighting?: boolean; // luces de neón reales (three.js) en este plano
};

export type Subtitle = {start: number; end: number; text: string; speaker?: string};

export type Style = {
  palette: Record<string, string>;
  outline: {color: string; width: number};
  fonts: {title: string; subtitle: string; kicker?: string; urls?: Record<string, string>};
  grain: number; // 0..1
  boil: number; // 0..1 temblor de línea dibujada a mano
  boilFps: number;
  vignette: number;
  engine?: 'css' | 'r3f' | 'auto'; // motor de escena: CSS 2.5D o @react-three/fiber (híbrido)
  three?: {lights?: boolean; ambient?: number; key?: number; neon?: string[]; neonIntensity?: number; actorScale?: number; bgScale?: number};
  dof?: number; // desenfoque por profundidad (px por cada 1000 de distancia al foco)
  grade?: {top: string; topOpacity: number; bottom: string; bottomOpacity: number};
  subtitle: {size: number; y: number; color: string; stroke: string; maxChars: number};
};

export type EpisodeSpec = {
  meta: {id: string; fps: number; width: number; height: number; durationInFrames: number; test?: boolean};
  style: Style;
  rigs: Record<string, Rig>;
  backgrounds: Record<string, Background>;
  shots: Shot[];
  subtitles: Subtitle[];
};

export type SheetSpec = {
  style: Style;
  rig: Rig;
  width: number;
  height: number;
  expressions: {label: string; set: Record<string, string>}[];
  poses: {label: string; tracks: Record<string, number>}[];
  title: string;
};
