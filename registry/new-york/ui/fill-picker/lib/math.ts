/**
 * Small numeric helpers shared by the engine (`lib/`, `hooks/`) and the
 * parts. Pure — no culori, so parts may import this freely.
 */

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

export function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

export function round(x: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

/** Euclidean modulo: always in `[0, mod)`, also for negative `v`. */
export function wrap(v: number, mod: number): number {
  return ((v % mod) + mod) % mod;
}

/**
 * Hue in `[0, 360)`. The double modulo matters: `-1e-14 + 360` rounds to
 * exactly 360, which a single `m < 0 ? m + 360 : m` would return as-is.
 */
export function wrapHue(h: number): number {
  return wrap(h, 360);
}
