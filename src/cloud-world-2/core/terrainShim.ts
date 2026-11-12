/**
 * Cloud World 2.0 — terrain adapter.
 *
 * Thin re-export surface matching the names world.ts assembles with. Keeps
 * the terrain module's generic (specs-first) API stable while giving the
 * assembler ergonomic call shapes.
 */

export { columnHeight, terrainBlocks, hash2, valueNoise } from './terrain';
import { surfaceY as rawSurfaceY } from './terrain';
import type { IslandSpec } from './types';

/** Walkable surface height (top of terrain) at (x, z), or null at sea. */
export function islandSurfaceYFn(specs: IslandSpec[], x: number, z: number): number | null {
  return rawSurfaceY(specs, x, z);
}
