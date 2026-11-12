/**
 * Cloud World 2.0 — navigation: A* over the actual generated world.
 *
 * Fresh implementation. Pathfinding ANSWERS "is there a walkable route?"
 * and produces waypoints for click-to-move; the physics in collision.ts
 * DECIDES what the character can occupy — this module is built on the same
 * queries (supportHeight / capsuleBlocked), so a route can never disagree
 * with what the player can physically walk.
 *
 * Cell (i, j) = world point (i, j). Height per cell is the standing surface
 * reached by climbing the support chain (terrain → plinth → interior floor).
 */

import type { Deck, IslandSpec } from '../core/types';
import { capsuleBlocked, STEP_UP, supportHeight } from './collision';
import type { Vec2 } from './navTypes';

export type { Vec2 };

interface Grid {
  minX: number;
  minZ: number;
  w: number;
  h: number;
  height: Float32Array;
  walkable: Uint8Array;
  region: Int32Array;
  clearance: Float32Array;
}

let grid: Grid | null = null;

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

function buildGrid(
  islands: IslandSpec[],
  decks: Deck[],
  terrainY: (x: number, z: number) => number | null,
): Grid {
  const pad = 3;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of islands) {
    const r = s.r * (1 + (s.wobble ?? 0.2)) + 2;
    minX = Math.min(minX, s.cx - r);
    maxX = Math.max(maxX, s.cx + r);
    minZ = Math.min(minZ, s.cz - r);
    maxZ = Math.max(maxZ, s.cz + r);
  }
  for (const d of decks) {
    minX = Math.min(minX, d.x0 - pad);
    maxX = Math.max(maxX, d.x1 + pad);
    minZ = Math.min(minZ, d.z0 - pad);
    maxZ = Math.max(maxZ, d.z1 + pad);
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

  /* pass 1: standing height + capsule fit per cell */
  for (let j = minZ; j <= maxZ; j++) {
    for (let i = minX; i <= maxX; i++) {
      const base = terrainY(i, j);
      if (base === null) continue;
      let y = base;
      // climb the support chain: plinths and interior floors are standing
      // surfaces up to one step each; taller stacks are walls
      for (;;) {
        const sup = supportHeight(i, j, y, terrainY, STEP_UP);
        if (sup === null || sup <= y + 0.001) break;
        if (!capsuleBlocked(i, j, sup)) {
          y = sup;
          continue;
        }
        const above = supportHeight(i, j, sup, terrainY, STEP_UP);
        if (above !== null && above > sup && !capsuleBlocked(i, j, above)) y = above;
        break;
      }
      height[idx(i, j)] = y;
      if (!capsuleBlocked(i, j, y)) walkable[idx(i, j)] = 1;
    }
  }

  const g: Grid = { minX, minZ, w, h, height, walkable, region, clearance };

  /* pass 2: connected components over the same edge rule A* uses */
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
          if (!edgeAllowed(g, ci, cj, di, dj, terrainY)) continue;
          region[ns] = id;
          stack.push(ns);
        }
      }
    }
  }

  /* pass 3: clearance — multi-source BFS from every non-walkable cell */
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

function inBounds(g: Grid, i: number, j: number): boolean {
  return i >= g.minX && i < g.minX + g.w && j >= g.minZ && j < g.minZ + g.h;
}

function cellIndex(g: Grid, i: number, j: number): number {
  return (j - g.minZ) * g.w + (i - g.minX);
}

/** An elevation edge is walkable only within STEP_UP, no corner cuts, and the
 * continuous walk (lineWalkable) must pass. */
function edgeAllowed(
  g: Grid,
  i: number,
  j: number,
  di: number,
  dj: number,
  terrainY: (x: number, z: number) => number | null,
): boolean {
  const ha = g.height[cellIndex(g, i, j)];
  const hb = g.height[cellIndex(g, i + di, j + dj)];
  if (Number.isNaN(ha) || Number.isNaN(hb)) return false;
  if (Math.abs(ha - hb) > STEP_UP + 1e-6) return false;
  if (di !== 0 && dj !== 0) {
    if (!g.walkable[cellIndex(g, i + di, j)]) return false;
    if (!g.walkable[cellIndex(g, i, j + dj)]) return false;
    const h1 = g.height[cellIndex(g, i + di, j)];
    const h2 = g.height[cellIndex(g, i, j + dj)];
    if (Math.abs(ha - h1) > STEP_UP + 1e-6 || Math.abs(ha - h2) > STEP_UP + 1e-6) return false;
  }
  return lineWalkable({ x: i, z: j }, { x: i + di, z: j + dj }, terrainY);
}

/** Build (or reuse) the grid for this world. */
export function ensureGrid(
  islands: IslandSpec[],
  decks: Deck[],
  terrainY: (x: number, z: number) => number | null,
): Grid {
  if (!grid) grid = buildGrid(islands, decks, terrainY);
  return grid;
}

export function resetGrid(): void {
  grid = null;
}

export function gridStats(): {
  cells: number;
  walkableCells: number;
  regions: number;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  buildMs: number;
} {
  if (!grid) throw new Error('navigation: grid not built');
  const t0 = performance.now();
  let walkableCells = 0;
  for (let s = 0; s < grid.walkable.length; s++) if (grid.walkable[s]) walkableCells++;
  const seen = new Set<number>();
  for (let s = 0; s < grid.region.length; s++) if (grid.region[s] >= 0) seen.add(grid.region[s]);
  return {
    cells: grid.w * grid.h,
    walkableCells,
    regions: seen.size,
    bounds: { minX: grid.minX, minZ: grid.minZ, maxX: grid.minX + grid.w - 1, maxZ: grid.minZ + grid.h - 1 },
    buildMs: performance.now() - t0,
  };
}

export function cellHeight(i: number, j: number): number {
  if (!grid) return NaN;
  if (!inBounds(grid, i, j)) return NaN;
  return grid.height[cellIndex(grid, i, j)];
}

export function cellWalkable(i: number, j: number): boolean {
  if (!grid) return false;
  if (!inBounds(grid, i, j)) return false;
  return grid.walkable[cellIndex(grid, i, j)] === 1;
}

export function cellRegion(i: number, j: number): number {
  if (!grid) return -1;
  if (!inBounds(grid, i, j)) return -1;
  return grid.region[cellIndex(grid, i, j)];
}

export function cellClearance(i: number, j: number): number {
  if (!grid) return 0;
  if (!inBounds(grid, i, j)) return 0;
  return grid.clearance[cellIndex(grid, i, j)];
}

/* ------------------------------------------------------------------ */
/* A*                                                                  */
/* ------------------------------------------------------------------ */

/** Admissible heuristic for 8-directional unit-cost movement. */
function octile(dx: number, dz: number): number {
  const ax = Math.abs(dx);
  const az = Math.abs(dz);
  return ax + az + (Math.SQRT2 - 2) * Math.min(ax, az);
}

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
      [this.items[p], this.items[c]] = [this.items[c], this.items[p]];
      [this.scores[p], this.scores[c]] = [this.scores[c], this.scores[p]];
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
        const r = p * 2 + 2;
        let m = p;
        if (l < this.items.length && this.scores[l] < this.scores[m]) m = l;
        if (r < this.items.length && this.scores[r] < this.scores[m]) m = r;
        if (m === p) break;
        [this.items[m], this.items[p]] = [this.items[p], this.items[m]];
        [this.scores[m], this.scores[p]] = [this.scores[p], this.scores[m]];
        p = m;
      }
    }
    return top;
  }
}

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

export interface PathResult {
  ok: boolean;
  points: Vec2[];
  length: number;
  reason?: string;
}

/** A* with clearance-weighted cost and collision-verified smoothing. */
export function findPath(from: Vec2, to: Vec2, terrainY: (x: number, z: number) => number | null): PathResult {
  if (!grid) return { ok: false, points: [], length: 0, reason: 'grid not built' };
  const g = grid;
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
      if (!edgeAllowed(g, ci, cj, di, dj, terrainY)) continue;
      const step = di !== 0 && dj !== 0 ? Math.SQRT2 : 1;
      // prefer open walkways over pinched corridors
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

  const cells: number[] = [];
  for (let cur = gi; cur !== -1; cur = from_[cur]) cells.push(cur);
  cells.reverse();
  const raw: Vec2[] = cells.map((s) => ({ x: (s % g.w) + g.minX, z: Math.floor(s / g.w) + g.minZ }));

  const points = smooth(raw, terrainY);
  let length = 0;
  for (let k = 1; k < points.length; k++) length += Math.hypot(points[k].x - points[k - 1].x, points[k].z - points[k - 1].z);
  return { ok: true, points, length };
}

/** String-pulling that replays the real movement rules — never opens a wall. */
function smooth(raw: Vec2[], terrainY: (x: number, z: number) => number | null): Vec2[] {
  if (raw.length <= 2) return raw;
  const out: Vec2[] = [raw[0]];
  let anchor = 0;
  while (anchor < raw.length - 1) {
    let furthest = anchor + 1;
    for (let cand = raw.length - 1; cand > anchor + 1; cand--) {
      if (lineWalkable(raw[anchor], raw[cand], terrainY)) {
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
export function lineWalkable(a: Vec2, b: Vec2, terrainY: (x: number, z: number) => number | null): boolean {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(dist / 0.08));
  const seed = terrainY(a.x, a.z);
  let y = supportHeight(a.x, a.z, seed ?? 0, terrainY);
  if (y === null) return false;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const ny = supportHeight(x, z, y, terrainY);
    if (ny === null || ny - y > STEP_UP + 1e-6) return false;
    if (capsuleBlocked(x, z, ny)) return false;
    y = ny;
  }
  return true;
}

/** Reachable approach position for a hotspot (ring search, wall-checked). */
export function approachFor(
  hx: number,
  hz: number,
  r: number,
  terrainY: (x: number, z: number) => number | null,
): { x: number; z: number; dist: number } | null {
  for (let d = 0.5; d <= r + 1e-6; d += 0.5) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = hx + Math.cos(ang) * d;
      const z = hz + Math.sin(ang) * d;
      const cell = nearestWalkable(Math.round(x), Math.round(z), 1);
      if (!cell) continue;
      const cd = Math.hypot(cell.i - hx, cell.j - hz);
      if (cd > 1.5 && !lineWalkable({ x: cell.i, z: cell.j }, { x: hx, z: hz }, terrainY)) continue;
      return { x: cell.i, z: cell.j, dist: cd };
    }
  }
  return null;
}

/** Region id at a world point (-1 none). */
export function regionAt(x: number, z: number): number {
  const c = nearestWalkable(Math.round(x), Math.round(z), 3);
  return c ? cellRegion(c.i, c.j) : -1;
}
