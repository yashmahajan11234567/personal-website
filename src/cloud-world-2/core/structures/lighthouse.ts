/**
 * Cloud World 2.0 — Lighthouse structure builder.
 * Tapered stone tower with alternating bands, gallery, lamp room, red/white banding, door, windows.
 */

import { Chunk } from '../voxel/builder';
import { P } from '../palette';

/**
 * Build a lighthouse.
 * @param c Chunk to mutate
 * @param height Total height in blocks (default 12)
 *
 * Tapered stone tower: base ~5x5, tapering to ~3x3 at top.
 * Stone bands alternating stoneDark every 2 layers.
 * Gallery platform at top (2 blocks wider than tower top).
 * Lamp room: 2x2 glowing (lantern colour, emissive look via bright colour).
 * Red/white banding near top (roofTerracotta bands).
 * Door at base, 1-2 windows up the shaft.
 */
export function buildLighthouse(c: Chunk, height: number = 12): void {
  const baseSize = 5; // base dimension (odd for centre)
  const topSize = 3; // top dimension before gallery

  // Build tower layers from y=0 to y=height-1
  for (let y = 0; y < height; y++) {
    // Taper: linear interpolation from baseSize to topSize
    const t = y / (height - 1);
    const size = Math.max(topSize, Math.round(baseSize - t * (baseSize - topSize)));
    // Ensure odd size for centred tower
    const layerSize = size % 2 === 1 ? size : size + 1;
    const half = Math.floor(layerSize / 2);

    // Band colour: alternate stone / stoneDark every 2 layers
    const bandIndex = Math.floor(y / 2);
    const isDarkBand = bandIndex % 2 === 1;
    const wallColour = isDarkBand ? P.stoneDark : P.stone;

    // Walls (hollow box)
    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        if (x !== -half && x !== half && z !== -half && z !== half) continue;
        c.put(x, y + 0.5, z, wallColour);
      }
    }

    // Door at base (y=0, front face z = -half)
    if (y === 0) {
      // Door opening: 1 wide x 2 high centred
      // Remove blocks at x=0, z=-half for y=0,1
      // (We just don't place them - but we already placed walls above)
      // Instead, place door frame: woodDark
      c.put(0, 0.5, -half, P.woodDark, 1, 2, 0.3);
      // Door itself (wallCreamDark)
      c.put(0, 1, -half + 0.2, P.wallCreamDark, 0.8, 1.8, 0.2);
    }

    // Windows at y=3 and y=7 (1-2 windows up the shaft)
    if (y === 3 || y === 7) {
      // Window on front face (z = -half)
      // Glass block with glassDark frame
      c.put(0, y + 0.5, -half, P.glassDark, 0.8, 0.8, 0.3);
      c.put(0, y + 0.5, -half + 0.1, P.glass, 0.6, 0.6, 0.2);
      // Emissive glow inside at night (emissiveWindow small cube behind glass)
      c.put(0, y + 0.5, -half + 0.2, P.emissiveWindow, 0.4, 0.4, 0.2);
    }

    // Red/white banding near top (last 3 layers before gallery)
    if (y >= height - 4 && y < height - 1) {
      const bandColour = (y - (height - 4)) % 2 === 0 ? P.roofTerracotta : P.wallCream;
      // Replace top course of this layer with band colour
      for (let x = -half; x <= half; x++) {
        for (let z = -half; z <= half; z++) {
          if (x !== -half && x !== half && z !== -half && z !== half) continue;
          // Override top of this layer (y+0.5) with band
          // Find and replace - easier: just add band blocks slightly higher
          c.put(x, y + 0.7, z, bandColour, 1, 0.2, 1);
        }
      }
    }
  }

  // Gallery platform at y = height (1 block above tower top)
  // 2 blocks wider than tower top
  const galleryHalf = Math.floor(topSize / 2) + 2; // topSize=3 -> half=1, galleryHalf=3 => 7x7
  const galleryY = height;

  // Gallery floor (stone slabs)
  for (let x = -galleryHalf; x <= galleryHalf; x++) {
    for (let z = -galleryHalf; z <= galleryHalf; z++) {
      // Only the ring (platform edge) and floor
      if (x > -galleryHalf && x < galleryHalf && z > -galleryHalf && z < galleryHalf) {
        // Inner floor: stone slabs
        c.put(x, galleryY + 0.1, z, P.stone, 1, 0.2, 1);
      } else {
        // Outer edge: stoneDark thicker
        c.put(x, galleryY + 0.1, z, P.stoneDark, 1, 0.4, 1);
      }
    }
  }

  // Gallery railing (iron/stoneDark posts + top rail)
  for (let x = -galleryHalf; x <= galleryHalf; x++) {
    for (let z = -galleryHalf; z <= galleryHalf; z++) {
      if (x !== -galleryHalf && x !== galleryHalf && z !== -galleryHalf && z !== galleryHalf) continue;
      // Post at corners and every 2 blocks
      if ((x % 2 === 0 || x === -galleryHalf || x === galleryHalf) &&
          (z % 2 === 0 || z === -galleryHalf || z === galleryHalf)) {
        c.put(x, galleryY + 0.7, z, P.stoneDark, 0.3, 1.2, 0.3);
      }
    }
  }
  // Top rail
  for (let x = -galleryHalf; x <= galleryHalf; x++) {
    c.put(x, galleryY + 1.3, -galleryHalf, P.stoneDark, 1, 0.2, 0.3);
    c.put(x, galleryY + 1.3, galleryHalf, P.stoneDark, 1, 0.2, 0.3);
  }
  for (let z = -galleryHalf; z <= galleryHalf; z++) {
    c.put(-galleryHalf, galleryY + 1.3, z, P.stoneDark, 0.3, 0.2, 1);
    c.put(galleryHalf, galleryY + 1.3, z, P.stoneDark, 0.3, 0.2, 1);
  }

  // Lamp room: 2x2 at centre of gallery, height 2 blocks (y = height+1 to height+2)
  const lampY = galleryY + 1;
  for (let x = -1; x <= 0; x++) {
    for (let z = -1; z <= 0; z++) {
      // Glass walls with lantern glow
      c.put(x, lampY + 0.5, z, P.glass, 1, 1.5, 1);
      // Inner emissive core
      c.put(x, lampY + 0.5, z, P.lanternGlow, 0.6, 1, 0.6);
    }
  }
  // Lamp room roof: shallow cone/peak (roofTerracottaDark)
  c.putBox(-1, lampY + 1.5, -1, 2, 0.5, 2, P.roofTerracottaDark);
  c.put(0, lampY + 2, 0, P.roofTerracottaDark, 1, 1, 1); // peak

  // Weather vane / lightning rod at very top
  c.put(0, lampY + 3, 0, P.stoneDark, 0.2, 2, 0.2);
  c.put(0, lampY + 4, 0, P.roofTerracotta, 0.5, 0.5, 0.5);
}