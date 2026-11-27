/**
 * Motor de tiempos. TODO el montaje se deriva de src/voz-tiempos.json:
 *   duración de escena = entrada + duracionVoz + cola
 * Los acontecimientos visuales se anclan a PALABRAS de la narración (no a segundos fijos),
 * así que si cambia la voz, cortes, gestos y remates se desplazan solos.
 */
import datos from "./voz-tiempos.json";
import { GUION, EscenaId } from "./guion";

export const FPS = datos.fps;

export type Palabra = { texto: string; inicio: number; fin: number }; // frames relativos a la escena

export type EscenaTiempo = {
  id: EscenaId;
  archivo: string;
  provisional: boolean;
  desde: number; // frame global de inicio
  duracion: number; // frames
  inicioVoz: number; // frame (relativo a la escena) donde empieza el MP3
  finVoz: number; // frame (relativo) donde acaba el MP3
  palabras: Palabra[];
};

const f = (s: number) => Math.round(s * FPS);

/** Peso aproximado de cada palabra (≈ sílabas) + pausas por puntuación. */
const peso = (w: string) => {
  const limpio = w.replace(/[¿?¡!,.«»]/g, "");
  const vocales = (limpio.match(/[aeiouáéíóúü]+/gi) || []).length;
  return Math.max(1, vocales) + 0.35;
};
const pausaTras = (w: string) => (/[.?!]$/.test(w) ? 1.6 : /,$/.test(w) ? 0.8 : 0);

function repartirPalabras(texto: string, durVoz: number, marcas: number[] | null): Palabra[] {
  const ws = texto.split(/\s+/);
  // Marcas reales (de ElevenLabs con timestamps) → precisión exacta.
  if (marcas && marcas.length === ws.length) {
    return ws.map((t, i) => ({
      texto: t,
      inicio: f(marcas[i]),
      fin: i + 1 < ws.length ? f(marcas[i + 1]) : f(durVoz),
    }));
  }
  // Estimación proporcional (silencio inicial/final típico de TTS ≈ 0,12 s / 0,2 s).
  const ini = 0.12;
  const util = Math.max(0.5, durVoz - ini - 0.2);
  const pesos = ws.map((w, i) => peso(w) + (i < ws.length - 1 ? pausaTras(w) : 0));
  const total = pesos.reduce((a, b) => a + b, 0);
  let t = ini;
  return ws.map((w, i) => {
    const habla = (peso(w) / total) * util;
    const p: Palabra = { texto: w, inicio: f(t), fin: f(t + habla) };
    t += (pesos[i] / total) * util;
    return p;
  });
}

export function construirLinea(): { escenas: EscenaTiempo[]; total: number; negro: number } {
  let cursor = 0;
  const escenas = datos.escenas.map((e) => {
    const id = e.id as EscenaId;
    const entrada = f(e.entrada);
    const voz = f(e.duracionVoz);
    const dur = entrada + voz + f(e.cola);
    const palabras = repartirPalabras(GUION[id], e.duracionVoz, e.palabras as number[] | null).map((p) => ({
      ...p,
      inicio: p.inicio + entrada,
      fin: p.fin + entrada,
    }));
    const r: EscenaTiempo = {
      id,
      archivo: e.archivo,
      provisional: e.provisional,
      desde: cursor,
      duracion: dur,
      inicioVoz: entrada,
      finVoz: entrada + voz,
      palabras,
    };
    cursor += dur;
    return r;
  });
  const negro = f(datos.negroFinal);
  return { escenas, total: cursor + negro, negro };
}

export const LINEA = construirLinea();
export const PAUSA_REMATE = f(datos.pausaRemate);

export const escena = (id: EscenaId) => LINEA.escenas.find((e) => e.id === id)!;

const normal = (w: string) => w.toLowerCase().replace(/[¿?¡!,.«»]/g, "");

/**
 * Frame (relativo a la escena) en que empieza una palabra de la narración.
 * Se busca por TEXTO (p. ej. palabra("tecnica", "tostadora")); `n` = n-ésima aparición.
 */
export const palabra = (id: EscenaId, w: string, n = 0) => {
  const ps = escena(id).palabras;
  const idx = ps.map((p, i) => (normal(p.texto) === normal(w) ? i : -1)).filter((i) => i >= 0)[n];
  if (idx === undefined) throw new Error(`La palabra "${w}" no está en la escena ${id}`);
  return ps[idx].inicio;
};
