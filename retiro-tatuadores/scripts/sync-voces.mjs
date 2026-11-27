#!/usr/bin/env node
/**
 * Sincroniza el montaje con las voces REALES de ElevenLabs.
 *
 *  1. Copia los MP3 a public/voz/  (01_gancho.mp3, 02_maestro.mp3, 03_tecnica.mp3, 04_final.mp3)
 *  2. (Opcional) Si guardaste la respuesta JSON del endpoint "with-timestamps" de ElevenLabs
 *     como public/voz/01_gancho.json, etc., se usan los tiempos EXACTOS de cada palabra.
 *  3. npm run voces   → actualiza src/voz-tiempos.json y escribe out/CUES.txt
 *  4. npm run render  → vuelve a renderizar (vídeo silencioso)
 *
 * No acelera ni recorta las voces: es el vídeo el que se adapta a ellas.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const rutaCfg = join(raiz, "src", "voz-tiempos.json");
const cfg = JSON.parse(readFileSync(rutaCfg, "utf8"));
const guionTs = readFileSync(join(raiz, "src", "guion.ts"), "utf8");

const duracion = (archivo) => {
  const args = ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", archivo];
  for (const [cmd, pre] of [["ffprobe", []], ["npx", ["remotion", "ffprobe"]]]) {
    try {
      const out = execFileSync(cmd, [...pre, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      const d = parseFloat(out.trim().split("\n").pop());
      if (!isNaN(d)) return d;
    } catch {}
  }
  throw new Error("No se pudo medir " + archivo + " (instala ffmpeg/ffprobe)");
};

const textoDe = (id) => {
  const m = guionTs.match(new RegExp(id + ':\\s*\\n?\\s*"([^"]+)"'));
  return m ? m[1] : null;
};

/** Convierte la alineación por caracteres de ElevenLabs en inicio de cada palabra (s). */
const palabrasDesdeAlineacion = (json, texto) => {
  const al = json.alignment || json.normalized_alignment || json;
  const chars = al.characters, ini = al.character_start_times_seconds;
  if (!chars || !ini) return null;
  const inicios = [];
  let enPalabra = false;
  chars.forEach((c, i) => {
    const esp = /\s/.test(c);
    if (!esp && !enPalabra) inicios.push(ini[i]);
    enPalabra = !esp;
  });
  const n = texto.split(/\s+/).length;
  return inicios.length === n ? inicios.map((x) => Math.round(x * 1000) / 1000) : null;
};

let cambios = 0;
for (const e of cfg.escenas) {
  const mp3 = join(raiz, "public", e.archivo);
  if (!existsSync(mp3)) {
    console.log(`·  ${e.archivo}: no existe → se mantiene la duración provisional (${e.duracionVoz}s)`);
    continue;
  }
  const d = Math.round(duracion(mp3) * 1000) / 1000;
  e.duracionVoz = d;
  e.provisional = false;
  e.palabras = null;
  const jsonPath = mp3.replace(/\.mp3$/, ".json");
  if (existsSync(jsonPath)) {
    const p = palabrasDesdeAlineacion(JSON.parse(readFileSync(jsonPath, "utf8")), textoDe(e.id) || "");
    if (p) {
      e.palabras = p;
      console.log(`✓  ${e.archivo}: ${d}s  + tiempos exactos por palabra`);
    } else console.log(`!  ${e.archivo}: ${d}s  (JSON ignorado: no cuadra con el guion)`);
  } else console.log(`✓  ${e.archivo}: ${d}s`);
  cambios++;
}
writeFileSync(rutaCfg, JSON.stringify(cfg, null, 2) + "\n");

// Hoja de cues: dónde colocar cada MP3 si montas la voz en CapCut/Premiere/DaVinci.
const fps = cfg.fps;
const f = (s) => Math.round(s * fps);
const tc = (fr) => {
  const s = fr / fps;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;
};
let cursor = 0;
const lineas = ["HOJA DE CUES — EL RETIRO ESPIRITUAL DE TATUADORES", `fps ${fps}`, ""];
const delays = [];
cfg.escenas.forEach((e, i) => {
  const ent = f(e.entrada), voz = f(e.duracionVoz), dur = ent + voz + f(e.cola);
  lineas.push(`${e.archivo.padEnd(20)} empieza en ${tc(cursor + ent)} (frame ${cursor + ent})  · escena ${tc(cursor)}–${tc(cursor + dur)}${e.provisional ? "  [PROVISIONAL]" : ""}`);
  delays.push({ archivo: e.archivo, ms: Math.round(((cursor + ent) / fps) * 1000) });
  cursor += dur;
});
const total = cursor + f(cfg.negroFinal);
lineas.push("", `Duración total: ${tc(total)} (${total} frames)`, "");
lineas.push("Mezcla opcional de la voz sobre el vídeo silencioso (ffmpeg):");
const inputs = delays.map((d) => `-i public/${d.archivo}`).join(" ");
const filtros = delays.map((d, i) => `[${i + 1}:a]adelay=${d.ms}|${d.ms}[a${i}]`).join(";");
lineas.push(
  `ffmpeg -i out/retiro_tatuadores_silencioso.mp4 ${inputs} -filter_complex "${filtros};${delays.map((_, i) => `[a${i}]`).join("")}amix=inputs=${delays.length}:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k out/retiro_con_voz.mp4`
);
mkdirSync(join(raiz, "out"), { recursive: true });
writeFileSync(join(raiz, "out", "CUES.txt"), lineas.join("\n") + "\n");
console.log("\n" + lineas.join("\n"));
console.log(`\n${cambios}/4 voces medidas. Ahora: npm run render`);
