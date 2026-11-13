import { D, DX, DY, RH, SL, U } from './iso';
import { mulberry32, rand } from './rng';
import type { StoneDef } from './wall';

/** Predrenderirani "sprite" jednog klesanog kamena (lice + gornja ploha + bok). */
export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Pomak od točke P(x0, 0, red) do gornjeg lijevog kuta spritea, u logičkim pikselima. */
  ax: number;
  ay: number;
  w: number;
  h: number;
}

const Q = 2; // faktor oštrine
const PAD = 6;
const cache = new Map<string, Sprite>();

// Nijanse jadranskog vapnenca: od bračke bjeline do toplog okera.
const PALETTE: [number, number, number][] = [
  [238, 231, 216],
  [230, 224, 211],
  [243, 237, 225],
  [224, 216, 199],
  [234, 226, 205],
  [228, 228, 221],
  [240, 228, 209],
  [233, 222, 212],
];

const rgb = (c: [number, number, number], k = 1, a = 1): string =>
  `rgba(${Math.min(255, Math.round(c[0] * k))},${Math.min(255, Math.round(c[1] * k))},${Math.min(
    255,
    Math.round(c[2] * k),
  )},${a})`;

type Pt = [number, number];

function path(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

export function stoneSprite(st: StoneDef, showCrack: boolean, broken = false): Sprite {
  const key = `${st.id}|${showCrack ? 1 : 0}|${broken ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const w = st.w;
  const width = w * U + D * U * DX + PAD * 2;
  const height = RH + D * U * DY + w * U * SL + PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * Q);
  canvas.height = Math.ceil(height * Q);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.scale(Q, Q);

  const oy = PAD + D * U * DY + RH;
  const lp = (x: number, y: number, z: number): Pt => [
    PAD + x * U + y * U * DX,
    oy + x * U * SL - y * U * DY - z * RH,
  ];

  const r = mulberry32(st.seed);
  const base = PALETTE[Math.floor(r() * PALETTE.length)] as [number, number, number];

  // Tamna silueta = sjena u fugama između kamenja.
  path(ctx, [lp(0, 0, 0), lp(w, 0, 0), lp(w, D, 0), lp(w, D, 1), lp(0, D, 1), lp(0, 0, 1)]);
  ctx.fillStyle = '#51463a';
  ctx.fill();

  const g = 0.03 + r() * 0.012;
  const x0 = g;
  const x1 = w - g;
  const zb = 0.025;
  const yb = D - 0.06;
  const n = Math.max(2, w * 2);
  const tops: { x: number; z: number }[] = [];
  for (let i = 0; i <= n; i++) {
    tops.push({ x: x0 + ((x1 - x0) * i) / n, z: 0.965 + rand(r, -0.03, 0.02) });
  }
  const last = tops[n] as { x: number; z: number };

  const front: Pt[] = [lp(x0, 0, zb), lp(x1, 0, zb)];
  for (let i = n; i >= 0; i--) front.push(lp((tops[i] as { x: number }).x, 0, (tops[i] as { z: number }).z));

  const top: Pt[] = [];
  for (let i = 0; i <= n; i++) top.push(lp((tops[i] as { x: number }).x, 0, (tops[i] as { z: number }).z));
  for (let i = n; i >= 0; i--) top.push(lp((tops[i] as { x: number }).x, yb, (tops[i] as { z: number }).z));

  const side: Pt[] = [lp(x1, 0, zb), lp(x1, yb, zb), lp(x1, yb, last.z), lp(x1, 0, last.z)];

  ctx.lineJoin = 'round';

  // Desni bok – u sjeni.
  path(ctx, side);
  const sg = ctx.createLinearGradient(...lp(x1, 0, 0.5), ...lp(x1, yb, 0.5));
  sg.addColorStop(0, rgb(base, 0.78));
  sg.addColorStop(1, rgb(base, 0.66));
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.fillStyle = 'rgba(70,90,130,0.10)';
  ctx.fill();

  // Gornja ploha – okupana suncem.
  path(ctx, top);
  ctx.fillStyle = rgb(base, 1.05);
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 6 * w; i++) {
    const p = lp(rand(r, x0, x1), rand(r, 0, yb), 0.97);
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(120,104,84,0.16)';
    ctx.beginPath();
    ctx.arc(p[0], p[1], rand(r, 0.5, 1.3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Lice kamena.
  path(ctx, front);
  ctx.fillStyle = rgb(base, 0.93);
  ctx.fill();
  ctx.strokeStyle = rgb(base, 0.93);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  path(ctx, front);
  ctx.clip();
  const fTop = lp(0, 0, 1)[1];
  const fBot = lp(w, 0, 0)[1];
  const fg = ctx.createLinearGradient(0, fTop, 0, fBot);
  fg.addColorStop(0, 'rgba(255,255,255,0.20)');
  fg.addColorStop(0.55, 'rgba(255,255,255,0)');
  fg.addColorStop(1, 'rgba(96,72,40,0.14)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, 0, width, height);

  // Zrnca i sitne šupljine.
  for (let i = 0; i < 18 * w; i++) {
    const p = lp(rand(r, x0, x1), 0, rand(r, 0.04, 0.95));
    const light = r() > 0.6;
    ctx.fillStyle = light ? `rgba(255,255,255,${rand(r, 0.2, 0.45)})` : `rgba(112,96,76,${rand(r, 0.08, 0.24)})`;
    ctx.beginPath();
    ctx.arc(p[0], p[1], rand(r, 0.4, 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
  // Tragovi dlijeta.
  ctx.lineCap = 'round';
  for (let i = 0; i < 5 * w; i++) {
    const p = lp(rand(r, x0 + 0.05, x1 - 0.05), 0, rand(r, 0.1, 0.9));
    const ang = -0.6 + rand(r, -0.35, 0.35);
    const len = rand(r, 3.5, 8);
    ctx.strokeStyle = `rgba(122,104,82,${rand(r, 0.16, 0.3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(p[0] + 0.8, p[1] + 0.9);
    ctx.lineTo(p[0] + 0.8 + Math.cos(ang) * len, p[1] + 0.9 + Math.sin(ang) * len);
    ctx.stroke();
  }
  // Žila u kamenu.
  if (r() < 0.4) {
    const zv = rand(r, 0.25, 0.75);
    ctx.strokeStyle = 'rgba(186,146,98,0.26)';
    ctx.lineWidth = rand(r, 1, 2.2);
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const p = lp(x0 + ((x1 - x0) * i) / 8, 0, zv + Math.sin(i * 1.3 + st.seed) * 0.06);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
  }
  // Sjena pri dnu.
  ctx.strokeStyle = 'rgba(64,46,28,0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(...lp(x0, 0, zb));
  ctx.lineTo(...lp(x1, 0, zb));
  ctx.stroke();

  if (broken) {
    ctx.fillStyle = 'rgba(70,45,25,0.16)';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();

  // Svijetli brid na vrhu lica.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  tops.forEach((t, i) => {
    const p = lp(t.x, 0, t.z);
    if (i === 0) ctx.moveTo(p[0], p[1]);
    else ctx.lineTo(p[0], p[1]);
  });
  ctx.stroke();

  // Pukotina.
  if (st.crack !== 'none') {
    const cr = mulberry32(st.seed ^ 0x9e3779b9);
    const cx = rand(cr, 0.3, Math.max(0.35, w - 0.3));
    const full = showCrack || broken;
    const zEnd = full ? zb : rand(cr, 0.45, 0.6);
    const pts: Pt[] = [];
    const steps = 6;
    let x = cx;
    for (let i = 0; i <= steps; i++) {
      const z = 0.955 - ((0.955 - zEnd) * i) / steps;
      pts.push(lp(Math.min(x1 - 0.03, Math.max(x0 + 0.03, x)), 0, z));
      x += rand(cr, -0.09, 0.11);
    }
    const stroke = (dx: number, style: string, lw: number): void => {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0] + dx, p[1]) : ctx.lineTo(p[0] + dx, p[1])));
      ctx.stroke();
    };
    if (full) {
      stroke(1.2, 'rgba(255,255,255,0.45)', 1);
      stroke(0, '#2c221a', broken ? 2.6 : 1.9);
      // Pukotina se nastavlja preko gornje plohe.
      const a = lp(cx, 0, 0.965);
      const b = lp(cx + rand(cr, -0.05, 0.12), yb, 0.965);
      ctx.strokeStyle = '#3a2e24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo((a[0] + b[0]) / 2 + 1.5, (a[1] + b[1]) / 2);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      if (broken) {
        // Druga pukotina i okrhnuti ugao.
        const c = lp(Math.max(x0 + 0.1, cx - 0.2), 0, 0.5);
        const d = lp(Math.min(x1 - 0.1, cx + 0.25), 0, 0.3);
        ctx.strokeStyle = '#2c221a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(c[0], c[1]);
        ctx.lineTo((c[0] + d[0]) / 2, (c[1] + d[1]) / 2 - 3);
        ctx.lineTo(d[0], d[1]);
        ctx.stroke();
      }
    } else {
      // Skrivena pukotina: jedva vidljiva vlas. Tko ima oko, vidjet će.
      stroke(0, 'rgba(70,54,40,0.2)', 0.9);
    }
  }

  const sprite: Sprite = { canvas, ax: -PAD, ay: -oy, w: width, h: height };
  cache.set(key, sprite);
  return sprite;
}

export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, px: number, py: number): void {
  ctx.drawImage(s.canvas, px + s.ax, py + s.ay, s.w, s.h);
}

export function clearSpriteCache(): void {
  cache.clear();
}
