#!/usr/bin/env node
/**
 * Hoja de EFECTOS DE SONIDO para generar en ElevenLabs (Sound Effects) y colocar en tu editor.
 * Los segundos se calculan con el mismo motor de tiempos que el vídeo → si cambian las voces,
 * ejecuta `npm run voces && npm run efectos` y la hoja se recoloca sola.
 *
 * Salida: EFECTOS.md (raíz del proyecto)
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "retiro-"));
execFileSync(
  "npx",
  ["tsc", "--outDir", tmp, "--noEmit", "false", "--module", "commonjs", "--resolveJsonModule", "--esModuleInterop", "--skipLibCheck", "--target", "es2019", "--lib", "es2019,dom", "src/tiempos.ts"],
  { cwd: raiz, stdio: "inherit" }
);
const { escena, palabra, PAUSA_REMATE, LINEA, FPS } = createRequire(import.meta.url)(join(tmp, "tiempos.js"));

/** segundos absolutos: frame relativo a la escena → s */
const S = (id, fr) => (escena(id).desde + fr) / FPS;
const W = (id, w, off = 0) => S(id, palabra(id, w) + off);

// Cortes internos (idénticos a los de las escenas)
const g = escena("gancho"), m = escena("maestro"), t = escena("tecnica"), f = escena("final");
const g1 = palabra("gancho", "fueras") - 6, g2 = palabra("gancho", "con") - 2;
const m1 = palabra("maestro", "te") - 3, m2 = palabra("maestro", "con") - 2;
const t1 = palabra("tecnica", "ego") - 4, t2 = palabra("tecnica", "aunque") - 3;
const f1 = palabra("final", "pero") - 3, f2 = palabra("final", "descubres") - 3, f3 = palabra("final", "y") - 3;
const remate3 = t.finVoz + PAUSA_REMATE;
const golpe0 = f.finVoz + PAUSA_REMATE;
const fin = (LINEA.escenas.at(-1).desde + LINEA.escenas.at(-1).duracion) / FPS;

// [segundo, escena, qué se ve, nombre, duración s, nivel respecto a la voz, prompt ElevenLabs]
const E = [
  [0, "1 · Viaje", "Pirineos de noche (todo el vídeo)", "Ambiente de montaña", 22, "−24 dB · loop 0→38,6 s", "Cold wind over a high mountain pass at night, distant pine trees creaking, very subtle low rumble, no music, seamless loop"],
  [0.3, "1A", "Faros subiendo por la pista", "Coche subiendo", 5.3, "−14 dB · entra con fade", "Old diesel car engine driving slowly uphill on a gravel mountain road at night, tires crunching on gravel, approaching from distance"],
  [S("gancho", g1 + Math.round((g2 - g1) * 0.62)), "1B", "El coche frena ante los monjes", "Frenazo + motor se apaga", 2.5, "−10 dB", "Car braking to a stop on gravel, handbrake pulled, engine idling then switching off, a few stones settling"],
  [S("gancho", g2 + 2), "1C", "Limpiaparabrisas (una pasada)", "Limpiaparabrisas", 1, "−12 dB", "Single windshield wiper sweep, rubber squeaking on wet glass, one pass"],
  [W("gancho", "monjes"), "1C", "El monje alza la cuchara", "Cuchara alzada", 1.5, "−18 dB", "Heavy metal ladle lifted slowly, faint metallic ring and robe rustle"],
  [W("gancho", "divorciados"), "1C", "Brillan los ojos en las capuchas", "Golpe grave de tensión", 2.5, "−16 dB", "Deep low sub-bass drone swell, ominous, short, no melody"],

  [S("maestro", 0), "2A", "Primer plano del maestro, mirada fija", "Vela + silencio de cabaña", 6, "−26 dB · loop hasta 17,3 s", "Single candle flame flickering softly, very quiet wooden cabin room tone, occasional wood creak"],
  [S("maestro", m1), "2B", "Camilla improvisada, el maestro se inclina", "Rozar de hábito + madera", 2.5, "−18 dB", "Wool robe rustling and old wooden table creaking, slow movement, quiet"],
  [S("maestro", m2), "2C", "Cuchara sobre la vela", "Metal calentándose", 3, "−16 dB", "Metal spoon heating over a candle flame, faint ticking of expanding metal and soft flame hiss"],
  [W("maestro", "caliente"), "2C", "La cuchara se pone al rojo", "Siseo corto", 1, "−12 dB", "Short sharp sizzle of red hot metal, single hiss burst"],

  [W("tecnica", "dolor"), "3A", "Contracción en la ceja y gota de sudor", "Respiración contenida", 1, "−20 dB", "Man exhaling sharply through clenched teeth, suppressed pain, very quiet, close microphone"],
  [W("tecnica", "abandonando"), "3B", "Los monjes asienten (1.º)", "“Mmm” solemne", 1.5, "−20 dB", "Low male voices murmuring a solemn mmm in agreement, several men, monastery"],
  [W("tecnica", "cuerpo"), "3B", "Los monjes asienten (2.º)", "“Mmm” solemne", 1.5, "−20 dB", "Low male voices murmuring a solemn mmm in agreement, several men, monastery"],
  [S("tecnica", t2), "3C", "Paneo por el cable (empieza)", "Zumbido eléctrico creciente", Math.min(5, W("tecnica", "tostadora") - S("tecnica", t2) + 0.5), "−18 dB · sube de volumen", "Low electrical mains hum slowly rising in pitch, buzzing power cable, tension building"],
  [W("tecnica", "tostadora"), "3C", "La cámara llega a la tostadora", "Resistencias de tostadora", 1.3, "−14 dB", "Toaster heating elements crackling and humming, glowing wires ticking"],
  [t.desde / FPS + t.finVoz / FPS, "3C", "★ SILENCIO breve antes del remate (corta el zumbido)", "— (silencio) —", PAUSA_REMATE / FPS, "corte brusco del zumbido", "(sin efecto)"],
  [S("tecnica", remate3), "3C", "REMATE: saltan las tostadas + chispa", "Tostadas + chispazo", 1.6, "−6 dB · el más fuerte hasta ahora", "Toaster pop-up spring clunk with two slices of toast ejecting, followed by a single electric spark zap"],

  [S("final", 0), "4A", "Amanecer gris, brazo negro con film", "Pasos + film plástico", 2.7, "−18 dB", "Footsteps on cold gravel walking briskly in morning fog, cling film plastic crinkling, distant birds"],
  [S("final", f1), "4B", "Cocina; el fluorescente arranca", "Fluorescente parpadeando", 3, "−14 dB, luego zumbido −26 dB hasta 35,0", "Fluorescent tube flickering on with buzzing and ticking then settling to a steady low hum"],
  [W("final", "tatuado"), "4C", "Aparece la puerta en relieve", "Tinta que se mueve", 2, "−20 dB", "Slow wet ink shimmer, skin stretching softly, subtle low rising tone, uncanny"],
  [W("final", "alguien"), "4D", "Luz por la rendija de la puerta", "Latido grave", 2.5, "−24 dB · sube", "Faint slow low pulsing rumble like a distant heartbeat, tension, no music"],
  [W("final", "llamando"), "4D", "El pomo gira y no abre", "Pomo de latón", 1.4, "−10 dB", "Brass doorknob turning and rattling, locked, latch clicking and stopping"],
  [f.desde / FPS + f.finVoz / FPS, "4D", "★ SILENCIO TOTAL durante la pausa (corta zumbido, latido y ambiente)", "— (silencio) —", PAUSA_REMATE / FPS, "corte brusco de todo", "(sin efecto: es el silencio que hace reír)"],
  [S("final", golpe0), "4D", "REMATE: golpe 1 desde dentro", "Golpe 1", 0.8, "−3 dB · el más fuerte", "One heavy muffled knock on a wooden door from the other side, close, dry, no echo"],
  [S("final", golpe0 + 10), "4D", "Golpe 2", "Golpe 2", 0.8, "−3 dB", "One heavy muffled knock on a wooden door from the other side, close, dry, no echo"],
  [S("final", golpe0 + 20), "4D", "Golpe 3", "Golpe 3", 1, "−3 dB", "One heavy muffled knock on a wooden door from the other side, close, dry, no echo"],
  [fin, "—", "CORTE A NEGRO", "— (silencio absoluto) —", 0.8, "0 dB", "(nada; opcional: un 4.º golpe lejano en el segundo " + (fin + 0.3).toFixed(1) + ")"],
].sort((a, b) => a[0] - b[0]);

const f2s = (x) => x.toFixed(2).replace(".", ",") + " s";
const filas = E.map((e, i) => `| ${i + 1} | **${f2s(e[0])}** | ${e[1]} | ${e[2]} | ${e[3]} | ${e[4].toFixed(1).replace(".", ",")} s | ${e[5]} | \`${e[6]}\` |`).join("\n");
const prov = LINEA.escenas.some((e) => e.provisional);

const md = `# Efectos de sonido — El retiro espiritual de tatuadores

${prov ? "> ⚠️ **Tiempos PROVISIONALES** (aún no hay MP3 reales). Cuando cargues las voces: `npm run voces && npm run efectos` y esta tabla se recalcula.\n" : "> Tiempos calculados con las voces reales.\n"}
**Cómo usarlo**
1. En ElevenLabs → *Sound Effects*: pega cada \`prompt\` (en inglés rinde mejor), pon la duración indicada y genera 2–3 variantes; elige la mejor.
2. En tu editor (CapCut / Premiere / DaVinci) coloca cada efecto en el **segundo** indicado, que es el **inicio del clip**. Los segundos son del vídeo completo (0 → ${fin.toFixed(1).replace(".", ",")} s + 0,8 s de negro).
3. Niveles relativos a la voz del narrador (−0 dB). Baja el ambiente cuando hable la voz (ducking).

| # | Segundo | Plano | Qué se ve | Efecto | Dur. | Nivel | Prompt ElevenLabs |
|---|---|---|---|---|---|---|---|
${filas}

## Reglas de oro
- **Remates = silencio antes + sonido seco después.** Corta todo el ambiente en la pausa (4D) y en la de la tostadora (3C): el chiste pega más.
- **Los golpes** son 3 con 0,33 s entre ellos. Genera un golpe y repítelo con ligera variación de tono; no uses un clip largo con tres.
- **Sin música.** Una música "de terror" estropea el tono de documental serio; deja solo ambiente y efectos.
- El vídeo entregado sigue siendo **mudo**: estos efectos los añades tú en el editor.
`;
writeFileSync(join(raiz, "EFECTOS.md"), md);
console.log(md);
