/**
 * Props — every small object in the world, built from the same voxel unit.
 *
 * All builders write into a `Chunk` in LOCAL coordinates, where y = 0 is the
 * layer that rests on the ground. Callers rotate and place with `place()`.
 *
 * Small-block detail (crate bands, barrel hoops, lantern glass) is done with
 * fractional-size boxes so a 1-block object can still read as a crate rather
 * than an anonymous cube.
 */
import { C } from './palette';
import type { Chunk } from './voxel';
import { hash2 } from './noise';

/**
 * Blocky palm with a leaning trunk and arching fronds (ref 2).
 *
 * `reach` is the frond length in blocks and is the single knob that decides
 * whether the tree belongs on the map. The first pass hard-coded 3, which on a
 * 12-block island produced a canopy wider than the beach — the whole starting
 * island read as a forest with a thin sand rim.
 */
export function palm(
  c: Chunk,
  x: number,
  y: number,
  z: number,
  height: number,
  seed: number,
  reach = 2,
): void {
  let ox = 0;
  let oz = 0;
  for (let i = 0; i < height; i++) {
    if (i > 1 && i % 3 === 0) {
      if (hash2(x + i, z, seed) > 0.5) ox += 1;
      else oz += 1;
    }
    c.put(x + ox, y + i, z + oz, C.trunk);
  }
  const top = y + height;
  const tx = x + ox;
  const tz = z + oz;
  c.put(tx, top, tz, C.leaf);

  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + seed * 0.7;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    for (let r = 1; r <= reach; r++) {
      const fx = Math.round(tx + dx * r);
      const fz = Math.round(tz + dz * r);
      const drop = r === 1 ? 0 : r - 2;
      c.put(fx, top + drop, fz, r === reach && reach > 1 ? C.leafLight : C.leaf);
      if (r === 1) c.put(fx, top + drop - 1, fz, C.leaf);
    }
  }
  // coconuts
  c.put(tx + 1, top - 1, tz, C.woodDark);
  c.put(tx, top - 1, tz - 1, C.woodDark);
}

/**
 * Stacked-cube canopy tree (refs 1 and 3). `radius` is the canopy half-width;
 * the caller picks 1 (a 3-wide tree, right for the small islands) or 2 (a
 * 5-wide tree, right for the village's garden trees).
 */
export function canopyTree(
  c: Chunk,
  x: number,
  y: number,
  z: number,
  trunkHeight: number,
  seed: number,
  radius = 1,
): void {
  for (let i = 0; i < trunkHeight; i++) c.put(x, y + i, z, C.trunk);
  const top = y + trunkHeight;
  for (let dy = 0; dy <= 2; dy++) {
    const spread = dy === 0 ? radius : dy === 1 ? radius : Math.max(0, radius - 1);
    const limit = spread === 0 ? 0 : spread + 1;
    for (let dx = -spread; dx <= spread; dx++) {
      for (let dz = -spread; dz <= spread; dz++) {
        const man = Math.abs(dx) + Math.abs(dz);
        if (man > limit) continue;
        if (dy === 2 && man > spread && spread > 0) continue;
        const t = hash2(x + dx * 7 + dy, z + dz * 3, seed);
        c.put(x + dx, top + dy, z + dz, t > 0.55 ? C.leafLight : C.leaf);
      }
    }
  }
  c.put(x, top + 3, z, C.leafLight);
}

export function bush(c: Chunk, x: number, y: number, z: number, seed: number): void {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 1 && hash2(x + dx, z + dz, seed) > 0.5) continue;
      c.put(x + dx, y, z + dz, hash2(x + dx, z + dz, seed + 3) > 0.6 ? C.leafLight : C.leaf);
    }
  }
  c.put(x, y + 1, z, C.leafLight);
}

export function cactus(c: Chunk, x: number, y: number, z: number, height: number): void {
  for (let i = 0; i < height; i++) c.put(x, y + i, z, C.cactus);
  if (height > 2) {
    c.put(x + 1, y + height - 2, z, C.cactus);
    c.put(x + 1, y + height - 1, z, C.cactus);
    c.put(x - 1, y + height - 3, z, C.cactus);
  }
  c.put(x, y + height, z, C.flowerPink);
}

export function flowers(c: Chunk, x: number, y: number, z: number, seed: number): void {
  const palette = [C.flowerPink, C.flowerYellow, C.flowerPurple, C.flowerWhite];
  const n = 2 + Math.floor(hash2(x, z, seed) * 3);
  for (let i = 0; i < n; i++) {
    const fx = x + Math.round((hash2(x + i, z, seed + 1) - 0.5) * 4);
    const fz = z + Math.round((hash2(x, z + i, seed + 2) - 0.5) * 4);
    c.put(fx, y, fz, C.grassDark);
    c.put(fx, y + 1, fz, palette[Math.floor(hash2(fx, fz, seed + 5) * palette.length)]);
  }
}

export function rockCluster(c: Chunk, x: number, y: number, z: number, size: number, seed: number): void {
  for (let dx = -size; dx <= size; dx++) {
    for (let dz = -size; dz <= size; dz++) {
      const h = hash2(x + dx, z + dz, seed);
      if (Math.hypot(dx, dz) > size + 0.3) continue;
      c.put(x + dx, y, z + dz, h > 0.5 ? C.stone : C.stoneDark);
      if (h > 0.74) c.put(x + dx, y + 1, z + dz, C.stone);
    }
  }
}

export function crate(c: Chunk, x: number, y: number, z: number): void {
  c.putBox(x, y + 0.5, z, 1, 1, 1, C.wood);
  c.putBox(x, y + 0.95, z, 1.04, 0.16, 1.04, C.woodDark);
  c.putBox(x, y + 0.12, z, 1.04, 0.16, 1.04, C.woodDark);
  c.putBox(x, y + 0.5, z + 0.51, 0.24, 1.0, 0.06, C.woodDark);
}

export function barrel(c: Chunk, x: number, y: number, z: number): void {
  c.putBox(x, y + 0.5, z, 0.88, 1, 0.88, C.wood);
  c.putBox(x, y + 0.28, z, 1.0, 0.12, 1.0, C.woodDark);
  c.putBox(x, y + 0.74, z, 1.0, 0.12, 1.0, C.woodDark);
  c.putBox(x, y + 1.02, z, 0.66, 0.1, 0.66, C.woodLight);
}

/** Post + glowing lantern; the warm accent that carries through the harbour. */
export function lamp(c: Chunk, x: number, y: number, z: number, height = 3): void {
  for (let i = 0; i < height; i++) c.put(x, y + i, z, C.woodDark);
  c.putBox(x, y + height + 0.35, z, 0.62, 0.7, 0.62, C.lantern);
  c.put(x, y + height + 0.9, z, C.woodDark);
}

/**
 * Voxel signpost: a timber post with a cream panel. `facing` rotates the panel
 * to one of four sides so signs point along the path.
 */
export function signpost(
  c: Chunk,
  x: number,
  y: number,
  z: number,
  facing: 0 | 1 | 2 | 3,
  width = 3,
  accent: number = C.roofBlue,
): void {
  for (let i = 0; i < 3; i++) c.put(x, y + i, z, C.woodDark);
  const half = Math.floor(width / 2);
  const alongX = facing === 0 || facing === 2;
  for (let i = 0; i < width; i++) {
    const off = i - half;
    const px = alongX ? x + off : x;
    const pz = alongX ? z : z + off;
    c.put(px, y + 3, pz, accent); // coloured header band
    c.put(px, y + 2, pz, C.wallCream); // board
  }
  // two painted lines on the board, on the side the sign faces
  const dx = facing === 1 ? 1 : facing === 3 ? -1 : 0;
  const dz = facing === 0 ? 1 : facing === 2 ? -1 : 0;
  for (const off of [-half + 1, half - 1]) {
    const px = (alongX ? x + off : x) + dx * 0.56;
    const pz = (alongX ? z : z + off) + dz * 0.56;
    c.putBox(px, y + 2.5, pz, dx ? 0.08 : 0.6, 0.16, dz ? 0.08 : 0.6, C.woodDark);
  }
}

export function flagpole(c: Chunk, x: number, y: number, z: number, height: number, color: number): void {
  for (let i = 0; i < height; i++) c.put(x, y + i, z, C.woodDark);
  for (let i = 0; i < 3; i++) {
    c.put(x + 1, y + height - 1 - i, z, color);
    c.put(x + 2, y + height - 1 - i, z, i === 2 ? color : C.wallCream);
  }
}

/** Mooring bollard + rope loop, used along the harbour quay. */
export function bollard(c: Chunk, x: number, y: number, z: number): void {
  c.put(x, y, z, C.woodDark);
  c.putBox(x, y + 0.85, z, 0.7, 0.3, 0.7, C.woodLight);
}

/** Market stall: counter, legs, striped awning, goods (ref 1). */
export function marketStall(
  c: Chunk,
  x: number,
  y: number,
  z: number,
  stripeA: number,
  stripeB: number,
): void {
  // counter
  for (let dz = -1; dz <= 1; dz++) {
    c.putBox(x, y + 0.55, z + dz, 3, 0.5, 0.94, C.wood);
    c.putBox(x, y + 0.82, z + dz, 3.02, 0.1, 0.98, C.woodLight);
  }
  // corner posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 3; i++) c.put(x + sx, y + i, z + sz * 1, C.woodDark);
    }
  }
  // awning
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 1; dz++) {
      if (Math.abs(dz) === 2 && Math.abs(dx) === 2) continue;
      c.putBox(x + dx, y + 3.15, z + dz, 1, 0.3, 1, (dx + dz) & 1 ? stripeA : stripeB);
    }
  }
  // goods on the counter
  c.putBox(x - 0.8, y + 0.98, z + 0.4, 0.4, 0.4, 0.4, C.cargoGreen);
  c.putBox(x + 0.2, y + 0.98, z - 0.3, 0.4, 0.4, 0.4, C.cargoRust);
  c.putBox(x + 0.9, y + 0.98, z + 0.3, 0.35, 0.35, 0.35, C.flowerYellow);
}

/** Small mooring dinghy tied up alongside the pier (ref 1). */
export function dinghy(c: Chunk, x: number, y: number, z: number, hue: number): void {
  c.putBox(x, y, z, 3.4, 0.6, 1.6, C.woodDark);
  c.putBox(x, y + 0.35, z, 2.8, 0.4, 1.0, C.wood);
  c.putBox(x - 1.3, y + 0.5, z, 0.4, 1.0, 0.9, hue);
  c.putBox(x + 1.3, y + 0.5, z, 0.4, 1.0, 0.9, hue);
  c.put(x, y + 0.9, z, C.woodDark);
  c.put(x + 1.4, y + 1.4, z, C.foam);
}

/**
 * Skill stall — counter, awning, themed goods, and a signpost slot for the
 * skill name. Callers register a hotspot + HTML sign via `buildSigns` in world.ts.
 * `facing` rotates the whole stall (0 = front faces +z).
 */
export function skillStall(
  c: Chunk,
  x: number,
  y: number,
  z: number,
  accent: number,
  goodsColor: number,
  facing: 0 | 1 | 2 | 3 = 0,
): void {
  // counter (3 wide, 1 deep)
  c.putBox(x, y + 0.55, z, 3, 0.5, 0.94, C.wood);
  c.putBox(x, y + 0.82, z, 3.02, 0.1, 0.98, C.woodLight);

  // corner posts
  const hx = 1.6, hz = 1.1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 3; i++) c.put(x + sx * hx, y + i, z + sz * hz, C.woodDark);
    }
  }

  // awning
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 1; dz++) {
      if (Math.abs(dz) === 2 && Math.abs(dx) === 2) continue;
      c.putBox(x + dx, y + 3.15, z + dz, 1, 0.3, 1, (dx + dz) & 1 ? accent : C.wallCream);
    }
  }

  // themed goods on the counter
  c.putBox(x - 0.8, y + 0.98, z + 0.4, 0.4, 0.4, 0.4, goodsColor);
  c.putBox(x + 0.2, y + 0.98, z - 0.3, 0.4, 0.4, 0.4, goodsColor);
  c.putBox(x + 0.9, y + 0.98, z + 0.3, 0.35, 0.35, 0.35, C.flowerYellow);

  // signpost BEHIND the counter: in front of it the board blocked the visitor's
  // approach (and the proximity line-of-sight) at head height. The sign faces
  // back toward the counter's front (the approach side).
  signpost(c, 0, 0, 2.2, ((facing + 2) % 4) as 0 | 1 | 2 | 3, 3, accent);
}
