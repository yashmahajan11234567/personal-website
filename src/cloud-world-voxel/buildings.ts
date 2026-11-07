/**
 * Buildings — the shared architectural language (brief 07).
 *
 * Every building in the world is produced by these builders, so they cannot
 * drift apart stylistically: cream walls, a dark timber corner post on every
 * corner, a stepped roof in either blue or terracotta, a lit window band, and
 * a coloured sign plaque over the entrance.
 *
 * Buildings are built with an OPEN FRONT: the middle of the front wall is left
 * out and dressed with display props, so walking up to a house actually shows
 * you what is inside it. That is the whole point of the village — the world is
 * the portfolio.
 *
 * The front of a building always faces local +z; callers rotate it with
 * `place(chunk, out, x, y, z, quarter)`.
 */
import { C } from './palette';
import type { Chunk } from './voxel';

export interface HouseOptions {
  /** footprint width along x (odd) */
  w: number;
  /** footprint depth along z (odd) */
  d: number;
  /** wall height in layers */
  wallH: number;
  roof: number;
  roofDark?: number;
  /** interior dressing, chosen per portfolio building */
  decor: 'shelves' | 'boards' | 'stands' | 'racks' | 'benches' | 'hall';
  /** sign plaque colour */
  accent: number;
  /** taller, grander entrance with columns */
  columns?: boolean;
  /** a second storey band of windows */
  twoStorey?: boolean;
  chimney?: boolean;
}

/**
 * A village house. Returns nothing; writes into the chunk.
 *
 * Layout, from the ground up:
 *   y = 0        stone plinth, one block wider than the walls
 *   y = 1..wallH cream walls + timber corner posts + window band
 *   y = wallH+1.. stepped roof, overhanging one block on every side
 */
export function house(c: Chunk, o: HouseOptions): void {
  const hx = (o.w - 1) / 2;
  const hz = (o.d - 1) / 2;
  const roofDark = o.roofDark ?? C.roofBlueDark;

  // foundation / plinth
  for (let x = -hx - 1; x <= hx + 1; x++)
    for (let z = -hz - 1; z <= hz + 1; z++) c.put(x, 0, z, C.stoneDark);

  // walls
  for (let y = 1; y <= o.wallH; y++) {
    for (let x = -hx; x <= hx; x++) {
      for (let z = -hz; z <= hz; z++) {
        const edge = Math.abs(x) === hx || Math.abs(z) === hz;
        if (!edge) continue; // solid volume is pointless; the interior is dressed instead
        c.put(x, y, z, C.wallCream);
      }
    }
  }

  // timber corner posts
  for (const sx of [-hx, hx]) {
    for (const sz of [-hz, hz]) {
      for (let y = 1; y <= o.wallH; y++) c.put(sx, y, sz, C.woodDark);
    }
  }

  // base course — a darker cream band that grounds the walls
  for (let x = -hx; x <= hx; x++) {
    c.put(x, 1, -hz, C.wallCreamDark);
    c.put(x, 1, hz, C.wallCreamDark);
  }
  for (let z = -hz; z <= hz; z++) {
    c.put(-hx, 1, z, C.wallCreamDark);
    c.put(hx, 1, z, C.wallCreamDark);
  }

  // window band on the side walls (glass with a cream sill and lintel)
  const winY = o.twoStorey ? [2, 3, 5] : [2, 3];
  for (const y of winY) {
    if (y > o.wallH) continue;
    c.put(-hx, y, 0, C.glass);
    c.put(hx, y, 0, C.glass);
    if (o.twoStorey) {
      c.put(-hx, y, -2, C.glass);
      c.put(hx, y, -2, C.glass);
      c.put(-hx, y, 2, C.glass);
      c.put(hx, y, 2, C.glass);
    }
    c.put(-hx, y - 1, 0, C.wallCreamDark);
    c.put(hx, y - 1, 0, C.wallCreamDark);
  }
  // a window either side of the front door
  if (hz >= 3) {
    for (let y = 2; y <= 3; y++) {
      if (y > o.wallH) continue;
      c.put(-hx + 1, y, hz, C.glass);
      c.put(hx - 1, y, hz, C.glass);
    }
  }

  // OPEN FRONT — clear the middle band of the front wall
  const openW = Math.max(3, o.w - 4);
  const openHalf = (openW - 1) / 2;
  for (let y = 1; y <= o.wallH; y++) {
    for (let x = -openHalf; x <= openHalf; x++) {
      if (Math.abs(x) === hx) continue;
      c.del(x, y, hz);
    }
  }

  // door frame posts + lintel
  for (const sx of [-openHalf - 1, openHalf + 1]) {
    for (let y = 1; y <= o.wallH + 1; y++) c.put(sx, y, hz, C.woodDark);
  }
  for (let x = -openHalf - 1; x <= openHalf + 1; x++) {
    c.put(x, o.wallH + 1, hz, C.woodDark);
  }

  // threshold step
  for (let x = -openHalf; x <= openHalf; x++) c.put(x, 0, hz + 1, C.stone);

  // decoration above the entrance: the building's sign plaque
  for (let x = -openHalf; x <= openHalf; x++) {
    for (let y = o.wallH - 1; y <= o.wallH; y++) {
      c.put(x, y, hz, C.wallCream);
    }
  }
  for (let x = -openHalf + 1; x <= openHalf - 1; x++) {
    c.put(x, o.wallH - 1, hz, o.accent);
  }
  // little voxel "letters" so the plaque reads as a sign at distance
  c.put(-openHalf + 1, o.wallH, hz, C.woodDark);
  c.put(openHalf - 1, o.wallH, hz, C.woodDark);
  if (openHalf > 2) c.put(0, o.wallH, hz, C.woodDark);

  // Roof: stepped gable, overhanging one block on all four sides.
  //
  // The roof rises TWO z-units per layer. The first pass rose one, which for a
  // 7-deep house produced five stacked slabs and a roof twice as tall as the
  // walls under it — the village read as a field of roofs with legs.
  // Two units per layer gives three slabs and a ridge, so the walls stay the
  // dominant mass, which is what the references actually show.
  let roofLayer = 0;
  for (let i = 0; i <= hz + 1; i += 2) {
    const y = o.wallH + 1 + roofLayer;
    const zA = -hz - 1 + i;
    const zB = hz + 1 - i;
    if (zA > zB) break;
    const ridge = zA === zB;
    for (let x = -hx - 1; x <= hx + 1; x++) {
      for (let z = zA; z <= zB; z++) {
        c.put(x, y, z, ridge ? roofDark : o.roof);
      }
    }
    roofLayer++;
  }

  if (o.columns) {
    for (const sx of [-openHalf - 1, openHalf + 1]) {
      for (let y = 1; y <= o.wallH + 1; y++) c.put(sx, y, hz + 1, C.wallCream);
      c.put(sx, o.wallH + 2, hz + 1, C.stone);
    }
  }

  if (o.chimney) {
    const cxp = hx - 1;
    for (let y = o.wallH + 1; y <= o.wallH + hz + 2; y++) c.put(cxp, y, -hz + 1, C.stone);
    c.put(cxp, o.wallH + hz + 3, -hz + 1, C.stoneDark);
  }

  // interior floor + dressing, visible through the open front
  const floorY = 1;
  for (let x = -hx + 1; x <= hx - 1; x++)
    for (let z = -hz + 1; z <= hz - 1; z++) c.put(x, floorY, z, C.wood);
  decor(c, floorY + 1, o);
}

function decor(c: Chunk, y: number, o: HouseOptions): void {
  const hx = (o.w - 1) / 2;
  const hz = (o.d - 1) / 2;
  const back = -hz + 1;

  switch (o.decor) {
    case 'shelves': {
      // workshop shelving stacked with tools and parts
      for (const sy of [y, y + 2]) {
        for (let x = -hx + 2; x <= hx - 2; x++) c.put(x, sy, back, C.woodDark);
        const items = [C.cargoGreen, C.roofTerracotta, C.glass, C.flowerYellow, C.whaleBlue];
        for (let x = -hx + 2; x <= hx - 2; x++) {
          const t = (x + hx) % items.length;
          if ((x & 1) === 0) c.put(x, sy + 1, back, items[t]);
        }
      }
      // a workbench across the middle of the room
      for (let x = -hx + 1; x <= hx - 1; x++) {
        c.putBox(x, y + 0.55, 0, 1, 0.5, 2.2, C.wood);
      }
      break;
    }
    case 'boards': {
      // notice board with pinned notices
      for (let x = -hx + 2; x <= hx - 2; x++) c.put(x, y + 3, back, C.woodDark);
      for (let x = -hx + 2; x <= hx - 2; x++)
        for (let yy = y; yy <= y + 2; yy++) c.put(x, yy, back, C.wallCream);
      const pins = [C.roofTerracotta, C.roofBlue, C.cargoGreen];
      for (let i = 0; i < 3; i++) {
        const x = -hx + 2 + i * 2;
        c.put(x, y + 1, back, pins[i]);
        c.put(x, y + 2, back, C.wallCream);
      }
      // a desk and a chair
      c.putBox(0, y + 0.55, 1, 2.4, 0.5, 1.4, C.wood);
      c.put(0, y, 1, C.woodDark);
      break;
    }
    case 'stands': {
      // display pedestals with project models on top
      const models = [C.whaleBlue, C.cargoGreen, C.roofTerracotta, C.stone];
      for (let i = 0; i < 4; i++) {
        const x = -hx + 2 + i * 2;
        c.put(x, y, 0, C.wallCreamDark);
        c.put(x, y + 1, 0, C.wallCream);
        c.put(x, y + 2, 0, models[i % models.length]);
      }
      for (let x = -hx + 2; x <= hx - 2; x++) c.put(x, y + 3, back, C.woodDark);
      break;
    }
    case 'racks': {
      // server racks: dark cabinets with a blue status strip
      for (let i = 0; i < 2; i++) {
        const z = back + i * 2;
        for (let x = -hx + 1; x <= hx - 1; x++) {
          for (let yy = y; yy <= y + 2; yy++) {
            c.put(x, yy, z, (x + yy) & 1 ? C.containerFrame : C.stoneDark);
          }
        }
        for (let x = -hx + 1; x <= hx - 1; x++) c.putBox(x, y + 2.5, z + 0.51, 0.8, 0.2, 0.06, C.glass);
      }
      // a raised floor tile pattern
      for (let x = -hx + 1; x <= hx - 1; x += 2)
        for (let z = -hz + 1; z <= hz - 1; z++) c.put(x, y - 1, z, C.stone);
      break;
    }
    case 'benches': {
      // laboratory benches with sample racks
      for (const bx of [-1, 1]) {
        for (let x = -hx + 1; x <= hx - 1; x++) c.putBox(x, y + 0.6, bx * 2, 1, 0.5, 1.6, C.wallCream);
        for (let x = -hx + 1; x <= hx - 1; x += 2)
          c.putBox(x, y + 1.1, bx * 2, 0.4, 0.6, 0.4, (x + bx) & 1 ? C.whaleLight : C.cargoGreen);
      }
      for (let x = -hx + 2; x <= hx - 2; x++) c.put(x, y + 3, back, C.woodDark);
      break;
    }
    case 'hall': {
      // the welcome hall: a long counter and two display cabinets
      for (let x = -hx + 2; x <= hx - 2; x++) c.putBox(x, y + 0.6, -hz + 3, 1, 0.55, 2, C.wood);
      for (let x = -hx + 2; x <= hx - 2; x++) c.putBox(x, y + 0.9, -hz + 3, 1.02, 0.12, 2.06, C.woodLight);
      for (const sx of [-hx + 2, hx - 2]) {
        for (let yy = y; yy <= y + 2; yy++) c.put(sx, yy, back, C.glass);
      }
      break;
    }
  }
}

/**
 * Welcome Hall — the harbour's centrepiece: a broad, two-storey hall with a
 * blue roof, a columned porch and a wide entrance (ref 1).
 */
export function welcomeHall(c: Chunk, accent: number): void {
  house(c, {
    w: 13,
    d: 9,
    wallH: 5,
    roof: C.roofBlue,
    roofDark: C.roofBlueDark,
    decor: 'hall',
    accent,
    columns: true,
    twoStorey: true,
    chimney: false,
  });
  // rooftop lantern so the hall is identifiable from the water
  c.put(0, 12, 0, C.woodDark);
  c.putBox(0, 12.6, 0, 0.8, 0.7, 0.8, C.lantern);
  c.put(0, 13.2, 0, C.roofBlueDark);
}

/** Stepped lighthouse with terracotta bands and a lit gallery (ref 1). */
export function lighthouse(c: Chunk, height: number): void {
  // stone base
  for (let x = -3; x <= 3; x++)
    for (let z = -3; z <= 3; z++)
      if (Math.hypot(x, z) <= 3.2) c.put(x, 0, z, C.stone);
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++) c.put(x, 1, z, C.stoneDark);

  // shaft: alternating cream / terracotta bands, tapering by one block
  for (let y = 2; y < height; y++) {
    const half = y > height - 4 ? 1 : 2;
    const band = Math.floor((y - 2) / 2) % 2 === 0;
    const col = band ? C.wallCream : C.roofTerracotta;
    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        const edge = Math.abs(x) === half || Math.abs(z) === half;
        if (!edge && y !== 2) continue;
        c.put(x, y, z, col);
      }
    }
  }

  // gallery
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++)
      if (Math.abs(x) === 2 || Math.abs(z) === 2) c.put(x, height, z, C.woodDark);

  // lantern room — glass box with a warm core, then a roof cap
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      const edge = Math.abs(x) === 1 || Math.abs(z) === 1;
      c.put(x, height + 1, z, edge ? C.glass : C.lantern);
      c.put(x, height + 2, z, edge ? C.glass : C.lantern);
    }
  }
  for (let x = -2; x <= 2; x++)
    for (let z = -2; z <= 2; z++) c.put(x, height + 3, z, C.roofTerracottaDark);
  c.put(0, height + 4, 0, C.woodDark);
}

/**
 * Village gateway — purple stone pillars with a decorated lintel and a
 * welcome sign (brief 06). Seven blocks wide, three deep.
 */
export function gateway(c: Chunk, accent: number): void {
  for (const sx of [-3, 3]) {
    for (let y = 0; y < 4; y++) {
      for (let z = -1; z <= 1; z++) c.put(sx, y, z, y === 0 ? C.rockSideDark : C.rockSide);
    }
    // pillar caps
    for (let x = sx - 1; x <= sx + 1; x++)
      for (let z = -1; z <= 1; z++) c.put(x, 4, z, C.stone);
  }
  // lintel
  for (let x = -3; x <= 3; x++)
    for (let z = -1; z <= 1; z++) c.put(x, 5, z, C.rockSide);
  for (let x = -2; x <= 2; x++) c.put(x, 6, 0, C.stone);
  // welcome plaque
  for (let x = -2; x <= 2; x++) c.put(x, 6, 1, C.wallCream);
  for (let x = -1; x <= 1; x++) c.put(x, 6, 1, accent);
  c.putBox(0, 7.1, 0, 2.2, 0.3, 2.2, C.roofTerracotta);
  // lamps on the caps
  c.putBox(-3, 5.2, 0, 0.5, 0.6, 0.5, C.lantern);
  c.putBox(3, 5.2, 0, 0.5, 0.6, 0.5, C.lantern);
}

/**
 * Timber dock. `w` is the length along x, `d` the width along z, both in
 * blocks; the deck occupies local layer 0 so the caller can pin it to a fixed
 * world layer and match the harbour floor exactly.
 */
export function dock(c: Chunk, w: number, d: number, railSides: number[]): void {
  const hx = (w - 1) / 2;
  const hz = (d - 1) / 2;

  // planks, alternating two timber tones like the refs
  for (let x = -hx; x <= hx; x++) {
    for (let z = -hz; z <= hz; z++) {
      c.putBox(x, 0.45, z, 1, 0.9, 1, (x + z) & 1 ? C.wood : C.woodLight);
    }
  }
  // edge trim
  for (let x = -hx; x <= hx; x++) {
    c.putBox(x, 0.95, -hz, 1, 0.2, 1, C.woodDark);
    c.putBox(x, 0.95, hz, 1, 0.2, 1, C.woodDark);
  }
  for (let z = -hz; z <= hz; z++) {
    c.putBox(-hx, 0.95, z, 1, 0.2, 1, C.woodDark);
    c.putBox(hx, 0.95, z, 1, 0.2, 1, C.woodDark);
  }

  // pilings: two blocks below the deck, sitting in the water
  for (let x = -hx; x <= hx; x += 3) {
    for (const z of [-hz, hz]) {
      c.put(x, -1, z, C.woodDark);
      c.put(x, -2, z, C.woodDark);
    }
  }
  for (let z = -hz; z <= hz; z += 3) {
    for (const x of [-hx, hx]) {
      c.put(x, -1, z, C.woodDark);
      c.put(x, -2, z, C.woodDark);
    }
  }

  // rails on the requested sides (0 = -z, 2 = +z), posts every other block
  for (const side of railSides) {
    const z = side === 0 ? -hz : hz;
    for (let x = -hx; x <= hx; x++) {
      if (((x + hx) & 1) === 0) c.put(x, 1, z, C.woodDark);
      c.putBox(x, 1.6, z, 1, 0.16, 1, C.woodDark);
    }
  }
}
