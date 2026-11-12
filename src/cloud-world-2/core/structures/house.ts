/**
 * Cloud World 2.0 — Project House structure builder.
 * 3 distinct timber houses with different roof shapes, landmarks, and interior dressing.
 */

import { Chunk } from '../voxel/builder';
import { P } from '../palette';
import type { HouseSpec } from '../registry';
import { gableRoof, hipRoof } from '../voxel/builder';

/**
 * Build a project house from a HouseSpec.
 * @param c Chunk to mutate
 * @param spec HouseSpec defining dimensions, roof, landmark, and interior theme
 *
 * Timber house: w x d footprint, wallH tall.
 * wallCream walls, woodDark corner posts + horizontal beam at wallH.
 * Roof per spec.roofShape: 'gable' uses gableRoof, 'hip' uses hipRoof.
 * Open front: 3-wide 2-high doorway centred on front face.
 * Interior floor at wallH-1 level visible.
 * Interior dressing per project:
 *   - go-microservices: shelves (woodDark slabs x2 rows on back wall) + emissiveCyan wireframe cube
 *   - rxverify: 2 display stands (fence posts + flowerYellow) + blue banner (awningBlue 2x3 vertical)
 *   - devops-masterclass: 2 server racks (containerFrame + emissiveCyan) + purple poster + whale poster
 * Landmark per spec: 'flag' (woodDark pole 4 high + accent wool + flag) or 'antenna' (pole 5 high + emissiveCyan tip)
 * 2 lanterns flanking door, 2 windows on side walls, chimney for go + rxverify.
 */
export function buildHouse(c: Chunk, spec: HouseSpec): void {
  const w = spec.width; // 9
  const d = spec.depth; // 7
  const wallH = spec.wallH; // 4
  const halfW = Math.floor(w / 2); // 4
  const halfD = Math.floor(d / 2); // 3

  // Foundation: stoneDark ring at y=0
  for (let x = -halfW; x <= halfW; x++) {
    for (let z = -halfD; z <= halfD; z++) {
      if (x !== -halfW && x !== halfW && z !== -halfD && z !== halfD) continue;
      c.put(x, 0.5, z, P.stoneDark);
    }
  }

  // Floor at y=1 (wood planks)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    for (let z = -halfD + 1; z <= halfD - 1; z++) {
      c.put(x, 1, z, P.woodLight, 1, 0.2, 1);
    }
  }

  // Corner posts (woodDark) full height to wallH
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

  // Horizontal beam at wallH level (top of walls)
  for (let x = -halfW; x <= halfW; x++) {
    c.put(x, wallH, -halfD, P.woodDark, 1, 0.3, 0.4); // front beam
    c.put(x, wallH, halfD, P.woodDark, 1, 0.3, 0.4); // back beam
  }
  for (let z = -halfD; z <= halfD; z++) {
    c.put(-halfW, wallH, z, P.woodDark, 0.4, 0.3, 1); // left beam
    c.put(halfW, wallH, z, P.woodDark, 0.4, 0.3, 1); // right beam
  }

  // Walls: wallCream infill between posts
  // Front wall (z = -halfD) - with 3-wide 2-high doorway centred
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    for (let y = 1; y <= wallH; y++) {
      // Doorway: x in [-1, 1] (3 wide), y in [1, 2] (2 high)
      const inDoorway = x >= -1 && x <= 1 && y <= 2;
      if (inDoorway) continue;
      c.put(x, y, -halfD, P.wallCream);
    }
  }

  // Back wall (z = halfD)
  for (let x = -halfW + 1; x <= halfW - 1; x++) {
    for (let y = 1; y <= wallH; y++) {
      c.put(x, y, halfD, P.wallCream);
    }
  }

  // Side walls (x = ±halfW) - with 2 windows each
  for (let z = -halfD + 1; z <= halfD - 1; z++) {
    for (let y = 1; y <= wallH; y++) {
      // Window positions: z = -1 and z = 1 (centred-ish), y = 2 (mid height)
      const isWindow = (z === -1 || z === 1) && y === 2;
      if (isWindow) {
        // Glass with wallCreamDark frame
        c.put(-halfW, y, z, P.glassDark, 0.3, 1, 1);
        c.put(-halfW, y, z, P.glass, 0.2, 0.8, 0.8);
        c.put(halfW, y, z, P.glassDark, 0.3, 1, 1);
        c.put(halfW, y, z, P.glass, 0.2, 0.8, 0.8);
      } else {
        c.put(-halfW, y, z, P.wallCream);
        c.put(halfW, y, z, P.wallCream);
      }
    }
  }

  // Roof
  const roofY = wallH;
  if (spec.roofShape === 'gable') {
    gableRoof(c, -halfW, halfW, -halfD, halfD, roofY, spec.roof, spec.roofDark);
  } else {
    hipRoof(c, -halfW, halfW, -halfD, halfD, roofY, spec.roof, spec.roofDark);
  }

  // Chimney for go-microservices and rxverify (spec.id check)
  if (spec.id === 'house-go' || spec.id === 'house-rxverify') {
    // Chimney at back-right corner of roof (x=halfW-1, z=halfD-1)
    const cx = halfW - 1;
    const cz = halfD - 1;
    // StoneDark column 2 above roof ridge
    c.put(cx, wallH + 2, cz, P.stoneDark);
    c.put(cx, wallH + 3, cz, P.stoneDark);
    // Cap
    c.put(cx, wallH + 3.5, cz, P.stone, 1, 0.5, 1);
  }

  // Landmark
  buildLandmark(c, spec, halfW, halfD, wallH);

  // 2 lanterns flanking door (at x = -2 and x = 2, y=2.25 post + lantern at y=3.25)
  const lanternX = [-2, 2];
  lanternX.forEach((x) => {
    c.put(x, 2.25, -halfD + 0.3, P.woodDark, 0.3, 1.5, 0.3); // post
    c.put(x, 3.25, -halfD + 0.3, P.lantern, 0.5, 0.5, 0.5); // lantern
    c.put(x, 3.25, -halfD + 0.3, P.lanternGlow, 0.3, 0.3, 0.3); // glow
  });

  // Interior dressing (floor at y=1 already done, interior visible through doorway)
  buildInterior(c, spec, halfW, halfD, wallH);
}

/**
 * Build landmark: flag or antenna at front corner.
 */
function buildLandmark(c: Chunk, spec: HouseSpec, halfW: number, halfD: number, _wallH: number): void {
  // Front-right corner (x=halfW, z=-halfD)
  const lx = halfW;
  const lz = -halfD;

  if (spec.landmark === 'flag') {
    // WoodDark pole 4 high
    for (let y = 1; y <= 4; y++) {
      c.put(lx, _wallH + y, lz, P.woodDark, 0.3, 1, 0.3);
    }
    // Accent wool block 1x1 at top
    c.put(lx, _wallH + 4.5, lz, spec.accent, 1, 1, 1);
    // Smaller flag block above
    c.put(lx + 0.8, _wallH + 5, lz, spec.accent, 1.5, 1, 0.2);
  } else if (spec.landmark === 'antenna') {
    // WoodDark pole 5 high
    for (let y = 1; y <= 5; y++) {
      c.put(lx, _wallH + y, lz, P.woodDark, 0.3, 1, 0.3);
    }
    // EmissiveCyan 0.5 cube on tip
    c.put(lx, _wallH + 5.5, lz, P.emissiveCyan, 0.5, 0.5, 0.5);
  }
}

/**
 * Build interior dressing per project theme.
 */
function buildInterior(c: Chunk, spec: HouseSpec, halfW: number, halfD: number, wallH: number): void {
  // Interior floor level is y=1 (already done)
  // Back wall is at z = halfD

  switch (spec.id) {
    case 'house-go': {
      // go-microservices: shelves (woodDark slabs x2 rows on back wall) + emissiveCyan wireframe cube
      // Shelf rows at y=2 and y=3, along back wall (z = halfD - 0.5)
      for (let row = 0; row < 2; row++) {
        const shelfY = 2 + row;
        for (let x = -halfW + 1; x <= halfW - 1; x++) {
          c.put(x, shelfY, halfD - 0.5, P.woodDark, 1, 0.2, 0.8);
        }
      }
      // EmissiveCyan wireframe-ish cube at centre of room (0, 2.5, 0)
      // Cube with stoneDark corner posts
      const cubeSize = 0.8;
      c.putBox(-cubeSize / 2, 2.5, -cubeSize / 2, cubeSize, cubeSize, cubeSize, P.emissiveCyan);
      // Corner posts (stoneDark)
      for (let px of [-cubeSize / 2, cubeSize / 2]) {
        for (let pz of [-cubeSize / 2, cubeSize / 2]) {
          c.put(px, 2.5, pz, P.stoneDark, 0.2, cubeSize, 0.2);
        }
      }
      break;
    }
    case 'house-rxverify': {
      // rxverify: 2 display stands (fence posts + flowerYellow on top) + blue banner (awningBlue 2x3 vertical)
      // Display stands at x = -2 and x = 2, on floor y=1.5
      [-2, 2].forEach((x) => {
        // Fence post (woodDark)
        c.put(x, 1.5, 0, P.woodDark, 0.3, 1.5, 0.3);
        // flowerYellow block on top
        c.put(x, 2.5, 0, P.flowerYellow, 0.6, 0.6, 0.6);
      });
      // Blue banner on front wall beside door (awningBlue 2x3 vertical cloth)
      // Front wall at z = -halfD, banner at x = 2..3 (right of door), y=1..3
      for (let y = 1; y <= 3; y++) {
        for (let x = 2; x <= 3; x++) {
          c.put(x, y, -halfD + 0.1, P.awningBlue, 1, 1, 0.2);
        }
      }
      break;
    }
    case 'house-devops': {
      // devops-masterclass: 2 server racks (containerFrame 1x2 stacks with emissiveCyan 0.3 cubes)
      // Rack 1 at back-left, Rack 2 at back-right
      const rackPositions = [
        { x: -halfW + 1.5, z: halfD - 1.5 },
        { x: halfW - 1.5, z: halfD - 1.5 },
      ];
      rackPositions.forEach(({ x, z }) => {
        // Base frame
        c.put(x, 1.5, z, P.containerFrame, 1, 2, 1);
        // EmissiveCyan cubes inside (0.3 cubes)
        c.put(x, 1.8, z, P.emissiveCyan, 0.3, 0.3, 0.3);
        c.put(x, 2.5, z, P.emissiveCyan, 0.3, 0.3, 0.3);
      });
      // Purple poster (flowerPurple 1x2 on side wall) - left side wall (x=-halfW)
      c.put(-halfW + 0.1, 2, 0, P.flowerPurple, 0.2, 2, 1);
      // Docker-whale poster (whaleBlue 2x1 on other side wall) - right side wall (x=halfW)
      c.put(halfW - 0.1, 2, 0, P.whaleBlue, 0.2, 1, 2);
      break;
    }
  }
}