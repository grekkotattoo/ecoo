// Lienzo 3D cinematográfico común + rig de cámara controlado por frame.
import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {continueRender, delayRender} from 'remotion';
import * as THREE from 'three';
import {HEIGHT, WIDTH} from '../config/timeline';
import type {Vec3} from '../config/physics';

export const SceneCanvas: React.FC<{children: React.ReactNode; background?: string; exposure?: number}> = ({
  children,
  background = '#000000',
  exposure = 1,
}) => (
  <ThreeCanvas
    width={WIDTH}
    height={HEIGHT}
    shadows
    dpr={[1, 2]}
    gl={{toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, antialias: true}}
    camera={{fov: 45, near: 0.03, far: 900, position: [0, 0, 10]}}
  >
    <color attach="background" args={[background]} />
    {children}
  </ThreeCanvas>
);

/** Coloca la cámara en cada frame (antes de que @remotion/three llame a advance()). */
export const CameraRig: React.FC<{position: Vec3; target: Vec3; fov?: number; roll?: number}> = ({position, target, fov = 45, roll = 0}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(target[0], target[1], target[2]);
    if (roll) camera.rotateZ(roll);
    camera.fov = fov;
    camera.near = 0.03;
    camera.far = 900;
    camera.updateProjectionMatrix();
  });
  return null;
};

/** spotLight con objetivo real en escena (three necesita el target en el grafo para apuntar). */
export const AimedSpotLight: React.FC<{target: Vec3} & Omit<JSX.IntrinsicElements['spotLight'], 'target'>> = ({target, ...props}) => {
  const [obj] = useState(() => new THREE.Object3D());
  obj.position.set(target[0], target[1], target[2]);
  obj.updateMatrixWorld();
  return (
    <>
      <primitive object={obj} />
      <spotLight target={obj} {...props} />
    </>
  );
};

// ---------------------------------------------------------------- Texturas de texto (carteles, etiquetas)
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/**
 * Dibuja en un canvas 2D y lo devuelve como textura para mapear sobre geometría 3D.
 * Espera a que la fuente esté cargada (delayRender) para que el render sea determinista.
 */
export const useCanvasTexture = (w: number, h: number, draw: Draw, fontSpec: string, deps: unknown[] = []) => {
  const advance = useThree((s) => s.advance);
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }, [w, h]);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  const [handle] = useState(() => delayRender(`Texto 3D: ${fontSpec}`));
  useEffect(() => {
    let done = false;
    const paint = () => {
      if (done) return;
      done = true;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
      texture.needsUpdate = true;
      // En render (frameloop "never") hay que volver a dibujar el frame con la textura ya pintada.
      advance(performance.now());
      invalidate();
      continueRender(handle);
    };
    document.fonts.load(fontSpec).then(paint, paint);
    const t = setTimeout(paint, 4000); // la fuente no debe bloquear el render
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return texture;
};

export const TITLE_FONT = "'Montserrat', 'Anton', 'Arial Black', sans-serif";
