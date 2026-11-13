/** Likovi crtani vektorski na Canvasu – slojevito, sa sjenama, da izgledaju "puno". */

export interface Look {
  skin: string;
  skinShade: string;
  shirt: string;
  pants: string;
  overalls?: string;
  vest?: string;
  hat: 'kapa' | 'bereta' | 'slamnati';
  hatColor: string;
  hatBand?: string;
  hair: string;
  moustache?: string;
  stubble?: boolean;
  glasses?: boolean;
  belly: number;
  shorts?: boolean;
  socks?: boolean;
  tool: 'mlat' | 'stap' | 'mobitel' | 'none';
  brows: string;
}

export interface Pose {
  t: number;
  /** 0..1 – koliko su usta otvorena (govor). */
  talk: number;
  /** 0..1 – zamah čekićem. */
  swing: number;
  /** 1 = gleda udesno, -1 = gleda ulijevo. */
  face: 1 | -1;
  /** Šešir odletio (bura). */
  hatless?: boolean;
}

export const GLURE: Look = {
  skin: '#d9a47a',
  skinShade: '#bd8259',
  shirt: '#f1ede2',
  pants: '#3f5f8a',
  overalls: '#3f5f8a',
  hat: 'kapa',
  hatColor: '#6b7280',
  hair: '#3b3029',
  moustache: '#2f2620',
  belly: 6,
  tool: 'mlat',
  brows: '#2f2620',
};

export const SIME: Look = {
  skin: '#cf9a72',
  skinShade: '#b07a55',
  shirt: '#e9e2cf',
  pants: '#4a443c',
  vest: '#3a3530',
  hat: 'bereta',
  hatColor: '#26221f',
  hair: '#e8e4dc',
  moustache: '#efece6',
  stubble: true,
  belly: 0,
  tool: 'stap',
  brows: '#e8e4dc',
};

export const STEF: Look = {
  skin: '#f0b99a',
  skinShade: '#dc967a',
  shirt: '#f08fa5',
  pants: '#d9c9a3',
  hat: 'slamnati',
  hatColor: '#e6cc82',
  hatBand: '#2f6f8f',
  hair: '#8a6a45',
  glasses: true,
  belly: 3,
  shorts: true,
  socks: true,
  tool: 'mobitel',
  brows: '#7a5c3c',
};

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function limb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function drawPerson(
  ctx: CanvasRenderingContext2D,
  look: Look,
  x: number,
  y: number,
  s: number,
  pose: Pose,
  shadow = true,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (shadow) {
    ctx.fillStyle = 'rgba(48,24,10,0.26)';
    ell(ctx, 4 * s, 3 * s, 44 * s, 10 * s);
    ctx.fill();
  }
  ctx.scale(s * pose.face, s);

  const b = Math.sin(pose.t * 2.1) * 1.1; // disanje
  const bw = 27 + look.belly;

  // --- Noge ---
  if (look.shorts) {
    ctx.fillStyle = look.skin;
    rr(ctx, -17, -46, 13, 42, 5);
    ctx.fill();
    rr(ctx, 4, -46, 13, 42, 5);
    ctx.fill();
    ctx.fillStyle = look.pants;
    rr(ctx, -20, -66, 18, 28, 5);
    ctx.fill();
    rr(ctx, 2, -66, 18, 28, 5);
    ctx.fill();
  } else {
    ctx.fillStyle = look.pants;
    rr(ctx, -19, -66, 16, 62, 6);
    ctx.fill();
    rr(ctx, 3, -66, 16, 62, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    rr(ctx, 11, -66, 8, 62, 4);
    ctx.fill();
  }
  if (look.socks) {
    // Sandale i čarape: međunarodni znak turista.
    ctx.fillStyle = '#fbfbf6';
    rr(ctx, -18, -24, 15, 20, 4);
    ctx.fill();
    rr(ctx, 3, -24, 15, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#7a5232';
    rr(ctx, -21, -6, 21, 7, 3);
    ctx.fill();
    rr(ctx, 1, -6, 23, 7, 3);
    ctx.fill();
    rr(ctx, -18, -13, 15, 4, 2);
    ctx.fill();
    rr(ctx, 3, -13, 15, 4, 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#2b2622';
    rr(ctx, -22, -10, 22, 11, 5);
    ctx.fill();
    rr(ctx, 1, -10, 25, 11, 5);
    ctx.fill();
  }

  // --- Stražnja ruka ---
  const shL: [number, number] = [-bw + 4, -120 + b];
  limb(ctx, shL[0], shL[1], shL[0] - 7, shL[1] + 46, 13, look.skin);
  limb(ctx, shL[0], shL[1], shL[0] - 3, shL[1] + 18, 14, look.shirt);
  ctx.fillStyle = look.skin;
  ell(ctx, shL[0] - 8, shL[1] + 50, 7.5, 7.5);
  ctx.fill();

  // --- Trup ---
  const torso = (): void => {
    rr(ctx, -bw, -130 + b, bw * 2, 74, 17);
    ctx.fill();
    ell(ctx, 3, -84 + b, bw + 3, 27);
    ctx.fill();
  };
  ctx.fillStyle = look.shirt;
  torso();
  if (look.overalls) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-bw - 8, -96 + b, bw * 2 + 16, 46);
    ctx.clip();
    ctx.fillStyle = look.overalls;
    torso();
    ctx.restore();
    ctx.fillStyle = look.overalls;
    rr(ctx, -15, -116 + b, 34, 26, 4);
    ctx.fill();
    ctx.strokeStyle = look.overalls;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-12, -114 + b);
    ctx.lineTo(-17, -130 + b);
    ctx.moveTo(16, -114 + b);
    ctx.lineTo(20, -130 + b);
    ctx.stroke();
    ctx.fillStyle = '#d7b35a';
    ell(ctx, -12, -112 + b, 2.2, 2.2);
    ctx.fill();
    ell(ctx, 16, -112 + b, 2.2, 2.2);
    ctx.fill();
    // Džep s tesarskom olovkom.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    rr(ctx, -6, -108 + b, 16, 13, 2);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    rr(ctx, 4, -116 + b, 3, 12, 1);
    ctx.fill();
  }
  if (look.vest) {
    ctx.fillStyle = look.vest;
    rr(ctx, -bw, -129 + b, 17, 68, 9);
    ctx.fill();
    rr(ctx, bw - 17, -129 + b, 17, 68, 9);
    ctx.fill();
  }
  if (!look.overalls && !look.vest) {
    // Polo ovratnik.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(-9, -130 + b);
    ctx.lineTo(2, -118 + b);
    ctx.lineTo(13, -130 + b);
    ctx.closePath();
    ctx.fill();
  }
  // Sjenčanje trupa – svjetlo dolazi slijeva.
  const tg = ctx.createLinearGradient(-bw, 0, bw + 4, 0);
  tg.addColorStop(0, 'rgba(255,255,255,0.12)');
  tg.addColorStop(0.5, 'rgba(0,0,0,0)');
  tg.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = tg;
  torso();

  // --- Vrat i glava ---
  const hx = 2;
  const hy = -151 + b;
  ctx.fillStyle = look.skinShade;
  rr(ctx, -7, -136 + b, 15, 11, 3);
  ctx.fill();
  ctx.fillStyle = look.skin;
  ell(ctx, hx - 20, hy + 1, 5, 6);
  ctx.fill();
  // Kosa iza ušiju.
  ctx.fillStyle = look.hair;
  ell(ctx, hx - 14, hy - 6, 9, 12);
  ctx.fill();
  ctx.fillStyle = look.skin;
  ell(ctx, hx, hy, 21, 21.5);
  ctx.fill();
  const hg = ctx.createRadialGradient(hx - 8, hy - 8, 4, hx, hy, 24);
  hg.addColorStop(0, 'rgba(255,255,255,0.14)');
  hg.addColorStop(0.6, 'rgba(0,0,0,0)');
  hg.addColorStop(1, 'rgba(60,20,0,0.2)');
  ctx.fillStyle = hg;
  ell(ctx, hx, hy, 21, 21.5);
  ctx.fill();

  if (look.stubble) {
    ctx.fillStyle = 'rgba(235,232,225,0.5)';
    for (let i = 0; i < 26; i++) {
      const a = 0.15 + (i / 26) * 2.6;
      const rad = 15 + ((i * 7) % 5);
      ell(ctx, hx + 4 + Math.cos(a) * rad * 0.9, hy + 4 + Math.sin(a) * rad * 0.8, 0.9, 0.9);
      ctx.fill();
    }
  }

  // Oči
  const blink = pose.t % 4.3 < 0.12;
  if (look.glasses) {
    ctx.fillStyle = '#1d1d22';
    rr(ctx, hx - 9, hy - 8, 12, 9, 3);
    ctx.fill();
    rr(ctx, hx + 6, hy - 8, 13, 9, 3);
    ctx.fill();
    ctx.strokeStyle = '#1d1d22';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hx + 3, hy - 5);
    ctx.lineTo(hx + 6, hy - 5);
    ctx.moveTo(hx - 9, hy - 5);
    ctx.lineTo(hx - 19, hy - 3);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, hx - 7, hy - 7, 4, 2.5, 1);
    ctx.fill();
    rr(ctx, hx + 8, hy - 7, 4, 2.5, 1);
    ctx.fill();
  } else if (blink) {
    ctx.strokeStyle = '#2a211b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 3);
    ctx.lineTo(hx - 1, hy - 3);
    ctx.moveTo(hx + 9, hy - 3);
    ctx.lineTo(hx + 14, hy - 3);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fffdf6';
    ell(ctx, hx - 3.5, hy - 3.5, 3.6, 3.9);
    ctx.fill();
    ell(ctx, hx + 11.5, hy - 3.5, 3.6, 3.9);
    ctx.fill();
    ctx.fillStyle = '#2a211b';
    ell(ctx, hx - 2.6, hy - 3.2, 2, 2.2);
    ctx.fill();
    ell(ctx, hx + 12.4, hy - 3.2, 2, 2.2);
    ctx.fill();
  }
  // Obrve
  if (!look.glasses) {
    ctx.strokeStyle = look.brows;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 10);
    ctx.lineTo(hx - 0.5, hy - 9);
    ctx.moveTo(hx + 8, hy - 9);
    ctx.lineTo(hx + 16, hy - 10);
    ctx.stroke();
  }
  // Nos
  ctx.fillStyle = look.skinShade;
  ell(ctx, hx + 6, hy + 3, 5.5, 6.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ell(ctx, hx + 4.5, hy + 0.5, 1.8, 2.4);
  ctx.fill();

  // Usta
  const my = hy + (look.moustache ? 14.5 : 12);
  if (pose.talk > 0.08) {
    ctx.fillStyle = '#5a1f1a';
    ell(ctx, hx + 5, my, 4.6, 1.2 + pose.talk * 4);
    ctx.fill();
  } else if (!look.moustache) {
    ctx.strokeStyle = '#8a4a3c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(hx + 5, my - 3, 5, 0.25, Math.PI - 0.25);
    ctx.stroke();
  }
  // Brk
  if (look.moustache) {
    ctx.fillStyle = look.moustache;
    ctx.beginPath();
    ctx.moveTo(hx + 5, hy + 7.5);
    ctx.bezierCurveTo(hx - 4, hy + 5, hx - 11, hy + 9, hx - 12, hy + 15);
    ctx.bezierCurveTo(hx - 6, hy + 14, hx, hy + 13.5, hx + 5, hy + 11);
    ctx.bezierCurveTo(hx + 10, hy + 13.5, hx + 16, hy + 14, hx + 22, hy + 15);
    ctx.bezierCurveTo(hx + 21, hy + 9, hx + 14, hy + 5, hx + 5, hy + 7.5);
    ctx.closePath();
    ctx.fill();
  }

  // --- Kapa / šešir ---
  if (!pose.hatless) {
    if (look.hat === 'kapa') {
      ctx.fillStyle = look.hatColor;
      ctx.beginPath();
      ctx.moveTo(hx - 22, hy - 9);
      ctx.bezierCurveTo(hx - 24, hy - 30, hx + 18, hy - 32, hx + 22, hy - 12);
      ctx.bezierCurveTo(hx + 8, hy - 16, hx - 8, hy - 15, hx - 22, hy - 9);
      ctx.closePath();
      ctx.fill();
      // Šilt kape.
      ctx.beginPath();
      ctx.moveTo(hx + 4, hy - 14.5);
      ctx.bezierCurveTo(hx + 16, hy - 17, hx + 30, hy - 13, hx + 33, hy - 8);
      ctx.bezierCurveTo(hx + 24, hy - 9, hx + 14, hy - 10, hx + 4, hy - 14.5);
      ctx.closePath();
      ctx.fillStyle = look.hatColor;
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ell(ctx, hx - 6, hy - 22, 9, 4, -0.2);
      ctx.fill();
    } else if (look.hat === 'bereta') {
      ctx.fillStyle = look.hatColor;
      ctx.beginPath();
      ctx.moveTo(hx - 23, hy - 10);
      ctx.bezierCurveTo(hx - 30, hy - 30, hx + 22, hy - 34, hx + 24, hy - 13);
      ctx.bezierCurveTo(hx + 8, hy - 17, hx - 8, hy - 16, hx - 23, hy - 10);
      ctx.closePath();
      ctx.fill();
      rr(ctx, hx - 3, hy - 32, 4, 5, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ell(ctx, hx - 8, hy - 23, 9, 4, -0.2);
      ctx.fill();
    } else {
      ctx.fillStyle = look.hatColor;
      ell(ctx, hx + 1, hy - 14, 36, 8.5, -0.05);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ell(ctx, hx + 1, hy - 12.5, 36, 7, -0.05);
      ctx.fill();
      ctx.fillStyle = look.hatColor;
      rr(ctx, hx - 16, hy - 37, 34, 25, 10);
      ctx.fill();
      ctx.fillStyle = look.hatBand ?? '#333';
      rr(ctx, hx - 16, hy - 22, 34, 6, 1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,105,40,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(hx - 13 + i * 9, hy - 35);
        ctx.lineTo(hx - 11 + i * 9, hy - 24);
        ctx.stroke();
      }
    }
  } else {
    // Bez šešira: proćelava istina.
    ctx.fillStyle = look.hair;
    ell(ctx, hx - 2, hy - 17, 15, 6, -0.1);
    ctx.fill();
  }

  // --- Prednja ruka s alatom ---
  const shR: [number, number] = [bw - 5, -119 + b];
  let ang = 0.28; // 0 = ruka visi ravno dolje, pozitivno = naprijed
  if (look.tool === 'mlat') {
    const sw = pose.swing;
    if (sw > 0) {
      // Zamah: gore pa snažno dolje.
      ang = sw < 0.45 ? 0.28 + (sw / 0.45) * 2.3 : 2.58 - ((sw - 0.45) / 0.55) * 1.5;
    } else {
      ang = 0.5 + Math.sin(pose.t * 1.3) * 0.04;
    }
  } else if (look.tool === 'mobitel') {
    ang = 1.9 + Math.sin(pose.t * 0.9) * 0.05;
  } else if (look.tool === 'stap') {
    ang = 0.62;
  }
  const len = 50;
  const hxR = shR[0] + Math.sin(ang) * len;
  const hyR = shR[1] + Math.cos(ang) * len;

  if (look.tool === 'stap') {
    limb(ctx, hxR + 2, hyR - 12, hxR + 8, 0, 4.5, '#6b4a2e');
    limb(ctx, hxR + 2, hyR - 12, hxR - 6, hyR - 14, 4.5, '#6b4a2e');
  }
  if (look.tool === 'mlat') {
    const ta = ang + 1.25;
    const tx = hxR + Math.sin(ta) * 30;
    const ty = hyR + Math.cos(ta) * 30;
    limb(ctx, hxR - Math.sin(ta) * 6, hyR - Math.cos(ta) * 6, tx, ty, 5, '#8a6238');
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(-ta);
    ctx.fillStyle = '#59606b';
    rr(ctx, -13, -8, 26, 16, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    rr(ctx, -13, -8, 26, 5, 3);
    ctx.fill();
    ctx.restore();
  }
  limb(ctx, shR[0], shR[1], hxR, hyR, 13, look.skin);
  limb(ctx, shR[0], shR[1], shR[0] + Math.sin(ang) * 20, shR[1] + Math.cos(ang) * 20, 14.5, look.shirt);
  ctx.fillStyle = look.skin;
  ell(ctx, hxR, hyR, 8, 8);
  ctx.fill();
  if (look.tool === 'mobitel') {
    ctx.save();
    ctx.translate(hxR + 2, hyR - 9);
    ctx.rotate(0.25);
    ctx.fillStyle = '#20232b';
    rr(ctx, -6, -11, 12, 21, 2.5);
    ctx.fill();
    ctx.fillStyle = '#7fd0ff';
    rr(ctx, -4.5, -9, 9, 15, 1.5);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/** Portret (glava i ramena) za dijaloški okvir. */
export function drawPortrait(
  ctx: CanvasRenderingContext2D,
  look: Look,
  size: number,
  t: number,
  talk: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  const s = size / 92;
  drawPerson(ctx, look, size * 0.47, size * 0.52 + 151 * s, s, { t, talk, swing: 0, face: 1 }, false);
  ctx.restore();
}

/** Koza Bilka. */
export function drawGoat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
  face: 1 | -1,
  walking: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(48,24,10,0.24)';
  ell(ctx, 0, 2 * s, 34 * s, 7 * s);
  ctx.fill();
  ctx.scale(s * face, s);
  const step = walking ? Math.sin(t * 14) : 0;
  const bob = walking ? Math.abs(Math.sin(t * 14)) * -2 : Math.sin(t * 1.7) * 0.6;

  const leg = (lx: number, phase: number): void => {
    const off = step * phase * 5;
    limb(ctx, lx, -22 + bob, lx + off, -3, 5, '#e9e4d8');
    limb(ctx, lx + off, -4, lx + off, -1, 5.5, '#3a322b');
  };
  leg(-16, 1);
  leg(14, -1);
  // Rep
  limb(ctx, -25, -34 + bob, -31, -42 + bob + Math.sin(t * 6) * 2, 5, '#f4f0e6');
  // Tijelo
  ctx.fillStyle = '#f7f3ea';
  ell(ctx, 0, -30 + bob, 27, 15);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -45, 0, -15);
  g.addColorStop(0, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(90,70,50,0.25)');
  ctx.fillStyle = g;
  ell(ctx, 0, -30 + bob, 27, 15);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,120,80,0.35)';
  ell(ctx, -8, -34 + bob, 9, 6, 0.3);
  ctx.fill();
  leg(-10, -1);
  leg(20, 1);
  // Vrat i glava
  limb(ctx, 20, -36 + bob, 30, -50 + bob, 11, '#f7f3ea');
  ctx.fillStyle = '#f7f3ea';
  ell(ctx, 36, -53 + bob, 12, 8, 0.35);
  ctx.fill();
  ctx.fillStyle = '#e6c9b8';
  ell(ctx, 45, -49 + bob, 4.5, 3.6, 0.35);
  ctx.fill();
  // Rogovi
  ctx.strokeStyle = '#8a7a66';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(30, -60 + bob);
  ctx.quadraticCurveTo(24, -72 + bob, 16, -70 + bob);
  ctx.moveTo(34, -61 + bob);
  ctx.quadraticCurveTo(30, -75 + bob, 21, -76 + bob);
  ctx.stroke();
  // Uho
  ctx.fillStyle = '#e9dccb';
  ell(ctx, 27, -55 + bob, 6, 3, -0.5);
  ctx.fill();
  // Oko – vodoravna zjenica, pogled pun prezira.
  ctx.fillStyle = '#e8c15a';
  ell(ctx, 37, -55 + bob, 2.6, 2.3);
  ctx.fill();
  ctx.fillStyle = '#1f1a16';
  rr(ctx, 35.3, -55.8 + bob, 3.4, 1.5, 0.7);
  ctx.fill();
  // Bradica
  limb(ctx, 40, -46 + bob, 39, -38 + bob + Math.sin(t * 3) * 0.8, 3, '#e9e4d8');
  // Zvonce
  ctx.fillStyle = '#c9a23a';
  ell(ctx, 27, -40 + bob, 3, 3.4);
  ctx.fill();
  ctx.restore();
}
