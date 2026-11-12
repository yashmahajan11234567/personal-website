/**
 * World assembly — geography, structures, walkable surfaces and hotspots.
 *
 * This module owns the single source of truth for "where things are". Nothing
 * else in the game hardcodes a coordinate, so moving a building is a one-line
 * change here and every system (terrain, camera, interaction, collision)
 * follows.
 *
 * Structure placement is deliberately defensive: a structure's base layer is
 * the HIGHEST ground column under its footprint, and every lower column is
 * filled with a stone foundation. That means a building can straddle a slope
 * without ever producing a hole in its walls — the mistake that usually makes
 * a hand-placed voxel village look broken.
 */
import { C } from './palette';
import { Chunk, place, type VoxelList } from './voxel';
import {
  ISLANDS,
  islandById,
  columnHeight,
  islandSurfaceY,
  shoreDistance,
  terrainBlocks,
} from './terrain';
import { lcg, hash2 } from './noise';
import {
  palm,
  canopyTree,
  bush,
  cactus,
  flowers,
  rockCluster,
  crate,
  barrel,
  lamp,
  signpost,
  flagpole,
  bollard,
  marketStall,
  skillStall,
  dinghy,
} from './props';
import { dock, gateway, house, lighthouse, welcomeHall } from './buildings';

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

export const DECK_LAYER = 1;
export const DECK_SURFACE = DECK_LAYER + 1;

export interface DeckRect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** walkable surface height */
  y: number;
  label: string;
}

/**
 * Dock decks. These are walkable rectangles independent of the terrain, so a
 * jetty crossing open water is solid ground for the character. The deck layer
 * is pinned to 1 (surface 2.0) so the harbour quay and every jetty line up.
 */
export const DOCKS: DeckRect[] = [
  { x0: -41, x1: -30, z0: -49, z1: -46, y: DECK_SURFACE, label: 'Arrival Dock' },
  { x0: -8, x1: 16, z0: 33, z1: 39, y: DECK_SURFACE, label: 'Harbour Pier' },
  { x0: 50, x1: 60, z0: -46, z1: -42, y: DECK_SURFACE, label: 'Beacon Jetty' },
];

/** Where the Docker Whale sits when moored, just off each dock's outer end. */
export interface Berth {
  x: number;
  z: number;
  heading: number;
  dock: DeckRect;
  label: string;
}

/** Hull half-length used to keep a moored whale clear of the pier it serves. */
export const WHALE_HALF_LENGTH = 7.5;

export const BERTHS: Berth[] = [
  { x: -22, z: -47.5, heading: Math.PI / 2, dock: DOCKS[0], label: 'Arrival Dock' },
  { x: -16, z: 36, heading: -Math.PI / 2, dock: DOCKS[1], label: 'Harbour Pier' },
  { x: 45, z: -44, heading: -Math.PI / 2, dock: DOCKS[2], label: 'Beacon Jetty' },
];

/** Starting position: on the shore beside the arrival dock, facing the route. */
export const SPAWN = { x: -45.5, z: -47.5, heading: Math.PI / 2 };

export const START_BERTH = BERTHS[0];

/** The whale must stay in open water and inside the reef. */
export function canSailTo(x: number, z: number): boolean {
  if (Math.hypot(x, z) > 300) return false;
  return shoreDistance(x, z) > 2.4;
}

/* ------------------------------------------------------------------ */
/* Placement helpers                                                   */
/* ------------------------------------------------------------------ */

/** Terrain top layer at a column, or null at sea. */
function topLayerAt(x: number, z: number): number | null {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  for (const spec of ISLANDS) {
    const h = columnHeight(spec, bx, bz);
    if (h !== null) return h;
  }
  return null;
}

interface Placement {
  chunk: Chunk;
  cx: number;
  cz: number;
  quarter: number;
  /** half-extents of the local footprint, used for the foundation pass */
  fx: number;
  fz: number;
  /** fixed base layer (docks); otherwise the highest ground column is used */
  base?: number;
  foundation?: number;
}

/** Build every static structure, then place them with foundations. */
function buildStructures(): VoxelList {
  const out: VoxelList = [];
  const harbour = islandById('harbour');
  const beacon = islandById('palm');

  const placements: Placement[] = [];

  /* ---------------- docks ---------------- */
  // arrival dock: spans the spawn island's shore out over the water
  {
    const c = new Chunk();
    dock(c, DOCKS[0].x1 - DOCKS[0].x0 + 1, DOCKS[0].z1 - DOCKS[0].z0 + 1, [0, 2]);
    placements.push({
      chunk: c,
      cx: (DOCKS[0].x0 + DOCKS[0].x1) / 2,
      cz: (DOCKS[0].z0 + DOCKS[0].z1) / 2,
      quarter: 0,
      fx: (DOCKS[0].x1 - DOCKS[0].x0) / 2,
      fz: (DOCKS[0].z1 - DOCKS[0].z0) / 2,
      base: DECK_LAYER,
    });
  }
  // harbour pier: long quay running west out of the harbour floor
  {
    const c = new Chunk();
    dock(c, DOCKS[1].x1 - DOCKS[1].x0 + 1, DOCKS[1].z1 - DOCKS[1].z0 + 1, [0, 2]);
    placements.push({
      chunk: c,
      cx: (DOCKS[1].x0 + DOCKS[1].x1) / 2,
      cz: (DOCKS[1].z0 + DOCKS[1].z1) / 2,
      quarter: 0,
      fx: (DOCKS[1].x1 - DOCKS[1].x0) / 2,
      fz: (DOCKS[1].z1 - DOCKS[1].z0) / 2,
      base: DECK_LAYER,
    });
  }
  // beacon jetty
  {
    const c = new Chunk();
    dock(c, DOCKS[2].x1 - DOCKS[2].x0 + 1, DOCKS[2].z1 - DOCKS[2].z0 + 1, [0, 2]);
    placements.push({
      chunk: c,
      cx: (DOCKS[2].x0 + DOCKS[2].x1) / 2,
      cz: (DOCKS[2].z0 + DOCKS[2].z1) / 2,
      quarter: 0,
      fx: (DOCKS[2].x1 - DOCKS[2].x0) / 2,
      fz: (DOCKS[2].z1 - DOCKS[2].z0) / 2,
      base: DECK_LAYER,
    });
  }

  /* ---------------- harbour prop dressing ---------------- */
  {
    const c = new Chunk();
    // barrels and crates along the quay
    for (let i = 0; i < 5; i++) barrel(c, 2 + i * 2, 0, 0);
    for (let i = 0; i < 3; i++) crate(c, 14 - i * 2, 0, 1);
    lampsAlong(c, -2, 14, 3);
    // mooring bollards on the water side
    for (let x = -1; x <= 13; x += 4) bollard(c, x, 0, -3);
    placements.push({ chunk: c, cx: 6, cz: 36, quarter: 0, fx: 9, fz: 4, base: DECK_LAYER });
  }

  /* ---------------- Welcome Hall ---------------- */
  {
    const c = new Chunk();
    welcomeHall(c, C.roofBlue);
    placements.push({ chunk: c, cx: harbour.cx + 26, cz: harbour.cz + 6, quarter: 3, fx: 7, fz: 5 });
  }

  /* ---------------- market stalls (harbour square) ----------------
   * Same per-stall placement rule as the skill row: narrow footprints keep
   * every foundation within one step of the ground it stands on. */
  const marketRow: { x: number; z: number; a: number; b: number }[] = [
    // westmost stall sits clear of the ramp corridor (x 16–18): its east
    // posts used to pinch the pier exit against the ramp steps
    { x: 13, z: 39, a: C.awningBlue, b: C.wallCream },
    { x: 20, z: 36, a: C.awningTerracotta, b: C.wallCream },
    { x: 25, z: 36, a: C.awningBlue, b: C.wallCream },
  ];
  for (const m of marketRow) {
    const c = new Chunk();
    marketStall(c, 0, 0, 0, m.a, m.b);
    placements.push({
      chunk: c,
      cx: m.x,
      cz: m.z,
      quarter: 0,
      fx: 2,
      fz: 2,
      base: (topLayerAt(m.x, m.z) ?? 0) + 1,
    });
  }
  // harbour clutter in narrow strips, each pinned to its own ground layer so
  // no strip straddling a slope grows an unclimbable foundation wall
  {
    const c = new Chunk();
    for (let i = 0; i < 5; i++) crate(c, -6 + i * 3, 0, 0);
    placements.push({
      chunk: c,
      cx: harbour.cx - 16,
      cz: harbour.cz - 4,
      quarter: 0,
      fx: 7,
      fz: 1,
      base: (topLayerAt(harbour.cx - 16, harbour.cz - 4) ?? 0) + 1,
    });
  }
  {
    const c = new Chunk();
    // three barrels beside the gateway — clear of its 5-block passage
    for (let i = 0; i < 3; i++) barrel(c, 0, 0, -2 + i * 2);
    placements.push({
      chunk: c,
      cx: harbour.cx - 11,
      cz: harbour.cz,
      quarter: 0,
      fx: 2,
      fz: 2,
      base: (topLayerAt(harbour.cx - 11, harbour.cz) ?? 0) + 1,
    });
  }
  {
    const c = new Chunk();
    // behind the stalls, so no lamp post lands inside a stall footprint
    lampsAlong(c, -6, 6, 0);
    placements.push({
      chunk: c,
      cx: harbour.cx - 16,
      cz: harbour.cz + 13,
      quarter: 0,
      fx: 7,
      fz: 1,
      base: (topLayerAt(harbour.cx - 16, harbour.cz + 13) ?? 0) + 1,
    });
  }

  /* ---------------- skill stalls (harbour front: exactly six, locked) ----------------
   * Locked product decision: Docker, CI/CD, Cloud & Infrastructure, Kubernetes,
   * Programming (Python), Data & AI (SQL). Linux is NOT a stall. Spacing is 8
   * blocks on the same z row the market has always occupied.
   * Each stall is its OWN placement so its foundation hugs the LOCAL ground:
   * one shared 45-block footprint would raise the whole row onto the highest
   * column's layer, building an unclimbable terrace across the harbour floor. */
  const stallRow: { x: number; accent: number; goods: number }[] = [
    { x: 8, accent: C.fishBlue, goods: C.fishBlue },          // Docker Fish Market
    { x: 16, accent: C.pipeGrey, goods: C.pipeGrey },         // CI/CD Workshop
    { x: 24, accent: C.roofTerracotta, goods: C.cargoGreen }, // Cloud & Infrastructure
    { x: 32, accent: C.roofBlue, goods: C.whaleBlue },        // Kubernetes / Container Orchestration
    { x: 40, accent: C.flowerYellow, goods: C.flowerYellow }, // Programming Workshop
    { x: 48, accent: C.cargoGreen, goods: C.containerCyan },  // Data & AI Laboratory
  ];
  for (const s of stallRow) {
    const c = new Chunk();
    skillStall(c, 0, 0, 2, s.accent, s.goods, 0);
    // base = this stall's OWN ground layer, so the counter sits one step above
    // the local ground no matter what the corners of the footprint do
    placements.push({
      chunk: c,
      cx: s.x,
      cz: harbour.cz + 8,
      quarter: 0,
      fx: 2,
      fz: 4,
      base: (topLayerAt(s.x, harbour.cz + 8) ?? 0) + 1,
    });
  }

  /* ---------------- Lighthouse (seaward headland) ---------------- */
  {
    const c = new Chunk();
    lighthouse(c, 12);
    placements.push({ chunk: c, cx: harbour.cx - 20, cz: harbour.cz - 14, quarter: 0, fx: 4, fz: 4 });
  }

  /* ---------------- village: gateway ---------------- */
  {
    const c = new Chunk();
    gateway(c, C.roofTerracotta);
    placements.push({ chunk: c, cx: harbour.cx - 9, cz: harbour.cz + 6, quarter: 1, fx: 3, fz: 1 });
  }

  /* ---------------- village: the three project houses (locked) ----------------
   * Locked product decision D1: exactly three verified project houses —
   * Go Microservices, RxVerify, DevOps Masterclass. Each keeps a distinct
   * silhouette (roof shape, landmark, interior dressing, accent) and opens the
   * project's own panel projected from `projects.cloud.ts`. */
  const village: { panel: string; lx: number; lz: number; quarter: number; opts: Parameters<typeof house>[1] }[] =
    [
      {
        panel: 'go-microservices',
        lx: 4,
        lz: -4,
        quarter: 0,
        opts: { w: 9, d: 7, wallH: 4, roof: C.roofBlue, roofShape: 'gable', landmark: 'flag', decor: 'shelves', accent: C.containerCyan, chimney: true },
      },
      {
        panel: 'rxverify',
        lx: 20,
        lz: -4,
        quarter: 0,
        opts: { w: 9, d: 7, wallH: 4, roof: C.roofTerracotta, roofDark: C.roofTerracottaDark, roofShape: 'hip', landmark: 'antenna', decor: 'stands', accent: C.flowerYellow, chimney: true },
      },
      {
        panel: 'devops-masterclass',
        lx: 4,
        lz: 16,
        quarter: 2,
        opts: { w: 9, d: 7, wallH: 4, roof: C.roofBlue, roofShape: 'hip', landmark: 'flag', decor: 'racks', accent: C.cargoGreen, chimney: false },
      },
    ];
  for (const v of village) {
    const c = new Chunk();
    house(c, v.opts);
    // an accent-coloured signpost beside the front corner, facing out toward
    // the plaza: directly in front of the door its board hung at head height
    // across the entrance approach
    signpost(c, v.opts.w / 2 + 1, 0, (v.opts.d - 1) / 2 + 2, 0, 3, v.opts.accent);
    placements.push({
      chunk: c,
      cx: harbour.cx + v.lx,
      cz: harbour.cz + v.lz,
      quarter: v.quarter,
      fx: (v.opts.w - 1) / 2 + 1,
      fz: (v.opts.d - 1) / 2 + 1,
    });
  }

  /* ---------------- village: plaza dressing ---------------- */
  {
    const c = new Chunk();
    // lanterns down both sides of the plaza
    for (let i = -4; i <= 4; i += 4) {
      lamp(c, i, 0, -6, 3);
      lamp(c, i, 0, 6, 3);
    }
    flagpole(c, 0, 0, 0, 7, C.roofBlue);
    for (let i = 0; i < 4; i++) {
      crate(c, -8 + i * 5, 0, 9);
      barrel(c, -8 + i * 5, 0, -9);
    }
    // a paved cross through the plaza
    for (let x = -11; x <= 11; x++) c.putBox(x, 0.06, 0, 1, 0.12, 3.4, C.sandDark);
    for (let z = -9; z <= 9; z++) c.putBox(0, 0.06, z, 3.4, 0.12, 1, C.sandDark);
    // accent-coloured path strips from the cross to each house front, so the
    // way to every house is visible on the ground, not just on the label
    const paths: { tx: number; tz: number; accent: number }[] = [
      { tx: -8, tz: -4, accent: C.containerCyan }, // Go Microservices House front
      { tx: 8, tz: -4, accent: C.flowerYellow }, // RxVerify House front
      { tx: -8, tz: 5, accent: C.cargoGreen }, // DevOps Masterclass House front
    ];
    for (const p of paths) {
      c.putBox((p.tx / 2), 0.06, 0, Math.abs(p.tx) + 1, 0.12, 1.6, p.accent);
      c.putBox(p.tx, 0.06, p.tz / 2, 1.6, 0.12, Math.abs(p.tz) + 1, p.accent);
    }
    placements.push({
      chunk: c,
      cx: harbour.cx + 12,
      cz: harbour.cz + 6,
      quarter: 0,
      fx: 11,
      fz: 10,
    });
  }

  /* ---------------- beacon islet: small tower + rest stop ---------------- */
  {
    const c = new Chunk();
    lighthouse(c, 8);
    for (let i = 0; i < 3; i++) barrel(c, 4, 0, -2 + i * 2);
    crate(c, -4, 0, 3);
    placements.push({ chunk: c, cx: beacon.cx + 1, cz: beacon.cz, quarter: 0, fx: 3, fz: 3 });
  }

  /* ---------------- decorative boats afloat beside the pier ---------------- */
  {
    const c = new Chunk();
    dinghy(c, 0, 0, 0, C.roofTerracotta);
    dinghy(c, 7, 0, 3, C.roofBlue);
    placements.push({ chunk: c, cx: -14, cz: 28, quarter: 0, fx: 5, fz: 3, base: 0 });
    const c2 = new Chunk();
    dinghy(c2, 0, 0, 0, C.awningBlue);
    placements.push({ chunk: c2, cx: -16, cz: 45, quarter: 2, fx: 3, fz: 2, base: 0 });
  }

  /* ---------------- lamp rows ---------------- */
  function lampsAlong(c: Chunk, x0: number, x1: number, z: number): void {
    for (let x = x0; x <= x1; x += 3) lamp(c, x, 0, z, 3);
  }

  /* ---- place them, reserving each footprint against the scatter pass ---- */
  for (const p of placements) {
    const swap = p.quarter === 1 || p.quarter === 3;
    const fx = swap ? p.fz : p.fx;
    const fz = swap ? p.fx : p.fz;
    OCCUPIED.push({
      x0: Math.round(p.cx - fx),
      x1: Math.round(p.cx + fx),
      z0: Math.round(p.cz - fz),
      z1: Math.round(p.cz + fz),
    });
    out.push(...placeWithFoundation(p));
  }
  return out;
}

/**
 * Place one structure: find the highest ground column under its footprint,
 * fill every lower column up to that layer with a foundation, then stamp the
 * structure. Returns the world-space blocks.
 */
function placeWithFoundation(p: Placement): VoxelList {
  const swap = p.quarter === 1 || p.quarter === 3;
  const fx = swap ? p.fz : p.fx;
  const fz = swap ? p.fx : p.fz;
  const x0 = Math.round(p.cx - fx);
  const x1 = Math.round(p.cx + fx);
  const z0 = Math.round(p.cz - fz);
  const z1 = Math.round(p.cz + fz);

  let base = p.base ?? 0;
  if (p.base === undefined) {
    let highest = -99;
    let any = false;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const t = topLayerAt(x, z);
        if (t !== null) {
          any = true;
          if (t + 1 > highest) highest = t + 1;
        }
      }
    }
    base = any ? highest : 1;
  }

  const out: VoxelList = [];
  // foundation: fill the gap between the ground and the structure's base
  const foundationColor = p.base === undefined ? C.stoneDark : C.woodDark;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const t = topLayerAt(x, z);
      const groundTop = t === null ? -2 : t + 1;
      for (let y = Math.min(groundTop, base); y < base; y++) {
        out.push({ x, y: y + 0.5, z, c: foundationColor });
      }
    }
  }
  place(p.chunk, out, p.cx, base, p.cz, p.quarter);
  return out;
}

/* ------------------------------------------------------------------ */
/* Vegetation and scatter                                              */
/* ------------------------------------------------------------------ */

const OCCUPIED: { x0: number; x1: number; z0: number; z1: number }[] = [];

function occupied(x: number, z: number, pad = 2): boolean {
  for (const r of OCCUPIED) {
    if (x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad) return true;
  }
  return false;
}

/**
 * Deterministic vegetation for one island, avoiding every structure.
 *
 * Density is controlled by SPACING, not by the attempt count. The first pass
 * ran 2,600 attempts with a 2-block keep-out and packed the islands so tightly
 * that the ground, the paths and the starting character were all invisible
 * under the canopy — the spawn screenshot was a wall of leaves. Trees now
 * reserve a 4-block radius, and the small islands grow 3-wide canopies instead
 * of 5-wide ones.
 */
function islandVegetation(id: string): VoxelList {
  const spec = islandById(id);
  const out: VoxelList = [];
  const c = new Chunk();
  const rnd = lcg(spec.seed * 977);
  const small = spec.r < 10;
  const tries = id === 'harbour' ? 1400 : id === 'spawn' ? 320 : 150;
  const treeSpacing = small ? 3 : 4;
  const treeRadius = small ? 1 : 2;

  for (let i = 0; i < tries; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * spec.r * 0.94;
    const x = Math.round(spec.cx + Math.cos(a) * r);
    const z = Math.round(spec.cz + Math.sin(a) * r);
    const h = columnHeight(spec, x, z);
    if (h === null || h < 1) continue; // keep the beach clear
    if (occupied(x, z, 3)) continue;
    if (natureTaken(KEY(x, z))) continue;

    const t = rnd();
    const sandy = h <= 1;
    if (sandy && t < 0.42) {
      palm(c, x, h + 1, z, 3 + Math.floor(rnd() * 2), spec.seed + i, 2);
      reserve(x, z, treeSpacing);
    } else if (!sandy && t < 0.36) {
      canopyTree(c, x, h + 1, z, 2 + Math.floor(rnd() * 2), spec.seed + i, treeRadius);
      reserve(x, z, treeSpacing);
    } else if (t < 0.64) {
      bush(c, x, h + 1, z, spec.seed + i);
      reserve(x, z, 2);
    } else if (t < 0.76) {
      flowers(c, x, h + 1, z, spec.seed + i);
      reserve(x, z, 2);
    } else if (t < 0.86) {
      rockCluster(c, x, h + 1, z, 1, spec.seed + i);
      reserve(x, z, 2);
    } else if (h >= 2) {
      cactus(c, x, h + 1, z, 2 + Math.floor(rnd() * 2));
      reserve(x, z, 2);
    }
  }
  out.push(...c.list());
  return out;
}

const NATURE = new Set<string>();
const KEY = (x: number, z: number) => `${x},${z}`;
function natureTaken(k: string): boolean {
  return NATURE.has(k);
}
function reserve(x: number, z: number, pad: number): void {
  for (let dx = -pad; dx <= pad; dx++) {
    for (let dz = -pad; dz <= pad; dz++) NATURE.add(KEY(x + dx, z + dz));
  }
}

/* ------------------------------------------------------------------ */
/* Signage                                                             */
/* ------------------------------------------------------------------ */

export interface Hotspot {
  id: string;
  /** panel opened by this hotspot */
  panel: string;
  label: string;
  x: number;
  y: number;
  z: number;
  r: number;
}

export const VILLAGE_ORIGIN = { x: 36 + 11, z: 36 + 4 };

/** Floating label above each village house (rendered as HTML billboards). */
export interface VillageLabel {
  label: string;
  x: number;
  y: number;
  z: number;
  accent: number;
}
export const VILLAGE_LABELS: VillageLabel[] = [];

/** Each house's accent colour, keyed by panel id (single source of truth). */
export const ACCENT_BY_PANEL: Record<string, number> = {
  'go-microservices': C.containerCyan,
  rxverify: C.flowerYellow,
  'devops-masterclass': C.cargoGreen,
};

function buildSigns(): { blocks: VoxelList; hotspots: Hotspot[] } {
  const blocks: VoxelList = [];
  const hotspots: Hotspot[] = [];
  VILLAGE_LABELS.length = 0;
  const H = 36; // harbour island centre

  /** Plant a voxel signpost on the ground at (x, z) and register its hotspot. */
  const put = (x: number, z: number, facing: 0 | 1 | 2 | 3, panel: string, label: string, r = 4) => {
    const g = islandSurfaceY(x, z);
    if (g === null) return;
    const c = new Chunk();
    signpost(c, 0, 0, 0, facing, 3);
    const list: VoxelList = [];
    place(c, list, x, g, z, 0);
    blocks.push(...list);
    hotspots.push({ id: `hs_${panel}_${x}_${z}`, panel, label, x, y: g + 1, z, r });
  };

  /* ---- starting island ---- */
  put(-44, -45, 0, 'welcome', 'Welcome to Cloud World', 7);
  put(-46, -51, 1, 'controls', 'How to Play', 6);
  // beside the dock, never on it: a sign in the dock corridor (z=-47) plus its
  // 3-wide board used to wall off the pier from the spawn shore
  put(-39, -44, 1, 'whale', 'The Docker Whale', 6);

  /* ---- the whale's home berth, at the end of the arrival dock ---- */
  hotspots.push({
    id: 'hs_whale_berth',
    panel: 'whale',
    label: 'Docker Whale — press E to board',
    x: -30,
    y: DECK_SURFACE + 1,
    z: -47.5,
    r: 7,
  });

  /* ---- harbour ---- */
  put(H - 18, H + 3, 1, 'whale', 'Docker Whale', 6);
  hotspots.push({
    id: 'hs_welcome_hall',
    panel: 'harbour',
    label: 'Welcome Hall',
    x: H + 18,
    y: 7,
    z: H + 6,
    r: 8,
  });
  hotspots.push({
    id: 'hs_lighthouse',
    panel: 'harbour',
    label: 'The Harbour Light',
    x: H - 20,
    y: 4,
    z: H - 8,
    r: 7,
  });

  /* ---- the village gateway ---- */
  put(H - 9, H + 13, 0, 'village', 'Portfolio Village', 8);

  /* ---- the three project houses: a hotspot in front of each open front ---- */
  const fronts: { panel: string; x: number; z: number; label: string }[] = [
    { panel: 'go-microservices', x: H + 4, z: H + 2, label: 'Go Microservices — Real-Time Balance Visibility' },
    { panel: 'rxverify', x: H + 20, z: H + 2, label: 'RxVerify — Digital Prescription Verification' },
    { panel: 'devops-masterclass', x: H + 4, z: H + 11, label: 'Full-Stack AI DevOps Masterclass' },
  ];
  for (const f of fronts) {
    const g = islandSurfaceY(f.x, f.z);
    if (g === null) continue;
    hotspots.push({ id: `hs_${f.panel}`, panel: f.panel, label: f.label, x: f.x, y: g + 1, z: f.z, r: 6 });
    VILLAGE_LABELS.push({
      label: f.label,
      x: f.x,
      y: g + 9,
      z: f.z,
      accent: ACCENT_BY_PANEL[f.panel] ?? C.roofBlue,
    });
  }

  /* ---- beacon islet ---- */
  put(65, -38, 2, 'whale', 'The Docker Whale', 6);

  /* ---- skill stalls (harbour front: exactly six, locked decision) ---- */
  const skillStalls: { id: string; panel: string; label: string; x: number; z: number }[] = [
    { id: 'hs_skill_docker', panel: 'docker', label: 'Docker Fish Market', x: 8, z: 44 },
    { id: 'hs_skill_cicd', panel: 'cicd', label: 'CI/CD Workshop', x: 16, z: 44 },
    { id: 'hs_skill_cloudinfra', panel: 'terraform', label: 'Cloud & Infrastructure', x: 24, z: 44 },
    { id: 'hs_skill_k8s', panel: 'k8s', label: 'Kubernetes / Container Orchestration', x: 32, z: 44 },
    { id: 'hs_skill_python', panel: 'python', label: 'Programming Workshop', x: 40, z: 44 },
    { id: 'hs_skill_sql', panel: 'sql', label: 'Data & AI Laboratory', x: 48, z: 44 },
  ];
  for (const s of skillStalls) {
    const g = islandSurfaceY(s.x, s.z);
    const y = g === null ? 2 : g + 1;
    hotspots.push({ id: s.id, panel: s.panel, label: s.label, x: s.x, y, z: s.z, r: 4 });
  }

  return { blocks, hotspots };
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

let cachedWorld: VoxelList | null = null;
let cachedHotspots: Hotspot[] | null = null;
let cachedCollision: VoxelList | null = null;

/**
 * The entire static world as one block list.
 *
 * Order matters and is the collision policy: terrain is written first, then
 * structures overwrite it. A structure block that lands inside the ground is
 * therefore dropped rather than hidden inside a hill — no z-fighting, no
 * underground geometry.
 */
export function staticWorld(): VoxelList {
  if (cachedWorld) return cachedWorld;

  OCCUPIED.length = 0;
  NATURE.clear();

  // reserve the structure footprints before scattering vegetation
  for (const d of DOCKS) {
    OCCUPIED.push({ x0: d.x0, x1: d.x1, z0: d.z0, z1: d.z1 });
  }
  // and the arrival clearing: a tree on the spawn point hides the visitor and
  // the first thing they are meant to read
  OCCUPIED.push({
    x0: Math.round(SPAWN.x) - 6,
    x1: Math.round(SPAWN.x) + 6,
    z0: Math.round(SPAWN.z) - 6,
    z1: Math.round(SPAWN.z) + 6,
  });

  const structures = buildStructures();

  const signs = buildSigns();

  const veg: VoxelList = [];
  for (const spec of ISLANDS) veg.push(...islandVegetation(spec.id));

  const map = new Map<string, { x: number; y: number; z: number; c: number }>();

  const terrainMap = new Set<string>();
  for (const spec of ISLANDS) {
    for (const b of terrainFor(spec.id)) {
      terrainMap.add(`${b.x},${b.y},${b.z}`);
      map.set(`${b.x},${b.y},${b.z}`, b);
    }
  }

  const push = (list: VoxelList, overwriteTerrain: boolean) => {
    for (const b of list) {
      const k = `${b.x},${b.y},${b.z}`;
      if (!overwriteTerrain && terrainMap.has(k)) continue;
      map.set(k, b);
    }
  };

  push(structures, false);
  push(signs.blocks, false);
  // vegetation is tracked separately so the collision index can exclude it:
  // greenery stays walk-through (as it has always been), buildings do not.
  const vegKeys = new Set<string>();
  for (const b of veg) {
    const k = `${b.x},${b.y},${b.z}`;
    if (terrainMap.has(k)) continue;
    vegKeys.add(k);
    map.set(k, b);
  }

  cachedWorld = Array.from(map.values());
  cachedCollision = cachedWorld.filter(
    (b) => !vegKeys.has(`${b.x},${b.y},${b.z}`) && !terrainMap.has(`${b.x},${b.y},${b.z}`),
  );
  cachedHotspots = signs.hotspots;
  return cachedWorld;
}

/**
 * Solid collision blocks: every rendered block that is neither terrain nor
 * vegetation. Terrain stays a pure heightfield (`walkableHeight`); buildings,
 * docks, stalls, signs and plaza props are the solid geometry the character
 * physically collides with. Derived from the same map that renders the world,
 * so collision can never drift from what the player sees.
 */
export function staticCollisionBlocks(): VoxelList {
  staticWorld();
  return cachedCollision ?? [];
}

export interface StructureFootprint {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/**
 * Placement footprints (including foundation margins) reserved during
 * structure assembly. Read-only copy — used by the world validator to detect
 * overlapping structures.
 */
export function structureFootprints(): StructureFootprint[] {
  staticWorld();
  return OCCUPIED.map((r) => ({ ...r }));
}

/** Terrain blocks for one island (cached). */
const terrainCache = new Map<string, VoxelList>();
function terrainFor(id: string): VoxelList {
  const hit = terrainCache.get(id);
  if (hit) return hit;
  const list = terrainBlocks(islandById(id));
  terrainCache.set(id, list);
  return list;
}

export const HOTSPOTS: Hotspot[] = (() => {
  staticWorld();
  return cachedHotspots ?? [];
})();

/* ------------------------------------------------------------------ */
/* Walkable surfaces                                                   */
/* ------------------------------------------------------------------ */

/** Deck rectangle containing (x, z), or null. */
export function deckAt(x: number, z: number): DeckRect | null {
  for (const d of DOCKS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return null;
}

/**
 * Walkable height at (x, z) — the surface the character stands on, or null for
 * open water. Decks are tested first so a jetty always wins over the sea.
 */
export function walkableHeight(x: number, z: number): number | null {
  const ground = islandSurfaceY(x, z);
  const deck = deckAt(x, z);
  if (!deck) return ground;
  if (ground === null) return deck.y;
  // A deck plank only survives where the ground does not already reach the deck
  // layer, so wherever the ground is at or above the deck the ground wins.
  return Math.max(deck.y, ground);
}

/** Nearest berth to a point (used for boarding and disembarking). */
export function nearestBerth(x: number, z: number): Berth {
  let best = BERTHS[0];
  let bestD = Infinity;
  for (const b of BERTHS) {
    const d = Math.hypot(b.x - x, b.z - z);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** Deterministic detail used by the renderer for micro-variation. */
export function jitter(x: number, z: number, seed = 5): number {
  return hash2(x, z, seed);
}

/* re-exported so the renderer has one import for world geometry */
export { columnHeight, islandSurfaceY };
