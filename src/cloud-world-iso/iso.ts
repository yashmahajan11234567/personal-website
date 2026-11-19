/**
 * Isometric 2.5D coordinate core — single source of truth for projection.
 *
 * World units are METRES on a square grid (1 cell = 1 m). Rendering uses a
 * 2:1 dimetric projection with TILE_W = 64 px per metre horizontally and
 * TILE_H = 32 px vertically; height z is in metres and lifts 32 px per metre.
 *
 *   screenX = (x - y) * 32 + originX
 *   screenY = (x + y) * 16 - z * 32 + originY
 *
 * All gameplay logic runs in world (metre) space; only rendering converts.
 */

export const TILE_W = 64;
export const TILE_H = 32;
export const PX_PER_M = 32;

export interface ScreenPoint { x: number; y: number }

export function worldToScreen(x: number, y: number, z = 0, originX = 0, originY = 0): ScreenPoint {
  return {
    x: originX + (x - y) * (TILE_W / 2),
    y: originY + (x + y) * (TILE_H / 2) - z * PX_PER_M,
  };
}

export function screenToWorld(sx: number, sy: number, originX = 0, originY = 0, z = 0): ScreenPoint {
  const dx = sx - originX;
  const dy = sy - originY + z * PX_PER_M; // undo the height lift before inverting
  const x = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const y = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  return { x, y };
}

/** Depth sort key for iso: larger x+y renders in front (higher depth). */
export function depthKey(x: number, y: number): number {
  return x + y;
}

/** 8-direction unit vectors in world space, screen-ordered S,SW,W,NW,N,NE,E,SE. */
export const DIR8: { name: string; dx: number; dy: number; angle: number }[] = [
  { name: 'S', dx: 0, dy: 1, angle: 90 },
  { name: 'SW', dx: -1, dy: 1, angle: 135 },
  { name: 'W', dx: -1, dy: 0, angle: 180 },
  { name: 'NW', dx: -1, dy: -1, angle: 225 },
  { name: 'N', dx: 0, dy: -1, angle: 270 },
  { name: 'NE', dx: 1, dy: -1, angle: 315 },
  { name: 'E', dx: 1, dy: 0, angle: 0 },
  { name: 'SE', dx: 1, dy: 1, angle: 45 },
];

const INV_SQRT2 = 1 / Math.SQRT2;

/** Normalize an 8-dir intent vector so diagonals are not faster. */
export function normalizeIntent(dx: number, dy: number): { dx: number; dy: number } {
  if (dx !== 0 && dy !== 0) return { dx: dx * INV_SQRT2, dy: dy * INV_SQRT2 };
  return { dx, dy };
}

/** Pick the closest of 8 directions for a velocity vector. Returns DIR8 index. */
export function directionIndex(vx: number, vy: number): number {
  if (Math.abs(vx) < 1e-6 && Math.abs(vy) < 1e-6) return 0;
  const a = (Math.atan2(vy, vx) * 180) / Math.PI; // screen-ish angle, y down = south
  const norm = ((a % 360) + 360) % 360;
  // map angle to DIR8 order S(90) SW(135) W(180) NW(225) N(270) NE(315) E(0) SE(45)
  const order = [90, 135, 180, 225, 270, 315, 0, 45];
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i < 8; i++) {
    let d = Math.abs(norm - order[i]);
    if (d > 180) d = 360 - d;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/* ------------------------- walkability grid ------------------------- */

export const CELL_WATER = 0;
export const CELL_LAND = 1;
export const CELL_DOCK = 2; // walkable pier over water
export const CELL_BLOCKED = 3; // building footprint / prop

export class WalkGrid {
  readonly w: number;
  readonly h: number;
  readonly cells: Uint8Array;
  constructor(w: number, h: number, fill = CELL_LAND) {
    this.w = w;
    this.h = h;
    this.cells = new Uint8Array(w * h).fill(fill);
  }
  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): number {
    if (!this.inBounds(x, y)) return CELL_WATER;
    return this.cells[Math.floor(y) * this.w + Math.floor(x)];
  }
  set(x: number, y: number, v: number): void {
    if (this.inBounds(x, y)) this.cells[Math.floor(y) * this.w + Math.floor(x)] = v;
  }
  rect(x0: number, y0: number, w: number, h: number, v: number): void {
    for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++)
      for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) this.set(x, y, v);
  }
  /** Can a circle of radius r at (x,y) stand here (foot mode)? */
  walkableAt(x: number, y: number, r = 0.35): boolean {
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        const cx = x + ox * r;
        const cy = y + oy * r;
        const c = this.get(cx, cy);
        if (c !== CELL_LAND && c !== CELL_DOCK) return false;
      }
    return true;
  }
  /** Can the boat sweep from (x,y) by (dx,dy) without leaving water/dock? */
  waterMoveOk(x: number, y: number, dx: number, dy: number, r = 1.1): boolean {
    const dist = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(dist / 0.25));
    const px = dx / n, py = dy / n;
    for (let i = 0; i <= n; i++) {
      const cx = x + px * i, cy = y + py * i;
      for (let oy = -r; oy <= r; oy += r)
        for (let ox = -r; ox <= r; ox += r) {
          const c = this.get(cx + ox, cy + oy);
          if (c !== CELL_WATER && c !== CELL_DOCK) return false;
        }
    }
    return true;
  }
  /** Can the boat (bigger radius) be here? */
  waterAt(x: number, y: number, r = 1.1): boolean {
    return this.waterMoveOk(x, y, 0, 0, r);
  }
  /** Axis-separated slide: try full move, then x-only, then y-only. */
  moveCircle(x: number, y: number, dx: number, dy: number, r: number, water: boolean): { x: number; y: number } {
    const ok = (nx: number, ny: number, mx: number, my: number) => (water ? this.waterMoveOk(nx, ny, mx, my, r) : this.walkableAt(nx, ny, r));
    if (ok(x + dx, y + dy, dx, dy)) return { x: x + dx, y: y + dy };
    if (dx !== 0 && ok(x + dx, y, dx, 0)) return { x: x + dx, y };
    if (dy !== 0 && ok(x, y + dy, 0, dy)) return { x, y: y + dy };
    return { x, y };
  }
}
