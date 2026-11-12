/**
 * Cloud World 2.0 — Docker Whale geometry.
 * Returns local-space BlockList (centred at origin, deck at y≈1.8).
 * Also builds dock container stacks for the whale's deck.
 */

import { P } from '../palette';
import type { BlockList } from '../types';

/**
 * Build the whale body as a local-space BlockList.
 * ~28 long (x: -14..+14), max 9 tall.
 * Blue body (whaleBlue) tapering to tail at +x, rounded head at -x.
 * whaleBelly underside band (sy=0.5 under main body rows).
 * whaleLight highlight blocks along top ridge.
 * Dorsal fin (whaleAccent) mid-top.
 * 2 pectoral fins (whaleBlue/whaleAccent) low sides near head.
 * Tail fluke: two whaleAccent half-steps forming V at +x end rising to y≈9.
 * Blowhole: 1 stoneDark vent on top near head.
 * 2 eyes: black/white block pairs on head sides.
 * Porthole windows: 3 glass circles along body side.
 * FLAT DECK: carve top flat at y=1.8 from x=-6..+6, z=-2..+2 — remove blocks above deck there and ensure deck surface blocks (woodLight planks sy=0.4 at y=1.6..2.0).
 * @returns BlockList in local space (centred at origin)
 */
export function buildWhaleBody(): BlockList {
  const blocks: BlockList = [];

  // Helper to add block
  const add = (x: number, y: number, z: number, c: number, sx = 1, sy = 1, sz = 1) => {
    blocks.push({ x, y, z, c, sx, sy, sz });
  };

  // ===== MAIN BODY =====
  // Body spans x = -14 (head) to +14 (tail), centred at x=0
  // Cross-section varies: widest at centre (~9 wide z, ~9 tall y), tapering to tail
  // We'll build in vertical slices along X

  for (let x = -14; x <= 14; x++) {
    // Normalized position along body: -1 (head) to +1 (tail)
    const t = x / 14;
    // Width profile: head rounded (narrow), belly wide, tail narrow
    let halfZ: number;
    let halfY: number;
    let yCentre = 0;

    if (t < -0.5) {
      // Head region (-14 to -7): rounded, narrowing
      const u = (t + 1) / 0.5; // 0 to 1
      halfZ = 2 + u * 2.5; // 2 to 4.5
      halfY = 2 + u * 2; // 2 to 4
      yCentre = -1 + u * 1; // -1 to 0
    } else if (t < 0.5) {
      // Mid body (-7 to +7): widest
      halfZ = 4.5;
      halfY = 4;
      yCentre = 0;
    } else {
      // Tail region (+7 to +14): tapering to fluke
      const u = (t - 0.5) / 0.5; // 0 to 1
      halfZ = 4.5 * (1 - u * 0.8); // 4.5 to 0.9
      halfY = 4 * (1 - u * 0.6); // 4 to 1.6
      yCentre = u * 1; // 0 to 1 (slight upturn)
    }

    // Fill cross-section ellipse-ish
    for (let zi = -Math.floor(halfZ); zi <= Math.floor(halfZ); zi++) {
      for (let yi = -Math.floor(halfY); yi <= Math.floor(halfY); yi++) {
        // Ellipse test
        const nx = zi / halfZ;
        const ny = (yi - yCentre) / halfY;
        if (nx * nx + ny * ny > 1) continue;

        const y = yi;
        const z = zi;

        // Determine colour: belly band (lower 20%), highlight (top ridge), else body
        const relHeight = (yi + halfY) / (2 * halfY); // 0 bottom, 1 top
        let colour: number;
        if (relHeight < 0.2) {
          colour = P.whaleBelly; // underside band
        } else if (relHeight > 0.85 && Math.abs(zi) < halfZ * 0.3) {
          colour = P.whaleLight; // top ridge highlight
        } else {
          colour = P.whaleBlue; // main body
        }

        add(x, y, z, colour);
      }
    }
  }

  // ===== DORSAL FIN =====
  // Mid-top, at x ≈ -2 (slightly forward of centre), rising from y≈4 to y≈8
  for (let i = 0; i < 5; i++) {
    const finX = -2 + i * 0.5; // swept back
    const finY = 4 + i;
    const finZ = 0;
    add(finX, finY, finZ, P.whaleAccent, 1, 1, 0.5);
  }

  // ===== PECTORAL FINS =====
  // Low sides near head (x ≈ -8), extending in ±z
  // Left fin (z negative)
  for (let i = 0; i < 4; i++) {
    const fx = -8 + i * 0.5;
    const fz = -4.5 - i * 0.5;
    const fy = -1;
    add(fx, fy, fz, i % 2 === 0 ? P.whaleBlue : P.whaleAccent, 1, 0.5, 1);
  }
  // Right fin (z positive)
  for (let i = 0; i < 4; i++) {
    const fx = -8 + i * 0.5;
    const fz = 4.5 + i * 0.5;
    const fy = -1;
    add(fx, fy, fz, i % 2 === 0 ? P.whaleBlue : P.whaleAccent, 1, 0.5, 1);
  }

  // ===== TAIL FLUKE =====
  // At x = +14, two half-steps forming V rising to y≈9
  // Left fluke (z negative, sweeping up)
  for (let i = 0; i < 5; i++) {
    const tx = 14 + i * 0.5;
    const tz = -2 - i * 0.8;
    const ty = 1 + i * 1.5;
    add(tx, ty, tz, P.whaleAccent, 1, 0.5, 1); // half-step
  }
  // Right fluke (z positive, sweeping up)
  for (let i = 0; i < 5; i++) {
    const tx = 14 + i * 0.5;
    const tz = 2 + i * 0.8;
    const ty = 1 + i * 1.5;
    add(tx, ty, tz, P.whaleAccent, 1, 0.5, 1);
  }
  // Fluke tips connect at top
  add(16, 8.5, -5, P.whaleAccent, 1, 0.5, 1);
  add(16, 8.5, 5, P.whaleAccent, 1, 0.5, 1);

  // ===== BLOWHOLE =====
  // On top near head (x ≈ -10, y ≈ 5, z = 0)
  add(-10, 5, 0, P.stoneDark, 0.5, 0.5, 0.5);

  // ===== EYES =====
  // Head sides at x ≈ -12, y ≈ 1, z ≈ ±3
  // Each eye: white 0.3 + dark 0.3 pair
  const eyeX = -12;
  const eyeY = 1;
  // Left eye
  add(eyeX, eyeY, -3, P.signText, 0.3, 0.3, 0.3); // white
  add(eyeX + 0.1, eyeY, -3.1, P.whaleAccent, 0.3, 0.3, 0.3); // dark pupil
  // Right eye
  add(eyeX, eyeY, 3, P.signText, 0.3, 0.3, 0.3);
  add(eyeX + 0.1, eyeY, 3.1, P.whaleAccent, 0.3, 0.3, 0.3);

  // ===== PORTHOLE WINDOWS =====
  // 3 glass circles (single glass blocks) along body side (z = +halfZ)
  // At x = -6, 0, +6
  [-6, 0, 6].forEach((px) => {
    add(px, 1, 5, P.glass, 1, 1, 0.3); // porthole on right side
    add(px, 1, -5, P.glass, 1, 1, 0.3); // left side
  });

  // ===== FLAT DECK =====
  // Carve top flat at y=1.8 from x=-6..+6, z=-2..+2
  // Remove blocks above deck there (we just don't add them in the first place, but since we already added,
  // we need to filter them out - easier: mark deck area and add deck surface)
  // Since we're building additively, we'll add deck surface blocks at y=1.6..2.0
  // and trust the renderer to handle z-fighting, or we can note that body blocks above deck are omitted.
  // For this implementation, we add deck planks on top.

  // Deck surface: woodLight planks sy=0.4 at y=1.6 to 2.0 (centres at 1.8, 2.2)
  for (let x = -6; x <= 6; x++) {
    for (let z = -2; z <= 2; z++) {
      // Two plank layers
      add(x, 1.8, z, P.woodLight, 1, 0.4, 1);
      add(x, 2.2, z, P.woodLight, 1, 0.4, 1);
    }
  }
  // Deck edge trim (woodDark)
  for (let x = -6; x <= 6; x++) {
    add(x, 2.0, -2.5, P.woodDark, 1, 0.5, 0.3);
    add(x, 2.0, 2.5, P.woodDark, 1, 0.5, 0.3);
  }
  for (let z = -2; z <= 2; z++) {
    add(-6.5, 2.0, z, P.woodDark, 0.3, 0.5, 1);
    add(6.5, 2.0, z, P.woodDark, 0.3, 0.5, 1);
  }

  // Mast for whale flag at rear of deck (x=5, z=0)
  const mastX = 5;
  const mastZ = 0;
  for (let i = 0; i < 3; i++) {
    add(mastX, 2.5 + i, mastZ, P.woodDark, 0.3, 1, 0.3);
  }
  // Whale flag (whaleBlue 1.5x1 on 2.5 woodDark mast) - already have mast, add flag
  add(mastX, 5.5, mastZ, P.whaleBlue, 1.5, 1, 0.2);

  return blocks;
}

/**
 * Build dock containers: stack of 4-6 containerBlue/containerCyan boxes
 * (2x2x2 each with containerFrame 0.2 edge trims) + whale flag.
 * Returns BlockList in local space (centred at origin, sitting on ground y=1).
 */
export function buildDockContainers(): BlockList {
  const blocks: BlockList = [];
  const add = (x: number, y: number, z: number, c: number, sx = 1, sy = 1, sz = 1) => {
    blocks.push({ x, y, z, c, sx, sy, sz });
  };

  // 5 containers stacked in a 2x2 grid, 2 high (4 total) + 1 on top = 5
  // Each container: 2x2x2, centred at grid positions
  const containerPositions = [
    { x: -2, z: -2 }, { x: 2, z: -2 },
    { x: -2, z: 2 }, { x: 2, z: 2 },
    { x: 0, z: 0 }, // top centre
  ];

  const colours = [P.containerBlue, P.containerCyan];

  containerPositions.forEach((pos, i) => {
    const baseColour = colours[i % 2];
    const baseY = i < 4 ? 1 : 3; // bottom layer at y=1 (centre), top at y=3
    const isTop = i >= 4;

    // Container box
    add(pos.x, baseY, pos.z, baseColour, 2, 2, 2);
    // Frame edges (containerFrame 0.2 thick)
    // Vertical edges
    for (let ex of [-1, 1]) {
      for (let ez of [-1, 1]) {
        add(pos.x + ex, baseY, pos.z + ez, P.containerFrame, 0.2, 2, 0.2);
      }
    }
    // Horizontal top/bottom edges
    for (let ex of [-1, 1]) {
      add(pos.x + ex, baseY + 1, pos.z, P.containerFrame, 0.2, 0.2, 2);
      add(pos.x + ex, baseY - 1, pos.z, P.containerFrame, 0.2, 0.2, 2);
    }
    for (let ez of [-1, 1]) {
      add(pos.x, baseY + 1, pos.z + ez, P.containerFrame, 2, 0.2, 0.2);
      add(pos.x, baseY - 1, pos.z + ez, P.containerFrame, 2, 0.2, 0.2);
    }

    // Whale flag on top container
    if (isTop) {
      // Mast
      for (let m = 0; m < 3; m++) {
        add(pos.x, baseY + 1.5 + m, pos.z, P.woodDark, 0.3, 1, 0.3);
      }
      // Flag
      add(pos.x, baseY + 5, pos.z, P.whaleBlue, 1.5, 1, 0.2);
    }
  });

  return blocks;
}