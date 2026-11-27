import { continueRender, delayRender, staticFile } from "remotion";

const FUENTES: [string, string, string, string][] = [
  ["Inter", "inter-latin-400-normal.woff2", "400", "normal"],
  ["Inter", "inter-latin-500-normal.woff2", "500", "normal"],
  ["Inter", "inter-latin-600-normal.woff2", "600", "normal"],
  ["Inter", "inter-latin-700-normal.woff2", "700", "normal"],
  ["Garamond", "eb-garamond-latin-400-normal.woff2", "400", "normal"],
  ["Garamond", "eb-garamond-latin-500-normal.woff2", "500", "normal"],
  ["Garamond", "eb-garamond-latin-400-italic.woff2", "400", "italic"],
  ["Plex", "ibm-plex-mono-latin-400-normal.woff2", "400", "normal"],
  ["Plex", "ibm-plex-mono-latin-500-normal.woff2", "500", "normal"],
];

let cargadas = false;
export const cargarFuentes = () => {
  if (cargadas || typeof document === "undefined") return;
  cargadas = true;
  const h = delayRender("fuentes");
  Promise.all(
    FUENTES.map(([fam, file, weight, style]) => {
      const ff = new FontFace(fam, `url(${staticFile("fonts/" + file)}) format("woff2")`, { weight, style });
      return ff.load().then((l) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(l));
    })
  )
    .then(() => continueRender(h))
    .catch((e) => {
      console.error(e);
      continueRender(h);
    });
};
