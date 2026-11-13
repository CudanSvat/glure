import { Sfx } from './audio';
import { Dialogue, type ChoiceKind } from './dialogue';
import { D, LOGICAL_H, LOGICAL_W, RH, SL, U, proj, wallOrigin, type Origin } from './iso';
import { drawGoat, drawPerson, GLURE, SIME, STEF, type Look } from './people';
import { clamp, lerp, mulberry32, pick, rand, type Rng } from './rng';
import { drawAtmosphere, drawBackground, drawWind, type SceneKind, type View } from './scene';
import {
  FINALE,
  GLURE_QUIPS,
  HONESTY_QUIPS,
  JOBS,
  PROLOG,
  T,
  type JobDef,
  type JobEvent,
  type Who,
} from './script';
import { clearSpriteCache, drawSprite, stoneSprite } from './sprites';
import { knownCracked, Wall, type Analysis, type Placed, type Preview, type StoneDef } from './wall';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
const eur = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('hr-HR')} €`;
const clock = (min: number): string => {
  const m = Math.round(min);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

interface Floater {
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  max: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  chip: boolean;
  rot: number;
  vr: number;
}

interface Bubble {
  who: Who;
  text: string;
  life: number;
}

interface Falling {
  stone: StoneDef;
  col: number;
  row: number;
  z: number;
  v: number;
  preview: Preview;
}

interface Tossed {
  stone: StoneDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
}

interface TestState {
  kind: 'koza' | 'bura';
  t: number;
  checked: Set<number>;
  breaks: number;
  creaks: number;
  done: () => void;
  finished: boolean;
  goat: { x: number; y: number; face: 1 | -1; walking: boolean };
  hat: { x: number; y: number; vx: number; vy: number; rot: number } | null;
}

interface Play {
  job: JobDef;
  wall: Wall;
  origin: Origin;
  rng: Rng;
  hand: (StoneDef | null)[];
  sel: number;
  col: number;
  colSmooth: number;
  time: number;
  shownTime: number;
  nextId: number;
  drawn: number;
  input: boolean;
  busy: boolean;
  fired: Set<string>;
  falling: Falling | null;
  tossed: Tossed[];
  placedCount: number;
  scrapCaught: number;
  scrapFlag: boolean;
  lies: number;
  brutal: number;
  swing: number;
  hintsShown: Set<string>;
  done: ((reason: 'done' | 'fajrunt') => void) | null;
  test: TestState | null;
  hatless: boolean;
  goatPos: { x: number; y: number; face: 1 | -1 };
  wind: number;
}

interface BillRow {
  label: string;
  value: string;
  kind: 'base' | 'minus' | 'note' | 'tip';
}

interface JobResult {
  job: JobDef;
  analysis: Analysis;
  rows: BillRow[];
  total: number;
  stars: number;
  quote: string;
  lies: number;
  scrap: number;
}

const CLIENT_LOOK: Record<'sime' | 'stef', Look> = { sime: SIME, stef: STEF };

export class Game {
  private canvas = $<HTMLCanvasElement>('scene');
  private ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  private view: View = { scale: 1, ox: 0, oy: 0, left: 0, top: 0, right: LOGICAL_W, bottom: LOGICAL_H };
  private dpr = 1;
  private t = 0;
  private last = 0;
  private par = 0;
  private parTarget = 0;
  private shake = 0;
  private camY = 0;
  private drawView: View = this.view;

  private sfx = new Sfx();
  private dialogue: Dialogue;

  private mode: 'title' | 'job' = 'title';
  private scene: SceneKind = 'maslinik';
  private play: Play | null = null;
  private titleWall: Wall;
  private titleOrigin: Origin = { x: 700, y: 512 };

  private floaters: Floater[] = [];
  private particles: Particle[] = [];
  private bubbles: Bubble[] = [];
  private results: JobResult[] = [];
  private totalLies = 0;
  private honestyIdx = 0;
  private hintTimer = 0;
  private cardEls: HTMLButtonElement[] = [];
  private overlayOpen = false;

  constructor() {
    this.dialogue = new Dialogue(
      this.sfx,
      () => this.onLie(),
      (k) => this.onPick(k),
    );
    this.titleWall = this.buildTitleWall();
    this.bind();
    this.resize();
    this.updateSoundLabels();
    requestAnimationFrame((ts) => this.frame(ts));
    void this.runGame();
  }

  // ---------------------------------------------------------------- tok igre

  private async runGame(): Promise<void> {
    for (;;) {
      await this.showTitle();
      await this.fade(true);
      $('title').classList.add('hidden');
      this.results = [];
      this.totalLies = 0;
      this.mode = 'job';
      this.setupPlay(JOBS[0] as JobDef);
      this.sfx.startAmbient();
      await this.fade(false);
      await this.dialogue.run(PROLOG);
      for (let i = 0; i < JOBS.length; i++) {
        const job = JOBS[i] as JobDef;
        if (i > 0) {
          await this.fade(true);
          this.setupPlay(job);
          await this.fade(false);
        }
        this.results.push(await this.playJob(job));
      }
      await this.dialogue.run(FINALE);
      await this.showFinale();
      await this.fade(true);
      $('hud').classList.add('hidden');
      this.play = null;
      this.mode = 'title';
      this.scene = 'maslinik';
      this.floaters = [];
      this.particles = [];
      this.bubbles = [];
      this.sfx.stopAmbient();
      $('title').classList.remove('hidden');
      await this.fade(false);
    }
  }

  private showTitle(): Promise<void> {
    return new Promise((resolve) => {
      const btn = $('btn-start');
      const go = (): void => {
        btn.removeEventListener('click', go);
        this.sfx.unlock();
        this.sfx.click();
        resolve();
      };
      btn.addEventListener('click', go);
    });
  }

  private async fade(on: boolean): Promise<void> {
    $('fade').classList.toggle('on', on);
    await wait(480);
  }

  private async showBanner(job: JobDef): Promise<void> {
    $('banner-no').textContent = `Posao ${job.no}.`;
    $('banner-title').textContent = job.title;
    $('banner-place').textContent = `${job.place} · ${clock(job.startMin)}`;
    const el = $('banner');
    el.classList.remove('hidden');
    await wait(2500);
    el.classList.add('hidden');
  }

  private setupPlay(job: JobDef): void {
    clearSpriteCache();
    const wall = new Wall(job.W, job.H, job.door);
    const origin = wallOrigin(job.W, job.H);
    const clientX = origin.x + job.W * U + 150;
    const clientY = origin.y + job.W * U * SL + 68;
    const p: Play = {
      job,
      wall,
      origin,
      rng: mulberry32((Date.now() ^ (job.no * 7919)) >>> 0),
      hand: [null, null, null],
      sel: 0,
      col: Math.floor(job.W / 2) - 1,
      colSmooth: Math.floor(job.W / 2) - 1,
      time: job.startMin,
      shownTime: job.startMin,
      nextId: 1,
      drawn: 0,
      input: false,
      busy: false,
      fired: new Set(),
      falling: null,
      tossed: [],
      placedCount: 0,
      scrapCaught: 0,
      scrapFlag: false,
      lies: 0,
      brutal: 0,
      swing: 0,
      hintsShown: new Set(),
      done: null,
      test: null,
      hatless: false,
      goatPos: { x: clientX + 96, y: clientY + 38, face: -1 },
      wind: 0,
    };
    this.play = p;
    this.scene = job.scene;
    this.floaters = [];
    this.particles = [];
    this.bubbles = [];
    for (let i = 0; i < 3; i++) p.hand[i] = this.drawStone(p);
    $('hud-no').textContent = `Posao ${job.no}.`;
    $('hud-title').textContent = job.title;
    $('hud-end').textContent = `fajrunt u ${clock(job.endMin)}`;
    $('hud-time').textContent = clock(job.startMin);
    $('hud-day').style.width = '0%';
    $('hud-day').classList.remove('late');
    $('hud').classList.remove('hidden');
    $('hand').classList.add('hidden');
    this.hideHint();
    this.renderCards();
    this.updateHud();
  }

  private async playJob(job: JobDef): Promise<JobResult> {
    const p = this.play as Play;
    await this.showBanner(job);
    await this.dialogue.run(job.intro);
    $('hand').classList.remove('hidden');
    p.input = true;
    this.hint(job.no === 1 ? 'start' : 'tap', job.no === 1 ? T.hintStart : T.hintTap);

    const reason = await new Promise<'done' | 'fajrunt'>((resolve) => {
      p.done = resolve;
    });
    p.input = false;
    $('hand').classList.add('hidden');
    this.hideHint();
    await wait(500);
    await this.dialogue.run(reason === 'fajrunt' ? job.fajrunt : job.testIntro.slice(0, 1));
    await this.dialogue.run(job.testIntro.slice(1));
    await this.runTest(p);
    const a = p.wall.analyze();
    await this.dialogue.run(a.quality >= 88 ? job.verdict.great : a.quality >= 62 ? job.verdict.ok : job.verdict.poor);
    const result = this.makeBill(p, a);
    await this.showBill(result);
    return result;
  }

  // ------------------------------------------------------------------ gomila

  private drawStone(p: Play): StoneDef {
    const { job, rng, wall } = p;
    const idx = p.drawn++;
    const widths = [1, 2, 3, 4].filter((k) => (job.weights[k - 1] ?? 0) > 0);
    const fit = widths.filter((k) => wall.fitsClean(k));
    const pool = rng() < 0.72 && fit.length ? fit : widths;
    const inHand = p.hand.filter((s): s is StoneDef => !!s).map((s) => s.w);

    const weighted = (): number => {
      const total = pool.reduce((sum, k) => sum + (job.weights[k - 1] ?? 0), 0);
      let roll = rng() * total;
      for (const k of pool) {
        roll -= job.weights[k - 1] ?? 0;
        if (roll <= 0) return k;
      }
      return pool[pool.length - 1] as number;
    };
    let w = weighted();
    // Malo raznolikosti: izbjegni tri ista kamena na gomili.
    if (inHand.filter((k) => k === w).length >= 2 && pool.length > 1) w = weighted();
    // Dok nadvoj nije postavljen, neka se kamen od 4 pedlja češće nađe pri ruci.
    const d = job.door;
    if (d && wall.get(d.col, d.h) === 0 && !inHand.includes(4) && wall.fitsClean(4) && rng() < 0.45) w = 4;

    let crack: StoneDef['crack'] = 'none';
    const roll = rng();
    if (job.no === 1 && idx === 5) crack = 'visible';
    else if (idx >= 4) {
      if (roll < job.crackVisible) crack = 'visible';
      else if (roll < job.crackVisible + job.crackHidden) crack = 'hidden';
    }
    return { id: p.nextId++, w, crack, tapped: false, seed: Math.floor(rng() * 1e9) };
  }

  private renderCards(): void {
    const p = this.play;
    const host = $('cards');
    if (!p) return;
    if (this.cardEls.length === 0) {
      for (let i = 0; i < 3; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'card';
        b.innerHTML =
          '<kbd></kbd><canvas width="320" height="150"></canvas><span class="card-span"></span><span class="badge"></span>';
        (b.querySelector('kbd') as HTMLElement).textContent = String(i + 1);
        b.addEventListener('click', () => this.select(i));
        host.appendChild(b);
        this.cardEls.push(b);
      }
    }
    this.cardEls.forEach((el, i) => {
      const st = p.hand[i];
      el.classList.toggle('selected', i === p.sel);
      const cv = el.querySelector('canvas') as HTMLCanvasElement;
      const c = cv.getContext('2d') as CanvasRenderingContext2D;
      c.clearRect(0, 0, cv.width, cv.height);
      const span = el.querySelector('.card-span') as HTMLElement;
      const badge = el.querySelector('.badge') as HTMLElement;
      if (!st) {
        span.textContent = '';
        badge.textContent = '';
        badge.className = 'badge';
        return;
      }
      const spr = stoneSprite(st, st.crack === 'visible' || st.tapped);
      const k = 1.16;
      const w = spr.w * k;
      const h = spr.h * k;
      c.drawImage(spr.canvas, (cv.width - w) / 2, (cv.height - h) / 2 + 4, w, h);
      span.textContent = T.spans[st.w] ?? '';
      const bad = knownCracked(st);
      const ok = st.tapped && st.crack === 'none';
      badge.textContent = bad ? T.badgeBad : ok ? T.badgeOk : T.badgeUnknown;
      badge.className = `badge ${bad ? 'bad' : ok ? 'ok' : 'unknown'}`;
      if (el.dataset.id !== String(st.id)) {
        el.dataset.id = String(st.id);
        el.classList.remove('pop');
        void el.offsetWidth;
        el.classList.add('pop');
      }
    });
  }

  private select(i: number): void {
    const p = this.play;
    if (!p || !p.input || !p.hand[i]) return;
    p.sel = i;
    const st = p.hand[i] as StoneDef;
    p.col = clamp(p.col, 0, p.wall.W - st.w);
    this.sfx.click();
    this.renderCards();
  }

  // ------------------------------------------------------------------ radnje

  private canAct(): Play | null {
    const p = this.play;
    if (!p || !p.input || p.busy || this.dialogue.active || this.overlayOpen) return null;
    return p;
  }

  private tryPlace(): void {
    const p = this.canAct();
    if (!p) return;
    const st = p.hand[p.sel];
    if (!st) return;
    const o = p.origin;
    const holdZ = p.wall.H + 0.75;
    const [fx, fy] = proj(o, p.col + st.w / 2, 0, holdZ + 0.6);
    if (knownCracked(st)) {
      this.sfx.nope();
      this.float(T.refuse, fx, fy, '#ffb4a0', 22);
      this.hint('refuse', T.refuseHint, true);
      this.say('glure', 'Škart ne ugrađujen. Ni za boga.');
      return;
    }
    const pv = p.wall.preview(p.col, st.w);
    if (!pv.valid) {
      this.sfx.nope();
      this.float(T.tooHigh, fx, fy, '#ffb4a0', 20);
      return;
    }
    p.busy = true;
    p.swing = 0.001;
    p.hand[p.sel] = null;
    p.falling = { stone: st, col: p.col, row: pv.row, z: holdZ, v: 0, preview: pv };
    this.renderCards();
  }

  private land(p: Play, f: Falling): void {
    p.falling = null;
    const res = p.wall.place(f.stone, f.col);
    if (!res) {
      p.busy = false;
      return;
    }
    const pv = f.preview;
    p.placedCount++;
    p.time += 10;
    const o = p.origin;
    const [cx, cy] = proj(o, f.col + f.stone.w / 2, 0, f.row + 1.25);
    this.sfx.thud();
    this.shake = Math.max(this.shake, 2 + f.stone.w * 1.2);
    for (let i = 0; i < 6 + f.stone.w * 4; i++) {
      const [px, py] = proj(o, f.col + Math.random() * f.stone.w, -0.05, f.row + 0.05);
      this.dust(px, py);
    }
    const perfectLintel = pv.lintel && pv.holes === 0 && pv.aligned === 0;
    if (pv.holes > 0 || pv.aligned > 0) {
      window.setTimeout(() => this.sfx.bad(), 90);
      const parts: string[] = [];
      if (pv.aligned > 0) parts.push(T.aligned);
      if (pv.holes > 0) parts.push(T.hole);
      this.float(parts.join(' '), cx, cy, '#ff8f70', 24);
    } else if (perfectLintel) {
      window.setTimeout(() => this.sfx.great(), 90);
      this.float(T.lintel, cx, cy, '#ffe08a', 26);
    } else if (pv.covered > 0) {
      window.setTimeout(() => this.sfx.good(), 90);
      this.float(T.overlap, cx, cy, '#b9f5a8', 24);
    } else {
      this.float(f.row === 0 ? T.foundation : T.seated, cx, cy, '#fff6dc', 20);
    }
    const d = p.job.door;
    if (d && f.row === d.h && !perfectLintel && f.col < d.col + d.w && f.col + f.stone.w > d.col) {
      this.float(T.lintelBad, cx, cy - 30, '#ff8f70', 22);
    }
    p.hand[p.sel] = this.drawStone(p);
    this.autoSelect(p);
    this.renderCards();
    void this.afterAction(p);
  }

  private autoSelect(p: Play): void {
    const st = p.hand[p.sel];
    if (st) p.col = clamp(p.col, 0, p.wall.W - st.w);
  }

  private tryTap(): void {
    const p = this.canAct();
    if (!p) return;
    const st = p.hand[p.sel];
    if (!st) return;
    const [fx, fy] = proj(p.origin, p.col + st.w / 2, 0, p.wall.H + 1.9);
    if (st.crack === 'visible') {
      this.sfx.nope();
      this.float(T.alreadyVisible, fx, fy, '#fff6dc', 20);
      return;
    }
    if (st.tapped) {
      this.sfx.nope();
      this.float(T.already, fx, fy, '#fff6dc', 20);
      return;
    }
    st.tapped = true;
    p.time += 5;
    p.swing = 0.3;
    if (st.crack === 'hidden') {
      this.sfx.tup();
      this.float(T.tup, fx, fy, '#ff8f70', 26);
      this.shake = Math.max(this.shake, 2);
    } else {
      this.sfx.tink();
      this.float(T.tink, fx, fy, '#bfeaff', 26);
    }
    this.renderCards();
    void this.afterAction(p);
  }

  private tryScrap(): void {
    const p = this.canAct();
    if (!p) return;
    const st = p.hand[p.sel];
    if (!st) return;
    const [sx, sy] = proj(p.origin, p.col, 0, p.wall.H + 0.75);
    const [fx, fy] = proj(p.origin, p.col + st.w / 2, 0, p.wall.H + 1.9);
    p.time += 5;
    this.sfx.toss();
    p.tossed.push({ stone: st, x: sx, y: sy, vx: -620, vy: -380, rot: 0, vr: -5, life: 1.1 });
    if (st.crack !== 'none') {
      p.scrapCaught++;
      p.scrapFlag = true;
      this.float(knownCracked(st) ? T.toScrap : T.goodNose, fx, fy, '#b9f5a8', 24);
      if (!knownCracked(st)) this.sfx.good();
    } else {
      this.float(T.returned, fx, fy, '#fff6dc', 20);
    }
    p.hand[p.sel] = this.drawStone(p);
    this.autoSelect(p);
    this.renderCards();
    void this.afterAction(p);
  }

  private async afterAction(p: Play): Promise<void> {
    this.updateHud();
    p.busy = true;
    await wait(260);
    const a = p.wall.analyze();
    const progress = a.filled / a.total;
    if (!a.complete) {
      for (const ev of p.job.events) {
        if (p.fired.has(ev.id)) continue;
        if (!this.triggered(p, ev, progress)) continue;
        p.fired.add(ev.id);
        await this.runEvent(p, ev);
      }
    }
    if (a.complete) {
      p.done?.('done');
      p.done = null;
      return;
    }
    if (p.time >= p.job.endMin) {
      p.done?.('fajrunt');
      p.done = null;
      return;
    }
    p.busy = false;
    this.contextHints(p);
  }

  private triggered(p: Play, ev: JobEvent, progress: number): boolean {
    if (ev.at === 'marenda') return p.time >= 10 * 60;
    if (ev.at === 'skart') return p.scrapFlag;
    return progress >= ev.at;
  }

  private async runEvent(p: Play, ev: JobEvent): Promise<void> {
    p.input = false;
    $('hand').classList.add('hidden');
    this.hideHint();
    await this.dialogue.run(ev.script);
    if (ev.at === 'marenda') {
      p.time += 30;
      this.updateHud();
    }
    $('hand').classList.remove('hidden');
    p.input = true;
  }

  private contextHints(p: Play): void {
    const hand = p.hand.filter((s): s is StoneDef => !!s);
    if (hand.some((s) => s.crack === 'visible')) this.hint('crack', T.hintCrack);
    else if (p.placedCount >= 3) this.hint('bond', T.hintBond);
    const d = p.job.door;
    if (d && (p.wall.height(d.col - 1) >= d.h - 1 || p.wall.height(d.col + d.w) >= d.h - 1)) {
      this.hint('lintel', T.hintLintel);
    }
  }

  private hint(id: string, text: string, force = false): void {
    const p = this.play;
    if (!p) return;
    if (!force && p.hintsShown.has(id)) return;
    p.hintsShown.add(id);
    $('hint-text').textContent = text;
    const el = $('hint');
    el.classList.remove('hidden');
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    this.hintTimer = 13;
  }

  private hideHint(): void {
    $('hint').classList.add('hidden');
    this.hintTimer = 0;
  }

  private onLie(): void {
    this.totalLies++;
    if (this.play) this.play.lies++;
    const el = $('hud-honesty');
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  private onPick(kind: ChoiceKind): void {
    if (kind === 'brutal' && this.play) this.play.brutal++;
  }

  // -------------------------------------------------------------------- proba

  private runTest(p: Play): Promise<void> {
    return new Promise((resolve) => {
      const [gx, gy] = [p.goatPos.x, p.goatPos.y];
      p.test = {
        kind: p.job.test,
        t: 0,
        checked: new Set(),
        breaks: 0,
        creaks: 0,
        done: resolve,
        finished: false,
        goat: { x: gx, y: gy, face: -1, walking: false },
        hat: null,
      };
      if (p.job.test === 'koza') this.sfx.goat();
      else this.sfx.wind(6.2);
    });
  }

  private checkColumn(p: Play, c: number): void {
    const test = p.test as TestState;
    if (test.checked.has(c)) return;
    test.checked.add(c);
    const o = p.origin;
    for (let r = p.wall.H - 1; r >= 0; r--) {
      const id = p.wall.get(c, r);
      if (id > 0) {
        const pl = p.wall.placed.get(id) as Placed;
        if (pl.stone.crack !== 'none' && !pl.broken) {
          pl.broken = true;
          test.breaks++;
          const [x, y] = proj(o, pl.col + pl.stone.w / 2, 0, pl.row + 0.5);
          this.sfx.crumble();
          this.shake = Math.max(this.shake, 7);
          this.float(T.crack, x, y - 20, '#ff8f70', 28);
          for (let i = 0; i < 14; i++) this.chip(x + rand(Math.random, -20, 20), y + rand(Math.random, -12, 12));
          for (let i = 0; i < 8; i++) this.dust(x + rand(Math.random, -24, 24), y + 10);
        }
      } else if (p.wall.isHole(c, r)) {
        test.creaks++;
        const [x, y] = proj(o, c + 0.5, 0, r + 0.5);
        for (let i = 0; i < 6; i++) this.dust(x + rand(Math.random, -10, 10), y);
        this.shake = Math.max(this.shake, 3);
        this.sfx.tup();
      }
    }
  }

  private updateTest(p: Play, dt: number): void {
    const test = p.test;
    if (!test || test.finished) return;
    test.t += dt;
    const t = test.t;
    const o = p.origin;
    const W = p.wall.W;
    const topAt = (x: number): number => {
      const c = clamp(Math.floor(x), 0, W - 1);
      return p.wall.height(c);
    };

    if (test.kind === 'koza') {
      const start = p.goatPos;
      const jumpIn = 0.9;
      const speed = 2.3;
      const walkDur = (W - 1) / speed;
      const g = test.goat;
      if (t < 0.5) {
        g.x = start.x;
        g.y = start.y;
        g.walking = false;
      } else if (t < 0.5 + jumpIn) {
        const k = (t - 0.5) / jumpIn;
        const [tx, ty] = proj(o, W - 0.5, D / 2, topAt(W - 0.5));
        g.x = lerp(start.x, tx, k);
        g.y = lerp(start.y, ty, k) - Math.sin(k * Math.PI) * 150;
        g.walking = true;
      } else if (t < 0.5 + jumpIn + walkDur) {
        const wx = W - 0.5 - (t - 0.5 - jumpIn) * speed;
        const [tx, ty] = proj(o, wx, D / 2, topAt(wx));
        g.x = tx;
        g.y = lerp(g.y, ty, Math.min(1, dt * 14));
        g.walking = true;
        this.checkColumn(p, clamp(Math.floor(wx), 0, W - 1));
        if (wx < 1) this.checkColumn(p, 0);
      } else if (t < 0.5 + jumpIn + walkDur + 0.8) {
        const k = (t - 0.5 - jumpIn - walkDur) / 0.8;
        const [sx, sy] = proj(o, 0.5, D / 2, topAt(0.5));
        const [tx, ty] = proj(o, -1.7, 1.6, 0);
        g.x = lerp(sx, tx, k);
        g.y = lerp(sy, ty, k) - Math.sin(k * Math.PI) * 70;
        g.walking = true;
      } else {
        const [tx, ty] = proj(o, -1.7, 1.6, 0);
        g.x = tx;
        g.y = ty;
        g.face = 1;
        g.walking = false;
        if (t > 0.5 + jumpIn + walkDur + 0.8 + 0.15 && !test.checked.has(-1)) {
          test.checked.add(-1);
          this.sfx.goat();
          this.say(p.job.client, test.breaks > 0 ? 'Bilka! Šta si mi to našla?!' : 'Bravo, Bilka.');
        }
        if (t > 0.5 + jumpIn + walkDur + 2.2) this.finishTest(p);
      }
    } else {
      const dur = 6.2;
      p.wind = t < 1 ? t : t > dur - 1.2 ? Math.max(0, (dur - t) / 1.2) : 1;
      this.shake = Math.max(this.shake, p.wind * 1.6);
      if (t > 1.3 && !p.hatless) {
        p.hatless = true;
        const cx = o.x + W * U + 150;
        const cy = o.y + W * U * SL + 68;
        test.hat = { x: cx, y: cy - 172, vx: -520, vy: -260, rot: 0 };
        this.say('stef', 'Moj šešir! Platil sam ga četrdeset eura!');
      }
      if (test.hat) {
        const h = test.hat;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.vy += 120 * dt;
        h.vy += Math.sin(t * 9) * 600 * dt;
        h.rot -= 7 * dt;
      }
      // Bura puše zdesna nalijevo, stupac po stupac.
      const k = clamp((t - 1.6) / 3.2, 0, 1);
      if (t > 1.6) {
        const upTo = W - 1 - Math.floor(k * (W - 1));
        for (let c = W - 1; c >= upTo; c--) this.checkColumn(p, c);
      }
      if (t > dur + 0.4) {
        p.wind = 0;
        this.finishTest(p);
      }
    }
  }

  private finishTest(p: Play): void {
    const test = p.test;
    if (!test || test.finished) return;
    test.finished = true;
    p.goatPos = { x: test.goat.x, y: test.goat.y, face: 1 };
    test.done();
  }

  // -------------------------------------------------------------------- račun

  private makeBill(p: Play, a: Analysis): JobResult {
    const job = p.job;
    const rows: BillRow[] = [];
    let total = job.price;
    rows.push({ label: `${job.title} – ${job.dims} (ugovoreno)`, value: eur(job.price), kind: 'base' });
    const minus = (label: string, amount: number): void => {
      if (amount <= 0) return;
      total -= amount;
      rows.push({ label, value: eur(-amount), kind: 'minus' });
    };
    if (a.unfilled > 0) {
      minus(`Nesazidano (${a.unfilled} polja) – ne naplaćuje se`, Math.round((job.price * a.unfilled) / a.total));
    }
    minus(`Fuga na fugu (${a.aligned}×) – Glure sam sebi odbija`, a.aligned * job.fines.aligned);
    minus(`Rupe u zidu (${a.holes}×)`, a.holes * job.fines.hole);
    minus(`Šupalj kamen ugrađen iz nemara (${a.cracked}×)`, a.cracked * job.fines.cracked);
    if (job.door && !a.lintelOk) minus('Nadvoj ne leži na zidu s obje strane – sramota', job.fines.lintel);
    if (rows.length === 1) rows.push({ label: 'Odbici: nema. Glure je zadovoljan (ne pokazuje).', value: '—', kind: 'note' });
    if (p.fired.has('marenda')) rows.push({ label: 'Marenda (pola sata) – nije rad', value: eur(0), kind: 'note' });
    if (p.scrapCaught > 0) {
      rows.push({ label: `Škart izdvojen na vrijeme (${p.scrapCaught} kom.)`, value: 'u cijeni', kind: 'note' });
    }
    if (p.lies > 0) {
      rows.push({ label: `Pokušaji laganja (${p.lies}×) – neuspjeli`, value: eur(0), kind: 'note' });
    }
    const tier = a.quality >= 88 ? 'great' : a.quality >= 62 ? 'ok' : 'poor';
    const rude = p.brutal >= 2;
    const tipValue = tier === 'great' ? (rude ? job.tip.greatRude : job.tip.great) : tier === 'ok' ? job.tip.ok : job.tip.poor;
    rows.push({ label: job.tip.label, value: tipValue, kind: 'tip' });
    total = Math.max(0, total);
    const stars = a.quality >= 90 ? 5 : a.quality >= 75 ? 4 : a.quality >= 60 ? 3 : a.quality >= 40 ? 2 : 1;
    return { job, analysis: a, rows, total, stars, quote: job.billQuote[tier], lies: p.lies, scrap: p.scrapCaught };
  }

  private async showBill(r: JobResult): Promise<void> {
    this.overlayOpen = true;
    $('bill-no').textContent = `br. ${String(r.job.no).padStart(3, '0')}`;
    $('bill-job').textContent = `Naručitelj: ${r.job.clientFull}`;
    const body = $('bill-rows');
    body.replaceChildren();
    $('bill-total').textContent = eur(r.total);
    $('bill-q').textContent = `${r.analysis.quality} %`;
    const stars = $('bill-stars');
    stars.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const sEl = document.createElement('i');
      sEl.className = i < r.stars ? 'pebble on' : 'pebble';
      stars.appendChild(sEl);
    }
    $('bill-quote').textContent = r.quote;
    const foot = $('bill-foot');
    foot.classList.remove('show');
    const stamp = $('bill-stamp');
    stamp.classList.remove('show');
    $('bill').classList.remove('hidden');
    for (const row of r.rows) {
      await wait(360);
      const tr = document.createElement('tr');
      tr.className = `row-${row.kind}`;
      const td1 = document.createElement('td');
      td1.textContent = row.label;
      const td2 = document.createElement('td');
      td2.textContent = row.value;
      tr.append(td1, td2);
      body.appendChild(tr);
      this.sfx.click();
    }
    await wait(450);
    foot.classList.add('show');
    await wait(500);
    stamp.classList.add('show');
    this.sfx.stamp();
    this.shake = 6;
    await new Promise<void>((resolve) => {
      const btn = $('bill-next');
      const go = (): void => {
        btn.removeEventListener('click', go);
        this.sfx.click();
        resolve();
      };
      btn.addEventListener('click', go);
    });
    $('bill').classList.add('hidden');
    this.overlayOpen = false;
  }

  private async showFinale(): Promise<void> {
    this.overlayOpen = true;
    const total = this.results.reduce((s, r) => s + r.total, 0);
    const avg = Math.round(this.results.reduce((s, r) => s + r.analysis.quality, 0) / Math.max(1, this.results.length));
    const aligned = this.results.reduce((s, r) => s + r.analysis.aligned, 0);
    const scrap = this.results.reduce((s, r) => s + r.scrap, 0);
    let rank: string;
    let text: string;
    if (avg >= 90) {
      rank = 'Meštar od kamena';
      text = 'Tvoji će zidovi nadživjeti i tebe, i kozu, i apartmane.';
    } else if (avg >= 75) {
      rank = 'Pravi zidar';
      text = 'Zid stoji, račun je čist. Glure kima glavom, a to je kod njega ovacija.';
    } else if (avg >= 55) {
      rank = 'Šegrt s potencijalom';
      text = 'Ruke uče sporije od glave. Sutra opet, od temelja.';
    } else {
      rank = 'Betonjerac';
      text = 'Glure te gleda i šuti. To je gore nego da viče.';
    }
    $('fin-rank').textContent = rank;
    $('fin-rank-text').textContent = text;
    const stats: [string, string][] = [
      ['Pošteno zarađeno', eur(total)],
      ['Prosječna kvaliteta zida', `${avg} %`],
      ['Fuga na fugu', `${aligned}×`],
      ['Izdvojeno škarta', `${scrap} kom.`],
      ['Pokušaja laganja', `${this.totalLies} (uspješnih: 0)`],
      ['Poštenje', '100 %'],
    ];
    const dl = $('fin-stats');
    dl.replaceChildren();
    for (const [k, v] of stats) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    }
    $('finale').classList.remove('hidden');
    this.sfx.great();
    await new Promise<void>((resolve) => {
      const btn = $('fin-again');
      const go = (): void => {
        btn.removeEventListener('click', go);
        this.sfx.click();
        resolve();
      };
      btn.addEventListener('click', go);
    });
    $('finale').classList.add('hidden');
    this.overlayOpen = false;
  }

  // ---------------------------------------------------------------------- HUD

  private updateHud(): void {
    const p = this.play;
    if (!p) return;
    const a = p.wall.analyze();
    // Skrivene pukotine se uživo ne vide – Glure ih još ne zna.
    const live = clamp(100 - a.aligned * 6 - a.holes * 9, 0, 100);
    $('hud-q').style.width = `${live}%`;
    $('hud-q').className = live >= 85 ? 'good' : live >= 60 ? 'mid' : 'low';
    $('hud-qv').textContent = `${live} %`;
    $('hud-prog').textContent = `${Math.round((a.filled / a.total) * 100)} %`;
  }

  private updateSoundLabels(): void {
    const on = !this.sfx.muted;
    $('btn-sound').textContent = on ? 'Zvuk: da' : 'Zvuk: ne';
    $('btn-sound').setAttribute('aria-pressed', String(on));
    $('btn-sound-title').textContent = on ? 'Zvuk: uključen' : 'Zvuk: isključen';
  }

  private toggleSound(): void {
    this.sfx.unlock();
    this.sfx.toggle();
    this.updateSoundLabels();
    this.sfx.click();
  }

  private openHowto(open: boolean): void {
    $('howto').classList.toggle('hidden', !open);
    this.overlayOpen = open || !$('bill').classList.contains('hidden') || !$('finale').classList.contains('hidden');
    this.sfx.click();
  }

  // -------------------------------------------------------------------- unos

  private bind(): void {
    window.addEventListener('resize', () => this.resize());
    const cv = this.canvas;

    const toLogical = (e: PointerEvent): [number, number] => [
      (e.clientX - this.view.ox) / this.view.scale,
      (e.clientY - this.view.oy) / this.view.scale - this.camY,
    ];
    const aim = (e: PointerEvent): void => {
      const [lx] = toLogical(e);
      this.parTarget = clamp((lx / LOGICAL_W - 0.5) * 2, -1, 1);
      const p = this.play;
      if (!p || !p.input) return;
      const st = p.hand[p.sel];
      const w = st ? st.w : 1;
      p.col = clamp(Math.round((lx - p.origin.x) / U - w / 2), 0, p.wall.W - w);
    };
    cv.addEventListener('pointermove', aim);
    cv.addEventListener('pointerdown', (e) => {
      this.sfx.unlock();
      aim(e);
    });
    cv.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      const [lx, ly] = toLogical(e);
      const p = this.play;
      if (this.dialogue.active) {
        this.dialogue.advance();
        return;
      }
      if (!p) return;
      const o = p.origin;
      const top = o.y - (p.wall.H + 2.4) * RH;
      const bottom = o.y + p.wall.W * U * SL + 46;
      const inWall = lx > o.x - 46 && lx < o.x + p.wall.W * U + 64 && ly > top && ly < bottom;
      if (inWall) {
        aim(e);
        this.tryPlace();
        return;
      }
      // Klik na lika = dosjetka.
      const gp = this.glurePos(p);
      const cp = this.clientPos(p);
      if (Math.abs(lx - gp.x) < 50 && ly < gp.y + 8 && ly > gp.y - 195) {
        this.say('glure', pick(Math.random, GLURE_QUIPS));
        this.sfx.click();
      } else if (Math.abs(lx - cp.x) < 50 && ly < cp.y + 8 && ly > cp.y - 195) {
        this.say(p.job.client, pick(Math.random, p.job.quips));
        this.sfx.click();
      } else if (p.job.test === 'koza' && Math.abs(lx - p.goatPos.x) < 44 && Math.abs(ly - p.goatPos.y + 30) < 40 && !p.test) {
        this.sfx.goat();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      this.sfx.unlock();
      const key = e.key.toLowerCase();
      if (key === 'm') {
        this.toggleSound();
        return;
      }
      if (!$('howto').classList.contains('hidden')) {
        if (key === 'escape' || key === 'enter' || key === ' ') this.openHowto(false);
        return;
      }
      if (this.dialogue.handleKey(e)) return;
      if (this.overlayOpen) {
        if (key === 'enter') {
          const visible = ['bill-next', 'fin-again'].map((id) => $(id)).find((b) => b.offsetParent !== null);
          visible?.click();
        }
        return;
      }
      if (this.mode === 'title') {
        if (key === 'enter') $('btn-start').click();
        return;
      }
      const p = this.play;
      if (!p || !p.input) return;
      if (key === '1' || key === '2' || key === '3') this.select(Number(key) - 1);
      else if (key === 'arrowleft' || key === 'a') {
        const st = p.hand[p.sel];
        p.col = clamp(p.col - 1, 0, p.wall.W - (st?.w ?? 1));
      } else if (key === 'arrowright' || key === 'd') {
        const st = p.hand[p.sel];
        p.col = clamp(p.col + 1, 0, p.wall.W - (st?.w ?? 1));
      } else if (key === ' ' || key === 'enter') {
        e.preventDefault();
        this.tryPlace();
      } else if (key === 'k') this.tryTap();
      else if (key === 'x') this.tryScrap();
      else if (key === 'h' || key === '?') this.openHowto(true);
    });

    $('btn-tap').addEventListener('click', () => this.tryTap());
    $('btn-scrap').addEventListener('click', () => this.tryScrap());
    $('btn-help').addEventListener('click', () => this.openHowto(true));
    $('btn-howto').addEventListener('click', () => {
      this.sfx.unlock();
      this.openHowto(true);
    });
    $('howto-close').addEventListener('click', () => this.openHowto(false));
    $('btn-sound').addEventListener('click', () => this.toggleSound());
    $('btn-sound-title').addEventListener('click', () => this.toggleSound());
    $('hud-honesty').addEventListener('click', () => {
      this.say('narator', HONESTY_QUIPS[this.honestyIdx++ % HONESTY_QUIPS.length] as string);
      this.sfx.nope();
    });
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const scale = Math.min(w / LOGICAL_W, h / LOGICAL_H);
    const ox = (w - LOGICAL_W * scale) / 2;
    const oy = (h - LOGICAL_H * scale) / 2;
    this.dpr = dpr;
    // Sučelje (DOM) raste i smanjuje se zajedno sa scenom.
    const ui = clamp(scale, 0.6, 2);
    document.documentElement.style.setProperty('--ui', ui.toFixed(3));
    document.body.classList.toggle('compact', w / ui < 1000);
    document.body.classList.toggle('tiny', w / ui < 720);
    document.body.classList.toggle('short', h / ui < 600);
    this.view = { scale, ox, oy, left: -ox / scale, top: -oy / scale, right: (w - ox) / scale, bottom: (h - oy) / scale };
  }

  // ----------------------------------------------------------- sitni efekti

  private float(text: string, x: number, y: number, color: string, size: number): void {
    this.floaters.push({ text, x, y, color, life: 1.5, max: 1.5, size });
  }

  private dust(x: number, y: number): void {
    this.particles.push({
      x,
      y,
      vx: rand(Math.random, -46, 46),
      vy: rand(Math.random, -34, -4),
      life: 0.7,
      max: 0.7,
      size: rand(Math.random, 3, 8),
      color: '236,222,196',
      chip: false,
      rot: 0,
      vr: 0,
    });
  }

  private chip(x: number, y: number): void {
    this.particles.push({
      x,
      y,
      vx: rand(Math.random, -150, 150),
      vy: rand(Math.random, -260, -60),
      life: 1.1,
      max: 1.1,
      size: rand(Math.random, 3, 7),
      color: '226,216,196',
      chip: true,
      rot: Math.random() * 6,
      vr: rand(Math.random, -9, 9),
    });
  }

  private say(who: Who, text: string): void {
    this.bubbles = this.bubbles.filter((b) => b.who !== who);
    this.bubbles.push({ who, text, life: 3.2 });
  }

  private glurePos(p: Play): { x: number; y: number } {
    return { x: p.origin.x - 96, y: p.origin.y + 112 };
  }

  private clientPos(p: Play): { x: number; y: number } {
    return { x: p.origin.x + p.wall.W * U + 150, y: p.origin.y + p.wall.W * U * SL + 68 };
  }

  private buildTitleWall(): Wall {
    const wall = new Wall(7, 3);
    const rows: [number, number][][] = [
      [
        [0, 2],
        [2, 3],
        [5, 2],
      ],
      [
        [0, 3],
        [3, 2],
        [5, 2],
      ],
      [
        [0, 2],
        [2, 3],
      ],
    ];
    let id = 9000;
    for (const row of rows) {
      for (const [col, w] of row) {
        wall.place({ id: id++, w, crack: 'none', tapped: false, seed: id * 7717 }, col);
      }
    }
    return wall;
  }

  // ------------------------------------------------------------------ petlja

  private frame(ts: number): void {
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0);
    this.last = ts;
    this.t += dt;
    this.update(dt);
    this.render();
    requestAnimationFrame((n) => this.frame(n));
  }

  private update(dt: number): void {
    this.par = lerp(this.par, this.parTarget, Math.min(1, dt * 4));
    this.shake = Math.max(0, this.shake - dt * 22);
    const camTarget = this.mode === 'job' && this.dialogue.active ? -66 : 0;
    this.camY = Math.abs(this.camY - camTarget) < 0.3 ? camTarget : lerp(this.camY, camTarget, Math.min(1, dt * 5));
    this.dialogue.update(dt, this.t);

    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= dt * 34;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.chip) {
        q.vy += 620 * dt;
        q.rot += q.vr * dt;
      } else {
        q.vx *= 1 - dt * 2;
        q.size += dt * 9;
      }
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const b of this.bubbles) b.life -= dt;
    this.bubbles = this.bubbles.filter((b) => b.life > 0);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hideHint();
    }

    const p = this.play;
    if (!p) return;
    p.colSmooth = lerp(p.colSmooth, p.col, Math.min(1, dt * 22));
    if (Math.abs(p.shownTime - p.time) > 0.05) {
      p.shownTime = lerp(p.shownTime, p.time, Math.min(1, dt * 6));
      $('hud-time').textContent = clock(p.shownTime);
      const k = clamp((p.shownTime - p.job.startMin) / (p.job.endMin - p.job.startMin), 0, 1);
      $('hud-day').style.width = `${k * 100}%`;
      $('hud-day').classList.toggle('late', k > 0.8);
    }
    if (p.swing > 0) {
      p.swing += dt * 2.6;
      if (p.swing >= 1) p.swing = 0;
    }
    const f = p.falling;
    if (f) {
      f.v += 46 * dt;
      f.z -= f.v * dt;
      if (f.z <= f.row) this.land(p, f);
    }
    for (const s of p.tossed) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 1500 * dt;
      s.rot += s.vr * dt;
    }
    p.tossed = p.tossed.filter((s) => s.life > 0);
    this.updateTest(p, dt);
  }

  // ---------------------------------------------------------------- crtanje

  private render(): void {
    const ctx = this.ctx;
    const v0 = this.view;
    const k = this.dpr * v0.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    // Dok traje razgovor, kamera se malo digne da likovi ostanu vidljivi iznad okvira.
    const cam = this.camY;
    ctx.setTransform(k, 0, 0, k, this.dpr * v0.ox + sx * k, this.dpr * v0.oy + (sy + cam) * k);
    const v = { ...v0, top: v0.top - cam, bottom: v0.bottom - cam };
    this.drawView = v;

    const p = this.play;
    drawBackground(ctx, this.scene, v, this.t, this.par, p?.wind ?? 0);

    if (this.mode === 'title' || !p) this.renderTitle();
    else this.renderJob(p);

    this.renderParticles();
    if (p && p.wind > 0) drawWind(ctx, v, this.t, p.wind);
    this.renderFloaters();
    this.renderBubbles();
    drawAtmosphere(ctx, v);
  }

  private renderTitle(): void {
    const ctx = this.ctx;
    const o = this.titleOrigin;
    this.drawPile(o.x - 250, o.y + 120);
    this.drawWall(this.titleWall, o, false);
    this.drawStakes(this.titleWall, o);
    const [gx, gy] = proj(o, 5.9, D / 2, 2);
    drawGoat(ctx, gx, gy, 0.95, this.t, -1, false);
    drawPerson(ctx, GLURE, o.x - 110, o.y + 128, 1.2, {
      t: this.t,
      talk: 0,
      swing: 0,
      face: 1,
    });
  }

  private renderJob(p: Play): void {
    const ctx = this.ctx;
    const o = p.origin;
    const wall = p.wall;
    const gp = this.glurePos(p);
    const cp = this.clientPos(p);

    this.drawPile(gp.x - 128, gp.y + 34);
    this.drawWall(wall, o, true);

    // Kamen u padu
    if (p.falling) {
      const f = p.falling;
      const [x, y] = proj(o, f.col, 0, f.z);
      drawSprite(ctx, stoneSprite(f.stone, f.stone.crack === 'visible' || f.stone.tapped), x, y);
    }

    // Obris i kamen u ruci
    const st = p.hand[p.sel];
    if (p.input && !p.busy && st && !this.dialogue.active) this.drawAim(p, st);

    this.drawStakes(wall, o);

    // Koza na zidu / u dvorištu
    const test = p.test;
    if (p.job.test === 'koza') {
      if (test && !test.finished) drawGoat(ctx, test.goat.x, test.goat.y, 0.9, this.t, test.goat.face, test.goat.walking);
      else drawGoat(ctx, p.goatPos.x, p.goatPos.y, 0.9, this.t, p.goatPos.face, false);
    }

    // Odbačeni kamen leti prema škartu
    for (const s of p.tossed) {
      const spr = stoneSprite(s.stone, s.stone.crack === 'visible' || s.stone.tapped);
      ctx.save();
      ctx.translate(s.x + spr.w / 2, s.y - spr.h / 2);
      ctx.rotate(s.rot);
      ctx.globalAlpha = clamp(s.life * 2, 0, 1);
      ctx.drawImage(spr.canvas, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
      ctx.restore();
    }

    const speaking = this.dialogue.talking ? this.dialogue.speaker : null;
    const mouth = 0.5 + 0.5 * Math.sin(this.t * 19);
    drawPerson(ctx, GLURE, gp.x, gp.y, 1.05, {
      t: this.t,
      talk: speaking === 'glure' ? mouth : 0,
      swing: p.swing,
      face: 1,
    });
    drawPerson(ctx, CLIENT_LOOK[p.job.client], cp.x, cp.y, 1.02, {
      t: this.t + 1.7,
      talk: speaking === p.job.client ? mouth : 0,
      swing: 0,
      face: -1,
      hatless: p.hatless,
    });

    if (test?.hat) {
      const h = test.hat;
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      ctx.fillStyle = STEF.hatColor;
      ctx.beginPath();
      ctx.ellipse(0, 6, 36, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-17, -16, 34, 24, 10);
      ctx.fill();
      ctx.fillStyle = STEF.hatBand ?? '#333';
      ctx.fillRect(-17, -1, 34, 6);
      ctx.restore();
    }
  }

  private drawPile(x: number, y: number): void {
    const ctx = this.ctx;
    // Karijola s kamenjem.
    ctx.fillStyle = 'rgba(48,24,10,0.26)';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 6, 78, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Kotač
    ctx.fillStyle = '#2b2622';
    ctx.beginPath();
    ctx.arc(x + 52, y - 6, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f8f8a';
    ctx.beginPath();
    ctx.arc(x + 52, y - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    // Ručke i noge
    ctx.strokeStyle = '#7a5232';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 40, y - 20);
    ctx.lineTo(x - 78, y - 40);
    ctx.stroke();
    ctx.strokeStyle = '#3d4a44';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 24);
    ctx.lineTo(x - 36, y + 2);
    ctx.stroke();
    // Kamenje (iza ruba korita)
    const r = mulberry32(31);
    const rock = (rx: number, ry: number, rw: number, rh: number): void => {
      const tone = 226 + Math.floor(r() * 18);
      ctx.fillStyle = `rgb(${tone - 34},${tone - 42},${tone - 60})`;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 6);
      ctx.fill();
      ctx.fillStyle = `rgb(${tone},${tone - 7},${tone - 22})`;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw - 5, rh * 0.62, 6);
      ctx.fill();
    };
    rock(x - 34, y - 70, 40, 26);
    rock(x - 4, y - 78, 44, 30);
    rock(x - 20, y - 92, 36, 24);
    // Korito
    ctx.fillStyle = '#4f7a63';
    ctx.beginPath();
    ctx.moveTo(x - 50, y - 52);
    ctx.lineTo(x + 56, y - 52);
    ctx.lineTo(x + 42, y - 16);
    ctx.lineTo(x - 32, y - 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(x - 50, y - 52);
    ctx.lineTo(x + 56, y - 52);
    ctx.lineTo(x + 53, y - 45);
    ctx.lineTo(x - 47, y - 45);
    ctx.closePath();
    ctx.fill();
    // Gomila na tlu
    rock(x - 118, y - 18, 46, 26);
    rock(x - 96, y - 38, 42, 26);
    rock(x - 140, y - 4, 38, 20);
  }

  private quad(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(d[0], d[1]);
    ctx.closePath();
  }

  private drawWall(wall: Wall, o: Origin, marks: boolean): void {
    const ctx = this.ctx;
    const W = wall.W;
    const H = wall.H;

    // Sjena zida pada unatrag i udesno.
    ctx.fillStyle = 'rgba(52,26,10,0.26)';
    ctx.beginPath();
    ctx.moveTo(...proj(o, 0, D, 0));
    for (let c = 0; c < W; c++) {
      const h = wall.height(c);
      ctx.lineTo(...proj(o, c + h * 0.5, D + h * 0.55, 0));
      ctx.lineTo(...proj(o, c + 1 + h * 0.5, D + h * 0.55, 0));
    }
    ctx.lineTo(...proj(o, W, D, 0));
    ctx.closePath();
    ctx.fill();

    // Temeljni rov.
    this.quad(proj(o, -0.12, -0.14, 0), proj(o, W + 0.12, -0.14, 0), proj(o, W + 0.12, D + 0.12, 0), proj(o, -0.12, D + 0.12, 0));
    ctx.fillStyle = 'rgba(62,34,18,0.42)';
    ctx.fill();

    // Oznake pedalja na tlu.
    if (marks) {
      ctx.strokeStyle = 'rgba(255,248,230,0.6)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let c = 0; c <= W; c++) {
        ctx.beginPath();
        ctx.moveTo(...proj(o, c, -0.2, 0));
        ctx.lineTo(...proj(o, c, c % 2 === 0 ? -0.5 : -0.38, 0));
        ctx.stroke();
      }
    }

    const door = wall.door;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const id = wall.get(c, r);
        if (id === -1) {
          if (door && c === door.col) this.drawDoorSlice(o, door.col, door.w, door.h, r);
        } else if (id > 0) {
          const pl = wall.placed.get(id) as Placed;
          if (pl.col !== c) continue;
          const [x, y] = proj(o, c, 0, r);
          drawSprite(ctx, stoneSprite(pl.stone, pl.stone.crack === 'visible' || pl.stone.tapped, pl.broken), x, y);
        } else if (wall.isHole(c, r)) {
          this.quad(proj(o, c, 0.05, r), proj(o, c + 1, 0.05, r), proj(o, c + 1, 0.05, r + 1), proj(o, c, 0.05, r + 1));
          ctx.fillStyle = '#231b15';
          ctx.fill();
        }
      }
    }
  }

  private drawDoorSlice(o: Origin, dc: number, dw: number, dh: number, r: number): void {
    const ctx = this.ctx;
    // Desni bok dovratnika.
    this.quad(proj(o, dc + dw, 0, r), proj(o, dc + dw, D, r), proj(o, dc + dw, D, r + 1), proj(o, dc + dw, 0, r + 1));
    ctx.fillStyle = '#4a321f';
    ctx.fill();
    if (r === dh - 1) {
      this.quad(proj(o, dc, 0, dh), proj(o, dc + dw, 0, dh), proj(o, dc + dw, D, dh), proj(o, dc, D, dh));
      ctx.fillStyle = '#93704a';
      ctx.fill();
    }
    // Lice vrata: crtamo u koordinatama (pedalj, red) pa preslikamo na kosu plohu.
    const [x0, y0] = proj(o, dc, 0, 0);
    ctx.save();
    ctx.transform(U, U * SL, 0, -RH, x0, y0);
    ctx.beginPath();
    ctx.rect(-0.005, r - 0.012, dw + 0.01, 1.024);
    ctx.clip();
    ctx.fillStyle = '#6f4d2f';
    ctx.fillRect(0, 0, dw, dh);
    ctx.fillStyle = '#8a6540';
    ctx.fillRect(0, dh - 0.07, dw, 0.07);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0.11, 0, dw - 0.22, dh - 0.15);
    ctx.fillStyle = '#3f6f55';
    ctx.fillRect(0.14, 0, dw - 0.28, dh - 0.19);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 1; i < 6; i++) ctx.fillRect(0.14 + ((dw - 0.28) * i) / 6 - 0.012, 0, 0.024, dh - 0.19);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0.14 + ((dw - 0.28) * i) / 6 + 0.012, 0, 0.03, dh - 0.19);
    ctx.fillStyle = '#35604a';
    ctx.fillRect(0.14, 0.42, dw - 0.28, 0.2);
    ctx.fillRect(0.14, dh - 0.86, dw - 0.28, 0.2);
    // Kvaka i šarke od kovanog željeza.
    ctx.fillStyle = '#1f1d1b';
    ctx.beginPath();
    ctx.arc(dw - 0.42, dh * 0.47, 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0.14, 0.48, 0.34, 0.07);
    ctx.fillRect(0.14, dh - 0.8, 0.34, 0.07);
    const g = ctx.createLinearGradient(0, dh, 0, 0);
    g.addColorStop(0, 'rgba(255,240,200,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, dw, dh);
    ctx.restore();
  }

  private drawStakes(wall: Wall, o: Origin): void {
    const ctx = this.ctx;
    const W = wall.W;
    const H = wall.H;
    const stake = (x: number): [number, number] => {
      const [bx, by] = proj(o, x, -0.16, 0);
      const [tx, ty] = proj(o, x, -0.16, H + 0.42);
      ctx.strokeStyle = '#5d4026';
      ctx.lineWidth = 7;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(bx, by + 3);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,225,180,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 2, by + 3);
      ctx.lineTo(tx - 2, ty);
      ctx.stroke();
      return proj(o, x, -0.16, H);
    };
    const a = stake(-0.32);
    const b = stake(W + 0.3);
    // Zidarski konop: do njega se zida.
    const sag = 3 + Math.sin(this.t * 2.2) * 0.8;
    ctx.strokeStyle = 'rgba(60,30,0,0.35)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1] + 1.5);
    ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag + 1.5, b[0], b[1] + 1.5);
    ctx.stroke();
    ctx.strokeStyle = '#f2a03a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag, b[0], b[1]);
    ctx.stroke();
  }

  private drawAim(p: Play, st: StoneDef): void {
    const ctx = this.ctx;
    const o = p.origin;
    const wall = p.wall;
    const pv = wall.preview(p.col, st.w);
    const scrap = knownCracked(st);
    const perfectLintel = pv.lintel && pv.holes === 0 && pv.aligned === 0;
    let color = '#8ee67a';
    let label = pv.covered > 0 ? T.ghostOk : '';
    if (scrap) {
      color = '#ff6b55';
      label = T.ghostScrap;
    } else if (!pv.valid) {
      color = '#ff6b55';
      label = T.ghostHigh;
    } else if (pv.holes > 0 || pv.aligned > 0) {
      color = '#ffab3d';
      label = [pv.aligned > 0 ? T.ghostAligned : '', pv.holes > 0 ? T.ghostHole : ''].filter(Boolean).join(' ');
    } else if (perfectLintel) {
      color = '#ffd95e';
      label = T.ghostLintel;
    }
    const spr = stoneSprite(st, st.crack === 'visible' || st.tapped);
    const holdZ = wall.H + 0.75 + Math.sin(this.t * 3) * 0.05;
    const cs = p.colSmooth;

    if (pv.valid && !scrap) {
      const [gx, gy] = proj(o, p.col, 0, pv.row);
      ctx.globalAlpha = 0.5;
      drawSprite(ctx, spr, gx, gy);
      ctx.globalAlpha = 1;
      // Obris lica kamena.
      this.quad(
        proj(o, p.col + 0.03, 0, pv.row + 0.02),
        proj(o, p.col + st.w - 0.03, 0, pv.row + 0.02),
        proj(o, p.col + st.w - 0.03, 0, pv.row + 0.97),
        proj(o, p.col + 0.03, 0, pv.row + 0.97),
      );
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = `${color}33`;
      ctx.fill();
      // Vodilice pada.
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      for (const dx of [0.03, st.w - 0.03]) {
        ctx.beginPath();
        ctx.moveTo(...proj(o, cs + dx, 0, holdZ));
        ctx.lineTo(...proj(o, p.col + dx, 0, pv.row + 1));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Kamen "u ruci" lebdi iznad konopa.
    const [hx, hy] = proj(o, cs, 0, holdZ);
    ctx.save();
    ctx.shadowColor = 'rgba(40,20,0,0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 10;
    drawSprite(ctx, spr, hx, hy);
    ctx.restore();
    if (scrap || !pv.valid) {
      this.quad(
        proj(o, cs + 0.03, 0, holdZ + 0.02),
        proj(o, cs + st.w - 0.03, 0, holdZ + 0.02),
        proj(o, cs + st.w - 0.03, 0, holdZ + 0.97),
        proj(o, cs + 0.03, 0, holdZ + 0.97),
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (label) {
      const [lx, ly] = proj(o, cs + st.w / 2, D / 2, holdZ + 1.32);
      ctx.font = '700 15px Cinzel, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(label).width + 18;
      ctx.fillStyle = 'rgba(38,26,16,0.78)';
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2, ly - 12, tw, 24, 12);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(label, lx, ly + 1);
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (const q of this.particles) {
      const a = clamp(q.life / q.max, 0, 1);
      if (q.chip) {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillStyle = `rgba(${q.color},${a})`;
        ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size * 0.7);
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(${q.color},${a * 0.5})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderFloaters(): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      const k = f.life / f.max;
      const appear = Math.min(1, (f.max - f.life) * 8);
      ctx.globalAlpha = clamp(k * 2.2, 0, 1);
      ctx.font = `900 ${Math.round(f.size * (0.7 + 0.3 * appear))}px Cinzel, Georgia, serif`;
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(38,24,12,0.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  private renderBubbles(): void {
    const p = this.play;
    if (!p || this.mode !== 'job') return;
    const ctx = this.ctx;
    for (const b of this.bubbles) {
      let x: number;
      let y: number;
      if (b.who === 'glure') {
        const g = this.glurePos(p);
        x = g.x + 10;
        y = g.y - 205;
      } else if (b.who === 'narator') {
        x = LOGICAL_W / 2;
        y = 120;
      } else {
        const c = this.clientPos(p);
        x = c.x - 20;
        y = c.y - 205;
      }
      ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
      const words = b.text.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (ctx.measureText(next).width > 230 && line) {
          lines.push(line);
          line = w;
        } else line = next;
      }
      if (line) lines.push(line);
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 26;
      const th = lines.length * 20 + 18;
      x = clamp(x, this.drawView.left + tw / 2 + 8, this.drawView.right - tw / 2 - 8);
      const a = clamp(Math.min(b.life * 3, (3.2 - b.life) * 8), 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(40,20,5,0.25)';
      ctx.beginPath();
      ctx.roundRect(x - tw / 2 + 2, y - th + 4, tw, th, 12);
      ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.beginPath();
      ctx.roundRect(x - tw / 2, y - th, tw, th, 12);
      ctx.fill();
      if (b.who !== 'narator') {
        ctx.beginPath();
        ctx.moveTo(x - 8, y - 1);
        ctx.lineTo(x + 8, y - 1);
        ctx.lineTo(x, y + 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#33271c';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, x, y - th + 19 + i * 20));
      ctx.globalAlpha = 1;
    }
  }
}
