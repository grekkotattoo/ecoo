import {Environment, Lightformer} from '@react-three/drei';
import React from 'react';

/** Mapa de entorno 100 % local (sin HDRI externos) para reflejos de cromo/cristal. */
export const StudioEnv: React.FC<{warm?: string; cool?: string; intensity?: number}> = ({
  warm = '#ffd2a1',
  cool = '#9fd8ff',
  intensity = 1,
}) => (
  <Environment resolution={256} frames={1} background={false} environmentIntensity={intensity}>
    <Lightformer form="rect" intensity={3} color={warm} position={[4, 3, 2]} scale={[3, 6, 1]} target={[0, 0, 0]} />
    <Lightformer form="rect" intensity={2} color={cool} position={[-5, 2, -1]} scale={[3, 5, 1]} target={[0, 0, 0]} />
    <Lightformer form="ring" intensity={4} color="#ffffff" position={[0, 6, 0]} scale={2} target={[0, 0, 0]} />
    <Lightformer form="rect" intensity={0.6} color="#ffffff" position={[0, 0, 6]} scale={[10, 1, 1]} target={[0, 0, 0]} />
  </Environment>
);
