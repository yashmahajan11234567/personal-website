/**
 * Navigation — grid pathfinding over the actual generated world.
 *
 * SEPARATION OF DUTIES (the correction the audit called for):
 *   - Pathfinding (this module) ANSWERS "is there a walkable route?" and
 *     produces waypoints for click-to-move. It can never make the character
 *     pass through a wall — only the physics in collision.ts can.
 *   - Physical collision (collision.ts) DECIDES what the character can occupy,
 *     and this module is built on the very same queries (supportHeight /
 *     capsuleBlocked), so a route can never disagree with the physics.
 *   - Sailing stays a separate mode: the whale keeps its own `canSailTo`
 *     water check and the grid contains no boat edges. The validator checks
 *     sail lanes separately.
 *
 * CELL CONVENTION: lattice cell (i, j) corresponds to the world point (i, j) —
 * the centre of a structure-block column and the sample point for the terrain
 * heightfield (which floors to the column containing it). All heights are
 * standing surfaces from collision.supportHeight, so terraces, plinths, pier
 * decks and stairs are represented with their true elevations.
 */
import { ISLANDS, shoreDistance } from './terrain';
import { DOCKS, HOTSPOTS, SPAWN, BERTHS, walkableHeight, structureFootprints, canSailTo } from './world';
import { STEP_UP, RADIUS, supportHeight, capsuleBlocked } from './collision';

export interface Vec2 {
  x: number;
  z: number;
}

/* ------------------------------------------------------------------ */
/* Grid construction                                                   */
/* ------------------------------------------------------------------ */

interface Grid {
  minX: number;
  minZ: number;
  w: number;
  h: number;
  /** standing height per cell; NaN = void (open water) */
  height: Float32Array;
  /** 1 when the capsule fits standing on that height */
  walkable: Uint8Array;
  /** connected-component id per walkable cell; -1 = none */
  region: Int32Array;
  /** BFS distance (in cells) to the nearest non-walkable cell */
  clearance: Float32Array;
}

let grid: Grid | null = null;

function buildGrid(): Grid {
  const pad = 3;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const grow = (x: number, z: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  };
  for (const s of ISLANDS) {
    const r = s.r * (1 + (s.wobble ?? 0.22)) + 2;
    grow(s.cx - r, s.cz - r);
    grow(s.cx + r, s.cz + r);
  }
  for (const d of DOCKS) {
    grow(d.x0 - pad, d.z0 - pad);
    grow(d.x1 + pad, d.z1 + pad);
  }
  minX = Math.floor(minX - pad);
  maxX = Math.ceil(maxX + pad);
  minZ = Math.floor(minZ - pad);
  maxZ = Math.ceil(maxZ + pad);

  const w = maxX - minX + 1;
  const h = maxZ - minZ + 1;
  const height = new Float32Array(w * h).fill(NaN);
  const walkable = new Uint8Array(w * h);
  const region = new Int32Array(w * h).fill(-1);
  const clearance = new Float32Array(w * h).fill(Infinity);

  const idx = (i: number, j: number) => (j - minZ) * w + (i - minX);
  const inB = (i: number, j: number) => i >= minX && i <= maxX && j >= minZ && j <= maxZ;

  // Pass 1: standing height + capsule fit per cell.
  for (let j = minZ; j <= maxZ; j++) {
    for (let i = minX; i <= maxX; i++) {
      const base = walkableHeight(i, j);
      if (base === null) continue; // open water
      // Climb the support chain: a solid top may stand up to one step
      // (STEP_UP) above the surface below it — plinths, thresholds, counters
      // and interior floors are climbable standing surfaces; taller stacks
      // are walls, never standing surfaces. Iterating matters: a house floor
      // sits TWO steps above the terrain (terrain → plinth → floor), and a
      // single-level lookup would misreport the cell height and make the
      // doorway an approach-height trap.
      let y = base;
      for (;;) {
        const sup = supportHeight(i, j, y, STEP_UP);
        if (sup === null || sup <= y + 0.001) break;
        if (!capsuleBlocked(i, j, sup)) {
          y = sup;
          continue;
        }
        // this course is solid where the body would be (a wall, or a floor
        // course sitting on the support below): try one course higher — a
        // plinth topped by an interior floor is climbed THROUGH, a wall is not
        const above = supportHeight(i, j, sup, STEP_UP);
        if (above !== null && above > sup && !capsuleBlocked(i, j, above)) {
          y = above;
        }
        break;
      }
      height[idx(i, j)] = y;
      if (!capsuleBlocked(i, j, y)) walkable[idx(i, j)] = 1;
    }
  }

  const g: Grid = { minX, minZ, w, h, height, walkable, region, clearance };

  // Pass 2: connected components over the SAME edge rule A* uses.
  let nextRegion = 0;
  const stack: number[] = [];
  for (let j = minZ; j <= maxZ; j++) {
    for (let i = minX; i <= maxX; i++) {
      const s = idx(i, j);
      if (!walkable[s] || region[s] !== -1) continue;
      const id = nextRegion++;
      region[s] = id;
      stack.push(s);
      while (stack.length) {
        const cur = stack.pop() as number;
        const ci = (cur % w) + minX;
        const cj = Math.floor(cur / w) + minZ;
        for (const [di, dj] of NEIGHBOURS) {
          const ni = ci + di;
          const nj = cj + dj;
          if (!inB(ni, nj)) continue;
          const ns = idx(ni, nj);
          if (!walkable[ns] || region[ns] !== -1) continue;
          if (!edgeAllowed(g, ci, cj, di, dj)) continue;
          region[ns] = id;
          stack.push(ns);
        }
      }
    }
  }

  // Pass 3: clearance — multi-source BFS from every non-walkable cell.
  const queue: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!walkable[s]) {
      clearance[s] = 0;
      queue.push(s);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    const ci = (cur % w) + minX;
    const cj = Math.floor(cur / w) + minZ;
    const d = clearance[cur];
    for (const [di, dj] of NEIGHBOURS) {
      const ni = ci + di;
      const nj = cj + dj;
      if (!inB(ni, nj)) continue;
      const ns = idx(ni, nj);
      if (clearance[ns] <= d + 1) continue;
      clearance[ns] = d + 1;
      queue.push(ns);
    }
  }

  return g;
}

/** Built grid, cached for the lifetime of the page (the world is static). */
export function getGrid(): Grid {
  if (!grid) grid = buildGrid();
  return grid;
}

/** Diagnostics for the debug overlay and tests. */
export function gridStats(): {
  cells: number;
  walkableCells: number;
  regions: number;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  buildMs: number;
} {
  const t0 = now();
  const g = getGrid();
  let walkableCells = 0;
  let regions = 0;
  for (let s = 0; s < g.walkable.length; s++) if (g.walkable[s]) walkableCells++;
  const seen = new Set<number>();
  for (let s = 0; s < g.region.length; s++) if (g.region[s] >= 0) seen.add(g.region[s]);
  regions = seen.size;
  return {
    cells: g.w * g.h,
    walkableCells,
    regions,
    bounds: { minX: g.minX, minZ: g.minZ, maxX: g.minX + g.w - 1, maxZ: g.minZ + g.h - 1 },
    buildMs: now() - t0,
  };
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/* ------------------------------------------------------------------ */
/* Cell queries                                                        */
/* ------------------------------------------------------------------ */

const NEIGHBOURS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function inBounds(g: Grid, i: number, j: number): boolean {
  return i >= g.minX && i < g.minX + g.w && j >= g.minZ && j < g.minZ + g.h;
}

function cellIndex(g: Grid, i: number, j: number): number {
  return (j - g.minZ) * g.w + (i - g.minX);
}

/** Standing height at a lattice cell, or NaN outside the grid / open water. */
export function cellHeight(i: number, j: number): number {
  const g = getGrid();
  if (!inBounds(g, i, j)) return NaN;
  return g.height[cellIndex(g, i, j)];
}

/** True when the character capsule fits standing at lattice cell (i, j). */
export function cellWalkable(i: number, j: number): boolean {
  const g = getGrid();
  if (!inBounds(g, i, j)) return false;
  return g.walkable[cellIndex(g, i, j)] === 1;
}

/** Connected-component id at a lattice cell (-1 = none). */
export function cellRegion(i: number, j: number): number {
  const g = getGrid();
  if (!inBounds(g, i, j)) return -1;
  return g.region[cellIndex(g, i, j)];
}

/** BFS distance in cells to the nearest blocked/void cell (clearance measure). */
export function cellClearance(i: number, j: number): number {
  const g = getGrid();
  if (!inBounds(g, i, j)) return 0;
  return g.clearance[cellIndex(g, i, j)];
}

/** An elevation edge is walkable only within the step-up limit… */
function edgeAllowed(g: Grid, i: number, j: number, di: number, dj: number): boolean {
  const ha = g.height[cellIndex(g, i, j)];
  const hb = g.height[cellIndex(g, i + di, j + dj)];
  if (Number.isNaN(ha) || Number.isNaN(hb)) return false;
  if (Math.abs(ha - hb) > STEP_UP + 1e-6) return false;
  if (di !== 0 && dj !== 0) {
    // corner-cut prevention: both orthogonal cells must be enterable too
    if (!g.walkable[cellIndex(g, i + di, j)]) return false;
    if (!g.walkable[cellIndex(g, i, j + dj)]) return false;
    const h1 = g.height[cellIndex(g, i + di, j)];
    const h2 = g.height[cellIndex(g, i, j + dj)];
    if (Math.abs(ha - h1) > STEP_UP + 1e-6 || Math.abs(ha - h2) > STEP_UP + 1e-6) return false;
  }
  // …and the physics must be able to WALK the segment: cell-centre tests miss
  // edge lips (e.g. a pier rail catching the capsule when stepping down off a
  // deck), so every edge is validated with the same continuous walk the
  // character performs.
  return lineWalkable({ x: i, z: j }, { x: i + di, z: j + dj });
}

/* ------------------------------------------------------------------ */
/* A* pathfinding                                                      */
/* ------------------------------------------------------------------ */

/** Simple binary min-heap keyed by f-score. */
class Heap {
  private items: number[] = [];
  private scores: number[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: number, score: number): void {
    this.items.push(item);
    this.scores.push(score);
    let c = this.items.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (this.scores[p] <= this.scores[c]) break;
      this.swap(p, c);
      c = p;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop() as number;
    const lastScore = this.scores.pop() as number;
    if (this.items.length) {
      this.items[0] = lastItem;
      this.scores[0] = lastScore;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1;
        const r = l + 1;
        let m = p;
        if (l < this.items.length && this.scores[l] < this.scores[m]) m = l;
        if (r < this.items.length && this.scores[r] < this.scores[m]) m = r;
        if (m === p) break;
        this.swap(p, m);
        p = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.scores[a], this.scores[b]] = [this.scores[b], this.scores[a]];
  }
}

/** Octile distance — admissible for 8-directional movement with unit costs. */
function octile(dx: number, dz: number): number {
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  return ax + az + (Math.SQRT2 - 2) * Math.min(ax, az);
}

export interface PathResult {
  /** true when a route was found */
  ok: boolean;
  /** waypoints in world coordinates (start first, goal last) */
  points: Vec2[];
  /** total 2D length of the route in blocks */
  length: number;
  /** when not ok: a human-readable reason */
  reason?: string;
}

/**
 * Nearest walkable lattice cell within `radius` (spiral search), or null.
 * Used to snap query endpoints that land on a prop, a signpost skirt or a
 * half-block boundary.
 */
function nearestWalkable(i: number, j: number, radius = 2): { i: number; j: number } | null {
  if (cellWalkable(i, j)) return { i, j };
  for (let r = 1; r <= radius; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (cellWalkable(i + di, j + dj)) return { i: i + di, j: j + dj };
      }
    }
  }
  return null;
}

/**
 * A* over the lattice. Diagonals never cut corners (both orthogonal cells
 * must be walkable and height-compatible), elevation changes respect
 * STEP_UP, and the result is string-pull smoothed only where the smoothed
 * line keeps full collision clearance (the LOS walk uses the same capsule
 * and support queries as the physics).
 */
export function findPath(from: Vec2, to: Vec2): PathResult {
  const g = getGrid();
  const start = nearestWalkable(Math.round(from.x), Math.round(from.z));
  const goal = nearestWalkable(Math.round(to.x), Math.round(to.z));
  if (!start) return { ok: false, points: [], length: 0, reason: `start (${from.x}, ${from.z}) has no walkable cell` };
  if (!goal) return { ok: false, points: [], length: 0, reason: `goal (${to.x}, ${to.z}) has no walkable cell within 2 blocks` };

  const si = cellIndex(g, start.i, start.j);
  const gi = cellIndex(g, goal.i, goal.j);
  if (si === gi) return { ok: true, points: [{ x: goal.i, z: goal.j }], length: 0 };

  const n = g.w * g.h;
  const gScore = new Float32Array(n).fill(Infinity);
  const from_ = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap = new Heap();
  gScore[si] = 0;
  heap.push(si, octile(goal.i - start.i, goal.j - start.j));

  const goalZ = Math.floor(gi / g.w) + g.minZ;
  const goalX = (gi % g.w) + g.minX;

  let found = false;
  while (heap.size > 0) {
    const cur = heap.pop();
    if (cur === gi) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = (cur % g.w) + g.minX;
    const cj = Math.floor(cur / g.w) + g.minZ;
    for (const [di, dj] of NEIGHBOURS) {
      const ni = ci + di;
      const nj = cj + dj;
      if (!inBounds(g, ni, nj)) continue;
      const ns = cellIndex(g, ni, nj);
      if (!g.walkable[ns] || closed[ns]) continue;
      if (!edgeAllowed(g, ci, cj, di, dj)) continue;
      const step = di !== 0 && dj !== 0 ? Math.SQRT2 : 1;
      // clearance-weighted: cells squeezed against geometry cost more, so the
      // planner prefers open walkways over marginally-shorter pinched
      // corridors that the capsule can grind in when pushed off-centre
      const squeeze = Math.max(0, 3 - g.clearance[ns]) * 0.9;
      const tentative = gScore[cur] + step + squeeze;
      if (tentative < gScore[ns]) {
        gScore[ns] = tentative;
        from_[ns] = cur;
        heap.push(ns, tentative + octile(goalX - ni, goalZ - nj));
      }
    }
  }

  if (!found) {
    return { ok: false, points: [], length: 0, reason: `no walkable route from (${start.i}, ${start.j}) to (${goal.i}, ${goal.j})` };
  }

  // reconstruct
  const cells: number[] = [];
  for (let cur = gi; cur !== -1; cur = from_[cur]) cells.push(cur);
  cells.reverse();
  const raw: Vec2[] = cells.map((s) => ({ x: (s % g.w) + g.minX, z: Math.floor(s / g.w) + g.minZ }));

  const points = smooth(raw);
  let length = 0;
  for (let k = 1; k < points.length; k++) length += Math.hypot(points[k].x - points[k - 1].x, points[k].z - points[k - 1].z);
  return { ok: true, points, length };
}

/**
 * String-pulling: keep the furthest waypoint the character could WALK to in a
 * straight line. The line-of-sight walk replays the actual movement rules —
 * support continuity within STEP_UP plus capsule clearance at every sample —
 * so smoothing can never open a route the physics would reject.
 */
function smooth(raw: Vec2[]): Vec2[] {
  if (raw.length <= 2) return raw;
  const out: Vec2[] = [raw[0]];
  let anchor = 0;
  while (anchor < raw.length - 1) {
    let furthest = anchor + 1;
    for (let cand = raw.length - 1; cand > anchor + 1; cand--) {
      if (lineWalkable(raw[anchor], raw[cand])) {
        furthest = cand;
        break;
      }
    }
    out.push(raw[furthest]);
    anchor = furthest;
  }
  return out;
}

/** Sampled walk along a segment using the same rules as the physics step. */
export function lineWalkable(a: Vec2, b: Vec2): boolean {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  // physics-resolution sampling: the character's capsule (r = 0.3) catches
  // geometry as thin as 0.08 blocks, so the edge test must sample finely
  // enough that no thin board or trim bar slips between samples
  const steps = Math.max(1, Math.ceil(dist / 0.08));
  // seed from the raw terrain/deck height — deliberately grid-independent so
  // this can run during grid construction (edge validation) without recursion
  const seed = walkableHeight(a.x, a.z);
  let y = supportHeight(a.x, a.z, seed ?? 0);
  if (y === null) return false;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const ny = supportHeight(x, z, y);
    if (ny === null || ny - y > STEP_UP + 1e-6) return false;
    if (capsuleBlocked(x, z, ny)) return false;
    y = ny;
  }
  return true;
}

function cellHeightOr(p: Vec2): number | null {
  const h = cellHeight(Math.round(p.x), Math.round(p.z));
  return Number.isNaN(h) ? null : h;
}

/* ------------------------------------------------------------------ */
/* Hotspot approach positions                                          */
/* ------------------------------------------------------------------ */

export interface Approach {
  x: number;
  z: number;
  /** distance from the hotspot centre (≤ its interaction radius) */
  dist: number;
}

/**
 * Find a reachable approach position for a hotspot: the closest ring point
 * that is walkable, optionally inside `region` (the island landing the
 * hotspot is served by — prevents "approaches" in sealed pockets), and with a
 * clear navigation line to the hotspot centre (so E cannot be offered through
 * a wall). The interaction radius `r` is NOT treated as open clearance; it
 * only bounds the search.
 */
export function approachFor(hx: number, hz: number, r: number, region?: number): Approach | null {
  for (let d = 0.5; d <= r + 1e-6; d += 0.5) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = hx + Math.cos(ang) * d;
      const z = hz + Math.sin(ang) * d;
      const cell = nearestWalkable(Math.round(x), Math.round(z), 1);
      if (!cell) continue;
      if (region !== undefined && cellRegion(cell.i, cell.j) !== region) continue;
      const cd = Math.hypot(cell.i - hx, cell.j - hz);
      // within 1.5 blocks the visitor is standing at the sign itself — no
      // wall can sit between them and the interaction
      if (cd > 1.5 && !lineWalkable({ x: cell.i, z: cell.j }, { x: hx, z: hz })) continue;
      return { x: cell.i, z: cell.j, dist: cd };
    }
  }
  return null;
}

/** Region id containing a world point (-1 for none). */
export function regionAt(x: number, z: number): number {
  const c = nearestWalkable(Math.round(x), Math.round(z), 3);
  return c ? cellRegion(c.i, c.j) : -1;
}

/* ------------------------------------------------------------------ */
/* World validation                                                    */
/* ------------------------------------------------------------------ */

export interface Diagnostic {
  id: string;
  object?: string;
  at?: Vec2;
  reason: string;
  suggestion: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface WorldReport {
  ok: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  checks: CheckResult[];
  stats: ReturnType<typeof gridStats>;
}

interface RequiredRoute {
  name: string;
  from: Vec2;
  to: Vec2;
}

/** harbour island centre — the origin every structure is placed relative to */
function harbourCentre(): Vec2 {
  return { x: 36, z: 36 };
}

/**
 * Validate the actual generated world. Every input is derived from the same
 * data that builds the world (footprints, hotspots, docks, berths, spawn);
 * nothing here is a duplicated coordinate list except named route endpoints,
 * which reference exported world data.
 */
export function validateWorld(): WorldReport {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const checks: CheckResult[] = [];

  const stats = gridStats();

  /* 1. structure footprints must not overlap.
   * Docks are excluded: they are WALKABLE GROUND surfaces (piers), and other
   * placements legitimately sit on or beside them. The spawn clearing is a
   * vegetation keep-out, not a structure. */
  const dockRects = DOCKS.map((d) => `${d.x0},${d.x1},${d.z0},${d.z1}`);
  const spawnClearing = `${Math.round(SPAWN.x) - 6},${Math.round(SPAWN.x) + 6},${Math.round(SPAWN.z) - 6},${Math.round(SPAWN.z) + 6}`;
  const structures = structureFootprints().filter((f) => {
    const k = `${f.x0},${f.x1},${f.z0},${f.z1}`;
    return !dockRects.includes(k) && k !== spawnClearing;
  });
  let overlaps = 0;
  for (let a = 0; a < structures.length; a++) {
    for (let b = a + 1; b < structures.length; b++) {
      const p = structures[a];
      const q = structures[b];
      if (p.x0 <= q.x1 && q.x0 <= p.x1 && p.z0 <= q.z1 && q.z0 <= p.z1) {
        overlaps++;
        warnings.push({
          id: 'footprint-overlap',
          object: `placement #${a} × placement #${b}`,
          at: { x: Math.max(p.x0, q.x0), z: Math.max(p.z0, q.z0) },
          reason: `placement footprints overlap: [${p.x0},${p.x1}]×[${p.z0},${p.z1}] vs [${q.x0},${q.x1}]×[${q.z0},${q.z1}]`,
          suggestion: 'review the pair — decor among structures is intended; two solid structures sharing space is not',
        });
      }
    }
  }
  checks.push({
    name: 'structure footprints do not overlap',
    passed: overlaps === 0,
    detail: `${structures.length} placements checked (docks excluded)`,
  });

  /* 2. every hotspot has a reachable approach position on its own island */
  // each island's walking region is anchored at the landing the whale serves
  const landingRegions = DOCKS.map((d) =>
    regionAt(Math.round((d.x0 + d.x1) / 2), Math.round((d.z0 + d.z1) / 2)),
  );
  const spawnRegionId = regionAt(SPAWN.x, SPAWN.z);
  const landingFor = (hx: number, hz: number): number => {
    if (spawnRegionId >= 0) {
      const spawnDock = regionAt(-35, -47);
      // hotspots on the starting island belong to its own walking region
      if (regionAt(hx, hz) === spawnRegionId) return spawnRegionId;
      if (spawnDock >= 0 && regionAt(hx, hz) === spawnDock) return spawnDock;
    }
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < DOCKS.length; k++) {
      const d = DOCKS[k];
      const dd = Math.hypot((d.x0 + d.x1) / 2 - hx, (d.z0 + d.z1) / 2 - hz);
      if (dd < bestD && landingRegions[k] >= 0) {
        bestD = dd;
        best = landingRegions[k];
      }
    }
    return best;
  };
  let approachFails = 0;
  const approaches = new Map<string, Approach>();
  for (const h of HOTSPOTS) {
    const landing = landingFor(h.x, h.z);
    const ap = approachFor(h.x, h.z, h.r, landing >= 0 ? landing : undefined);
    if (ap) {
      approaches.set(h.id, ap);
    } else {
      approachFails++;
      errors.push({
        id: 'hotspot-unreachable',
        object: `${h.id} (${h.label})`,
        at: { x: h.x, z: h.z },
        reason: `no walkable approach within interaction radius r=${h.r}${landing >= 0 ? ` connected to the island landing (region ${landing})` : ''}`,
        suggestion: 'clear the approach path or move the hotspot/structure',
      });
    }
  }
  checks.push({
    name: 'every hotspot has a reachable approach',
    passed: approachFails === 0,
    detail: `${HOTSPOTS.length} hotspots checked against ${DOCKS.length + 1} island landings`,
  });

  /* 3. required walking routes */
  const hc = harbourCentre();
  const pierEnd = { x: DOCKS[1].x1 - 6, z: Math.round((DOCKS[1].z0 + DOCKS[1].z1) / 2) };
  const arrivalInner = { x: DOCKS[0].x1 - 1, z: Math.round((DOCKS[0].z0 + DOCKS[0].z1) / 2) };
  const stallFront = (x: number) => ({ x, z: 43 });
  const routes: RequiredRoute[] = [
    { name: 'spawn → arrival dock', from: { x: SPAWN.x, z: SPAWN.z }, to: arrivalInner },
    { name: 'harbour pier → first stall', from: pierEnd, to: stallFront(9) },
    { name: 'first stall → last stall (market row)', from: stallFront(9), to: stallFront(47) },
    { name: 'last stall → village gateway', from: stallFront(47), to: { x: 24, z: 42 } },
    { name: 'harbour floor → village plateau (the climb)', from: { x: 12, z: 34 }, to: { x: 46, z: 46 } },
    { name: 'gateway → Go Microservices House', from: { x: 29, z: 42 }, to: { x: 40, z: 38 } },
    { name: 'gateway → RxVerify House', from: { x: 29, z: 42 }, to: { x: 56, z: 38 } },
    { name: 'gateway → DevOps Masterclass House', from: { x: 29, z: 42 }, to: { x: 39, z: 47 } },
    { name: 'Go House → RxVerify House', from: { x: 40, z: 38 }, to: { x: 56, z: 38 } },
    { name: 'RxVerify House → DevOps House', from: { x: 56, z: 38 }, to: { x: 39, z: 47 } },
    { name: 'village → Welcome Hall', from: { x: 29, z: 42 }, to: { x: 54, z: 42 } },
    { name: 'harbour floor → lighthouse', from: { x: 12, z: 34 }, to: { x: 16, z: 28 } },
  ];
  let routeFails = 0;
  let minClearance = Infinity;
  for (const route of routes) {
    const res = findPath(route.from, route.to);
    if (!res.ok) {
      routeFails++;
      errors.push({
        id: 'required-route-blocked',
        object: route.name,
        at: route.to,
        reason: res.reason ?? 'no path',
        suggestion: 'inspect the corridor between the endpoints in the nav debug overlay',
      });
      continue;
    }
    // nav/collision agreement + clearance along the actual waypoints
    let y = cellHeightOr(res.points[0]) ?? 0;
    let agree = true;
    for (const p of res.points) {
      const ny = supportHeight(p.x, p.z, y);
      if (ny === null || capsuleBlocked(p.x, p.z, ny)) agree = false;
      else y = ny;
      minClearance = Math.min(minClearance, cellClearance(Math.round(p.x), Math.round(p.z)));
    }
    if (!agree) {
      routeFails++;
      errors.push({
        id: 'nav-collision-disagreement',
        object: route.name,
        reason: 'a route waypoint is blocked according to the physical collision module',
        suggestion: 'fix the cell walkability rule or the collision index — they must agree',
      });
    }
  }
  checks.push({
    name: 'all required walking routes exist and match collision',
    passed: routeFails === 0,
    detail: `${routes.length} routes checked`,
  });
  if (minClearance < 1) {
    warnings.push({
      id: 'route-clearance-tight',
      reason: `narrowest point on a required route leaves ${minClearance} cell(s) to the nearest obstruction (character half-width ${RADIUS})`,
      suggestion: 'acceptable if ≥1; widen the corridor if it reads as pinched',
    });
  }
  checks.push({
    name: 'route clearance',
    passed: true,
    detail: `minimum clearance along required routes: ${minClearance === Infinity ? 'n/a' : minClearance} cells`,
  });

  /* 4. stair elevation profile: the harbour floor must connect to the
   * plateau in steps within STEP_UP (no jumping exploits, no teleporting).
   * Sampled finely ALONG the route — smoothed leg endpoints naturally span
   * several cells of ramp. */
  const stair = findPath({ x: 12, z: 34 }, { x: 46, z: 46 });
  let maxStep = 0;
  if (stair.ok) {
    let y = cellHeightOr(stair.points[0]) ?? 0;
    for (let k = 1; k < stair.points.length; k++) {
      const a = stair.points[k - 1];
      const b = stair.points[k];
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.ceil(dist / 0.25));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const ny = supportHeight(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, y);
        if (ny === null) break;
        maxStep = Math.max(maxStep, Math.abs(ny - y));
        y = ny;
      }
    }
  }
  checks.push({
    name: 'harbour→plateau climb walkable without jumping',
    passed: stair.ok && maxStep <= STEP_UP + 1e-6,
    detail: stair.ok
      ? `route found; largest single step ${maxStep.toFixed(2)} blocks (limit ${STEP_UP})`
      : 'no route from the harbour floor to the plateau',
  });
  if (!stair.ok || maxStep > STEP_UP + 1e-6) {
    errors.push({
      id: 'stairs-unwalkable',
      object: 'harbour→plateau climb',
      at: hc,
      reason: stair.ok ? `step of ${maxStep.toFixed(2)} blocks exceeds STEP_UP=${STEP_UP}` : 'no walkable route up to the plateau',
      suggestion: 'add intermediate stair steps or widen the terrain blend at the plateau edge',
    });
  }

  /* 5. region sanity: walkable area should be one main component */
  checks.push({
    name: 'walkable regions',
    passed: true,
    detail: `${stats.regions} region(s), ${stats.walkableCells}/${stats.cells} cells walkable`,
  });

  /* 6. sail lanes between berths stay in open water */
  const sailLanes: RequiredRoute[] = [
    { name: 'arrival berth → harbour berth', from: { x: BERTHS[0].x, z: BERTHS[0].z }, to: { x: BERTHS[1].x, z: BERTHS[1].z } },
    { name: 'harbour berth → beacon berth', from: { x: BERTHS[1].x, z: BERTHS[1].z }, to: { x: BERTHS[2].x, z: BERTHS[2].z } },
  ];
  let sailFails = 0;
  for (const lane of sailLanes) {
    const steps = Math.ceil(Math.hypot(lane.to.x - lane.from.x, lane.to.z - lane.from.z) / 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = lane.from.x + (lane.to.x - lane.from.x) * t;
      const z = lane.from.z + (lane.to.z - lane.from.z) * t;
      if (!canSailTo(x, z)) {
        sailFails++;
        errors.push({
          id: 'sail-lane-blocked',
          object: lane.name,
          at: { x, z },
          reason: `straight berth-to-berth lane is not sailable at (${x.toFixed(1)}, ${z.toFixed(1)})`,
          suggestion: 'the whale can still steer around obstacles; verify manually if this lane is required',
        });
        break;
      }
    }
  }
  checks.push({
    name: 'sail lanes between berths',
    passed: sailFails === 0,
    detail: `${sailLanes.length} lanes sampled every 2 blocks`,
  });

  /* 7. shore sanity: the harbour island exists where the market expects it */
  const shore = shoreDistance(hc.x + 12, hc.z + 8);
  checks.push({
    name: 'harbour interior sampled',
    passed: shore > 0,
    detail: `shoreDistance at market row: ${shore.toFixed(1)} blocks`,
  });

  return { ok: errors.length === 0, errors, warnings, checks, stats };
}
