/**
 * Deterministic pseudo-randomness for the world environments.
 *
 * The PIP network and the cloud field are generated, not authored. That makes a
 * SEEDED generator load-bearing rather than a convenience: with Math.random the
 * same world would redraw itself differently on every hover, so the environment
 * would shimmer between visits instead of feeling like a place the user is
 * returning to. The reference videos also have stable, repeatable structure --
 * a blueprint that is the same blueprint each time.
 *
 * mulberry32 is used for exactly that reason: 32-bit state, fast, good enough
 * distribution for layout jitter, and trivially reproducible in tests.
 */

/** A seeded generator. Same seed in, same sequence out, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform in [lo, hi). */
export function range(rand: () => number, lo: number, hi: number): number {
  return lo + rand() * (hi - lo);
}

/** Uniform integer in [lo, hi]. */
export function rangeInt(rand: () => number, lo: number, hi: number): number {
  return Math.floor(lo + rand() * (hi - lo + 1));
}

/** Pick one element. */
export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))];
}

/** Smooth 0..1 ease, used for per-structure arrival windows. */
export function smoothstep(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * Map a value into the sub-window [from, to] of progress, clamped.
 * Used to give every structure its own arrival window so the environment
 * fills in progressively instead of all at once.
 */
export function window01(p: number, from: number, to: number): number {
  if (to <= from) return p >= to ? 1 : 0;
  return smoothstep((p - from) / (to - from));
}

export const clamp01 = (v: number): number =>
  v <= 0 ? 0 : v >= 1 ? 1 : v;