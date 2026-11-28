// Reloj de diseño por escena: las escenas se animan a 60 fps "de diseño" aunque el vídeo salga a 30,
// y se reproduce solo el tramo [designStart, designEnd] definido en timeline.ts.
import {useCurrentFrame} from 'remotion';
import {SCENES, toDesign, type SceneId} from '../config/timeline';

export const useDesignFrame = (id: SceneId) => toDesign(SCENES[id], useCurrentFrame());
