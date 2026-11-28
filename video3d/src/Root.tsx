import React from 'react';
import {Composition, Folder} from 'remotion';
import {COMPOSITION_ID, DURATION_IN_FRAMES, FPS, HEIGHT, SCENE_LIST, WIDTH} from './config/timeline';
import {Main, SinglePreview} from './Main';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id={COMPOSITION_ID} component={Main} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{muted: false}} />
    <Folder name="Escenas">
      {SCENE_LIST.map((s) => (
        <Composition
          key={s.id}
          id={`${COMPOSITION_ID}-${s.id}`}
          component={SinglePreview}
          durationInFrames={s.durationInFrames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{scene: s.id}}
        />
      ))}
    </Folder>
  </>
);
