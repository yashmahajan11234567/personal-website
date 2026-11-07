/**
 * Ocean — one InstancedMesh of flush 2x2 voxel tiles (ref 3).
 *
 * Every tile's colour is decided by its distance to the real coastline
 * (`shoreDistance`), so the turquoise lagoon, the mid-blue shelf and the deep
 * water always hug the generated geography. There are no waves: the refs are
 * calm, and flat tiles are what makes the water read as *voxel* rather than as
 * a shader.
 *
 * TILES MUST BE EXACTLY TILE x TILE. The first pass carried the tile size in
 * fields named `s` and `h`, while the instancing layer reads `sx/sy/sz` — so
 * every tile silently fell back to a unit cube at 2-unit spacing and the ocean
 * rendered as a grid of separated squares with the far-sea plane showing
 * through. A bathroom floor, not an ocean. Sizes are now explicit in all three
 * axes, with no aliasing between the producer and the consumer.
 *
 * The gentle motion is a shader-side vertical bob driven by instance position
 * (see VoxelMesh's `wave` flag), so nothing is recomputed per frame in JS.
 */
import { C } from './palette';
import { WATER_TOP, shoreDistance } from './terrain';
import { hash2 } from './noise';

export const TILE = 2;
export const OCEAN_COUNT_DESKTOP = 240;
export const OCEAN_COUNT_MOBILE = 140;

/** Flat disc that fills the sea from the tile grid out to the horizon. */
export const FAR_SEA_RADIUS = 780;
/** Sits just under the tile tops — coplanar would z-fight across the grid. */
export const FAR_SEA_Y = 0.5;

const TILE_THICKNESS = 0.62;

export interface OceanTile {
  /** centre */
  x: number;
  y: number;
  z: number;
  c: number;
  sx: number;
  sy: number;
  sz: number;
}

export function buildOcean(count: number = OCEAN_COUNT_DESKTOP): OceanTile[] {
  const out: OceanTile[] = [];
  const half = count / 2;
  const top = WATER_TOP;

  for (let i = 0; i < count; i++) {
    const cx = (i - half + 0.5) * TILE;
    for (let j = 0; j < count; j++) {
      const cz = (j - half + 0.5) * TILE;

      const pen = shoreDistance(cx, cz);
      if (pen < 0) continue; // the tile is on land

      let c: number;
      let sx = TILE;
      let sz = TILE;
      let sy = TILE_THICKNESS;
      const y = top - TILE_THICKNESS / 2;

      if (pen < 1.6) {
        // surf line: a narrow bright band right at the shore
        c = C.foam;
        sx = sz = TILE * 0.86;
      } else if (pen < 3.0) {
        c = C.oceanSurf;
      } else if (pen < 8) {
        c = C.oceanLagoon;
      } else if (pen < 16) {
        c = C.oceanShallow;
      } else if (pen < 34) {
        c = C.oceanMid;
      } else {
        // Open water. The checker is deliberately LOW contrast: ref 3 shows two
        // neighbouring blues, not a chequerboard, and high contrast at this
        // scale turns the sea into a tiled floor instead of water.
        c = (i + j) & 1 ? C.oceanDeep : C.oceanDeepAlt;
      }

      // Kelp tufts and lily pads, only in the shallows (ref 2).
      const d = hash2(i, j, 301);
      let finalY = y;
      if (pen > 2.4 && pen < 7 && d < 0.006) {
        c = C.leafLight;
        sx = sz = TILE * 0.5;
        sy = 0.22;
        finalY = top + 0.02;
      } else if (pen > 2.0 && pen < 5.5 && d >= 0.006 && d < 0.014) {
        c = C.leaf;
        sx = sz = TILE * 0.32;
        sy = 0.9;
        finalY = top + 0.45;
      }

      out.push({ x: cx, y: finalY, z: cz, c, sx, sy, sz });
    }
  }
  return out;
}
