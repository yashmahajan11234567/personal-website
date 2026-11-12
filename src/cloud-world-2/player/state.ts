/**
 * Cloud World 2.0 — shared player + input state.
 *
 * A fresh module owned by the new implementation. Plain mutable objects (not
 * React state) because the fixed-step physics loop reads/writes them 60× per
 * second; React components subscribe to the zustand interaction store instead
 * (see gameplay/store.ts) so UI updates are event-driven, never polled.
 */

import * as THREE from 'three';
import type { CharacterVariant, PilotMode } from '../core/types';
import { SPAWN } from '../core/registry';

/** The visitor: position, motion and mode. */
export interface Pilot {
  mode: PilotMode;
  /** feet position on land; deck position while aboard */
  pos: THREE.Vector3;
  /** render-side eased Y so terraces glide (physics Y snaps) */
  visualY: number;
  /** whale position while sailing */
  boatPos: THREE.Vector3;
  heading: number;
  boatHeading: number;
  moving: boolean;
  running: boolean;
  /** walk-cycle phase advanced by distance travelled */
  stride: number;
  /** non-null while gliding from a pier onto the whale deck (and back) */
  boardFrom: { x: number; z: number; t: number } | null;

  /* vertical physics */
  velY: number;
  grounded: boolean;
  jumpBuffer: number;
  coyote: number;
  /** 0..1 landing impulse for squash feel, decayed by the renderer */
  landImpact: number;

  /* click-to-move */
  moveTarget: { x: number; z: number } | null;
  path: { x: number; z: number }[] | null;
  pathIndex: number;
  pathStuck: number;
  replanCount: number;
  retreatGoal: { x: number; z: number } | null;
  retreatCount: number;
  lastPathDist: number | null;

  /* cosmetic + sim clock */
  variant: CharacterVariant;
  simTime: number;
  /** previous-frame jump key state for edge detection (internal) */
  _prevJump: boolean;
}

const spawnY = 2; // spawn shore is layer-0 terrain → surface 1… refined by world at boot

export const pilot: Pilot = {
  mode: 'walk',
  pos: new THREE.Vector3(SPAWN.x, spawnY, SPAWN.z),
  visualY: spawnY,
  boatPos: new THREE.Vector3(-22, 0, -47.5),
  heading: SPAWN.heading,
  boatHeading: Math.PI / 2,
  moving: false,
  running: false,
  stride: 0,
  boardFrom: null,
  velY: 0,
  grounded: true,
  jumpBuffer: 0,
  coyote: 0,
  landImpact: 0,
  moveTarget: null,
  path: null,
  pathIndex: 0,
  pathStuck: 0,
  replanCount: 0,
  retreatGoal: null,
  retreatCount: 0,
  lastPathDist: null,
  variant: 'traveller',
  simTime: 0,
  _prevJump: false,
};

/** Keyboard state, written by the canvas key handlers. */
export const keys: Record<string, boolean> = {};

/** Analog touch input, written only by the touch controls. */
export const input = { x: 0, z: 0, run: false, active: false };

/** Presentation state read by the camera, HUD and minimap. */
export const view = {
  zoom: 1,
  /** 0 on land, 1 at sea — blended, never snapped */
  sea: 0,
  orbit: 0,
  pitch: 0.18,
  camFwd: { x: 0, z: -1 },
  camRight: { x: 1, z: 0 },
  ready: false,
  /** night lighting rig toggle (DEC-002: full toggle, demo runs sunset) */
  night: false,
};

/** Written by the whale each frame; read by the character while aboard. */
export const boatPose = { worldY: 0, deckY: 1.8 };

/** Character world constants (doc 05 §1.4 — locked). */
export const CHAR = {
  WALK_SPEED: 4.6,
  RUN_SPEED: 8.4,
  GRAVITY: 26,
  JUMP_V: 8.5,
  JUMP_BUFFER: 0.12,
  COYOTE: 0.1,
  STEP_UP: 1.15,
  RADIUS: 0.3,
  HEIGHT: 1.7,
  BODY_H: 1.7,
  BOAT_SPEED: 8.5,
  BOAT_RUN_SPEED: 13,
  BOARD_GLIDE: 0.55,
} as const;
