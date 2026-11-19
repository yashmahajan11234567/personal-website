/**
 * Deterministic noise. No dependencies, no Math.random — the world must be
 * byte-identical on every load so QA screenshots stay comparable.
 */

/** 0..1 hash of two integers plus a seed. */
export function hash2(x: number, z: number, seed: number): number {
  let h = (x | 0) * 374761393 + (z | 0) * 668265263 + (seed | 0) * 1442695041;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise on the integer lattice, 0..1. */
export function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const n00 = hash2(x0, z0, seed);
  const n10 = hash2(x0 + 1, z0, seed);
  const n01 = hash2(x0, z0 + 1, seed);
  const n11 = hash2(x0 + 1, z0 + 1, seed);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

/** Two octaves, 0..1 — enough detail for scatter and grass patchiness. */
export function fractal(x: number, z: number, seed: number): number {
  return valueNoise(x, z, seed) * 0.65 + valueNoise(x * 2.1 + 11, z * 2.1 - 7, seed + 31) * 0.35;
}

/** Seeded linear congruential generator returning 0..1. */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
