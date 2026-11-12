/**
 * Cloud World 2.0 — Market Stall structure builder.
 * 6 distinct stalls with striped awnings, themed counter props, sign boards, lanterns.
 */

import { Chunk } from '../voxel/builder';
import { P } from '../palette';
import type { StallSpec } from '../registry';

/**
 * Build a market stall from a StallSpec.
 * @param c Chunk to mutate
 * @param spec StallSpec defining position, colours, and theme
 *
 * 5 wide x 4 deep x 4 high.
 * Stone foundation ring (stoneDark) 1 high.
 * Wood plank walls (wood) with open front.
 * Counter: 1-high wood across front with accent-coloured goods (0.5 cubes x3-5).
 * Striped awning at y=3.5 (sy=0.5) projecting 2 blocks over counter, alternating awningA/awningB columns.
 * Awning posts at corners (woodDark).
 * Sign board: 3x1.5 signBoard panel above awning front (sz=0.3) with white accent mark.
 * 2 lanterns hanging under awning corners.
 * Interior warm glow (emissiveWindow 0.5 cube on back wall).
 * 1-2 themed props on counter per skill.
 */
export function buildStall(c: Chunk, spec: StallSpec): void {
  const w = 5; // width X
  const d = 4; // depth Z
  const h = 4; // wall height
  const halfW = Math.floor(w / 2); // 2
  const halfD = Math.floor(d / 2); // 2

  // Foundation ring at y=0 (stoneDark)
  for (let x = -halfW; x <= halfW; x++) {
    for (let z = -halfD; z <= halfD; z++) {
      if (x !== -halfW && x !== halfW && z !== -halfD && z !== halfD) continue;
      c.put(x, 0.5, z, P.stoneDark);
    }
  }

  // Floor at y=1 (wood planks)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    for (let z = -halfD + 1; z <= halfD - 1; z++) {
      c.put(x, 1, z, P.wood, 1, 0.2, 1);
    }
  }

  // Walls: back (z=halfD) and sides (x=±halfW), open front (z=-halfD)
  // Wood plank walls (wood) with woodDark corner posts
  const corners = [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: -halfW, z: halfD },
    { x: halfW, z: halfD },
  ];
  corners.forEach(({ x, z }) => {
    for (let y = 1; y <= h; y++) {
      c.put(x, y, z, P.woodDark, 0.4, 1, 0.4);
    }
  });

  // Back wall (z = halfD)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    for (let y = 1; y <= h; y++) {
      c.put(x, y, halfD, P.wood);
    }
  }

  // Side walls (x = ±halfW)
  for (let z = -halfD + 1; z <= halfD - 1; z++) {
    for (let y = 1; y <= h; y++) {
      c.put(-halfW, y, z, P.wood);
      c.put(halfW, y, z, P.wood);
    }
  }

  // Horizontal beams at y=1, y=h (woodDark)
  for (let y of [1, h]) {
    for (let x = -halfW; x <= halfW; x++) {
      c.put(x, y, halfD, P.woodDark, 1, 0.3, 0.4); // back beam
    }
    for (let z = -halfD; z <= halfD; z++) {
      c.put(-halfW, y, z, P.woodDark, 0.4, 0.3, 1); // left beam
      c.put(halfW, y, z, P.woodDark, 0.4, 0.3, 1); // right beam
    }
  }

  // Counter: 1-high wood across front (z = -halfD + 0.5, slightly inside)
  // Spans x = -halfW+1 .. halfW-1 at y=1.5 (centre of 1-high block)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    c.put(x, 1.5, -halfD + 0.5, P.wood, 1, 1, 0.8);
  }
  // Counter top trim (woodDark thin)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    c.put(x, 2, -halfD + 0.5, P.woodDark, 1, 0.1, 0.8);
  }

  // Goods on counter: 3-5 accent-coloured 0.5 cubes
  const goodsCount = 4;
  const goodsSpacing = (w - 2) / (goodsCount + 1);
  for (let i = 1; i <= goodsCount; i++) {
    const gx = -halfW + 1 + i * goodsSpacing;
    c.put(Math.round(gx * 2) / 2, 2.25, -halfD + 0.3, spec.accent, 0.5, 0.5, 0.5);
  }

  // Striped awning at y=3.5 (centre), sy=0.5, projecting 2 blocks over counter (z = -halfD -1 to -halfD -2)
  // Alternating 1-block columns of awningA/awningB along X
  for (let x = -halfW; x <= halfW; x++) {
    const awningColour = (x + halfW) % 2 === 0 ? spec.awningA : spec.awningB;
    // Awning extends 2 blocks outward from front wall
    for (let pz = 0; pz < 2; pz++) {
      c.put(x, 3.5, -halfD - 0.5 - pz, awningColour, 1, 0.5, 1);
    }
  }
  // Awning valence (front edge trim) - woodDark thin board at z = -halfD - 2.5
  for (let x = -halfW; x <= halfW; x++) {
    c.put(x, 3.5, -halfD - 2.5, P.woodDark, 1, 0.5, 0.2);
  }

  // Awning posts at corners (woodDark) - from y=1 to y=3.5
  const postPositions = [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
  ];
  postPositions.forEach(({ x, z }) => {
    for (let y = 1; y <= 3; y++) {
      c.put(x, y + 0.5, z, P.woodDark, 0.4, 1, 0.4);
    }
    // Post top connects to awning
    c.put(x, 3.5, z, P.woodDark, 0.4, 0.5, 0.4);
  });

  // Sign board: 3 wide x 1.5 tall signBoard panel above awning front face (sz=0.3)
  // Centred at x=0, y=4.5, z = -halfD - 2.5 (front of awning)
  c.putBox(-1.5, 4, -halfD - 2.65, 3, 1.5, 0.3, P.signBoard);
  // White accent mark (abstract icon) - small signText blocks in accent colour
  const iconMarks = [
    { x: -0.5, y: 4.3, z: -halfD - 2.5 },
    { x: 0.5, y: 4.3, z: -halfD - 2.5 },
    { x: 0, y: 4.7, z: -halfD - 2.5 },
  ];
  iconMarks.forEach(({ x, y, z }) => {
    c.put(x, y, z, spec.accent, 0.4, 0.4, 0.2);
  });

  // 2 lanterns hanging under awning corners (at y=3.25, just below awning)
  const lanternPositions = [
    { x: -halfW, z: -halfD - 1 },
    { x: halfW, z: -halfD - 1 },
  ];
  lanternPositions.forEach(({ x, z }) => {
    // Chain (stoneDark thin)
    c.put(x, 3.25, z, P.stoneDark, 0.1, 0.5, 0.1);
    // Lantern body
    c.put(x, 3.0, z, P.lantern, 0.4, 0.4, 0.4);
    // Glow core
    c.put(x, 3.0, z, P.lanternGlow, 0.2, 0.2, 0.2);
  });

  // Interior warm glow: emissiveWindow 0.5 cube on back wall (z = halfD - 0.3)
  c.put(0, 2.5, halfD - 0.3, P.emissiveWindow, 0.5, 0.5, 0.3);

  // Themed props on counter (1-2 per skill)
  buildStallProps(c, spec, halfW, halfD);
}

/**
 * Build themed counter props for each stall type.
 */
function buildStallProps(c: Chunk, spec: StallSpec, _halfW: number, halfD: number): void {
  const counterY = 2.25;
  const counterZ = -halfD + 0.3;

  switch (spec.id) {
    case 'stall-docker': {
      // Fish shape in fishBlue (2x1 blocks)
      c.put(-0.5, counterY, counterZ, P.fishBlue, 1, 0.5, 0.5);
      c.put(0.5, counterY, counterZ, P.fishBlue, 1, 0.5, 0.5);
      // Tail fin
      c.put(1, counterY, counterZ + 0.3, P.fishOrange, 0.5, 0.3, 0.5);
      break;
    }
    case 'stall-cicd': {
      // PipeGrey monitor 1x1 with emissiveWindow screen
      c.put(0, counterY + 0.25, counterZ, P.pipeGrey, 1, 1, 0.3);
      c.put(0, counterY + 0.25, counterZ - 0.1, P.emissiveWindow, 0.8, 0.8, 0.1);
      // Keyboard (pipeGrey flat)
      c.put(0, counterY - 0.2, counterZ + 0.3, P.pipeGrey, 1, 0.2, 0.5);
      break;
    }
    case 'stall-cloud': {
      // 2 server racks (cargoGreen + containerFrame)
      // Rack 1
      c.put(-1, counterY, counterZ, P.cargoGreen, 1, 1.5, 1);
      c.put(-1, counterY, counterZ, P.containerFrame, 1.1, 1.6, 1.1);
      // Rack 2
      c.put(1, counterY, counterZ, P.cargoGreen, 1, 1.5, 1);
      c.put(1, counterY, counterZ, P.containerFrame, 1.1, 1.6, 1.1);
      break;
    }
    case 'stall-k8s': {
      // 2 stacked containerBlue mini containers (1x1x1 each)
      c.put(-0.5, counterY, counterZ, P.containerBlue, 0.8, 0.8, 0.8);
      c.put(-0.5, counterY + 0.8, counterZ, P.containerBlue, 0.8, 0.8, 0.8);
      c.put(0.5, counterY, counterZ, P.containerBlue, 0.8, 0.8, 0.8);
      c.put(0.5, counterY + 0.8, counterZ, P.containerBlue, 0.8, 0.8, 0.8);
      break;
    }
    case 'stall-python': {
      // FlowerYellow snake coil (3 blocks in S curve)
      c.put(-0.5, counterY, counterZ, P.flowerYellow, 0.5, 0.5, 0.5);
      c.put(0, counterY + 0.3, counterZ, P.flowerYellow, 0.5, 0.5, 0.5);
      c.put(0.5, counterY, counterZ, P.flowerYellow, 0.5, 0.5, 0.5);
      break;
    }
    case 'stall-sql': {
      // 2 potion bottles (emissiveCyan + flowerPurple)
      // Bottle 1: emissiveCyan
      c.put(-0.5, counterY, counterZ, P.emissiveCyan, 0.3, 1, 0.3);
      c.put(-0.5, counterY + 0.5, counterZ, P.emissiveCyan, 0.4, 0.3, 0.4); // neck
      c.put(-0.5, counterY + 0.8, counterZ, P.stoneDark, 0.3, 0.2, 0.3); // cork
      // Bottle 2: flowerPurple
      c.put(0.5, counterY, counterZ, P.flowerPurple, 0.3, 1, 0.3);
      c.put(0.5, counterY + 0.5, counterZ, P.flowerPurple, 0.4, 0.3, 0.4);
      c.put(0.5, counterY + 0.8, counterZ, P.stoneDark, 0.3, 0.2, 0.3);
      break;
    }
  }
}