import fs from 'node:fs';
import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
// WebGL por software (funciona en servidores sin GPU). En una máquina con GPU: 'angle'.
Config.setChromiumOpenGlRenderer(process.env.REMOTION_GL === 'angle' ? 'angle' : 'swangle');
// Chromium preinstalado (entorno cloud). Si no existe, Remotion descarga el suyo.
const SHELL = '/opt/pw-browsers/chromium_headless_shell';
if (fs.existsSync(SHELL)) Config.setBrowserExecutable(SHELL);
