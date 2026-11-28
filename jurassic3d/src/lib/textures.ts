import {random} from 'remotion';
import * as THREE from 'three';

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d') as CanvasRenderingContext2D] as const;
};

const toTexture = (c: HTMLCanvasElement, color = true, repeat: [number, number] = [1, 1]) => {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
};

/** Triángulo cutre, torcido y con trazo tembloroso (el "tribal"). */
const drawUglyTriangle = (
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  color: string,
  seed: string,
) => {
  const pts: [number, number][] = [
    [cx - s * 0.55, cy + s * 0.45],
    [cx + s * 0.1, cy - s * 0.6],
    [cx + s * 0.62, cy + s * 0.38],
  ];
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.lineWidth = s * (0.09 - pass * 0.02);
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const [x0, y0] = pts[i % 3];
      const [x1, y1] = pts[(i + 1) % 3];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const j = (random(`${seed}-${pass}-${i}-${k}`) - 0.5) * s * 0.07;
        const x = x0 + (x1 - x0) * t + j;
        const y = y0 + (y1 - y0) * t - j;
        if (i === 0 && k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
    }
    g.stroke();
  }
  // Gotas de tinta escurridas
  g.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(
      cx + (random(`${seed}-d${i}`) - 0.5) * s * 1.4,
      cy + (random(`${seed}-e${i}`) - 0.5) * s * 1.2,
      s * 0.03 * (1 + random(`${seed}-f${i}`)),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
};

// UV del bíceps en la cápsula del brazo superior (u alrededor, v a lo largo).
export const TATTOO_UV = {u: 0.25, v: 0.5};

export const makeSkinTexture = () => {
  const [c, g] = canvas(1024, 1024);
  const grd = g.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, '#e2a989');
  grd.addColorStop(0.5, '#d89a78');
  grd.addColorStop(1, '#c98463');
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120,60,40,${random(`sk${i}`) * 0.06})`;
    g.fillRect(random(`sx${i}`) * 1024, random(`sy${i}`) * 1024, 2, 2);
  }
  // Piel enrojecida alrededor del tatuaje
  const cx = TATTOO_UV.u * 1024;
  const cy = (1 - TATTOO_UV.v) * 1024;
  const red = g.createRadialGradient(cx, cy, 10, cx, cy, 170);
  red.addColorStop(0, 'rgba(200,40,40,0.55)');
  red.addColorStop(1, 'rgba(200,40,40,0)');
  g.fillStyle = red;
  g.fillRect(cx - 200, cy - 200, 400, 400);
  drawUglyTriangle(g, cx, cy, 210, '#141018', 'skin');
  return toTexture(c);
};

/** Piedra gris agrietada con musgo (procedural) + mapa de relieve. */
export const makeStoneTextures = (withTattoo: boolean) => {
  const [c, g] = canvas(1024, 1024);
  const [b, gb] = canvas(1024, 1024);
  g.fillStyle = '#7a7873';
  g.fillRect(0, 0, 1024, 1024);
  gb.fillStyle = '#808080';
  gb.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1400; i++) {
    const x = random(`px${i}`) * 1024;
    const y = random(`py${i}`) * 1024;
    const r = 4 + random(`pr${i}`) * 26;
    const v = Math.floor(90 + random(`pv${i}`) * 70);
    g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    const bv = Math.floor(100 + random(`pb${i}`) * 110);
    gb.fillStyle = `rgba(${bv},${bv},${bv},0.4)`;
    gb.beginPath();
    gb.arc(x, y, r, 0, Math.PI * 2);
    gb.fill();
  }
  // Musgo
  for (let i = 0; i < 70; i++) {
    const x = random(`mx${i}`) * 1024;
    const y = random(`my${i}`) * 1024;
    const r = 20 + random(`mr${i}`) * 70;
    const m = g.createRadialGradient(x, y, 0, x, y, r);
    m.addColorStop(0, 'rgba(70,110,40,0.85)');
    m.addColorStop(0.6, 'rgba(60,95,35,0.45)');
    m.addColorStop(1, 'rgba(60,95,35,0)');
    g.fillStyle = m;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Grietas (random walk)
  for (let i = 0; i < 26; i++) {
    let x = random(`cx${i}`) * 1024;
    let y = random(`cy${i}`) * 1024;
    let a = random(`ca${i}`) * Math.PI * 2;
    g.strokeStyle = 'rgba(25,22,20,0.9)';
    gb.strokeStyle = 'rgba(0,0,0,1)';
    g.lineWidth = 2 + random(`cw${i}`) * 3;
    gb.lineWidth = g.lineWidth + 2;
    g.beginPath();
    gb.beginPath();
    g.moveTo(x, y);
    gb.moveTo(x, y);
    const steps = 18 + Math.floor(random(`cs${i}`) * 30);
    for (let k = 0; k < steps; k++) {
      a += (random(`ck${i}-${k}`) - 0.5) * 1.2;
      x += Math.cos(a) * 14;
      y += Math.sin(a) * 14;
      g.lineTo(x, y);
      gb.lineTo(x, y);
    }
    g.stroke();
    gb.stroke();
  }
  if (withTattoo) {
    const cx = TATTOO_UV.u * 1024;
    const cy = (1 - TATTOO_UV.v) * 1024;
    drawUglyTriangle(g, cx, cy, 210, 'rgba(30,26,28,0.92)', 'skin');
    drawUglyTriangle(gb, cx, cy, 210, 'rgba(20,20,20,1)', 'skin');
  }
  return {map: toTexture(c), bump: toTexture(b, false)};
};

export const makeMarbleTexture = () => {
  const [c, g] = canvas(1024, 1024);
  g.fillStyle = '#121214';
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) {
    let x = random(`vx${i}`) * 1024;
    let y = random(`vy${i}`) * 1024;
    let a = random(`va${i}`) * Math.PI;
    const gold = random(`vg${i}`) > 0.7;
    g.strokeStyle = gold ? 'rgba(200,160,90,0.35)' : 'rgba(210,210,220,0.16)';
    g.lineWidth = 0.6 + random(`vw${i}`) * 2.2;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 90; k++) {
      a += (random(`vk${i}-${k}`) - 0.5) * 0.5;
      x += Math.cos(a) * 12;
      y += Math.sin(a) * 12;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return toTexture(c, true, [3, 3]);
};

export const makeBarkTexture = () => {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#3a2a1e';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    const x = random(`bx${i}`) * 512;
    g.strokeStyle = `rgba(${15 + random(`bc${i}`) * 30},${10 + random(`bd${i}`) * 20},8,0.8)`;
    g.lineWidth = 1 + random(`bw${i}`) * 4;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 10, 170, x - 10, 340, x + (random(`be${i}`) - 0.5) * 30, 512);
    g.stroke();
  }
  return toTexture(c, true, [3, 1]);
};

/** Placa dorada grabada. */
export const makePlaqueTexture = (lines: string[]) => {
  const [c, g] = canvas(1024, 512);
  const grd = g.createLinearGradient(0, 0, 1024, 512);
  grd.addColorStop(0, '#f4d27a');
  grd.addColorStop(0.45, '#c9962e');
  grd.addColorStop(0.55, '#e8bf5c');
  grd.addColorStop(1, '#9c6d17');
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = 'rgba(70,45,5,0.85)';
  g.lineWidth = 10;
  g.strokeRect(26, 26, 1024 - 52, 512 - 52);
  g.lineWidth = 3;
  g.strokeRect(46, 46, 1024 - 92, 512 - 92);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((line, i) => {
    const size = i === 0 ? 96 : 66;
    g.font = `${i === 0 ? 'bold ' : 'italic '}${size}px Georgia, "DejaVu Serif", serif`;
    const y = 512 / 2 + (i - (lines.length - 1) / 2) * 130;
    // Grabado: sombra clara abajo + texto oscuro
    g.fillStyle = 'rgba(255,240,190,0.7)';
    g.fillText(line, 512, y + 3);
    g.fillStyle = 'rgba(60,38,4,0.95)';
    g.fillText(line, 512, y);
  });
  return toTexture(c);
};
