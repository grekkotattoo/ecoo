import React from "react";
import { H, W } from "../constants";

/** Capa SVG a pantalla completa en coordenadas de mundo (1080x1920). */
export const Layer: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}
  >
    {children}
  </svg>
);
