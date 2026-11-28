// Simulación determinista del "pulso sin gravedad" (Escena 3).
// Pura (sin React): la consume la escena para posiciones/rotaciones y timeline.ts para
// derivar los SFX de choque → audio y vídeo nunca se desincronizan.

export type Vec3 = [number, number, number];

export interface AstroState {
  pos: Vec3;
  rot: Vec3; // euler (rad)
}

export interface AstroSim {
  a: AstroState[]; // tatuador
  b: AstroState[]; // tatuado
  hits: {frame: number; who: 'a' | 'b'}[]; // frames LOCALES de choque con la pared
}

export const CABIN_RADIUS = 2.45; // radio útil de la cabina (sección XY)
const BODY_RADIUS = 0.75;

/**
 * @param total frames de la escena
 * @param impulseFrame frame local en el que la aguja toca la piel
 */
export const simulateAstronauts = (total: number, impulseFrame: number, fps: number): AstroSim => {
  const dt = 1 / fps;
  const limit = CABIN_RADIUS - BODY_RADIUS;
  const bodies = [
    {p: [-0.55, -0.15, 0] as Vec3, v: [0, 0, 0] as Vec3, r: [0, 0.35, 0] as Vec3, w: [0, 0, 0] as Vec3, lastHit: -999},
    {p: [0.55, -0.15, 0] as Vec3, v: [0, 0, 0] as Vec3, r: [0, -0.35, 0] as Vec3, w: [0, 0, 0] as Vec3, lastHit: -999},
  ];
  const out: AstroSim = {a: [], b: [], hits: []};
  for (let f = 0; f < total; f++) {
    if (f === impulseFrame) {
      // Tercera ley de Newton: acción = −reacción. Salen hacia el "techo" en diagonales opuestas.
      bodies[0].v = [-2.1, 1.35, 0.35];
      bodies[1].v = [2.1, 1.25, -0.35];
      bodies[0].w = [1.6, -2.4, 5.2];
      bodies[1].w = [-1.3, 2.8, -6.0];
    }
    bodies.forEach((b, i) => {
      // Micro-deriva previa al impulso (ingravidez: nunca están quietos del todo)
      if (f < impulseFrame) {
        const t = f / fps;
        b.p = [b.p[0], -0.15 + Math.sin(t * 1.3 + i) * 0.04, Math.sin(t * 0.9 + i * 2) * 0.03];
      } else {
        for (let k = 0; k < 3; k++) {
          b.p[k] += b.v[k] * dt;
          b.r[k] += b.w[k] * dt;
        }
        const d = Math.hypot(b.p[0], b.p[1]);
        if (d > limit) {
          // Rebote contra la pared cilíndrica: refleja la componente radial con pérdida.
          const nx = b.p[0] / d;
          const ny = b.p[1] / d;
          const vn = b.v[0] * nx + b.v[1] * ny;
          if (vn > 0) {
            const e = 0.72;
            b.v[0] -= (1 + e) * vn * nx;
            b.v[1] -= (1 + e) * vn * ny;
            b.w = [b.w[0] * -0.8, b.w[1] * 1.1, b.w[2] * -0.85];
            if (f - b.lastHit > 12) out.hits.push({frame: f, who: i === 0 ? 'a' : 'b'});
            b.lastHit = f;
          }
          b.p[0] = nx * limit;
          b.p[1] = ny * limit;
        }
        // Tope suave en el eje Z para que no salgan de plano
        if (Math.abs(b.p[2]) > 1.6) b.v[2] *= -0.8;
      }
      (i === 0 ? out.a : out.b).push({pos: [...b.p] as Vec3, rot: [...b.r] as Vec3});
    });
  }
  return out;
};
