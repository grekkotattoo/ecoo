import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setConcurrency(4);

// Opcional: usar un Chrome/Chromium ya instalado en lugar del que descarga Remotion.
// REMOTION_BROWSER=/ruta/a/chrome-headless-shell npm run render
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
