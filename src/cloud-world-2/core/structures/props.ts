/**
 * Cloud World 2.0 — Props library.
 * Reusable prop builders: lamp, crate, barrel, flagpole, bollard, flowerBed, bush, palmTree, canopyTree, rockCluster, signpost.
 */

import { Chunk } from '../voxel/builder';
import { P } from '../palette';

/**
 * Lamp post with lantern on top.
 * @param c Chunk to mutate
 * @param x X position
 * @param y Y position (base of post)
 * @param z Z position
 */
export function buildLamp(c: Chunk, x: number, y: number, z: number): void {
  // Post: 1.5 high woodDark
  c.put(x, y + 0.75, z, P.woodDark, 0.3, 1.5, 0.3);
  // Lantern body: 0.5 cube at top
  const lanternY = y + 1.5 + 0.25;
  c.put(x, lanternY, z, P.lantern, 0.5, 0.5, 0.5);
  // Glow core
  c.put(x, lanternY, z, P.lanternGlow, 0.3, 0.3, 0.3);
}

/**
 * Wooden crate (1x1x1).
 */
export function buildCrate(c: Chunk, x: number, y: number, z: number, colour: number = P.wood): void {
  c.put(x, y + 0.5, z, colour, 1, 1, 1);
  // Corner braces
  c.put(x, y + 0.5, z, P.woodDark, 1, 0.1, 1);
  c.put(x, y + 0.5, z, P.woodDark, 0.1, 1, 1);
}

/**
 * Barrel (cargoRust) - vertical cylinder approx.
 */
export function buildBarrel(c: Chunk, x: number, y: number, z: number): void {
  // Body
  c.put(x, y + 0.75, z, P.cargoRust, 0.8, 1.5, 0.8);
  // Metal bands
  c.put(x, y + 0.5, z, P.stoneDark, 0.9, 0.1, 0.9);
  c.put(x, y + 1.0, z, P.stoneDark, 0.9, 0.1, 0.9);
  c.put(x, y + 1.5, z, P.stoneDark, 0.9, 0.1, 0.9);
  // Top/bottom lids
  c.put(x, y + 0.05, z, P.woodDark, 0.85, 0.1, 0.85);
  c.put(x, y + 1.95, z, P.woodDark, 0.85, 0.1, 0.85);
}

/**
 * Flagpole with accent flag.
 * @param c Chunk to mutate
 * @param x X position
 * @param y Y position (base)
 * @param z Z position
 * @param height Pole height (default 4)
 * @param accent Flag colour
 */
export function buildFlagpole(c: Chunk, x: number, y: number, z: number, height: number = 4, accent: number = P.roofBlue): void {
  // Pole (woodDark)
  for (let i = 0; i < height; i++) {
    c.put(x, y + i + 0.5, z, P.woodDark, 0.3, 1, 0.3);
  }
  // Flag block at top
  c.put(x, y + height + 0.5, z, accent, 1.5, 1, 0.2);
  // Small accent above
  c.put(x + 0.8, y + height + 1, z, accent, 1, 0.6, 0.2);
}

/**
 * Mooring bollard (stoneDark, 0.5 high).
 */
export function buildBollard(c: Chunk, x: number, y: number, z: number): void {
  // Base cylinder
  c.put(x, y + 0.25, z, P.stoneDark, 0.6, 0.5, 0.6);
  // Cap
  c.put(x, y + 0.6, z, P.stoneDark, 0.4, 0.2, 0.4);
}

/**
 * Flower bed: 2x1 slab + 3 mixed flowers (pink/white/yellow).
 */
export function buildFlowerBed(c: Chunk, x: number, y: number, z: number): void {
  // Slab base (woodDark)
  c.putBox(x - 0.5, y, z - 0.25, 2, 0.3, 1, P.woodDark);
  // 3 flowers
  const flowers = [
    { dx: -0.3, dz: 0, colour: P.flowerPink },
    { dx: 0.3, dz: 0.2, colour: P.flowerWhite },
    { dx: 0, dz: -0.1, colour: P.flowerYellow },
  ];
  flowers.forEach(({ dx, dz, colour }) => {
    c.put(x + dx, y + 0.4, z + dz, colour, 0.4, 0.4, 0.4);
  });
}

/**
 * Bush: 2x2x1 leaf cluster.
 */
export function buildBush(c: Chunk, x: number, y: number, z: number): void {
  const leafColours = [P.leaf, P.leafLight];
  for (let dx = -0.5; dx <= 0.5; dx += 0.5) {
    for (let dz = -0.5; dz <= 0.5; dz += 0.5) {
      const colour = leafColours[(dx + dz + 1) % 2];
      c.put(x + dx, y + 0.5, z + dz, colour, 0.6, 1, 0.6);
    }
  }
  // Top layer
  c.put(x, y + 1.2, z, P.leaf, 0.8, 0.5, 0.8);
}

/**
 * Palm tree: trunk 3-4 woodDark with 1-block lean, 5-block leaf canopy cross + corners.
 */
export function buildPalmTree(c: Chunk, x: number, y: number, z: number): void {
  const trunkHeight = 4;
  // Trunk with slight lean (+x direction)
  for (let i = 0; i < trunkHeight; i++) {
    const lean = i * 0.15; // 1 block lean over 4 blocks
    c.put(x + lean, y + i + 0.5, z, P.woodDark, 0.5, 1, 0.5);
  }
  // Leaf canopy at top (5 blocks: cross + 4 corners)
  const canopyY = y + trunkHeight;
  const leafPositions = [
    { dx: 0, dz: 0 }, // centre
    { dx: 1, dz: 0 }, // +x
    { dx: -1, dz: 0 }, // -x
    { dx: 0, dz: 1 }, // +z
    { dx: 0, dz: -1 }, // -z
    { dx: 0.7, dz: 0.7 }, // corners
    { dx: -0.7, dz: 0.7 },
    { dx: 0.7, dz: -0.7 },
    { dx: -0.7, dz: -0.7 },
  ];
  leafPositions.forEach(({ dx, dz }) => {
    c.put(x + dx, canopyY + 0.5, z + dz, P.leaf, 1, 0.5, 1);
  });
}

/**
 * Canopy tree: trunk 2 + 3x3x2 leaf blob.
 */
export function buildCanopyTree(c: Chunk, x: number, y: number, z: number): void {
  // Trunk (2 high)
  c.put(x, y + 0.5, z, P.woodDark, 0.6, 1, 0.6);
  c.put(x, y + 1.5, z, P.woodDark, 0.6, 1, 0.6);
  // Leaf blob: 3x3x2 centred at y+2.5
  const blobY = y + 2.5;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = 0; dy < 2; dy++) {
        const colour = dy === 0 ? P.leaf : P.leafLight;
        c.put(x + dx, blobY + dy * 0.5, z + dz, colour, 1, 0.5, 1);
      }
    }
  }
}

/**
 * Rock cluster: 3-5 rockSide/rockSideDark 0.5-1 cubes.
 */
export function buildRockCluster(c: Chunk, x: number, y: number, z: number): void {
  const rockCount = 4;
  const positions = [
    { dx: 0, dz: 0, sy: 1, colour: P.rockSide },
    { dx: 0.8, dz: 0.2, sy: 0.7, colour: P.rockSideDark },
    { dx: -0.5, dz: 0.7, sy: 0.8, colour: P.rockSide },
    { dx: 0.3, dz: -0.6, sy: 0.6, colour: P.rockSideDark },
    { dx: -0.7, dz: -0.3, sy: 0.9, colour: P.rockSide },
  ];
  positions.slice(0, rockCount).forEach(({ dx, dz, sy, colour }) => {
    c.put(x + dx, y + sy / 2, z + dz, colour, 1, sy, 1);
  });
}

/**
 * Signpost: woodDark post 3 high, arms with accent boards at y=2.2.
 * @param c Chunk to mutate
 * @param x X position
 * @param y Y position (base)
 * @param z Z position
 * @param arms Array of {dx, dz, accent, label?} - direction vectors for each arm
 */
export function buildSignpost(
  c: Chunk,
  x: number,
  y: number,
  z: number,
  arms: { dx: number; dz: number; accent: number; label?: string }[],
): void {
  // Post (3 high)
  for (let i = 0; i < 3; i++) {
    c.put(x, y + i + 0.5, z, P.woodDark, 0.4, 1, 0.4);
  }
  // Arms at y = y + 2.2
  const armY = y + 2.2;
  arms.forEach(({ dx, dz, accent }) => {
    // Arm board: 1.5 long, 0.3 thick, pointing in (dx, dz) direction
    // Normalize direction
    const len = Math.hypot(dx, dz);
    const nx = dx / len;
    const nz = dz / len;
    // Board extends from post outward
    for (let t = 0.3; t <= 1.5; t += 0.5) {
      c.put(x + nx * t, armY, z + nz * t, accent, 0.5, 0.3, 0.5);
    }
    // Small white mark at tip
    c.put(x + nx * 1.5, armY + 0.1, z + nz * 1.5, P.signText, 0.3, 0.2, 0.3);
  });
}