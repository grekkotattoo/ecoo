import React from "react";
import { Composition } from "remotion";
import { TattooRocketViral } from "./Composition";
import { DURATION, FPS, H, W } from "./constants";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="TattooRocketViral"
    component={TattooRocketViral}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
  />
);
