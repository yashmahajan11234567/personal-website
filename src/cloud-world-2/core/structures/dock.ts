/**
 * Cloud World 2.0 — Dock structure builder.
 * Wooden pier at deck layer with piles, railings, crates, barrels, bollards.
 */

import { Chunk } from '../voxel/builder';
import { P } from '../palette';

/**
 * Build a wooden dock/pier.
 * @param c Chunk to mutate
 * @param w Width along X (number of planks)
 * @param d Depth along Z (number of planks)
 *
 * Deck layer: planks at y=1 (centre), walkable surface at y=2.
 * Piles go down to y=-1, -2 every 3 blocks.
 * Railings along long sides (1.5 high, woodDark) with entry gaps.
 * Crates, barrels, and mooring bollards on water side.
 */
export function buildDock(c: Chunk, w: number, d: number): void {
  const halfW = Math.floor(w / 2);
  const halfD = Math.floor(d / 2);

  // Planks: y=1 centre (surface y=2), woodLight
  for (let x = -halfW; x <= halfW; x++) {
    for (let z = -halfD; z <= halfD; z++) {
      c.put(x, 1, z, P.woodLight, 1, 1, 1);
    }
  }

  // Support piles every 3 blocks along perimeter, going down to y=-2
  const pileInterval = 3;
  for (let x = -halfW; x <= halfW; x += pileInterval) {
    for (let z = -halfD; z <= halfD; z += pileInterval) {
      // Only on perimeter
      if (x !== -halfW && x !== halfW && z !== -halfD && z !== halfD) continue;
      // Piles at y=0, -1, -2 (centres) — woodDark
      c.put(x, 0, z, P.woodDark);
      c.put(x, -1, z, P.woodDark);
      c.put(x, -2, z, P.woodDark);
    }
  }

  // Railings along long sides (Z = ±halfD), 1.5 high = two layers: y=2 (post base) and y=3 (top rail)
  // Gaps for entry: leave middle 3 blocks open on front (z = -halfD) and back (z = halfD)
  const gapStart = -1;
  const gapEnd = 1;

  // Front railing (z = -halfD) - water side gets bollards too
  for (let x = -halfW; x <= halfW; x++) {
    if (x >= gapStart && x <= gapEnd) continue; // entry gap
    // Post at y=2.25 (centre of 1.5 high block from y=1.5 to y=3)
    c.put(x, 2.25, -halfD, P.woodDark, 0.3, 1.5, 0.3);
  }

  // Back railing (z = halfD)
  for (let x = -halfW; x <= halfW; x++) {
    if (x >= gapStart && x <= gapEnd) continue;
    c.put(x, 2.25, halfD, P.woodDark, 0.3, 1.5, 0.3);
  }

  // Top rail boards connecting posts (thin boards at y=3, sz=0.2)
  for (let x = -halfW; x <= halfW; x++) {
    if (x >= gapStart && x <= gapEnd) continue;
    c.put(x, 3, -halfD, P.woodDark, 1, 0.2, 0.2);
    c.put(x, 3, halfD, P.woodDark, 1, 0.2, 0.2);
  }

  // Crates (wood/woodDark) - 2-3 crates near front edge
  const cratePositions = [
    { x: -halfW + 2, z: -halfD + 2 },
    { x: halfW - 2, z: -halfD + 2 },
    { x: 0, z: -halfD + 3 },
  ];
  cratePositions.forEach((pos, i) => {
    const baseColour = i % 2 === 0 ? P.wood : P.woodDark;
    // Crate: 1x1x1 cube
    c.put(pos.x, 2.5, pos.z, baseColour);
    // Corner trim
    c.put(pos.x, 2.5, pos.z, baseColour, 1, 1, 1);
  });

  // Barrels (cargoRust) - 1-2 barrels
  const barrelPositions = [
    { x: -halfW + 1, z: -halfD + 1 },
    { x: halfW - 1, z: -halfD + 1 },
  ];
  barrelPositions.forEach((pos) => {
    // Barrel: vertical cylinder approx - 1x1.5x1 at y=2.25..3.25
    c.put(pos.x, 2.25, pos.z, P.cargoRust, 0.8, 1.5, 0.8);
    // Metal bands (stoneDark thin rings)
    c.put(pos.x, 2.0, pos.z, P.stoneDark, 0.9, 0.1, 0.9);
    c.put(pos.x, 3.0, pos.z, P.stoneDark, 0.9, 0.1, 0.9);
  });

  // Mooring bollards (stoneDark, 0.5 high) on water side (front, z = -halfD - 1)
  const bollardPositions = [
    { x: -halfW + 2, z: -halfD - 1 },
    { x: 0, z: -halfD - 1 },
    { x: halfW - 2, z: -halfD - 1 },
  ];
  bollardPositions.forEach((pos) => {
    // Bollard: 0.5 high cylinder on a base
    c.put(pos.x, 2.25, pos.z, P.stoneDark, 0.6, 0.5, 0.6);
    c.put(pos.x, 2.6, pos.z, P.stoneDark, 0.4, 0.2, 0.4); // cap
  });
}