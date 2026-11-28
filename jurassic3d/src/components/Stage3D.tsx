import {useThree} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useLayoutEffect} from 'react';
import {useVideoConfig} from 'remotion';
import * as THREE from 'three';

const RendererSetup: React.FC<{exposure: number}> = ({exposure}) => {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.localClippingEnabled = true;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, exposure]);
  return null;
};

/** Lienzo 3D común a todas las escenas: sombras, ACES, clipping local. */
export const Stage3D: React.FC<{
  children: React.ReactNode;
  background: string;
  exposure?: number;
}> = ({children, background, exposure = 1}) => {
  const {width, height} = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        preserveDrawingBuffer: true,
      }}
      camera={{fov: 40, position: [0, 2, 10], near: 0.05, far: 250}}
      style={{backgroundColor: background}}
    >
      <RendererSetup exposure={exposure} />
      <color attach="background" args={[background]} />
      {children}
    </ThreeCanvas>
  );
};

/** Cámara controlada por props: se aplica antes de cada render de R3F. */
export const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  roll?: number;
}> = ({position, target, fov, roll = 0}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 250;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  });
  return null;
};
