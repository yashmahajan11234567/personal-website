/**
 * Cloud World 2.0 — character controller: fixed-step physics (60 Hz).
 *
 * Fresh implementation. Motion model:
 *   fixed step  physics integrates on a 60 Hz accumulator; jump arcs are
 *               identical at 30 and 144 fps.
 *   gravity     velY drives vertical motion; terrain only supplies the floor.
 *   stepping    a 1-block terrace climbs instantly (STEP_UP), anything taller
 *               blocks the axis; axis-by-axis slide keeps you moving along a
 *               cliff instead of stopping dead.
 *   buffering   jump pressed ≤120 ms early fires on landing; ≤100 ms after
 *               leaving a ledge still fires (coyote).
 *   click-move  a ground click paths there; any manual input cancels.
 *
 * Render vs physics: physics Y snaps (collision stays honest); render Y eases
 * only when grounded. Squash and landing impact are render-side only.
 */

import { useInteraction } from '../gameplay/store';
import { islandAt, nearestShoreIsland, surfaceY, shoreDistance } from '../core/terrain';
import { VILLAGE_ZONE } from '../core/world';
import { CHAR, keys, input, pilot, boatPose, view } from './state';
import { canSailTo, DECKS, ISLANDS, SPAWN } from '../core/registry';
import { floorBelow, makeFloorAt, tryMove } from './collision';
import { findPath } from './navigation';

const STEP = 1 / 60;
const ARRIVE = 0.9;

export interface WorldQueries {
  terrainY: (x: number, z: number) => number | null;
}

let floorAt: ((x: number, z: number) => number | null) | null = null;

export function bindWorldQueries(terrainY: (x: number, z: number) => number | null): void {
  floorAt = makeFloorAt(terrainY, DECKS);
}

/** Zone label for the HUD — derived from position, published on change. */
function currentZone(): string {
  if (pilot.mode === 'boat') return 'At sea — Docker Whale';
  const isl = islandAt(ISLANDS, pilot.pos.x, pilot.pos.z) ?? nearestShoreIsland(ISLANDS, pilot.pos.x, pilot.pos.z, 24);
  let zone = isl ? isl.label : 'At sea';
  if (zone === 'Welcome Harbour' && Math.abs(pilot.pos.x - VILLAGE_ZONE.x) < 17 && Math.abs(pilot.pos.z - VILLAGE_ZONE.z) < 17) {
    zone = 'Portfolio Village';
  }
  return zone;
}

let lastZone = '';

function publishZone(): void {
  const zone = currentZone();
  if (zone !== lastZone) {
    lastZone = zone;
    useInteraction.getState().setZone(zone);
  }
}

/** Advance the whole simulation one fixed step. Called from useFrame. */
export function stepPhysics(): void {
  pilot.simTime += STEP;

  /* ---- 1. read intent -------------------------------------------------- */
  let ix = 0;
  let iz = 0;
  if (keys['w'] || keys['arrowup']) iz -= 1;
  if (keys['s'] || keys['arrowdown']) iz += 1;
  if (keys['a'] || keys['arrowleft']) ix -= 1;
  if (keys['d'] || keys['arrowright']) ix += 1;
  if (input.active) {
    ix += input.x;
    iz += input.z;
  }
  const manual = Math.hypot(ix, iz) > 0.05;
  const run = !!keys['shift'] || input.run;

  /* jump edge → buffer */
  const jumpDown = !!keys[' '];
  pilot.jumpBuffer = Math.max(0, pilot.jumpBuffer - STEP);
  pilot.coyote = Math.max(0, pilot.coyote - STEP);
  if (jumpDown && !pilot._prevJump) pilot.jumpBuffer = CHAR.JUMP_BUFFER;
  pilot._prevJump = jumpDown;

  /* ---- 2. click-to-move: manual input always wins ---------------------- */
  if (manual) {
    pilot.moveTarget = null;
    pilot.path = null;
  } else if (pilot.moveTarget && pilot.mode === 'walk' && floorAt) {
    let tx = pilot.moveTarget.x;
    let tz = pilot.moveTarget.z;
    let aimX = tx;
    let aimZ = tz;
    if (pilot.path && pilot.path.length > 0) {
      const wp = pilot.path[Math.min(pilot.pathIndex, pilot.path.length - 1)];
      tx = wp.x;
      tz = wp.z;
      aimX = tx;
      aimZ = tz;
      const dwp = Math.hypot(wp.x - pilot.pos.x, wp.z - pilot.pos.z);
      if (dwp <= ARRIVE && pilot.pathIndex < pilot.path.length - 1) {
        pilot.pathIndex += 1;
        const next = pilot.path[pilot.pathIndex];
        tx = next.x;
        tz = next.z;
        aimX = tx;
        aimZ = tz;
      }
      // segment projection: get back ON the validated line before closing
      if (pilot.pathIndex > 0) {
        const prev = pilot.path[pilot.pathIndex - 1];
        const sx = tx - prev.x;
        const sz = tz - prev.z;
        const len2 = sx * sx + sz * sz || 1;
        let t = ((pilot.pos.x - prev.x) * sx + (pilot.pos.z - prev.z) * sz) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = prev.x + sx * t;
        const pz = prev.z + sz * t;
        if ((pilot.pos.x - px) * sx + (pilot.pos.z - pz) * sz < -0.05) {
          aimX = px;
          aimZ = pz;
        }
      }
    }
    const d = Math.hypot(tx - pilot.pos.x, tz - pilot.pos.z);
    const adx = aimX - pilot.pos.x;
    const adz = aimZ - pilot.pos.z;
    const ad = Math.hypot(adx, adz);
    const lastLeg = !pilot.path || pilot.pathIndex >= pilot.path.length - 1;
    if (d <= ARRIVE && lastLeg && aimX === tx && aimZ === tz) {
      if (pilot.retreatGoal) {
        const goal = pilot.retreatGoal;
        pilot.retreatGoal = null;
        const route = findPath({ x: pilot.pos.x, z: pilot.pos.z }, goal, routeTerrainY);
        if (route.ok && route.points.length > 0) {
          pilot.path = route.points;
          pilot.pathIndex = 0;
          const last = route.points[route.points.length - 1];
          pilot.moveTarget = { x: last.x, z: last.z };
          pilot.lastPathDist = null;
        } else {
          pilot.moveTarget = null;
          pilot.path = null;
        }
      } else {
        pilot.moveTarget = null;
        pilot.path = null;
      }
    } else if (ad > 1e-6) {
      ix = adx / ad;
      iz = adz / ad;
    }

    /* stuck detection: re-plan, then back out, then give up cleanly */
    if (pilot.moveTarget) {
      if (pilot.lastPathDist !== null && d > pilot.lastPathDist - 0.005) {
        pilot.pathStuck += STEP;
      } else {
        pilot.pathStuck = 0;
        pilot.replanCount = 0;
        pilot.retreatCount = 0;
      }
      pilot.lastPathDist = d;
      if (pilot.pathStuck > 0.6) {
        pilot.pathStuck = 0;
        if (pilot.retreatGoal) {
          pilot.moveTarget = null;
          pilot.path = null;
          pilot.retreatGoal = null;
          pilot.replanCount = 0;
        } else {
          pilot.replanCount += 1;
          if (pilot.replanCount >= 2) {
            if (pilot.retreatCount >= 3) {
              pilot.moveTarget = null;
              pilot.path = null;
              pilot.retreatGoal = null;
              pilot.replanCount = 0;
            } else {
              const back = pilot.path && pilot.pathIndex > 0 ? pilot.path[pilot.pathIndex - 1] : null;
              if (back) {
                pilot.retreatGoal = { x: pilot.moveTarget.x, z: pilot.moveTarget.z };
                pilot.retreatCount += 1;
                pilot.moveTarget = { x: back.x, z: back.z };
                pilot.path = null;
                pilot.pathIndex = 0;
              } else {
                pilot.moveTarget = null;
                pilot.path = null;
              }
              pilot.replanCount = 0;
            }
          } else {
            const goal = pilot.moveTarget;
            const route = findPath({ x: pilot.pos.x, z: pilot.pos.z }, goal, routeTerrainY);
            if (route.ok && route.points.length > 0) {
              pilot.path = route.points;
              pilot.pathIndex = 0;
            } else {
              pilot.moveTarget = null;
              pilot.path = null;
            }
          }
        }
      }
    }
  }

  const len = Math.hypot(ix, iz);
  pilot.running = run && len > 0.05;
  pilot.moving = len > 0.05;

  /* ---- 3. boarding / disembark glide ----------------------------------- */
  if (pilot.boardFrom) {
    if (pilot.mode === 'walk' && pilot.moving) {
      pilot.boardFrom = null;
    } else {
      pilot.boardFrom.t += STEP / CHAR.BOARD_GLIDE;
      const k = Math.min(1, pilot.boardFrom.t);
      const e = k * k * (3 - 2 * k);
      pilot.pos.x = pilot.boardFrom.x + (pilot.boatPos.x - pilot.boardFrom.x) * e;
      pilot.pos.z = pilot.boardFrom.z + (pilot.boatPos.z - pilot.boardFrom.z) * e;
      if (k >= 1) pilot.boardFrom = null;
    }
  }

  if (pilot.mode === 'walk') {
    /* ---- 4. horizontal: camera-relative, axis slide, step-up ----------- */
    if (pilot.moving && floorAt) {
      const nx0 = ix / len;
      const nz0 = iz / len;
      const wx = view.camRight.x * nx0 + view.camFwd.x * -nz0;
      const wz = view.camRight.z * nx0 + view.camFwd.z * -nz0;
      const speed = pilot.running ? CHAR.RUN_SPEED : CHAR.WALK_SPEED;
      const nx = pilot.pos.x + wx * speed * STEP;
      const nz = pilot.pos.z + wz * speed * STEP;

      const tol = pilot.grounded ? CHAR.STEP_UP : 0.06;
      const feet = pilot.pos.y;

      const m3 = tryMove(feet, nx, nz, floorAt, tol);
      const m1 = tryMove(feet, nx, pilot.pos.z, floorAt, tol);
      const m2 = tryMove(feet, pilot.pos.x, nz, floorAt, tol);
      if (m3.ok) {
        pilot.pos.x = nx;
        pilot.pos.z = nz;
        if (pilot.grounded) pilot.pos.y = m3.y;
      } else if (m1.ok) {
        pilot.pos.x = nx;
        if (pilot.grounded) pilot.pos.y = m1.y;
      } else if (m2.ok) {
        pilot.pos.z = nz;
        if (pilot.grounded) pilot.pos.y = m2.y;
      } else {
        pilot.moveTarget = null;
        pilot.path = null;
      }
      pilot.heading = Math.atan2(wx, wz);
      pilot.stride += speed * STEP * 2.6;
    }

    /* ---- 5. vertical: gravity, landing, jump --------------------------- */
    if (floorAt) {
      const floorY = floorBelow(pilot.pos.x, pilot.pos.z, pilot.pos.y + 0.01, floorAt) ?? pilot.pos.y;

      if (pilot.grounded) {
        if (pilot.pos.y - floorY > 0.12) {
          pilot.grounded = false;
          pilot.coyote = CHAR.COYOTE;
        } else {
          pilot.pos.y = floorY;
        }
      }

      if (!pilot.grounded) {
        pilot.velY -= CHAR.GRAVITY * STEP;
        pilot.pos.y += pilot.velY * STEP;
        if (pilot.pos.y <= floorY) {
          pilot.landImpact = Math.min(1, Math.abs(pilot.velY) / 12);
          pilot.pos.y = floorY;
          pilot.velY = 0;
          pilot.grounded = true;
        }
      }

      if (pilot.jumpBuffer > 0 && (pilot.grounded || pilot.coyote > 0)) {
        pilot.velY = CHAR.JUMP_V;
        pilot.grounded = false;
        pilot.coyote = 0;
        pilot.jumpBuffer = 0;
      }
    }
  } else {
    /* ---- sailing ------------------------------------------------------- */
    const speed = pilot.running ? CHAR.BOAT_RUN_SPEED : CHAR.BOAT_SPEED;
    if (pilot.moving) {
      const nx0 = ix / len;
      const nz0 = iz / len;
      const wx = view.camRight.x * nx0 + view.camFwd.x * -nz0;
      const wz = view.camRight.z * nx0 + view.camFwd.z * -nz0;
      const nx = pilot.boatPos.x + wx * speed * STEP;
      const nz = pilot.boatPos.z + wz * speed * STEP;
      if (canSailTo(nx, pilot.boatPos.z, shoreDistanceFn)) pilot.boatPos.x = nx;
      if (canSailTo(pilot.boatPos.x, nz, shoreDistanceFn)) pilot.boatPos.z = nz;
      pilot.boatHeading = Math.atan2(wx, wz);
      pilot.heading = pilot.boatHeading;
      pilot.stride += speed * STEP * 1.1;
    }
    pilot.pos.set(pilot.boatPos.x, boatPose.worldY + boatPose.deckY, pilot.boatPos.z);
    pilot.grounded = true;
    pilot.velY = 0;
    pilot.moveTarget = null;
  }
}

/* terrain shim for pathfinding (recomputed per call — the grid is cached) */
function routeTerrainY(x: number, z: number): number | null {
  return surfaceY(ISLANDS, x, z);
}

function shoreDistanceFn(x: number, z: number): number {
  return shoreDistance(ISLANDS, x, z);
}

/** Publish zone each frame — call from the render loop. */
export function publishZoneFrame(): void {
  publishZone();
}

/** Boot the character onto the actual terrain surface. */
export function placePilotAtSpawn(terrainY: (x: number, z: number) => number | null): void {
  const y = terrainY(SPAWN.x, SPAWN.z) ?? 2;
  pilot.pos.set(SPAWN.x, y, SPAWN.z);
  pilot.visualY = y;
  pilot.grounded = true;
  pilot.velY = 0;
  pilot.moveTarget = null;
  pilot.path = null;
}
