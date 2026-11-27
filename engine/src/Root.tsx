import React from 'react';
import {Composition} from 'remotion';
import {CharacterSheet} from './CharacterSheet';
import {Episode} from './Episode';
import type {EpisodeSpec, SheetSpec} from './types';

// Props por defecto mínimas: el contenido real SIEMPRE llega por --props desde el orquestador.
const emptyStyle = {
  palette: {paper: '#f3e9d2', ink: '#1d1a17'}, outline: {color: '#1d1a17', width: 6},
  fonts: {title: 'sans-serif', subtitle: 'sans-serif'}, grain: 0, boil: 0, boilFps: 10, vignette: 0,
  subtitle: {size: 64, y: 0.68, color: '#fff', stroke: '#000', maxChars: 32},
};
const emptySpec: EpisodeSpec = {
  meta: {id: 'empty', fps: 30, width: 1080, height: 1920, durationInFrames: 30},
  style: emptyStyle, rigs: {}, backgrounds: {}, shots: [], subtitles: [],
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={Episode}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={30}
      defaultProps={{spec: emptySpec}}
      calculateMetadata={({props}) => ({
        durationInFrames: Math.max(1, props.spec.meta.durationInFrames),
        fps: props.spec.meta.fps,
        width: props.spec.meta.width,
        height: props.spec.meta.height,
      })}
    />
    <Composition
      id="CharacterSheet"
      component={CharacterSheet}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={1}
      defaultProps={{sheet: {style: emptyStyle, rig: {id: 'none', version: 0, name: '', width: 1, height: 1, anchor: [0, 0], parts: []}, width: 1080, height: 1920, expressions: [], poses: [], title: ''} as SheetSpec}}
      calculateMetadata={({props}) => ({width: props.sheet.width, height: props.sheet.height})}
    />
  </>
);
