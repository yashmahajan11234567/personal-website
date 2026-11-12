/**
 * Cloud World 2.0 — voxel builder.
 *
 * Fresh construction vocabulary for the greenfield world. A `Chunk`
 * accumulates blocks in LOCAL space; `placeChunk` stamps it into world space
 * with a 90°-step rotation. Blocks may be non-cubic (sx/sy/sz) — stairs,
 * slabs, boards and thin trims are all scaled boxes, which keeps the whole
 * static world renderable as a handful of InstancedMeshes.
 *
 * Structure placement rule (doc 04 §4): a structure's base layer is the
 * HIGHEST ground column under its footprint, and every lower column is filled
 * with a foundation, so a building can straddle a slope without holes.
 */

import type { Block, BlockList } from '../types';

/** A 90°-step rotation of the local frame, applied at placement time. */
export type Quarter = 0 | 1 | 2 | 3;

export class Chunk {
  private blocks: Block[] = [];

  /** Add one block. Colour is a palette hex. */
  put(x: number, y: number, z: number, c: number, sx = 1, sy = 1, sz = 1): this {
    this.blocks.push({ x, y, z, c, sx, sy, sz });
    return this;
  }

  /** Add an axis-aligned box spanning [x, x+sx) × [y, y+sy) × [z, z+sz). */
  putBox(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: number): this {
    this.blocks.push({ x: x + sx / 2, y: y + sy / 2, z: z + sz / 2, c, sx, sy, sz });
    return this;
  }

  /** Fill a solid box of full cubes (one block per cell). */
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number): this {
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          this.put(x, y, z, c);
        }
      }
    }
    return this;
  }

  /** Hollow walls of a box footprint (no floor/ceiling). */
  walls(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number): this {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
          this.put(x, y, z, c);
        }
      }
    }
    return this;
  }

  list(): BlockList {
    return this.blocks;
  }
}

/** Rotate/scale a local block into world space around (cx, baseY, cz). */
export function placeChunk(
  chunk: Chunk,
  out: BlockList,
  cx: number,
  baseY: number,
  cz: number,
  quarter: Quarter = 0,
): void {
  const swap = quarter === 1 || quarter === 3;
  const flip = quarter === 2 || quarter === 3;
  for (const b of chunk.list()) {
    const lx = b.x;
    const lz = b.z;
    const rx = swap ? lz : lx;
    const rz = swap ? lx : lz;
    const fx = flip ? -rx : rx;
    const fz = flip ? -rz : rz;
    out.push({
      ...b,
      x: cx + fx,
      y: baseY + b.y,
      z: cz + fz,
      sx: swap ? (b.sz ?? 1) : (b.sx ?? 1),
      sz: swap ? (b.sx ?? 1) : (b.sz ?? 1),
    });
  }
}

/**
 * Stamp a chunk so its base sits on `baseY`, filling a stone foundation
 * between the terrain and the base under every footprint column that sits on
 * ground lower than the base.
 */
export function placeWithFoundation(
  chunk: Chunk,
  out: BlockList,
  cx: number,
  cz: number,
  quarter: Quarter,
  footprint: { fx: number; fz: number },
  baseY: number,
  groundTopAt: (x: number, z: number) => number | null,
  foundationColour: number,
): void {
  const swap = quarter === 1 || quarter === 3;
  const fx = swap ? footprint.fz : footprint.fx;
  const fz = swap ? footprint.fx : footprint.fz;
  const x0 = Math.round(cx - fx);
  const x1 = Math.round(cx + fx);
  const z0 = Math.round(cz - fz);
  const z1 = Math.round(cz + fz);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const t = groundTopAt(x, z);
      if (t === null) continue; // over water — piers carry their own piles
      for (let y = t + 1; y < baseY; y++) {
        out.push({ x, y: y + 0.5, z, c: foundationColour });
      }
    }
  }
  placeChunk(chunk, out, cx, baseY, cz, quarter);
}

/** Find the highest ground column + 1 under a footprint (the base layer). */
export function highestGroundBase(
  cx: number,
  cz: number,
  fx: number,
  fz: number,
  groundTopAt: (x: number, z: number) => number | null,
): number {
  let highest = 1;
  let any = false;
  for (let x = Math.round(cx - fx); x <= Math.round(cx + fx); x++) {
    for (let z = Math.round(cz - fz); z <= Math.round(cz + fz); z++) {
      const t = groundTopAt(x, z);
      if (t !== null) {
        any = true;
        if (t + 1 > highest) highest = t + 1;
      }
    }
  }
  return any ? highest : 1;
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

/** A stair step: half-height box (the voxel idiom for stairs). */
export function step(c: Chunk, x: number, y: number, z: number, colour: number, dir: 'x' | 'z' = 'z'): void {
  if (dir === 'z') c.put(x, y + 0.25, z, colour, 1, 0.5, 1);
  else c.put(x, y + 0.25, z, colour, 1, 0.5, 1);
}

/** Gable roof: two slopes of half-steps meeting at a ridge along x. */
export function gableRoof(
  c: Chunk,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y0: number,
  colour: number,
  ridge: number,
): void {
  const span = z1 - z0;
  for (let i = 0; i <= Math.floor(span / 2); i++) {
    const y = y0 + i * 0.5;
    c.putBox(x0, y, z0 + i, x1 - x0 + 1, 0.5, 1, colour);
    const zi = z1 - i;
    if (zi > z0 + i) c.putBox(x0, y, zi, x1 - x0 + 1, 0.5, 1, i === 0 ? colour : ridge);
    else c.putBox(x0, y, zi, x1 - x0 + 1, 0.5, 1, ridge);
  }
}

/** Hip roof: four slopes converging (stepped pyramid with cut corners). */
export function hipRoof(
  c: Chunk,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y0: number,
  colour: number,
  ridge: number,
): void {
  let a = x0;
  let b = x1;
  let d = z0;
  let e = z1;
  let y = y0;
  let first = true;
  while (a <= b && d <= e) {
    for (let x = a; x <= b; x++) {
      c.put(x, y, d, first ? colour : ridge, 1, 0.5, 1);
      if (e !== d) c.put(x, y, e, first ? colour : ridge, 1, 0.5, 1);
    }
    for (let z = d + 1; z <= e - 1; z++) {
      c.put(a, y, z, first ? colour : ridge, 1, 0.5, 1);
      if (b !== a) c.put(b, y, z, first ? colour : ridge, 1, 0.5, 1);
    }
    a += 1;
    b -= 1;
    d += 1;
    e -= 1;
    y += 0.5;
    first = false;
  }
}
