import React from "react";
import { Composition } from "remotion";
import { Retiro } from "./Retiro";
import { FPS, LINEA } from "./tiempos";

export const RemotionRoot: React.FC = () => (
  <>
    {/* Versión de entrega: SIN audio */}
    <Composition id="Retiro" component={Retiro} durationInFrames={LINEA.total} fps={FPS} width={1080} height={1920} defaultProps={{ conVoz: false }} />
    {/* Solo para comprobar la sincronía con los MP3 reales (no es la entrega) */}
    <Composition id="RetiroConVoz" component={Retiro} durationInFrames={LINEA.total} fps={FPS} width={1080} height={1920} defaultProps={{ conVoz: true }} />
  </>
);
