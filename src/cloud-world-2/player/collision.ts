/**
 * Cloud World 2.0 — physical collision: capsule vs solid voxel geometry.
 *
 * Fresh implementation for the greenfield world. Terrain and piers remain a
 * pure heightfield (`floorHeight`); every other placed block (structures,
 * props, foundations) is solid geometry the capsule collides with. The index
 * is a column broad-phase over TRUE block rectangles — identical convention to
 * the block type: (x,z) is the rectangle centre, y spans [y-sy/2, y+sy/2].
 *
 * The character is a vertical capsule: radius 0.3 in the ground plane over
 * [feet, feet + 1.7]. Blocks whose top is within STEP_UP of the feet are
 * climbable terrain (they contribute standing surface, never block).
 */

import { CHAR } from './state';
import type { Block, BlockList, Deck } from '../core/types';

export const STEP_UP: number = CHAR.STEP_UP;
export const RADIUS: number = CHAR.RADIUS;
export const HEIGHT: number = CHAR.HEIGHT;

interface Entry {
  lo: number;
  hi: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const columns = new Map<number, Entry[]>();
let built = false;

/** Column key packing for the ±512 block world extent. */
function key(cx: number, cz: number): number {
  return (cx + 512) * 2048 + (cz + 1024);
}

function addBlock(b: Block): void {
  const hx = (b.sx ?? 1) / 2;
  const hz = (b.sz ?? 1) / 2;
  const entry: Entry = {
    lo: b.y - (b.sy ?? 1) / 2,
    hi: b.y + (b.sy ?? 1) / 2,
    x0: b.x - hx,
    x1: b.x + hx,
    z0: b.z - hz,
    z1: b.z + hz,
  };
  const xMin = Math.floor(entry.x0 - 0.5) + 1;
  const xMax = Math.ceil(entry.x1 + 0.5) - 1;
  const zMin = Math.floor(entry.z0 - 0.5) + 1;
  const zMax = Math.ceil(entry.z1 + 0.5) - 1;
  for (let cx = xMin; cx <= xMax; cx++) {
    for (let cz = zMin; cz <= zMax; cz++) {
      const k = key(cx, cz);
      let list = columns.get(k);
      if (!list) {
        list = [];
        columns.set(k, list);
      }
      list.push(entry);
    }
  }
}

/** Build the index once from the world's solid block list. */
export function buildCollisionIndex(solid: BlockList): void {
  if (built) return;
  built = true;
  for (const b of solid) addBlock(b);
}

export function collisionReady(): boolean {
  return built;
}

export function collisionStats(): { columns: number; blocks: number } {
  let blocks = 0;
  for (const list of columns.values()) blocks += list.length;
  return { columns: columns.size, blocks };
}

/** Solid entries near a world point (3×3 column neighbourhood). */
function entriesNear(x: number, z: number): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<Entry>();
  const cx = Math.round(x);
  const cz = Math.round(z);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const list = columns.get(key(cx + dx, cz + dz));
      if (!list) continue;
      for (const e of list) {
        if (!seen.has(e)) {
          seen.add(e);
          out.push(e);
        }
      }
    }
  }
  return out;
}

/** Diagnostics for QA: solid spans registered at a point. */
export function solidSpansAt(x: number, z: number): { lo: number; hi: number }[] {
  return entriesNear(x, z).map((e) => ({ lo: e.lo, hi: e.hi }));
}

/**
 * Highest standing surface at (x, z) reachable from `refY`: the heightfield
 * base, or the top of a solid block whose rectangle contains the point and
 * whose top is within `stepUp` of refY. Null = open water.
 */
export function supportHeight(
  x: number,
  z: number,
  refY: number,
  floorAt: (x: number, z: number) => number | null,
  stepUp = STEP_UP,
): number | null {
  const base = floorAt(x, z);
  let best: number | null = base;
  const limit = refY + stepUp;
  for (const e of entriesNear(x, z)) {
    if (e.hi > limit) continue;
    if (x < e.x0 - 1e-9 || x > e.x1 + 1e-9 || z < e.z0 - 1e-9 || z > e.z1 + 1e-9) continue;
    if (best === null || e.hi > best) best = e.hi;
  }
  return best;
}

/**
 * True when the capsule at (x, z) with feet at `feetY` intersects any solid
 * block. A block whose top is within step range and does NOT contain the
 * point is a climbable step beside the character, never a wall.
 */
export function capsuleBlocked(
  x: number,
  z: number,
  feetY: number,
  stepTol = STEP_UP,
): boolean {
  const bandLo = feetY + 0.05;
  const bandHi = feetY + HEIGHT;
  const stepLimit = feetY + stepTol;
  for (const e of entriesNear(x, z)) {
    if (e.hi <= bandLo || e.lo >= bandHi) continue;
    const nx = Math.min(Math.max(x, e.x0), e.x1);
    const nz = Math.min(Math.max(z, e.z0), e.z1);
    const dx = x - nx;
    const dz = z - nz;
    if (dx * dx + dz * dz >= RADIUS * RADIUS) continue;
    const contains = x >= e.x0 - 1e-9 && x <= e.x1 + 1e-9 && z >= e.z0 - 1e-9 && z <= e.z1 + 1e-9;
    if (e.hi <= stepLimit && !contains) continue;
    return true;
  }
  return false;
}

export interface MoveResult {
  ok: boolean;
  y: number;
}

/**
 * Validate one horizontal step to (toX, toZ) from foot level `fromY`.
 * Max speed 8.4 u/s × 1/60 s = 0.14 blocks per step — far under the capsule
 * radius, so a destination check cannot tunnel through a wall.
 */
export function tryMove(
  fromY: number,
  toX: number,
  toZ: number,
  floorAt: (x: number, z: number) => number | null,
  stepTol = STEP_UP,
): MoveResult {
  const sup = supportHeight(toX, toZ, fromY, floorAt, stepTol);
  if (sup === null) return { ok: false, y: fromY };
  if (sup - fromY > stepTol + 1e-6) return { ok: false, y: sup };
  if (capsuleBlocked(toX, toZ, sup)) return { ok: false, y: sup };
  return { ok: true, y: sup };
}

/** Highest floor under a falling/jumping body — no step-up in the air. */
export function floorBelow(
  x: number,
  z: number,
  y: number,
  floorAt: (x: number, z: number) => number | null,
): number | null {
  const base = floorAt(x, z);
  let best: number | null = base;
  for (const e of entriesNear(x, z)) {
    if (e.hi > y + 1e-6) continue;
    if (x < e.x0 - 1e-9 || x > e.x1 + 1e-9 || z < e.z0 - 1e-9 || z > e.z1 + 1e-9) continue;
    if (best === null || e.hi > best) best = e.hi;
  }
  return best;
}

/**
 * The heightfield floor: terrain surface, or a pier deck where one is over
 * water. Decks never cut into higher ground.
 */
export function makeFloorAt(terrainY: (x: number, z: number) => number | null, decks: Deck[]) {
  return (x: number, z: number): number | null => {
    const ground = terrainY(x, z);
    let deckY: number | null = null;
    for (const d of decks) {
      if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) {
        deckY = d.y;
        break;
      }
    }
    if (deckY === null) return ground;
    if (ground === null) return deckY;
    return Math.max(deckY, ground);
  };
}
