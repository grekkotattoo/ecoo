import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Etalonaje, Grano, Subtitulos, Vineta } from "./components/fx";
import { cargarFuentes } from "./components/fuentes";
import { Escena1Viaje } from "./scenes/Escena1Viaje";
import { Escena2Maestro } from "./scenes/Escena2Maestro";
import { Escena3Tecnica } from "./scenes/Escena3Tecnica";
import { Escena4Desgracia } from "./scenes/Escena4Desgracia";
import { EscenaId } from "./guion";
import { LINEA } from "./tiempos";

cargarFuentes();

const COMPONENTES: Record<EscenaId, React.FC> = {
  gancho: Escena1Viaje,
  maestro: Escena2Maestro,
  tecnica: Escena3Tecnica,
  final: Escena4Desgracia,
};

export const Retiro: React.FC<{ conVoz: boolean }> = ({ conVoz }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    {LINEA.escenas.map((e) => {
      const Comp = COMPONENTES[e.id];
      return (
        <Sequence key={e.id} from={e.desde} durationInFrames={e.duracion} name={e.id}>
          <AbsoluteFill style={{ filter: "contrast(1.08) saturate(0.82) brightness(0.97)" }}>
            <Comp />
          </AbsoluteFill>
          <Etalonaje />
          <Vineta />
          <Grano />
          <Subtitulos palabras={e.palabras} />
          {conVoz && !e.provisional && (
            <Sequence from={e.inicioVoz}>
              <Audio src={staticFile(e.archivo)} />
            </Sequence>
          )}
        </Sequence>
      );
    })}
    {/* corte final a negro: LINEA.negro frames de negro puro tras la última escena */}
  </AbsoluteFill>
);
