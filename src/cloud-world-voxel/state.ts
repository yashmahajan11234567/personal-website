/**
 * Shared player state.
 *
 * Kept in its own module so the renderer, the controller, the camera and the
 * HTML overlays can all read the same object without importing each other —
 * the v2 implementation had the overlay importing the character, which is how
 * a circular import gets introduced the first time anything moves.
 */
import * as THREE from 'three';
import { SPAWN, walkableHeight } from './world';

export interface Pilot {
  mode: 'walk' | 'boat';
  /** world position of the character (or of the deck position while aboard) */
  pos: THREE.Vector3;
  /** smoothed vertical position, so terraces do not snap */
  visualY: number;
  boatPos: THREE.Vector3;
  heading: number;
  boatHeading: number;
  moving: boolean;
  running: boolean;
  /** walk-cycle phase, advanced by distance travelled */
  stride: number;
}

const spawnY = walkableHeight(SPAWN.x, SPAWN.z) ?? 2;

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
};

/** Analog input, written only by the touch controls. */
export const input = { x: 0, z: 0, run: false, active: false };

/** Keyboard state. */
export const keys: Record<string, boolean> = {};

/** Presentation state read by the camera and the HUD. */
export const view = {
  /** user zoom multiplier */
  zoom: 1,
  /** 0 on land, 1 at sea — blended, never snapped */
  sea: 0,
  /** camera orbit yaw, driven by dragging */
  orbit: 0,
  /** set by the loader once the first frame has rendered */
  ready: false,
};

/**
 * Written by the whale every frame, read by the character: while the visitor is
 * aboard, their feet sit on the whale's deck, and the whale bobs.
 */
export const boatPose = { worldY: 0, deckY: 1.8 };
