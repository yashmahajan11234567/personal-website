/**
 * Physical character collision — capsule vs the world's solid voxel geometry.
 *
 * WHY THIS EXISTS: until now the character collided only with the ground
 * heightfield (`walkableHeight`), so building walls were pure decoration and
 * the visitor could walk straight through a house. This module adds real
 * solid-block collision while keeping the engine's fixed-step, axis-slide
 * movement model exactly as it was.
 *
 * WHERE THE GEOMETRY COMES FROM: `staticCollisionBlocks()` in world.ts — the
 * same block map that renders the world, minus terrain (which stays a
 * heightfield) and minus vegetation (greenery stays walk-through, as it has
 * always been). Collision therefore can never drift from what the player sees,
 * and there is no second, hand-maintained collision map to go stale.
 *
 * COORDINATE CONVENTIONS (verified against the source):
 *   - A voxel's x/z are the CENTRE of an sx × sz box: block (26, z) with sx=1
 *     occupies [25.5, 26.5] in world space. Broad-phase lookups round the
 *     query coordinate; the narrow phase tests each block's TRUE rectangle,
 *     so a 3-wide counter never blocks a column it merely touches.
 *   - A voxel's y is also a centre: it spans [y - sy/2, y + sy/2].
 *   - Terrain (and dock decks) remain the walkable heightfield from world.ts;
 *     solid tops (plinths, floors, counters) act as additional standing
 *     surfaces within the existing step-up limit.
 *
 * THE CHARACTER: torso is 0.6 blocks wide and BODY_H = 1.7 tall (both from
 * VoxelCharacter source). Modelled as a vertical capsule: circle of radius
 * RADIUS = 0.3 in the ground plane over [feet + stepTol, feet + HEIGHT] —
 * geometry within the step limit is climbable terrain, never a wall.
 */
import { walkableHeight, staticCollisionBlocks } from './world';
import type { Voxel } from './voxel';

/** One voxel step of terrace remains walkable (matches VoxelCharacter). */
export const STEP_UP = 1.15;
/** Character collision half-width in blocks (0.6-block total width). */
export const RADIUS = 0.3;
/** Character height in blocks (BODY_H in VoxelCharacter). */
export const HEIGHT = 1.7;

interface Entry {
  /** vertical span of the block */
  lo: number;
  hi: number;
  /** true horizontal rectangle of the block (centre ± half size) */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** column key → solid entries whose rectangle touches that column. */
const columns = new Map<number, Entry[]>();
let built = false;

function addBlock(b: Voxel): void {
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
  // broad-phase: register under every column the rectangle may touch
  const xMin = Math.floor(entry.x0 - 0.5) + 1;
  const xMax = Math.ceil(entry.x1 + 0.5) - 1;
  const zMin = Math.floor(entry.z0 - 0.5) + 1;
  const zMax = Math.ceil(entry.z1 + 0.5) - 1;
  for (let cx = xMin; cx <= xMax; cx++) {
    for (let cz = zMin; cz <= zMax; cz++) {
      const k = (cx + 512) * 2048 + (cz + 1024);
      let list = columns.get(k);
      if (!list) {
        list = [];
        columns.set(k, list);
      }
      list.push(entry);
    }
  }
}

/** Build the column index once. Deterministic and cached — never rebuilt. */
export function ensureCollisionIndex(): void {
  if (built) return;
  built = true;
  for (const b of staticCollisionBlocks()) addBlock(b);
}

/** Diagnostics: how many solid columns were indexed (QA/debug). */
export function collisionStats(): { columns: number; built: boolean } {
  ensureCollisionIndex();
  return { columns: columns.size, built };
}

/** Solid entries whose registered columns overlap world point (x, z). */
function entriesNear(x: number, z: number): Entry[] {
  ensureCollisionIndex();
  const out: Entry[] = [];
  const seen = new Set<Entry>();
  const cx = Math.round(x);
  const cz = Math.round(z);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const list = columns.get((cx + dx + 512) * 2048 + (cz + dz + 1024));
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

/** Solid vertical spans registered near (x, z) — diagnostics/QA helper. */
export function solidSpansAt(x: number, z: number): { lo: number; hi: number }[] {
  return entriesNear(x, z).map((e) => ({ lo: e.lo, hi: e.hi }));
}

/**
 * Highest standing surface at (x, z) that is reachable from foot level
 * `refY`: the terrain/deck heightfield, or the top of a solid block whose
 * TRUE rectangle contains the point and whose top is within `stepUp` of
 * `refY`. Null means open water with nothing to stand on.
 */
export function supportHeight(x: number, z: number, refY: number, stepUp = STEP_UP): number | null {
  const base = walkableHeight(x, z);
  let best = base;
  const limit = refY + stepUp;
  for (const e of entriesNear(x, z)) {
    if (e.hi > limit) continue;
    if (x < e.x0 - 1e-9 || x > e.x1 + 1e-9 || z < e.z0 - 1e-9 || z > e.z1 + 1e-9) continue;
    if (best === null || e.hi > best) best = e.hi;
  }
  return best;
}

/**
 * True when the character capsule at (x, z) with feet at `feetY` intersects
 * any solid block. A block blocks when its TRUE rectangle is within RADIUS of
 * the circle centre AND its span overlaps the full body [feetY + eps,
 * feetY + HEIGHT] AND it is not merely a climbable step: a block whose top is
 * within step range and which does NOT contain (x, z) is a step beside the
 * character (its side may be grazed by the legs mid-climb), while the same
 * block in the character's own column is a wall course to be climbed ONTO,
 * never walked through.
 */
export function capsuleBlocked(x: number, z: number, feetY: number, stepTol: number = STEP_UP): boolean {
  ensureCollisionIndex();
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
    if (e.hi <= stepLimit && !contains) continue; // climbable step beside the character
    return true;
  }
  return false;
}

export interface MoveResult {
  /** false → the move is physically blocked; caller keeps the old position */
  ok: boolean;
  /** the feet height the character would stand at after the move */
  y: number;
}

/**
 * Validate one horizontal step landing at (toX, toZ) from foot level `fromY`.
 * (The from-position needs no sweep: the fastest horizontal speed is
 * 8.4 blocks/s × 1/60 s = 0.14 blocks per physics step, well under the
 * capsule radius, so a destination check cannot tunnel through a wall.)
 * The step is legal when the destination has a standing surface within
 * `stepTol` of the current feet AND the capsule fits there. This is the
 * single gate used by the character controller for walking (jump arcs keep
 * their own ballistic integration and only consult the floor).
 */
export function tryMove(fromY: number, toX: number, toZ: number, stepTol: number = STEP_UP): MoveResult {
  const sup = supportHeight(toX, toZ, fromY, stepTol);
  if (sup === null) return { ok: false, y: fromY };
  if (sup - fromY > stepTol + 1e-6) return { ok: false, y: sup };
  if (capsuleBlocked(toX, toZ, sup)) return { ok: false, y: sup };
  return { ok: true, y: sup };
}

/** Highest floor under a falling/jumping body at (x, z) — no step-up in the air. */
export function floorBelow(x: number, z: number, y: number): number | null {
  const base = walkableHeight(x, z);
  let best = base;
  for (const e of entriesNear(x, z)) {
    if (e.hi > y + 1e-6) continue;
    if (x < e.x0 - 1e-9 || x > e.x1 + 1e-9 || z < e.z0 - 1e-9 || z > e.z1 + 1e-9) continue;
    if (best === null || e.hi > best) best = e.hi;
  }
  return best;
}
