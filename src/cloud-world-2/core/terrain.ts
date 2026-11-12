/**
 * Cloud World 2.0 — terrain: seeded island heightfields.
 *
 * Fresh deterministic terrain for the greenfield world. Each island is a
 * wobbly disc whose height rises toward its centre; column heights are pure
 * functions of (island seed, x, z), so the world is identical every load and
 * every consumer (renderer, collision, navigation, minimap) can recompute it.
 */

import type { IslandSpec } from './types';

/** Small deterministic integer hash → [0, 1). */
export function hash2(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** Smooth value noise on a unit grid — bilinear over hashed lattice points. */
export function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const n00 = hash2(x0, z0, seed);
  const n10 = hash2(x0 + 1, z0, seed);
  const n01 = hash2(x0, z0 + 1, seed);
  const n11 = hash2(x0 + 1, z0 + 1, seed);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sz) + (n01 * (1 - sx) + n11 * sx) * sz;
}

/**
 * Signed radial wobble for an island edge: noise in [-0.5, 0.5], scaled by
 * the spec's `wobble` factor. Gives coastlines an organic, non-circular read.
 */
function edgeWobble(spec: IslandSpec, angle: number): number {
  const nx = Math.cos(angle) * 2.2 + spec.cx * 0.05;
  const nz = Math.sin(angle) * 2.2 + spec.cz * 0.05;
  return (valueNoise(nx, nz, spec.seed) - 0.5) * 2 * spec.wobble;
}

/** Signed distance from the island's (wobbled) shoreline; >0 means land. */
export function islandField(spec: IslandSpec, x: number, z: number): number {
  const dx = x - spec.cx;
  const dz = z - spec.cz;
  const dist = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const effectiveR = spec.r * (1 + edgeWobble(spec, angle));
  return effectiveR - dist;
}

/** Distance to the nearest shoreline across all islands (negative = at sea). */
export function shoreDistance(specs: IslandSpec[], x: number, z: number): number {
  let best = -Infinity;
  for (const spec of specs) {
    const d = islandField(spec, x, z);
    if (d > best) best = d;
  }
  return best;
}

/** Terrain top layer at (x, z), or null for open water. */
export function columnHeight(specs: IslandSpec[], x: number, z: number): number | null {
  for (const spec of specs) {
    const field = islandField(spec, x, z);
    if (field <= 0) continue;
    // Height rises from the beach (layer 0) toward the island heart.
    // The harbour island carries a raised plateau for the village.
    const t = Math.min(1, field / (spec.r * 0.72));
    let h = Math.round(t * 2);
    if (spec.id === 'harbour') {
      // plateau: the eastern half of the harbour rises two extra layers,
      // reached by the stone stair east of the harbour floor
      const plateau = (x - (spec.cx - 2)) / 14;
      if (plateau > 0) h += Math.min(3, Math.round(plateau * 3));
    }
    return h;
  }
  return null;
}

/** The walkable surface height on land (top of the topmost terrain block). */
export function surfaceY(specs: IslandSpec[], x: number, z: number): number | null {
  const h = columnHeight(specs, x, z);
  return h === null ? null : h + 1;
}

/** The island containing (x, z), or null at sea. */
export function islandAt(specs: IslandSpec[], x: number, z: number): IslandSpec | null {
  let best: IslandSpec | null = null;
  let bestField = -Infinity;
  for (const spec of specs) {
    const f = islandField(spec, x, z);
    if (f > 0 && f > bestField) {
      bestField = f;
      best = spec;
    }
  }
  return best;
}

/** Nearest island within `maxDist` of the shore — used to credit piers. */
export function nearestShoreIsland(
  specs: IslandSpec[],
  x: number,
  z: number,
  maxDist: number,
): IslandSpec | null {
  let best: IslandSpec | null = null;
  let bestField = -Infinity;
  for (const spec of specs) {
    const f = islandField(spec, x, z);
    if (f > -maxDist && f > bestField) {
      bestField = f;
      best = spec;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Terrain block generation                                            */
/* ------------------------------------------------------------------ */

import { P } from './palette';
import type { Block, BlockList } from './types';

/** Generate all terrain blocks for one island (cached by the world module). */
export function terrainBlocks(spec: IslandSpec): BlockList {
  const out: Block[] = [];
  const r = spec.r * (1 + spec.wobble) + 2;
  const minX = Math.floor(spec.cx - r);
  const maxX = Math.ceil(spec.cx + r);
  const minZ = Math.floor(spec.cz - r);
  const maxZ = Math.ceil(spec.cz + r);

  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      const h = columnHeight([spec], x, z);
      if (h === null) continue;
      // side material: rock on steep tall columns, sand at the beach
      const surfaceNoise = valueNoise(x * 0.31, z * 0.31, spec.seed + 7);
      const topColour = h === 0 ? (surfaceNoise > 0.55 ? P.sandDark : P.sand) : surfaceNoise > 0.62 ? P.grassTop : P.grassDark;
      for (let y = 0; y <= h; y++) {
        let c: number;
        if (y === h) c = topColour;
        else if (y === 0) c = P.rockSideDark;
        else c = y >= h - 1 ? P.rockSide : P.rockSideDark;
        // cliff banding for a Minecraft-like cutaway read
        if (y < h - 1 && (x + z + y) % 3 === 0) c = P.rockSideDark;
        out.push({ x, y: y + 0.5, z, c });
      }
    }
  }
  return out;
}
