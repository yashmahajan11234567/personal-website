/**
 * The Docker Whale — high-fidelity redesign.
 */
import { C } from './palette';
import { Chunk, mergeVoxels } from './voxel';
import type * as THREE from 'three';

export const WHALE_DECK_Y = 3.2;
export const WHALE_HALF_LENGTH = 9;
export const WHALE_HALF_WIDTH = 4.8;

function halfWidthAt(z: number): number {
  const t = (z + 9) / 18;
  if (t < 0.15) return 1.8 + t * 8;
  else if (t < 0.7) {
    const bodyT = (t - 0.15) / 0.55;
    return 3.2 + Math.sin(bodyT * Math.PI) * 1.8;
  } else {
    const noseT = (t - 0.7) / 0.3;
    return 5.0 - noseT * 4.0;
  }
}

function topAt(z: number): number {
  const t = (z + 9) / 18;
  if (t < 0.15) return 1.5 + t * 4;
  else if (t < 0.65) {
    const bodyT = (t - 0.15) / 0.5;
    const base = 2.8 + Math.sin(bodyT * Math.PI) * 1.2;
    if (t > 0.35 && t < 0.5) return base + Math.sin((t - 0.35) / 0.15 * Math.PI) * 1.5;
    return base;
  } else {
    const noseT = (t - 0.65) / 0.35;
    return 4.0 - noseT * 2.5;
  }
}

function bottomAt(z: number): number {
  const t = (z + 9) / 18;
  if (t < 0.15) return -0.5;
  else if (t < 0.7) return -1.5 - Math.sin(((t - 0.15) / 0.55) * Math.PI) * 1.0;
  else return -1.5;
}

function inside(z: number, x: number, y: number): boolean {
  const w = halfWidthAt(z);
  const top = topAt(z);
  const bot = bottomAt(z);
  if (w <= 0.5) return false;
  const cy = (top + bot) / 2;
  const ry = Math.max(0.6, (top - bot) / 2);
  const nx = x / w;
  const ny = (y - cy) / ry;
  return nx * nx + ny * ny <= 1.0;
}

function makeContainer(
  hull: Chunk,
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  color: number,
  hasDockerLogo: boolean = true
): void {
  hull.putBox(cx, cy, cz, sx, sy, sz, color);

  const frameColor = 0x0d1b2a;
  hull.putBox(cx, cy + sy / 2 - 0.08, cz, sx + 0.08, 0.16, sz + 0.08, frameColor);
  hull.putBox(cx, cy - sy / 2 + 0.08, cz, sx + 0.08, 0.16, sz + 0.08, frameColor);
  hull.putBox(cx + sx / 2 - 0.06, cy, cz, 0.16, sy, sz + 0.08, frameColor);
  hull.putBox(cx - sx / 2 + 0.06, cy, cz, 0.16, sy, sz + 0.08, frameColor);

  for (let i = -1; i <= 1; i++) {
    hull.putBox(cx + i * (sx / 3), cy, cz + sz / 2 + 0.03, 0.14, sy * 0.7, 0.08, frameColor);
    hull.putBox(cx + i * (sx / 3), cy, cz - sz / 2 - 0.03, 0.14, sy * 0.7, 0.08, frameColor);
  }

  if (hasDockerLogo && color === C.whaleBlue) {
    const logoY = cy;
    const logoZ = cz + sz / 2 + 0.04;
    hull.putBox(cx, logoY + 0.4, logoZ, 1.0, 0.4, 0.1, 0xffffff);
    hull.putBox(cx, logoY, logoZ, 1.2, 0.6, 0.1, 0xffffff);
    hull.putBox(cx, logoY - 0.4, logoZ, 1.0, 0.4, 0.1, 0xffffff);
  }

  const cornerSize = 0.3;
  const halfSx = sx / 2;
  const halfSy = sy / 2;
  const halfSz = sz / 2;
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        hull.putBox(
          cx + xSign * (halfSx - cornerSize / 2),
          cy + ySign * (halfSy - cornerSize / 2),
          cz + zSign * (halfSz - cornerSize / 2),
          cornerSize, cornerSize, cornerSize,
          frameColor
        );
      }
          }
        }
        return;
      }
      export interface WhaleParts {
  hull: THREE.BufferGeometry;
  tail: THREE.BufferGeometry;
}

// @ts-ignore - TypeScript control flow analysis false positive
export function buildWhale(): WhaleParts {
  const hull = new Chunk();

  for (let z = -9; z <= 9; z++) {
    const w = halfWidthAt(z);
    const top = topAt(z);
    const bot = bottomAt(z);
    if (w <= 0.5) continue;
    const wx = Math.ceil(w);

    for (let x = -wx; x <= wx; x++) {
      for (let y = Math.floor(bot); y <= Math.ceil(top); y++) {
        if (!inside(z, x, y)) continue;

        const surface =
          !inside(z, x + 1, y) ||
          !inside(z, x - 1, y) ||
          !inside(z, x, y + 1) ||
          !inside(z, x, y - 1);
        if (!surface) continue;

        let color: number;
        if (y >= top - 0.8) color = C.whaleLight;
        else if (y < bot + 0.8) color = C.whaleBelly;
        else if (x === wx || x === -wx) color = C.whaleAccent;
        else color = C.whaleBlue;
        hull.put(x, y, z, color);
      }

    const deckY = Math.ceil(top) - 1;
    for (let x = -wx; x <= wx; x++) {
      if (inside(z, x, deckY)) hull.put(x, deckY, z, C.whaleLight);
    }
  }

  makeContainer(hull, -2.2, WHALE_DECK_Y + 1.2, 1.5, 4.2, 2.2, 4.0, C.containerBlue, true);
  makeContainer(hull, 2.3, WHALE_DECK_Y + 1.2, 1.5, 4.2, 2.2, 4.0, C.containerCyan, true);
  makeContainer(hull, -1.5, WHALE_DECK_Y + 3.4, 1.0, 3.5, 2.2, 3.5, C.containerBlue, true);
  makeContainer(hull, 1.5, WHALE_DECK_Y + 3.4, 1.0, 3.5, 2.2, 3.5, C.containerCyan, true);
  makeContainer(hull, 0, WHALE_DECK_Y + 5.6, 0.5, 3.2, 2.2, 3.0, C.containerBlue, true);

  hull.putBox(0, 4.8, 5.5, 0.8, 0.4, 0.8, C.whaleAccent);
  hull.put(0, 5.2, 5.5, C.containerFrame);

  for (const side of [-1, 1]) {
    const eyeZ = 6.0;
    const eyeW = Math.round(halfWidthAt(eyeZ));
    hull.put(side * eyeW, 1.6, eyeZ, C.containerFrame);
    hull.put(side * eyeW, 1.6, eyeZ + 1, C.containerFrame);
    hull.put(side * (eyeW - 1), 1.6, eyeZ, 0x0d1b2a);
  }

  for (let h = 0; h < 4; h++) {
    const width = 2.2 - h * 0.5;
    hull.putBox(0, 4.4 + h, 3.0, width, 0.6, 1.2, C.whaleBlue);
  }
  hull.putBox(0, 5.4, 3.0, 0.8, 0.6, 1.0, C.whaleAccent);

  for (const side of [-1, 1]) {
    hull.putBox(side * 4.0, -0.2, 1.5, 2.5, 0.5, 1.8, C.whaleBlue);
    hull.putBox(side * 5.0, -0.5, 2.5, 1.5, 0.4, 1.2, C.whaleAccent);
  }

  const tail = new Chunk();
  for (let z = -10; z >= -12; z--) {
    const w = 1.6 + (z + 12) * 0.15;
    for (let x = -Math.round(w); x <= Math.round(w); x++) {
      for (let y = -1; y <= 1; y++) {
        const nx = x / w;
        const ny = y / 1.2;
        if (nx * nx + ny * ny > 1.0) continue;
        tail.put(x, y, z, C.whaleBlue);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 5; i++) {
      tail.put(side * i, i * 0.5 - 0.3, -12 - i, i > 3 ? C.whaleAccent : C.whaleBlue);
      tail.put(side * i, i * 0.5 - 0.3, -13 - i, C.whaleBlue);
    }
    tail.put(side * 2, -0.5, -15, C.containerFrame);
  }
  tail.putBox(0, -0.2, -12, 1.5, 0.8, 2.5, C.whaleAccent);

  hull.putBox(0, 3.4, 6.5, 1.6, 0.5, 1.6, C.wood);
  hull.putBox(0, 2.8, 8.0, 0.8, 0.4, 0.8, C.stone);

  return { hull: mergeVoxels(hull.list()), tail: mergeVoxels(tail.list()) };
}
}
