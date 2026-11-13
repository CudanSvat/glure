export type Crack = 'none' | 'visible' | 'hidden';

export interface StoneDef {
  id: number;
  w: number;
  crack: Crack;
  /** Je li Glure kucnuo kamen čekićem (tada zna je li zdrav). */
  tapped: boolean;
  seed: number;
}

export interface Placed {
  stone: StoneDef;
  col: number;
  row: number;
  /** Pukao na probi (koza / bura). */
  broken: boolean;
}

export interface Door {
  col: number;
  w: number;
  h: number;
}

export interface Preview {
  valid: boolean;
  row: number;
  holes: number;
  /** Koliko rubova kamena sjeda točno na fugu ispod ("fuga na fugu"). */
  aligned: number;
  /** Koliko fuga ispod kamen lijepo preklapa. */
  covered: number;
  /** Savršen nadvoj nad vratima. */
  lintel: boolean;
}

export interface Analysis {
  aligned: number;
  holes: number;
  cracked: number;
  unfilled: number;
  filled: number;
  total: number;
  quality: number;
  lintelOk: boolean;
  complete: boolean;
}

const DOOR = -1;

/** Je li poznato da je kamen škart (vidi se ili ga je Glure kucnuo). */
export function knownCracked(s: StoneDef): boolean {
  return s.crack === 'visible' || (s.crack === 'hidden' && s.tapped);
}

export class Wall {
  readonly W: number;
  readonly H: number;
  readonly door: Door | null;
  readonly cells: Int32Array;
  readonly placed = new Map<number, Placed>();

  constructor(W: number, H: number, door: Door | null = null) {
    this.W = W;
    this.H = H;
    this.door = door;
    this.cells = new Int32Array(W * H);
    if (door) {
      for (let r = 0; r < door.h; r++) {
        for (let c = door.col; c < door.col + door.w; c++) this.cells[r * W + c] = DOOR;
      }
    }
  }

  get(c: number, r: number): number {
    if (c < 0 || c >= this.W || r < 0 || r >= this.H) return 0;
    return this.cells[r * this.W + c] as number;
  }

  /** Visina stupca = prvi slobodni red iznad najvišeg zauzetog polja. */
  height(c: number): number {
    for (let r = this.H - 1; r >= 0; r--) if (this.get(c, r) !== 0) return r + 1;
    return 0;
  }

  /** Postoji li okomita fuga između polja (e-1) i (e) u redu r. */
  private joint(e: number, r: number): boolean {
    const a = this.get(e - 1, r);
    const b = this.get(e, r);
    return a !== 0 && b !== 0 && a !== b;
  }

  private doorInterior(e: number, r: number): boolean {
    const d = this.door;
    return !!d && r === d.h && e > d.col && e < d.col + d.w;
  }

  /** Rub kamena točno nad rubom vrata: nadvoj tu ne smije završiti, mora leći na zid. */
  private doorEdge(e: number, r: number): boolean {
    const d = this.door;
    return !!d && r === d.h && (e === d.col || e === d.col + d.w);
  }

  preview(col: number, w: number): Preview {
    const res: Preview = { valid: false, row: 0, holes: 0, aligned: 0, covered: 0, lintel: false };
    if (col < 0 || col + w > this.W) return res;
    let row = 0;
    for (let c = col; c < col + w; c++) row = Math.max(row, this.height(c));
    res.row = row;
    if (row >= this.H) return res;
    res.valid = true;
    for (let c = col; c < col + w; c++) res.holes += row - this.height(c);
    if (row > 0) {
      for (const e of [col, col + w]) {
        if (e <= 0 || e >= this.W) continue;
        // Rub uz drvena vrata nije fuga u kamenu.
        const neighbour = e === col ? this.get(col - 1, row) : this.get(col + w, row);
        if (neighbour === DOOR) continue;
        if (this.joint(e, row - 1) || this.doorInterior(e, row) || this.doorEdge(e, row)) res.aligned++;
      }
      for (let e = col + 1; e < col + w; e++) if (this.joint(e, row - 1)) res.covered++;
    }
    const d = this.door;
    if (d && row === d.h && col <= d.col - 1 && col + w >= d.col + d.w + 1) res.lintel = true;
    return res;
  }

  place(stone: StoneDef, col: number): { placed: Placed; preview: Preview } | null {
    const p = this.preview(col, stone.w);
    if (!p.valid) return null;
    for (let c = col; c < col + stone.w; c++) this.cells[p.row * this.W + c] = stone.id;
    const placed: Placed = { stone, col, row: p.row, broken: false };
    this.placed.set(stone.id, placed);
    return { placed, preview: p };
  }

  /** Postoji li mjesto gdje kamen širine w sjeda bez rupe. */
  fitsClean(w: number): boolean {
    for (let c = 0; c + w <= this.W; c++) {
      const p = this.preview(c, w);
      if (p.valid && p.holes === 0) return true;
    }
    return false;
  }

  isHole(c: number, r: number): boolean {
    return this.get(c, r) === 0 && r < this.height(c);
  }

  analyze(): Analysis {
    let aligned = 0;
    let holes = 0;
    let unfilled = 0;
    let filled = 0;
    let total = 0;
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.W; c++) {
        const v = this.get(c, r);
        if (v === DOOR) continue;
        total++;
        if (v > 0) filled++;
        else if (this.isHole(c, r)) holes++;
        else unfilled++;
      }
    }
    for (let r = 1; r < this.H; r++) {
      for (let e = 1; e < this.W; e++) {
        const a = this.get(e - 1, r);
        const b = this.get(e, r);
        if (a > 0 && b > 0 && a !== b && (this.joint(e, r - 1) || this.doorInterior(e, r))) aligned++;
      }
    }
    let cracked = 0;
    for (const p of this.placed.values()) if (p.stone.crack !== 'none') cracked++;

    let lintelOk = true;
    const d = this.door;
    if (d) {
      const id = this.get(d.col - 1, d.h);
      lintelOk = id > 0;
      for (let c = d.col - 1; c <= d.col + d.w; c++) if (this.get(c, d.h) !== id) lintelOk = false;
    }

    const quality = Math.max(0, Math.round(100 - aligned * 6 - holes * 9 - cracked * 12 - unfilled * 2));
    return {
      aligned,
      holes,
      cracked,
      unfilled,
      filled,
      total,
      quality,
      lintelOk,
      complete: unfilled === 0,
    };
  }
}
