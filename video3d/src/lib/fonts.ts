// Fuentes locales (sin CDN en tiempo de render): Montserrat variable (800–900) + Anton de reserva.
import {continueRender, delayRender, staticFile} from 'remotion';

export const FONT_FAMILY = "'Montserrat', 'Anton', 'Arial Black', Impact, sans-serif";

let loaded = false;
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Cargando fuentes locales');
  const faces = [
    new FontFace('Montserrat', `url(${staticFile('fonts/Montserrat-Variable-latin.woff2')}) format('woff2')`, {weight: '100 900'}),
    new FontFace('Anton', `url(${staticFile('fonts/Anton.woff')}) format('woff')`),
  ];
  Promise.all(
    faces.map((f) =>
      f.load().then(
        (ff) => (document.fonts as unknown as {add: (f: FontFace) => void}).add(ff),
        () => undefined,
      ),
    ),
  ).finally(() => continueRender(handle));
};
