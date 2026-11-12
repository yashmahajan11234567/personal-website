/**
 * Cloud World 2.0 — core types.
 *
 * Fresh type vocabulary for the greenfield implementation. Conventions:
 *   - 1 world unit = 1 voxel block = 1 metre.
 *   - A block's (x, z) is the CENTRE of an sx × sz box; y is also a centre.
 *   - Y grows up. Terrain is a heightfield; structures are solid blocks.
 */

/** One placed voxel block. sx/sy/sz default to 1 (full cube). */
export interface Block {
  x: number;
  y: number;
  z: number;
  c: number; // palette colour (hex int)
  sx?: number;
  sy?: number;
  sz?: number;
}

export type BlockList = Block[];

/** Axis-aligned rectangle in the ground plane, inclusive integer bounds. */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** A walkable pier/deck surface, independent of terrain. */
export interface Deck extends Rect {
  y: number; // walkable surface height (top of planks)
  label: string;
}

/** Where the whale moors, just off a dock's outer end. */
export interface Berth {
  x: number;
  z: number;
  heading: number;
  dockLabel: string;
  label: string;
}

/** Island heightfield specification — procedural, seeded. */
export interface IslandSpec {
  id: string;
  label: string;
  cx: number;
  cz: number;
  r: number;
  seed: number;
  wobble: number;
}

/** Interaction hotspot: a proximity + click target anchored to world space. */
export interface Hotspot {
  id: string;
  panelId: string;
  label: string;
  x: number;
  y: number;
  z: number;
  /** walk-in interaction radius (E key) */
  r: number;
}

/** Floating village label rendered as an HTML billboard. */
export interface WorldLabel {
  label: string;
  x: number;
  y: number;
  z: number;
  accent: number;
}

/** A clickable interaction zone shape (box proxy for hover raycast). */
export interface ClickProxy {
  hotspotId: string;
  x: number;
  y: number;
  z: number;
  /** half-extents of the click box (blocks) */
  hx: number;
  hy: number;
  hz: number;
}

/** Which of the three character cosmetic variants is worn. */
export type CharacterVariant = 'arrival' | 'explorer' | 'traveller';

/** Whale animation state machine states. */
export type WhaleState = 'docked' | 'sailing';

/** Movement mode: on foot, or aboard the whale. */
export type PilotMode = 'walk' | 'boat';
