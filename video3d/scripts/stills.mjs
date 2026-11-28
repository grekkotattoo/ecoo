// Uso: node scripts/stills.mjs 60 150 420 ...  → out/stills/fXXXX.png (escala 0.4)
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const frames = process.argv.slice(2).map(Number);
const scale = Number(process.env.SCALE ?? 0.4);
const SHELL = '/opt/pw-browsers/chromium_headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), publicDir: path.resolve('public')});
const opts = {serveUrl, chromiumOptions: {gl: 'swangle'}, browserExecutable: fs.existsSync(SHELL) ? SHELL : null};
const composition = await selectComposition({...opts, id: 'GravedadCero'});
fs.mkdirSync('out/stills', {recursive: true});
for (const f of frames) {
  const output = `out/stills/f${String(f).padStart(4, '0')}.png`;
  const t0 = Date.now();
  await renderStill({...opts, composition, frame: f, output, scale});
  console.log(output, `${Date.now() - t0}ms`);
}
