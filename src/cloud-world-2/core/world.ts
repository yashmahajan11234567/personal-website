/**
 * Cloud World 2.0 — world assembly.
 *
 * Single source of truth for "where things are". Assembles terrain, decks,
 * vegetation, structures and signage into one block list + a solid-collision
 * subset + hotspots. Everything downstream (renderer, physics, navigation,
 * minimap, QA hooks) reads from here — nothing else hardcodes a coordinate.
 *
 * Assembly order is the collision policy: terrain first, then structures
 * overwrite it. A structure block landing inside the ground is dropped, so no
 * z-fighting and no buried geometry. Vegetation is tracked separately and
 * stays walk-through.
 */

import { P } from './palette';
import { BERTHS, DECKS, ISLANDS, SPAWN, buildHotspots, HARBOUR_CX, HARBOUR_CZ, STALLS, STALL_ROW_Z, HOUSES } from './registry';
import { columnHeight, hash2, terrainBlocks, islandSurfaceYFn } from './terrainShim';
import type { Block, BlockList, Hotspot, WorldLabel, Deck, Berth } from './types';
import { Chunk, placeChunk, placeWithFoundation, highestGroundBase } from './voxel/builder';

/* ------------------------------------------------------------------ */
/* Ground queries                                                      */
/* ------------------------------------------------------------------ */

/** Terrain top surface at (x, z), or null for open water. */
export function terrainY(x: number, z: number): number | null {
  return islandSurfaceYFn(ISLANDS, x, z);
}

/** Terrain top BLOCK layer at (x, z) (one below the surface), or null. */
export function groundTop(x: number, z: number): number | null {
  return columnHeight(ISLANDS, x, z);
}

/** The village plateau centre — used for the zone label radius. */
export const VILLAGE_ZONE = { x: HARBOUR_CX + 11, z: HARBOUR_CZ + 4 };

/* ------------------------------------------------------------------ */
/* Vegetation (walk-through)                                           */
/* ------------------------------------------------------------------ */

const occupied: { x0: number; x1: number; z0: number; z1: number }[] = [];
const natureTaken = new Set<string>();
const KEY = (x: number, z: number) => `${x},${z}`;

function reserve(x: number, z: number, pad: number): void {
  for (let dx = -pad; dx <= pad; dx++) {
    for (let dz = -pad; dz <= pad; dz++) natureTaken.add(KEY(x + dx, z + dz));
  }
}

function isOccupied(x: number, z: number, pad = 2): boolean {
  for (const r of occupied) {
    if (x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad) return true;
  }
  return false;
}

/** Deterministic vegetation scatter for one island, avoiding structures. */
function islandVegetation(specId: string): BlockList {
  const spec = ISLANDS.find((s) => s.id === specId);
  if (!spec) return [];
  const c = new Chunk();
  const rnd = lcg(spec.seed * 977);
  const small = spec.r < 10;
  const tries = specId === 'harbour' ? 1100 : specId === 'spawn' ? 260 : 120;
  const spacing = small ? 3 : 4;

  for (let i = 0; i < tries; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * spec.r * 0.92;
    const x = Math.round(spec.cx + Math.cos(a) * r);
    const z = Math.round(spec.cz + Math.sin(a) * r);
    const h = columnHeight(ISLANDS, x, z);
    if (h === null || h < 1) continue;
    if (isOccupied(x, z, 3)) continue;
    if (natureTaken.has(KEY(x, z))) continue;

    const t = rnd();
    const sandy = h <= 1;
    if (sandy && t < 0.4) {
      palm(c, x, h + 1, z, spec.seed + i);
      reserve(x, z, spacing);
    } else if (!sandy && t < 0.34) {
      tree(c, x, h + 1, z, spec.seed + i);
      reserve(x, z, spacing);
    } else if (t < 0.6) {
      bush(c, x, h + 1, z);
      reserve(x, z, 2);
    } else if (t < 0.72) {
      flowers(c, x, h + 1, z, spec.seed + i);
      reserve(x, z, 2);
    } else if (t < 0.82) {
      rocks(c, x, h + 1, z);
      reserve(x, z, 2);
    }
  }
  return c.list();
}

/** Tiny deterministic LCG for scatter. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* -- fresh vegetation primitives (local, walk-through) ---------------- */

function palm(c: Chunk, x: number, y: number, z: number, seed: number): void {
  const lean = hash2(x, z, seed) > 0.5 ? 1 : -1;
  const hgt = 3 + Math.floor(hash2(x, z, seed + 1) * 2);
  for (let i = 0; i < hgt; i++) c.put(x + (i > hgt - 3 ? lean : 0), y + i, z, P.trunk, 0.6, 1, 0.6);
  const ty = y + hgt;
  const tx = x + lean;
  c.put(tx, ty, z, P.leafLight, 1.4, 0.5, 1.4);
  c.put(tx + 1.4, ty - 0.2, z, P.leaf, 1.2, 0.4, 0.8);
  c.put(tx - 1.4, ty - 0.2, z, P.leaf, 1.2, 0.4, 0.8);
  c.put(tx, ty - 0.2, z + 1.4, P.leaf, 0.8, 0.4, 1.2);
  c.put(tx, ty - 0.2, z - 1.4, P.leaf, 0.8, 0.4, 1.2);
  c.put(tx, ty + 0.3, z, P.leafLight, 0.8, 0.4, 0.8);
}

function tree(c: Chunk, x: number, y: number, z: number, seed: number): void {
  const hgt = 2 + Math.floor(hash2(x, z, seed) * 2);
  for (let i = 0; i < hgt; i++) c.put(x, y + i, z, P.trunk, 0.7, 1, 0.7);
  const ty = y + hgt;
  c.put(x, ty, z, P.leaf, 2.6, 1.2, 2.6);
  c.put(x, ty + 1, z, P.leafLight, 1.6, 0.8, 1.6);
  c.put(x, ty + 1.6, z, P.leaf, 0.9, 0.5, 0.9);
}

function bush(c: Chunk, x: number, y: number, z: number): void {
  c.put(x, y + 0.3, z, P.leaf, 1.1, 0.7, 1.1);
  c.put(x + 0.3, y + 0.7, z - 0.2, P.leafLight, 0.7, 0.5, 0.7);
}

function flowers(c: Chunk, x: number, y: number, z: number, seed: number): void {
  const cols = [P.flowerPink, P.flowerWhite, P.flowerYellow];
  for (let i = 0; i < 3; i++) {
    const fx = x + Math.round(hash2(x + i, z, seed) * 2 - 1);
    const fz = z + Math.round(hash2(x, z + i, seed + 3) * 2 - 1);
    c.put(fx, y + 0.15, fz, cols[i % 3], 0.4, 0.3, 0.4);
  }
}

function rocks(c: Chunk, x: number, y: number, z: number): void {
  c.put(x, y + 0.2, z, P.rockSide, 0.9, 0.5, 0.9);
  c.put(x + 0.4, y + 0.5, z + 0.3, P.rockSideDark, 0.6, 0.4, 0.6);
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

let cachedWorld: BlockList | null = null;
let cachedCollision: BlockList | null = null;
let cachedHotspots: Hotspot[] | null = null;
let cachedLabels: WorldLabel[] | null = null;
let cachedLanterns: [number, number, number][] | null = null;
let cachedTerrainKeys: Set<string> | null = null;
let cachedVegKeys: Set<string> | null = null;

export interface AssembledWorld {
  world: BlockList;
  solid: BlockList;
  hotspots: Hotspot[];
  labels: WorldLabel[];
  lanterns: [number, number, number][];
}

/**
 * The entire static world. Order: terrain → structures (overwrite) →
 * vegetation (tracked separately for the walk-through rule).
 */
export function staticWorld(): AssembledWorld {
  if (cachedWorld) {
    return { world: cachedWorld, solid: cachedCollision!, hotspots: cachedHotspots!, labels: cachedLabels!, lanterns: cachedLanterns! };
  }

  occupied.length = 0;
  natureTaken.clear();

  /* reserve dock footprints + the spawn clearing before scattering */
  for (const d of DECKS) occupied.push({ x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1 });
  occupied.push({ x0: Math.round(SPAWN.x) - 6, x1: Math.round(SPAWN.x) + 6, z0: Math.round(SPAWN.z) - 6, z1: Math.round(SPAWN.z) + 6 });

  const map = new Map<string, Block>();
  const terrainKeys = new Set<string>();

  for (const spec of ISLANDS) {
    for (const b of terrainBlocks(spec)) {
      const k = `${b.x},${b.y},${b.z}`;
      terrainKeys.add(k);
      map.set(k, b);
    }
  }

  const push = (list: BlockList, overwriteTerrain: boolean) => {
    for (const b of list) {
      const k = `${b.x},${b.y},${b.z}`;
      if (!overwriteTerrain && terrainKeys.has(k)) continue;
      map.set(k, b);
    }
  };

  /* ---- docks (walkable decks + their piles/rails/props) ---- */
  const lanterns: [number, number, number][] = [];
  const dockBlocks = buildDocks(lanterns);
  push(dockBlocks, true);

  /* ---- structures (stalls, houses, harbour landmarks) ---- */
  const structureBlocks = buildStructures(lanterns);
  push(structureBlocks, true);

  /* ---- signage posts ---- */
  const signBlocks = buildSignage();
  push(signBlocks, false);

  /* ---- vegetation ---- */
  const vegKeys = new Set<string>();
  for (const spec of ISLANDS) {
    for (const b of islandVegetation(spec.id)) {
      const k = `${b.x},${b.y},${b.z}`;
      if (terrainKeys.has(k)) continue;
      vegKeys.add(k);
      map.set(k, b);
    }
  }

  cachedWorld = Array.from(map.values());
  cachedCollision = cachedWorld.filter((b) => !vegKeys.has(`${b.x},${b.y},${b.z}`) && !terrainKeys.has(`${b.x},${b.y},${b.z}`));
  cachedTerrainKeys = terrainKeys;
  cachedVegKeys = vegKeys;

  const { hotspots, labels } = buildHotspots(terrainY);
  cachedHotspots = hotspots;
  cachedLabels = labels;
  cachedLanterns = lanterns;

  return { world: cachedWorld, solid: cachedCollision, hotspots, labels, lanterns };
}

/* -- docks ------------------------------------------------------------ */

function buildDocks(lanterns: [number, number, number][]): BlockList {
  const out: BlockList = [];
  for (const d of DECKS) {
    const c = new Chunk();
    const w = d.x1 - d.x0 + 1;
    const dep = d.z1 - d.z0 + 1;
    // plank surface at layer 1 (centre) → walkable top at y=2
    c.fill(0, 1, 0, w - 1, 1, dep - 1, P.wood);
    // plank seams
    for (let x = 0; x < w; x += 2) c.putBox(x + 0.45, 1.28, 0, 0.1, 0.06, dep, P.woodDark);
    // support piles into the water every 3 blocks
    for (let x = 0; x < w; x += 3) {
      c.putBox(x + 0.3, -1.6, 0.2, 0.4, 2.6, 0.4, P.woodDark);
      c.putBox(x + 0.3, -1.6, dep - 0.6, 0.4, 2.6, 0.4, P.woodDark);
    }
    // railings: posts + top rail along both long sides, entry gaps at ends
    for (let x = 1; x < w - 1; x += 2) {
      c.putBox(x, 1.5, 0.15, 0.22, 1.1, 0.22, P.woodDark);
      c.putBox(x, 1.5, dep - 0.37, 0.22, 1.1, 0.22, P.woodDark);
    }
    c.putBox(1, 2.55, 0.22, w - 2, 0.14, 0.12, P.wood);
    c.putBox(1, 2.55, dep - 0.34, w - 2, 0.14, 0.12, P.wood);
    // mooring bollards on the water side
    for (let x = 2; x < w - 1; x += 5) c.putBox(x, 2, dep - 0.2, 0.5, 0.5, 0.5, P.stoneDark);
    // crates + barrels near the shore end
    if (w >= 10) {
      c.putBox(1.2, 2, dep - 1.4, 1, 1, 1, P.wood);
      c.putBox(2.4, 2, dep - 1.6, 0.9, 0.9, 0.9, P.cargoRust);
      c.putBox(1.3, 3, dep - 1.5, 0.8, 0.8, 0.8, P.woodDark);
    }
    // lamps
    for (let x = 3; x < w - 1; x += 5) {
      c.putBox(x, 2, 0.5, 0.18, 1.3, 0.18, P.woodDark);
      c.putBox(x, 3.45, 0.5, 0.42, 0.42, 0.42, P.lantern);
      const lx = d.x0 + x;
      lanterns.push([lx, d.y + 1.45, d.z0 + 0.5]);
    }
    placeChunk(c, out, d.x0, 0, d.z0, 0);
  }
  return out;
}

/* -- structures --------------------------------------------------------- */

function buildStructures(lanterns: [number, number, number][]): BlockList {
  const out: BlockList = [];

  /* welcome hall on the harbour hill */
  {
    const c = new Chunk();
    buildWelcomeHallLocal(c);
    const cx = HARBOUR_CX + 18;
    const cz = HARBOUR_CZ + 6;
    const base = highestGroundBase(cx, cz, 7, 5, groundTop);
    placeWithFoundation(c, out, cx, cz, 0, { fx: 7, fz: 5 }, base, groundTop, P.stoneDark);
  }

  /* harbour lighthouse on the seaward headland */
  {
    const c = new Chunk();
    buildLighthouseLocal(c);
    const cx = HARBOUR_CX - 20;
    const cz = HARBOUR_CZ - 8;
    const base = highestGroundBase(cx, cz, 3, 3, groundTop);
    placeWithFoundation(c, out, cx, cz, 0, { fx: 3, fz: 3 }, base, groundTop, P.stoneDark);
  }

  /* the six skill stalls — each on its OWN ground layer */
  for (const s of STALLS) {
    const c = new Chunk();
    buildStallLocal(c, s);
    const base = highestGroundBase(s.x, STALL_ROW_Z, 3, 2, groundTop);
    placeWithFoundation(c, out, s.x, STALL_ROW_Z, 0, { fx: 3, fz: 2 }, base, groundTop, P.stoneDark);
  }

  /* the three project houses */
  for (const h of HOUSES) {
    const c = new Chunk();
    buildHouseLocal(c, h);
    const cx = HARBOUR_CX + h.lx;
    const cz = HARBOUR_CZ + h.lz;
    const base = highestGroundBase(cx, cz, h.width / 2 + 1, h.depth / 2 + 1, groundTop);
    placeWithFoundation(c, out, cx, cz, h.quarter, { fx: h.width / 2 + 1, fz: h.depth / 2 + 1 }, base, groundTop, P.stoneDark);
  }

  /* plaza dressing: lamps, flagpole, market clutter, path strips */
  {
    const c = new Chunk();
    const px = HARBOUR_CX + 6;
    const pz = HARBOUR_CZ + 8;
    for (let i = -8; i <= 8; i += 4) {
      c.putBox(i, 0, -5, 0.22, 1.6, 0.22, P.woodDark);
      c.putBox(i, 1.75, -5, 0.45, 0.45, 0.45, P.lantern);
      lanterns.push([px + i, 2.2, pz - 5]);
      c.putBox(i, 0, 5, 0.22, 1.6, 0.22, P.woodDark);
      c.putBox(i, 1.75, 5, 0.45, 0.45, 0.45, P.lantern);
      lanterns.push([px + i, 2.2, pz + 5]);
    }
    // flagpole
    c.putBox(0, 0, 0, 0.3, 7, 0.3, P.woodDark);
    c.putBox(0.35, 5.6, 0, 1.6, 1, 0.12, P.roofBlue);
    // paved cross + accent paths to each house
    for (let x = -11; x <= 11; x++) c.putBox(x, 0.06, 0, 1, 0.12, 3.4, P.sandDark);
    for (let z = -9; z <= 9; z++) c.putBox(0, 0.06, z, 3.4, 0.12, 1, P.sandDark);
    for (const h of HOUSES) {
      const tx = h.lx;
      const tz = h.lz + (h.quarter === 2 ? -h.depth / 2 - 1 : h.depth / 2 + 1);
      c.putBox(tx / 2, 0.07, 0, Math.abs(tx) + 1, 0.14, 1.6, h.accent);
      c.putBox(tx, 0.07, tz / 2, 1.6, 0.14, Math.abs(tz) + 1, h.accent);
    }
    // market clutter
    for (let i = 0; i < 4; i++) {
      c.putBox(-8 + i * 5, 0, 9, 1, 1, 1, P.wood);
      c.putBox(-8 + i * 5, 0, -9, 0.9, 0.9, 0.9, P.cargoRust);
    }
    const base = highestGroundBase(px, pz, 12, 10, groundTop);
    placeWithFoundation(c, out, px, pz, 0, { fx: 12, fz: 10 }, base, groundTop, P.stoneDark);
  }

  /* beacon islet: small tower + rest stop */
  {
    const c = new Chunk();
    buildLighthouseLocal(c, 8);
    c.putBox(4, 0, -2, 0.9, 0.9, 0.9, P.cargoRust);
    c.putBox(4, 0, 0, 0.9, 0.9, 0.9, P.cargoRust);
    c.putBox(-4, 0, 3, 1, 1, 1, P.wood);
    const cx = 64 + 1;
    const cz = -38;
    const base = highestGroundBase(cx, cz, 3, 3, groundTop);
    placeWithFoundation(c, out, cx, cz, 0, { fx: 3, fz: 3 }, base, groundTop, P.stoneDark);
  }

  return out;
}

/* Local structure builders — thin wrappers over the structures module.
 * The geometry lives in core/structures/*.ts; these wrappers bind palette
 * defaults and register lantern positions. */

import { buildWelcomeHall } from './structures/welcomeHall';
import { buildLighthouse } from './structures/lighthouse';
import { buildStall } from './structures/stall';
import { buildHouse } from './structures/house';

function buildWelcomeHallLocal(c: Chunk): void {
  buildWelcomeHall(c, P.roofBlue);
}

function buildLighthouseLocal(c: Chunk, height = 12): void {
  buildLighthouse(c, height);
}

function buildStallLocal(c: Chunk, spec: (typeof STALLS)[number]): void {
  buildStall(c, spec);
}

function buildHouseLocal(c: Chunk, spec: (typeof HOUSES)[number]): void {
  buildHouse(c, spec);
}

/* -- signage ---------------------------------------------------------- */

function buildSignage(): BlockList {
  const out: BlockList = [];
  const post = (x: number, z: number, arms: { dx: number; dz: number; accent: number }[]) => {
    const g = terrainY(x, z);
    if (g === null) return;
    const c = new Chunk();
    c.putBox(0, 0, 0, 0.26, 3, 0.26, P.woodDark);
    for (const arm of arms) {
      const len = 1.5;
      c.putBox(arm.dx * len * 0.5 - (arm.dx < 0 ? len * 0.5 : 0) + (arm.dx > 0 ? 0.13 : 0), 2.2, arm.dz * len * 0.5 - (arm.dz < 0 ? len * 0.5 : 0) + (arm.dz > 0 ? 0.13 : 0), arm.dx !== 0 ? len : 0.3, 0.28, arm.dz !== 0 ? len : 0.3, arm.accent);
      // white icon mark on the arm
      c.putBox(arm.dx * len * 0.75, 2.28, arm.dz * len * 0.75, 0.3, 0.12, 0.3, P.signText);
    }
    placeChunk(c, out, x, g, z, 0);
  };

  /* arrival dock: the three-way decision */
  post(-44, -45, [
    { dx: 1, dz: 0, accent: P.roofBlue },
    { dx: 0, dz: 1, accent: P.containerCyan },
    { dx: -1, dz: 0, accent: P.whaleBlue },
  ]);
  /* marketplace entry */
  post(6, 41, [{ dx: 1, dz: 0, accent: P.roofBlue }]);
  /* village entry */
  post(HARBOUR_CX - 9, HARBOUR_CZ + 13, [{ dx: 1, dz: 0, accent: P.containerCyan }]);
  /* one signpost per house front */
  for (const h of HOUSES) {
    const hx = HARBOUR_CX + h.lx + h.width / 2 + 1;
    const hz = HARBOUR_CZ + h.lz + (h.quarter === 2 ? -h.depth / 2 - 2 : h.depth / 2 + 2);
    post(hx, hz, [{ dx: -1, dz: 0, accent: h.accent }]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Read-only helpers for other systems                                 */
/* ------------------------------------------------------------------ */

export function allDecks(): Deck[] {
  return DECKS;
}

export function allBerths(): Berth[] {
  return BERTHS;
}

/** Terrain surface for arbitrary queries (used by hotspots, minimap). */
export { terrainY as groundSurface };

/** Render partition keys — consumed by the voxel renderer. */
export function renderPartition(): { terrainKeys: Set<string>; vegKeys: Set<string> } {
  staticWorld();
  return { terrainKeys: cachedTerrainKeys!, vegKeys: cachedVegKeys! };
}
