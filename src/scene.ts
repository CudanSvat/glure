import { mulberry32, rand, type Rng } from './rng';

/** Pozadine: slojevi s paralaksom (nebo, otoci, more, tlo, stabla) daju dubinu bez pravog 3D-a. */

export type SceneKind = 'maslinik' | 'selo';

export interface View {
  scale: number;
  ox: number;
  oy: number;
  /** Vidljivi pravokutnik u logičkim koordinatama. */
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const HZ = 262; // obzor

interface Deco {
  sparkles: { x: number; y: number; p: number; l: number }[];
  pebbles: { x: number; y: number; r: number; k: number }[];
  tufts: { x: number; y: number; s: number; c: string }[];
  olives: { blobs: { dx: number; dy: number; rx: number; ry: number; c: string; p: number }[] }[];
}

const decos = new Map<SceneKind, Deco>();

function deco(kind: SceneKind): Deco {
  const hit = decos.get(kind);
  if (hit) return hit;
  const r = mulberry32(kind === 'maslinik' ? 1207 : 5521);
  const d: Deco = { sparkles: [], pebbles: [], tufts: [], olives: [] };
  for (let i = 0; i < 110; i++) {
    const y = HZ + 3 + Math.pow(r(), 1.4) * 92;
    d.sparkles.push({ x: rand(r, -300, 1580), y, p: r() * 6.28, l: 4 + ((y - HZ) / 92) * 16 });
  }
  for (let i = 0; i < 170; i++) {
    const y = 356 + Math.pow(r(), 0.8) * 380;
    d.pebbles.push({ x: rand(r, -300, 1580), y, r: 1.2 + ((y - 340) / 380) * rand(r, 2, 6.5), k: r() });
  }
  const grass = kind === 'maslinik' ? ['#c9b565', '#a8a45a', '#8b9a52', '#d6c47a'] : ['#b9ad6a', '#98a060', '#cfc07e'];
  for (let i = 0; i < 70; i++) {
    const y = 360 + Math.pow(r(), 0.9) * 370;
    d.tufts.push({
      x: rand(r, -300, 1580),
      y,
      s: 0.5 + ((y - 340) / 380) * 1.3,
      c: grass[Math.floor(r() * grass.length)] as string,
    });
  }
  const greens = ['#6c8659', '#87a074', '#a5b892', '#5b764d', '#96ad84'];
  for (let t = 0; t < 4; t++) {
    const blobs = [];
    for (let i = 0; i < 13; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * 52;
      blobs.push({
        dx: Math.cos(a) * rad * 1.25,
        dy: -92 + Math.sin(a) * rad * 0.62,
        rx: rand(r, 20, 34),
        ry: rand(r, 14, 22),
        c: greens[Math.floor(r() * greens.length)] as string,
        p: r() * 6.28,
      });
    }
    blobs.sort((a, b) => a.dy - b.dy);
    d.olives.push({ blobs });
  }
  decos.set(kind, d);
  return d;
}

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ell(ctx, x, y, 60 * s, 16 * s);
  ctx.fill();
  ell(ctx, x - 26 * s, y - 10 * s, 30 * s, 16 * s);
  ctx.fill();
  ell(ctx, x + 14 * s, y - 16 * s, 36 * s, 20 * s);
  ctx.fill();
  ell(ctx, x + 44 * s, y - 6 * s, 24 * s, 12 * s);
  ctx.fill();
}

function island(ctx: CanvasRenderingContext2D, x0: number, x1: number, h: number, color: string, skew = 0.35): void {
  const w = x1 - x0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0, HZ + 1);
  ctx.bezierCurveTo(x0 + w * 0.15, HZ - h * 0.5, x0 + w * (skew - 0.1), HZ - h, x0 + w * skew, HZ - h);
  ctx.bezierCurveTo(x0 + w * (skew + 0.25), HZ - h, x0 + w * 0.8, HZ - h * 0.35, x1, HZ + 1);
  ctx.closePath();
  ctx.fill();
}

function cypress(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sway: number): void {
  ctx.fillStyle = 'rgba(48,24,10,0.22)';
  ell(ctx, x + 10 * s, y + 2, 26 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = '#4b3a2c';
  ctx.fillRect(x - 3 * s, y - 16 * s, 6 * s, 18 * s);
  const tip = x + sway * 14 * s;
  ctx.fillStyle = '#2f5140';
  ctx.beginPath();
  ctx.moveTo(x - 17 * s, y - 14 * s);
  ctx.bezierCurveTo(x - 24 * s, y - 80 * s, tip - 8 * s, y - 150 * s, tip, y - 178 * s);
  ctx.bezierCurveTo(tip + 8 * s, y - 150 * s, x + 24 * s, y - 80 * s, x + 17 * s, y - 14 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(160,200,150,0.22)';
  ctx.beginPath();
  ctx.moveTo(x - 15 * s, y - 20 * s);
  ctx.bezierCurveTo(x - 21 * s, y - 80 * s, tip - 8 * s, y - 150 * s, tip, y - 176 * s);
  ctx.bezierCurveTo(tip - 4 * s, y - 130 * s, x - 6 * s, y - 70 * s, x - 6 * s, y - 16 * s);
  ctx.closePath();
  ctx.fill();
}

function olive(
  ctx: CanvasRenderingContext2D,
  d: Deco,
  idx: number,
  x: number,
  y: number,
  s: number,
  t: number,
  wind: number,
): void {
  const tree = d.olives[idx % d.olives.length] as Deco['olives'][number];
  ctx.fillStyle = 'rgba(48,24,10,0.2)';
  ell(ctx, x + 18 * s, y + 3, 78 * s, 13 * s);
  ctx.fill();
  // Kvrgavo deblo.
  ctx.fillStyle = '#5d4838';
  ctx.beginPath();
  ctx.moveTo(x - 15 * s, y + 2);
  ctx.bezierCurveTo(x - 8 * s, y - 20 * s, x - 18 * s, y - 40 * s, x - 22 * s, y - 68 * s);
  ctx.lineTo(x - 10 * s, y - 70 * s);
  ctx.bezierCurveTo(x - 6 * s, y - 52 * s, x, y - 50 * s, x + 4 * s, y - 72 * s);
  ctx.lineTo(x + 16 * s, y - 70 * s);
  ctx.bezierCurveTo(x + 12 * s, y - 40 * s, x + 8 * s, y - 20 * s, x + 16 * s, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,18,10,0.35)';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y - 2);
  ctx.bezierCurveTo(x - 2 * s, y - 20 * s, x - 8 * s, y - 34 * s, x - 6 * s, y - 50 * s);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,230,200,0.18)';
  ctx.beginPath();
  ctx.moveTo(x - 11 * s, y - 2);
  ctx.bezierCurveTo(x - 6 * s, y - 22 * s, x - 15 * s, y - 40 * s, x - 18 * s, y - 62 * s);
  ctx.stroke();
  // Krošnja: srebrnozeleni oblaci lišća.
  for (const b of tree.blobs) {
    const sw = Math.sin(t * 0.9 + b.p) * (1.5 + wind * 9) + wind * 10;
    ctx.fillStyle = b.c;
    ell(ctx, x + (b.dx + sw) * s, y + b.dy * s, b.rx * s, b.ry * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(235,245,225,0.2)';
    ell(ctx, x + (b.dx + sw - 5) * s, y + (b.dy - 5) * s, b.rx * 0.55 * s, b.ry * 0.45 * s);
    ctx.fill();
  }
}

function boat(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const bob = Math.sin(t * 1.4) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(Math.sin(t * 1.1) * 0.03);
  ctx.fillStyle = '#fbfaf4';
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(13, -4);
  ctx.lineTo(0, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e9e4d6';
  ctx.beginPath();
  ctx.moveTo(-2, -24);
  ctx.lineTo(-10, -4);
  ctx.lineTo(-2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7b3f2a';
  ctx.beginPath();
  ctx.moveTo(-15, -3);
  ctx.lineTo(18, -3);
  ctx.lineTo(13, 3);
  ctx.lineTo(-11, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sea(ctx: CanvasRenderingContext2D, v: View, d: Deco, t: number, bottom: number, sunX: number, shift: number): void {
  const g = ctx.createLinearGradient(0, HZ, 0, bottom);
  g.addColorStop(0, '#3a8fc2');
  g.addColorStop(0.45, '#2f84b8');
  g.addColorStop(1, '#4fb6c4');
  ctx.fillStyle = g;
  ctx.fillRect(v.left - 20, HZ, v.right - v.left + 40, bottom - HZ);
  // Izmaglica na obzoru.
  const hz = ctx.createLinearGradient(0, HZ, 0, HZ + 18);
  hz.addColorStop(0, 'rgba(235,246,250,0.55)');
  hz.addColorStop(1, 'rgba(235,246,250,0)');
  ctx.fillStyle = hz;
  ctx.fillRect(v.left - 20, HZ, v.right - v.left + 40, 18);
  // Ljeskanje mora.
  ctx.lineCap = 'round';
  for (const s of d.sparkles) {
    if (s.y > bottom) continue;
    const near = Math.max(0, 1 - Math.abs(s.x - sunX) / 190);
    const a = (0.16 + near * 0.5) * (0.5 + 0.5 * Math.sin(t * 1.6 + s.p));
    if (a < 0.03) continue;
    ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    ctx.lineWidth = 1 + (s.y - HZ) / 60;
    ctx.beginPath();
    ctx.moveTo(s.x + shift - s.l / 2, s.y);
    ctx.lineTo(s.x + shift + s.l / 2, s.y);
    ctx.stroke();
  }
}

function groundDeco(ctx: CanvasRenderingContext2D, d: Deco, v: View, top: number, pebble: string, t: number, wind: number): void {
  for (const p of d.pebbles) {
    if (p.y < top + 6 || p.x < v.left - 20 || p.x > v.right + 20 || p.y > v.bottom + 10) continue;
    ctx.fillStyle = 'rgba(60,30,15,0.22)';
    ell(ctx, p.x + p.r * 0.4, p.y + p.r * 0.35, p.r * 1.3, p.r * 0.6);
    ctx.fill();
    ctx.fillStyle = p.k > 0.5 ? pebble : '#f2ebdb';
    ell(ctx, p.x, p.y, p.r * 1.25, p.r * 0.72, p.k);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (const g of d.tufts) {
    if (g.y < top + 8 || g.x < v.left - 20 || g.x > v.right + 20 || g.y > v.bottom + 10) continue;
    const sw = Math.sin(t * 1.2 + g.x * 0.05) * (1 + wind * 7) + wind * 6;
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 1.6 * g.s;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(g.x + i * 2 * g.s, g.y);
      ctx.quadraticCurveTo(g.x + i * 3 * g.s, g.y - 7 * g.s, g.x + (i * 5 + sw) * g.s, g.y - (11 - Math.abs(i) * 2) * g.s);
    }
    ctx.stroke();
  }
}

function house(ctx: CanvasRenderingContext2D, x: number, y: number, r: Rng): void {
  // Bočni zid u sjeni.
  ctx.fillStyle = '#b9aa8b';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 70, y - 22);
  ctx.lineTo(x - 70, y - 212);
  ctx.lineTo(x, y - 232);
  ctx.closePath();
  ctx.fill();
  // Pročelje.
  const g = ctx.createLinearGradient(0, y - 232, 0, y);
  g.addColorStop(0, '#eadfc6');
  g.addColorStop(1, '#d9ccae');
  ctx.fillStyle = g;
  ctx.fillRect(x, y - 232, 400, 232);
  // Redovi kamena.
  ctx.strokeStyle = 'rgba(120,100,70,0.22)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 12; row++) {
    const yy = y - 232 + row * 19.5;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + 400, yy);
    ctx.stroke();
    let xx = x + rand(r, 10, 40);
    while (xx < x + 395) {
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + 19.5);
      ctx.stroke();
      xx += rand(r, 26, 58);
    }
  }
  // Prozor sa škurama.
  const win = (wx: number, wy: number): void => {
    ctx.fillStyle = '#f4eee0';
    ctx.fillRect(wx - 5, wy - 5, 62, 80);
    ctx.fillStyle = '#31464a';
    ctx.fillRect(wx, wy, 52, 70);
    ctx.fillStyle = '#3f6b4f';
    ctx.fillRect(wx - 27, wy - 2, 26, 74);
    ctx.fillRect(wx + 53, wy - 2, 26, 74);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(wx - 25, wy + 2 + i * 8, 22, 2);
      ctx.fillRect(wx + 55, wy + 2 + i * 8, 22, 2);
    }
    ctx.fillStyle = '#f4eee0';
    ctx.fillRect(wx - 9, wy + 70, 70, 7);
  };
  win(x + 70, y - 180);
  win(x + 260, y - 180);
  // Krov od kupa kanalica.
  ctx.fillStyle = '#b9552f';
  ctx.beginPath();
  ctx.moveTo(x - 86, y - 208);
  ctx.lineTo(x - 14, y - 296);
  ctx.lineTo(x + 420, y - 296);
  ctx.lineTo(x + 420, y - 226);
  ctx.lineTo(x - 14, y - 226);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cf6a3d';
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 296);
  ctx.lineTo(x + 420, y - 296);
  ctx.lineTo(x + 420, y - 226);
  ctx.lineTo(x - 14, y - 226);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,40,15,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 31; i++) {
    const xx = x - 8 + i * 14.2;
    ctx.beginPath();
    ctx.moveTo(xx, y - 296);
    ctx.lineTo(xx, y - 226);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,220,180,0.25)';
  for (let j = 1; j < 5; j++) {
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 296 + j * 14);
    ctx.lineTo(x + 420, y - 296 + j * 14);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,30,10,0.25)';
  ctx.fillRect(x, y - 226, 400, 8);
  // Dimnjak.
  ctx.fillStyle = '#e2d6bd';
  ctx.fillRect(x + 300, y - 330, 34, 44);
  ctx.fillStyle = '#b9552f';
  ctx.fillRect(x + 294, y - 338, 46, 10);
}

function bougainvillea(ctx: CanvasRenderingContext2D, x: number, y: number, r: Rng, t: number, wind: number): void {
  ctx.strokeStyle = '#5b4a35';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - 8, y - 70, x + 12, y - 130, x - 4, y - 200);
  ctx.stroke();
  const cols = ['#c22f7c', '#d9539c', '#b02570', '#e37bb2', '#4f7a48'];
  for (let i = 0; i < 46; i++) {
    const yy = y - 60 - r() * 170;
    const spread = 14 + (y - yy) * 0.22;
    const xx = x + rand(r, -spread, spread * 1.2);
    const sw = Math.sin(t * 1.3 + i) * (1 + wind * 6) + wind * 5;
    ctx.fillStyle = cols[Math.floor(r() * cols.length)] as string;
    ell(ctx, xx + sw, yy, rand(r, 7, 14), rand(r, 5, 10));
    ctx.fill();
  }
}

/**
 * Crta cijelu pozadinu.
 * @param par  paralaksa, -1..1 (položaj pokazivača)
 * @param wind 0..1 (bura)
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  kind: SceneKind,
  v: View,
  t: number,
  par: number,
  wind: number,
): void {
  const d = deco(kind);
  const W = v.right - v.left;
  const maslinik = kind === 'maslinik';

  // Nebo
  const sky = ctx.createLinearGradient(0, Math.min(v.top, 0), 0, HZ);
  if (maslinik) {
    sky.addColorStop(0, '#3f97dc');
    sky.addColorStop(0.6, '#93cbee');
    sky.addColorStop(1, '#e4f2f5');
  } else {
    sky.addColorStop(0, '#4a9fe0');
    sky.addColorStop(0.55, '#a9d6ee');
    sky.addColorStop(1, '#f8ecd2');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(v.left - 20, v.top - 20, W + 40, HZ - v.top + 22);

  // Sunce
  const sunX = (maslinik ? 1030 : 250) - par * 3;
  const sunY = maslinik ? 108 : 96;
  const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 170);
  sg.addColorStop(0, 'rgba(255,250,225,0.95)');
  sg.addColorStop(0.2, 'rgba(255,244,200,0.45)');
  sg.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 170, sunY - 170, 340, 340);
  ctx.fillStyle = '#fffbe6';
  ell(ctx, sunX, sunY, 30, 30);
  ctx.fill();

  // Oblaci
  const span = W + 500;
  const cl = (base: number, y: number, s: number, sp: number): void => {
    const x = ((((base + t * sp) % span) + span) % span) + v.left - 250;
    cloud(ctx, x - par * 5, y, s);
  };
  cl(140, 92, 1.1, 5);
  cl(620, 150, 0.7, 3.4);
  cl(1150, 64, 0.9, 4.2);

  // Otoci u izmaglici
  const p1 = -par * 6;
  island(ctx, -80 + p1, 420 + p1, 44, '#b4d0e2', 0.4);
  island(ctx, 760 + p1, 1420 + p1, 58, '#a9c9de', 0.55);
  const p2 = -par * 10;
  island(ctx, 300 + p2, 760 + p2, 30, '#8db6cf', 0.3);
  if (!maslinik) island(ctx, -200 + p2, 240 + p2, 70, '#86aec6', 0.6);

  // More
  const seaBottom = maslinik ? 372 : 352;
  sea(ctx, v, d, t, seaBottom, sunX, -par * 8);
  const bx = ((t * 3.2) % 900) + 180;
  boat(ctx, bx - par * 8, HZ + 14, t);

  // Tlo
  const p3 = -par * 14;
  const gTop = maslinik ? 350 : 336;
  ctx.beginPath();
  ctx.moveTo(v.left - 40, gTop + 12);
  ctx.bezierCurveTo(300 + p3, gTop - 16, 800 + p3, gTop - 4, v.right + 40, gTop + 8);
  ctx.lineTo(v.right + 40, v.bottom + 40);
  ctx.lineTo(v.left - 40, v.bottom + 40);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, gTop - 16, 0, 720);
  if (maslinik) {
    gg.addColorStop(0, '#d39a67');
    gg.addColorStop(0.25, '#c07a4b');
    gg.addColorStop(1, '#9a5632');
  } else {
    gg.addColorStop(0, '#e6d6b2');
    gg.addColorStop(0.3, '#d8c59c');
    gg.addColorStop(1, '#b89d72');
  }
  ctx.fillStyle = gg;
  ctx.fill();
  // Svijetli rub brijega.
  ctx.strokeStyle = maslinik ? 'rgba(255,225,180,0.5)' : 'rgba(255,250,230,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(v.left - 40, gTop + 12);
  ctx.bezierCurveTo(300 + p3, gTop - 16, 800 + p3, gTop - 4, v.right + 40, gTop + 8);
  ctx.stroke();

  // Stari suhozid na rubu terase (u daljini).
  const wr = mulberry32(77);
  const bez = (a: number, b: number, c: number, e: number, k: number): number =>
    (1 - k) ** 3 * a + 3 * (1 - k) ** 2 * k * b + 3 * (1 - k) * k * k * c + k ** 3 * e;
  const count = Math.ceil((W + 80) / 27);
  for (let i = 0; i < count; i++) {
    const k = i / count;
    const x = bez(v.left - 40, 300 + p3, 800 + p3, v.right + 40, k);
    const y = bez(gTop + 12, gTop - 16, gTop - 4, gTop + 8, k) + 1;
    const skip = wr() < 0.12;
    const hgt = rand(wr, 6, 10);
    if (skip) continue;
    ctx.fillStyle = wr() > 0.5 ? '#e9e0cc' : '#d8ceb8';
    ctx.beginPath();
    ctx.roundRect(x, y - hgt, 24, hgt + 3, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(70,50,30,0.22)';
    ctx.fillRect(x, y + 1, 24, 2.5);
  }

  groundDeco(ctx, d, v, gTop + 10, maslinik ? '#e4d8c0' : '#f0e8d6', t, wind);

  const sway = Math.sin(t * 0.8) * 0.12 + wind * 1.2;
  const p4 = -par * 9;
  if (maslinik) {
    cypress(ctx, 84 + p4, 404, 1.0, sway);
    olive(ctx, d, 0, 250 + p4, 398, 0.95, t, wind);
    olive(ctx, d, 1, 660 + p4, 376, 0.82, t, wind);
    olive(ctx, d, 2, 1060 + p4, 392, 1.0, t, wind);
    cypress(ctx, 1218 + p4, 388, 0.85, sway);
  } else {
    const hr = mulberry32(4242);
    cypress(ctx, 96 + p4, 392, 1.05, sway);
    cypress(ctx, 168 + p4, 380, 0.8, sway);
    olive(ctx, d, 3, 430 + p4, 384, 0.8, t, wind);
    house(ctx, 790 + p4, 396, hr);
    bougainvillea(ctx, 800 + p4, 398, hr, t, wind);
  }
}

/** Vinjeta i topla svjetlost preko svega. */
export function drawAtmosphere(ctx: CanvasRenderingContext2D, v: View): void {
  const W = v.right - v.left;
  const H = v.bottom - v.top;
  const cx = v.left + W / 2;
  const cy = v.top + H / 2;
  const g = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.42, cx, cy, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(40,20,0,0)');
  g.addColorStop(1, 'rgba(40,20,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(v.left, v.top, W, H);
}

/** Pruge vjetra za buru. */
export function drawWind(ctx: CanvasRenderingContext2D, v: View, t: number, strength: number): void {
  if (strength <= 0.01) return;
  const r = mulberry32(99);
  ctx.lineCap = 'round';
  const W = v.right - v.left + 400;
  for (let i = 0; i < 46; i++) {
    const y = v.top + r() * (v.bottom - v.top);
    const sp = 900 + r() * 900;
    const len = 80 + r() * 220;
    const x = v.right + 200 - ((t * sp + r() * W) % W);
    ctx.strokeStyle = `rgba(255,255,255,${(0.12 + r() * 0.3) * strength})`;
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - len / 2, y + 6 * Math.sin(t * 3 + i), x - len, y + 3);
    ctx.stroke();
  }
}
