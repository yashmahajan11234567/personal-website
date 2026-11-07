/**
 * Terrain — the archipelago generator.
 *
 * Geography model (ART_DIRECTION §3): terraced stepped islands. A radial dome
 * that is quantised to integer layers, an angular wobble on the radius so no
 * island is a circle, and optional flat "pads" that carve deliberate harbour
 * floors and village plateaus out of the dome.
 *
 * The generative rule is a single source of truth: the visible blocks, the
 * character's walkable surface and the ocean's shallow/foam rings all read the
 * same `columnHeight`, so the world can never disagree with itself.
 *
 * Layer convention: the top block of a column with height `h` occupies world
 * layer `h`, so its top surface — and the walkable height — is `h + 1`.
 */
import { C } from './palette';
import { valueNoise } from './noise';
import type { VoxelList } from './voxel';

export const BLOCK = 1;
/** Top surface of the ocean tiles. Land layer 0 tops out at 1.0, so the beach
 *  lip reads as 0.38 of a block — enough to see, small enough to look calm. */
export const WATER_TOP = 0.62;

export interface IslandPad {
  /** local coords relative to the island centre */
  x: number;
  z: number;
  r: number;
  /** plateau layer */
  h: number;
  /** taper width in blocks */
  blend?: number;
}

export interface IslandSpec {
  id: string;
  label: string;
  cx: number;
  cz: number;
  r: number;
  tiers: number;
  amp: number;
  seed: number;
  /**
   * Strength of the angular radius wobble. Small decorative islands use the
   * default (a ragged silhouette reads as natural rock); the main island uses
   * a low value because its buildings need predictable ground to stand on.
   */
  wobble?: number;
  /** width of the sand ring at the edge, in blocks */
  beach?: number;
  pads?: IslandPad[];
  /** decorative-only islands get no walkable treatment beyond their surface */
  decorative?: boolean;
}

/**
 * The archipelago (brief 01 "World structure").
 *
 *   spawn    — the starting island: small, two rises, arrival dock
 *   harbour  — the main island: low harbour in the west, elevated village east
 *   rocky    — decorative rock outcrop
 *   palm     — rest islet with a beacon tower, a genuine landfall mid-route
 *   sandbar  — decorative sandbar
 *
 * The spawn -> harbour vector runs south-west to north-east across the middle
 * of the ocean, which is the route the whale sails.
 */
export const ISLANDS: IslandSpec[] = [
  {
    id: 'spawn',
    label: 'Starting Island',
    cx: -48,
    cz: -48,
    r: 12,
    tiers: 3,
    amp: 0.8,
    seed: 3,
    beach: 2.6,
    pads: [
      // a small rise in the middle of the island
      { x: -3, z: -2, r: 6, h: 1, blend: 2.5 },
      // the pad the arrival dock lands on — held at the deck's own layer so the
      // jetty and the shore are flush instead of one block apart
      { x: 6, z: 1, r: 6, h: 1, blend: 3 },
    ],
  },
  {
    id: 'harbour',
    label: 'Welcome Harbour',
    cx: 36,
    cz: 36,
    r: 36,
    tiers: 4,
    amp: 0.9,
    seed: 7,
    wobble: 0.08,
    beach: 3,
    pads: [
      // the low, flat apron the docks and the market sit on
      { x: -20, z: 3, r: 8, h: 1, blend: 3.5 },
      // the elevated village plateau
      { x: 10, z: 6, r: 21, h: 4, blend: 3 },
      // the lighthouse headland on the seaward approach
      { x: -20, z: -14, r: 5, h: 2, blend: 2.5 },
    ],
  },
  {
    id: 'rocky',
    label: 'Rocky Islet',
    cx: -62,
    cz: 26,
    r: 5,
    tiers: 2,
    amp: 0.6,
    seed: 11,
    beach: 1.2,
    decorative: true,
  },
  {
    id: 'palm',
    label: 'Beacon Islet',
    cx: 64,
    cz: -44,
    r: 7,
    tiers: 2,
    amp: 0.6,
    seed: 13,
    beach: 2,
    pads: [{ x: 0, z: 0, r: 5.5, h: 1, blend: 2.5 }],
  },
  {
    id: 'sandbar',
    label: 'Sandbar',
    cx: -22,
    cz: 84,
    r: 4.5,
    tiers: 1,
    amp: 0.4,
    seed: 17,
    beach: 3,
    decorative: true,
  },
];

export function islandById(id: string): IslandSpec {
  const found = ISLANDS.find((i) => i.id === id);
  if (!found) throw new Error(`unknown island: ${id}`);
  return found;
}

/** Angular radius wobble — the reason no island is a flat circular platform. */
export function radiusAt(spec: IslandSpec, theta: number): number {
  const n = valueNoise(Math.cos(theta) * 1.7 + 5.5, Math.sin(theta) * 1.7 + 5.5, spec.seed) - 0.5;
  return spec.r * (1 + 2 * (spec.wobble ?? 0.22) * n);
}

/** Max possible radius for this island (used for bounding boxes). */
export function maxRadius(spec: IslandSpec): number {
  return spec.r * (1 + 2 * (spec.wobble ?? 0.22) * 0.5) + 2;
}

/** Terrain layer at integer column (bx, bz); null when the column is sea. */
export function columnHeight(spec: IslandSpec, bx: number, bz: number): number | null {
  const dx = bx + 0.5 - spec.cx;
  const dz = bz + 0.5 - spec.cz;
  const d = Math.hypot(dx, dz);
  const rr = radiusAt(spec, Math.atan2(dz, dx));
  if (d > rr) return null;

  const t = d / rr;
  const beachW = spec.beach ?? 2.5;
  let h: number;

  if (t >= 1 - beachW / rr) {
    h = 0; // sand ring
  } else {
    const dome = 1 - t * t;
    const n = valueNoise(bx * 0.19, bz * 0.19, spec.seed + 91) - 0.5;
    h = Math.max(1, Math.round(dome * spec.tiers + n * spec.amp * 2));
  }

  // Pads are resolved last-declared-first: the most specific pad wins, and only
  // one pad ever applies to a column. Declaring the village plateau after the
  // harbour floor is what makes "the village sits above the harbour" true
  // rather than a race between two overlapping circles.
  const pads = spec.pads ?? [];
  for (let i = pads.length - 1; i >= 0; i--) {
    const pad = pads[i];
    const pd = Math.hypot(bx + 0.5 - (spec.cx + pad.x), bz + 0.5 - (spec.cz + pad.z));
    const blend = pad.blend ?? 3;
    if (pd <= pad.r) {
      h = pad.h;
      break;
    }
    if (pd <= pad.r + blend) {
      const k = 1 - (pd - pad.r) / blend;
      const s = k * k * (3 - 2 * k);
      h = Math.round(h + (pad.h - h) * s);
      break;
    }
  }

  return h < 0 ? 0 : h;
}

/** Walkable surface height for a world (x, z) once quantised to its column. */
export function islandSurfaceY(x: number, z: number): number | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (const spec of ISLANDS) {
    const h = columnHeight(spec, bx, bz);
    if (h !== null) return h + 1;
  }
  return null;
}

/** The island a column belongs to, or null at sea. */
export function islandAt(x: number, z: number): IslandSpec | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (const spec of ISLANDS) {
    if (columnHeight(spec, bx, bz) !== null) return spec;
  }
  return null;
}

/**
 * Distance from a point to the nearest island shoreline, in blocks. Negative
 * means the point is inside an island footprint. Drives the ocean's colour
 * rings, so the turquoise band always hugs the real coastline.
 */
export function shoreDistance(x: number, z: number): number {
  let best = Infinity;
  for (const spec of ISLANDS) {
    const dx = x - spec.cx;
    const dz = z - spec.cz;
    const d = Math.hypot(dx, dz);
    const pen = d - radiusAt(spec, Math.atan2(dz, dx));
    if (pen < best) best = pen;
  }
  return best;
}

/**
 * Emit every visible terrain block for an island.
 *
 * Interior columns stop one layer below their neighbours, so cliff faces are
 * filled while hidden bulk is not generated at all — the block count stays
 * around 25k for the whole archipelago instead of ~90k.
 */
export function terrainBlocks(spec: IslandSpec): VoxelList {
  const out: VoxelList = [];
  const rm = maxRadius(spec) + 3;
  const x0 = Math.floor(spec.cx - rm);
  const x1 = Math.ceil(spec.cx + rm);
  const z0 = Math.floor(spec.cz - rm);
  const z1 = Math.ceil(spec.cz + rm);

  for (let bx = x0; bx <= x1; bx++) {
    for (let bz = z0; bz <= z1; bz++) {
      const h = columnHeight(spec, bx, bz);
      if (h === null) continue;

      let minN = h;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (ox === 0 && oz === 0) continue;
          const nh = columnHeight(spec, bx + ox, bz + oz);
          const v = nh === null ? -3 : nh;
          if (v < minN) minN = v;
        }
      }

      let yLow = minN - 1;
      if (yLow < -2) yLow = -2;
      if (yLow > h) yLow = h;

      for (let y = yLow; y <= h; y++) {
        let c: number;
        if (y === h) {
          if (h === 0) c = C.sand;
          else c = valueNoise(bx * 0.34, bz * 0.34, spec.seed + 7) > 0.47 ? C.grassTop : C.grassDark;
        } else if (y >= 0) {
          c = C.sandDark; // cream side band, from the refs
        } else if (y === -1) {
          c = C.rockSide;
        } else {
          c = C.rockSideDark;
        }
        out.push({ x: bx, y: y + 0.5, z: bz, c });
      }
    }
  }
  return out;
}

/** All terrain blocks for every island, keyed by island id. */
export function allTerrain(): Map<string, VoxelList> {
  const map = new Map<string, VoxelList>();
  for (const spec of ISLANDS) map.set(spec.id, terrainBlocks(spec));
  return map;
}
