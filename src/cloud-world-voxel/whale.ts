/**
 * The Docker Whale.
 *
 * Reference 5 is a blue voxel whale with shipping containers lashed across its
 * back — the world's signature vehicle, and the one asset that has to read
 * instantly as a designed game object rather than as a pile of boxes.
 *
 * Construction: fifteen cross-sections along the body, each rasterised into a
 * one-block-thick shell of a flattened ellipse. That gives a genuinely
 * whale-shaped silhouette (tapered nose, deep chest, narrow tail stock) while
 * every surface is still a legal voxel face. The container stack, the porthole
 * eye and the fluke are then placed on top of that hull.
 *
 * Local forward is +z, matching the heading convention used everywhere else.
 */
import { C } from './palette';
import { Chunk, mergeVoxels } from './voxel';
import type * as THREE from 'three';

/** Top of the hull where the visitor stands, in local units. */
export const WHALE_DECK_Y = 2.9;
export const WHALE_HALF_LENGTH = 8;
export const WHALE_HALF_WIDTH = 4.4;

function halfWidthAt(z: number): number {
  const t = (z - 0.6) / 8.4;
  return WHALE_HALF_WIDTH * Math.sqrt(Math.max(0, 1 - t * t));
}
function topAt(z: number): number {
  const t = (z - 1.2) / 8.6;
  return 2.6 * Math.sqrt(Math.max(0, 1 - t * t));
}
function bottomAt(z: number): number {
  const t = z / 9.2;
  return -2.0 * Math.sqrt(Math.max(0, 1 - t * t));
}

/** Is (x, y) inside the body cross-section at z? */
function inside(z: number, x: number, y: number): boolean {
  const w = halfWidthAt(z);
  const top = topAt(z);
  const bot = bottomAt(z);
  if (w <= 0.4) return false;
  const cy = (top + bot) / 2;
  const ry = Math.max(0.5, (top - bot) / 2);
  const nx = x / w;
  const ny = (y - cy) / ry;
  return nx * nx + ny * ny <= 1.02;
}

export interface WhaleParts {
  hull: THREE.BufferGeometry;
  tail: THREE.BufferGeometry;
}

export function buildWhale(): WhaleParts {
  const hull = new Chunk();

  // ---- body shell: one block thick, plus a solid deck ----
  for (let z = -8; z <= 8; z++) {
    const w = halfWidthAt(z);
    const top = topAt(z);
    const bot = bottomAt(z);
    if (w <= 0.4) continue;
    const wx = Math.ceil(w);
    for (let x = -wx; x <= wx; x++) {
      for (let y = Math.floor(bot); y <= Math.ceil(top); y++) {
        const here = inside(z, x, y);
        if (!here) continue;
        // shell test: a block is part of the surface if any neighbour is outside
        const surface = !inside(z, x + 1, y) || !inside(z, x - 1, y) || !inside(z, x, y + 1) || !inside(z, x, y - 1);
        if (!surface) continue;

        let c: number;
        if (y >= top - 1.0) c = C.whaleLight;
        else if (y < -0.4) c = C.whaleBelly;
        else c = (z + 8) % 4 < 2 ? C.whaleBlue : C.whaleAccent;
        hull.put(x, y, z, c);
      }
    }
    // solid deck at the top of each slice so the visitor has something to stand on
    for (let x = -wx; x <= wx; x++) {
      if (inside(z, x, Math.ceil(top) - 1)) hull.put(x, Math.ceil(top) - 1, z, C.whaleLight);
    }
  }

  // ---- container stack (ref 5) ----
  const container = (
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    panel: number,
  ) => {
    hull.putBox(cx, cy, cz, sx, sy, sz, panel);
    // dark corner framing, drawn as thin slabs over the shell
    hull.putBox(cx, cy + sy / 2 - 0.06, cz, sx + 0.06, 0.13, sz + 0.06, C.containerFrame);
    hull.putBox(cx, cy - sy / 2 + 0.06, cz, sx + 0.06, 0.13, sz + 0.06, C.containerFrame);
    hull.putBox(cx + sx / 2 - 0.05, cy, cz, 0.13, sy, sz + 0.06, C.containerFrame);
    hull.putBox(cx - sx / 2 + 0.05, cy, cz, 0.13, sy, sz + 0.06, C.containerFrame);
    // corrugation
    for (let i = -1; i <= 1; i++) {
      hull.putBox(cx + i * (sx / 3), cy, cz + sz / 2 + 0.02, 0.12, sy * 0.8, 0.06, C.whaleAccent);
    }
  };

  container(-1.6, 4.4, 0.5, 3.0, 2.0, 3.0, C.containerCyan);
  container(1.7, 4.4, 0.5, 3.0, 2.0, 3.0, C.containerBlue);
  container(0.1, 6.4, 0.2, 3.4, 2.0, 3.0, C.containerCyan);
  container(0.1, 4.4, -3.2, 3.2, 2.0, 2.4, C.containerBlue);

  // ---- porthole eye ----
  for (const side of [-1, 1]) {
    const w = Math.round(halfWidthAt(4.4));
    hull.put(side * w, 0.4, 4, C.containerFrame);
    hull.put(side * w, 0.4, 5, C.containerFrame);
    hull.put(side * (w - 1), 0.4, 4, C.whaleBelly);
  }

  // ---- pectoral fins ----
  for (const side of [-1, 1]) {
    hull.putBox(side * 3.6, -0.9, 2.0, 2.2, 0.5, 1.4, C.whaleBlue);
    hull.putBox(side * 4.6, -1.3, 2.6, 1.4, 0.4, 1.0, C.whaleAccent);
  }

  // ---- blowhole and a hatch on the foredeck ----
  hull.putBox(0, 3.4, 6.4, 0.7, 0.5, 0.7, C.whaleAccent);
  hull.putBox(0, 3.2, -6.2, 1.4, 0.5, 1.4, C.wood);

  // ---- tail stock + fluke, animated separately ----
  const tail = new Chunk();
  for (let z = -9; z >= -12; z--) {
    const w = 2.4 + (z + 9) * 0.1;
    for (let x = -Math.round(w); x <= Math.round(w); x++) {
      for (let y = -1; y <= 1; y++) {
        const nx = x / w;
        const ny = y / 1.4;
        if (nx * nx + ny * ny > 1.05) continue;
        tail.put(x, y, z, C.whaleBlue);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 4; i++) {
      tail.put(side * i, i * 0.55 - 0.4, -12 - i, i > 2 ? C.whaleAccent : C.whaleBlue);
      tail.put(side * i, i * 0.55 - 0.4, -13 - i, C.whaleBlue);
    }
  }
  tail.putBox(0, 0, -12, 1.2, 1.2, 2.2, C.whaleAccent);

  return { hull: mergeVoxels(hull.list()), tail: mergeVoxels(tail.list()) };
}
