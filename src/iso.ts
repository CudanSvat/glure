/**
 * Lažna 3D projekcija (kosa / "kabinet" projekcija).
 * Svijet: x = duž zida (u pedljima), y = dubina (od gledatelja), z = visina (u redovima).
 * Vidimo lice zida, gornju plohu i desni bok – dovoljno za "3D izgled" bez pravog 3D-a.
 */
export const U = 54; // širina jednog pedlja u logičkim pikselima
export const RH = 42; // visina jednog reda
export const SL = 0.12; // nagib osi x (zid se lagano spušta udesno)
export const DX = 0.42; // pomak dubine po x
export const DY = 0.3; // pomak dubine po y
export const D = 0.9; // debljina zida u pedljima

export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;

export interface Origin {
  x: number;
  y: number;
}

export function proj(o: Origin, x: number, y: number, z: number): [number, number] {
  return [o.x + x * U + y * U * DX, o.y + x * U * SL - y * U * DY - z * RH];
}

/** Ishodište zida tako da bude lijepo centriran u sceni. */
export function wallOrigin(W: number, H: number): Origin {
  const width = W * U + D * U * DX;
  const x = (LOGICAL_W - width) / 2 + 6;
  const drop = W * U * SL;
  const y = 452 - drop / 2 + (H - 4) * 14;
  return { x, y };
}
