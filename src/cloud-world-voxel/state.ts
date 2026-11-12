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
  /** while non-null, the character is easing from this point onto the whale deck */
  boardFrom: { x: number; z: number; t: number } | null;

  /* ---- vertical physics (T1) ---- */
  /** vertical velocity, blocks/second; positive is up */
  velY: number;
  /** true while standing on terrain or a deck */
  grounded: boolean;
  /** seconds remaining in which a jump press is remembered (input buffering) */
  jumpBuffer: number;
  /** seconds remaining after walking off an edge where a jump still works */
  coyote: number;
  /** 0..1 impulse set on touchdown, decayed by the renderer for landing feel */
  landImpact: number;
  /** click-to-move destination in the ground plane; null when not pathing */
  moveTarget: { x: number; z: number } | null;
  /** planned A* route for click-to-move, consumed waypoint-by-waypoint */
  path: { x: number; z: number }[] | null;
  /** index of the waypoint currently being walked toward */
  pathIndex: number;
  /** seconds the route has made no progress (triggers a re-plan) */
  pathStuck: number;
  /** consecutive no-progress re-plans (triggers a retreat) */
  replanCount: number;
  /** original destination preserved while the character backs out of a pinch */
  retreatGoal: { x: number; z: number } | null;
  /** completed backing-out manoeuvres for the current order (caps the cycle) */
  retreatCount: number;
  /** distance to the active waypoint at the previous physics step */
  lastPathDist: number | null;
  /** seconds of simulated time elapsed — lets tests measure speed independent of frame rate */
  simTime: number;
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
  simTime: 0,
};

/** True when the OS asks for reduced motion; infinite ambient animation is gated on this. */
export const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  /** camera pitch in radians, driven by dragging vertically (third-person look) */
  pitch: 0.42,
  /** camera ground-plane forward/right (unit vectors in xz), refreshed by CameraRig */
  camFwd: { x: 0, z: -1 },
  camRight: { x: 1, z: 0 },
  /** true while the pointer is locked (first-person look active) */
  pointerLocked: false,
  /** set by the loader once the first frame has rendered */
  ready: false,
};

/**
 * Written by the whale every frame, read by the character: while the visitor is
 * aboard, their feet sit on the whale's deck, and the whale bobs.
 */
export const boatPose = { worldY: 0, deckY: 1.8 };
