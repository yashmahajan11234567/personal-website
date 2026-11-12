/**
 * Cloud World 2.0 — Welcome Hall structure builder.
 * 2-storey timber lodge ~14x10 with gable roof, arched doorway, windows, flower boxes, ivy, cloud sign, lanterns.
 */

import { Chunk } from '../voxel/builder';
import { P } from '../palette';
import { gableRoof } from '../voxel/builder';

/**
 * Build the Welcome Hall.
 * @param c Chunk to mutate
 * @param roofColour Roof colour (default P.roofBlue)
 *
 * Dimensions: ~14 wide (x) x 10 deep (z), 2 storeys.
 * Wall: wallCream with woodDark timber frame accents.
 * Gable roof using gableRoof from builder.
 * Stone stair (5 wide, half-steps) up to arched doorway (2w x 3h).
 * 6+ warm windows (emissiveWindow 1x1 with glassDark frame).
 * Flower boxes under 3 windows (slab + flowerPink/flowerWhite).
 * Ivy (leaf blocks) on one wall corner.
 * Cloud-emblem sign board above door (signBoard 3x1x0.5 with white cloud blocks).
 * 2 lanterns flanking door.
 */
export function buildWelcomeHall(c: Chunk, roofColour: number = P.roofBlue): void {
  const w = 14; // width along X
  const d = 10; // depth along Z
  const halfW = Math.floor(w / 2);
  const halfD = Math.floor(d / 2);
  const wallH = 8; // 2 storeys: ground (y=1..4) + upper (y=5..8), roof starts at y=8

  // Foundation: stoneDark ring at y=0
  for (let x = -halfW; x <= halfW; x++) {
    for (let z = -halfD; z <= halfD; z++) {
      if (x !== -halfW && x !== halfW && z !== -halfD && z !== halfD) continue;
      c.put(x, 0.5, z, P.stoneDark);
    }
  }

  // Floor slabs at y=1 (ground floor) and y=5 (upper floor)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    for (let z = -halfD + 1; z <= halfD - 1; z++) {
      c.put(x, 1, z, P.woodLight, 1, 0.2, 1); // ground floor
      c.put(x, 5, z, P.woodLight, 1, 0.2, 1); // upper floor
    }
  }

  // Walls: wallCream with woodDark timber frame
  // Corner posts (woodDark) full height
  const corners = [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: -halfW, z: halfD },
    { x: halfW, z: halfD },
  ];
  corners.forEach(({ x, z }) => {
    for (let y = 1; y <= wallH; y++) {
      c.put(x, y, z, P.woodDark, 0.4, 1, 0.4);
    }
  });

  // Horizontal beams at floor levels (y=1, y=5, y=8)
  for (let y of [1, 5, 8]) {
    for (let x = -halfW; x <= halfW; x++) {
      // Front and back beams
      c.put(x, y, -halfD, P.woodDark, 1, 0.3, 0.4);
      c.put(x, y, halfD, P.woodDark, 1, 0.3, 0.4);
    }
    for (let z = -halfD; z <= halfD; z++) {
      // Side beams
      c.put(-halfW, y, z, P.woodDark, 0.4, 0.3, 1);
      c.put(halfW, y, z, P.woodDark, 0.4, 0.3, 1);
    }
  }

  // Wall infill: wallCream between frames
  for (let y = 1; y <= wallH; y++) {
    // Front wall (z = -halfD) - with doorway gap
    for (let x = -halfW + 1; x <= halfW - 1; x++) {
      // Doorway: 2 wide centred at x=0, from y=1 to y=3 (arch top at y=3)
      const inDoorway = x >= -1 && x <= 0 && y <= 3;
      if (inDoorway) continue;
      c.put(x, y, -halfD, P.wallCream);
    }
    // Back wall (z = halfD)
    for (let x = -halfW + 1; x <= halfW - 1; x++) {
      c.put(x, y, halfD, P.wallCream);
    }
    // Side walls (x = ±halfW) - with windows
    for (let z = -halfD + 1; z <= halfD - 1; z++) {
      c.put(-halfW, y, z, P.wallCream);
      c.put(halfW, y, z, P.wallCream);
    }
  }

  // Arched doorway top (y=3, x=-1..0): glassDark arch blocks
  c.put(-1, 3, -halfD, P.glassDark, 1, 0.5, 0.3);
  c.put(0, 3, -halfD, P.glassDark, 1, 0.5, 0.3);

  // Windows: 6+ total — 2 per side wall, 1 front upper, 1 back upper
  // Window = emissiveWindow 1x1 block with glassDark frame (0.2 thick around)
  const windows = [
    // Left wall (x = -halfW)
    { x: -halfW, y: 2, z: -2 },
    { x: -halfW, y: 6, z: -2 },
    { x: -halfW, y: 2, z: 2 },
    { x: -halfW, y: 6, z: 2 },
    // Right wall (x = halfW)
    { x: halfW, y: 2, z: -2 },
    { x: halfW, y: 6, z: -2 },
    { x: halfW, y: 2, z: 2 },
    { x: halfW, y: 6, z: 2 },
    // Front upper (z = -halfD)
    { x: -4, y: 6, z: -halfD },
    { x: 3, y: 6, z: -halfD },
    // Back upper (z = halfD)
    { x: -4, y: 6, z: halfD },
    { x: 3, y: 6, z: halfD },
  ];

  windows.forEach(({ x, y, z }) => {
    // Glass frame (thin)
    const isSideWall = Math.abs(x) === halfW;
    if (isSideWall) {
      c.put(x, y, z, P.glassDark, 0.3, 1, 1);
      c.put(x, y, z, P.emissiveWindow, 0.2, 0.8, 0.8);
    } else {
      c.put(x, y, z, P.glassDark, 1, 1, 0.3);
      c.put(x, y, z, P.emissiveWindow, 0.8, 0.8, 0.2);
    }
  });

  // Flower boxes under 3 windows (front wall upper windows at y=6)
  // Box at y=5.5 (below window), extends outward (z = -halfD - 1)
  const flowerBoxWindows = [
    { x: -4, z: -halfD },
    { x: 0, z: -halfD }, // centred
    { x: 3, z: -halfD },
  ];
  flowerBoxWindows.forEach(({ x, z }, i) => {
    const boxZ = z - 1; // outward
    // Slab base (woodDark)
    c.put(x, 5.5, boxZ, P.woodDark, 1, 0.3, 0.8);
    // Flowers: alternating pink/white
    const flowerColour = i % 2 === 0 ? P.flowerPink : P.flowerWhite;
    c.put(x, 5.9, boxZ, flowerColour, 0.4, 0.4, 0.4);
    c.put(x + 0.3, 5.9, boxZ + 0.2, i % 2 === 0 ? P.flowerWhite : P.flowerPink, 0.3, 0.3, 0.3);
  });

  // Ivy on one wall corner (back-left corner: x=-halfW, z=halfD)
  for (let y = 1; y <= wallH; y += 1) {
    // Leaf clusters climbing up
    c.put(-halfW + 0.3, y, halfD - 0.3, P.leaf, 0.4, 0.4, 0.4);
    if (y % 2 === 0) {
      c.put(-halfW + 0.5, y + 0.3, halfD - 0.5, P.leafLight, 0.3, 0.3, 0.3);
    }
  }

  // Gable roof (ridge along X, slopes along Z)
  // Roof sits on top of walls at y=wallH (8)
  gableRoof(c, -halfW, halfW, -halfD, halfD, wallH, roofColour, P.roofBlueDark);

  // Cloud-emblem sign board above door: signBoard 3x1x0.5 at y=4.5, z=-halfD-0.5
  // Sign panel
  c.putBox(0, 4.5, -halfD - 0.5, 3, 1, 0.5, P.signBoard);
  // Small white cloud made of blocks on sign
  const cloudBlocks = [
    { x: -0.5, y: 4.8, z: -halfD - 0.3 },
    { x: 0.5, y: 4.8, z: -halfD - 0.3 },
    { x: 0, y: 5.1, z: -halfD - 0.3 },
    { x: -0.3, y: 5.0, z: -halfD - 0.3 },
    { x: 0.3, y: 5.0, z: -halfD - 0.3 },
  ];
  cloudBlocks.forEach(({ x, y, z }) => {
    c.put(x, y, z, P.signText, 0.5, 0.3, 0.3);
  });

  // 2 Lanterns flanking door at ground level (y=2.25 post + lantern at y=3.25)
  // Left lantern (x=-2)
  c.put(-2, 2.25, -halfD + 0.3, P.woodDark, 0.3, 1.5, 0.3); // post
  c.put(-2, 3.25, -halfD + 0.3, P.lantern, 0.5, 0.5, 0.5); // lantern body
  c.put(-2, 3.25, -halfD + 0.3, P.lanternGlow, 0.3, 0.3, 0.3); // glow core

  // Right lantern (x=1)
  c.put(1, 2.25, -halfD + 0.3, P.woodDark, 0.3, 1.5, 0.3);
  c.put(1, 3.25, -halfD + 0.3, P.lantern, 0.5, 0.5, 0.5);
  c.put(1, 3.25, -halfD + 0.3, P.lanternGlow, 0.3, 0.3, 0.3);

  // Stone stairs (5 wide, half-steps) leading up to doorway from y=0 to y=1
  // Stairs centred at x=0, extending from z=-halfD-1 down to z=-halfD-5
  for (let i = 0; i < 5; i++) {
    const stepY = 0.25 + i * 0.5; // half-step height
    const stepZ = -halfD - 1 - i;
    c.putBox(-2, stepY, stepZ, 5, 0.5, 1, P.stone);
  }
}