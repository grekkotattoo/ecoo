// Narración oficial — texto EXACTO, no modificar.
export const GUION = {
  gancho:
    "¿Qué pasaría si en vez de ir a un estudio de tatuajes, te fueras a una cabaña en los Pirineos a hacerte un blackout con cinco monjes divorciados?",
  maestro:
    "El maestro utiliza una técnica ancestral llamada oscuridad administrativa. Te hace meditar mientras te tatúa con una cuchara caliente.",
  tecnica:
    "Según ellos, el dolor es tu ego abandonando el cuerpo. Aunque sospechas que puede ser la cuchara enchufada a una tostadora.",
  final:
    "Sales con el brazo completamente negro. Pero al llegar a casa descubres que te han tatuado una puerta. Y alguien está llamando desde dentro.",
} as const;

export type EscenaId = keyof typeof GUION;
