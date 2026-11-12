/** The visitor: controller + voxel body.
 *
 * MOTION MODEL (third-person action, per input-systems / camera-systems /
 * game-feel skills):
 *
 *   fixed step  physics integrates on a fixed 60 Hz accumulator so jump arcs
 *               are identical at 30 and 144 fps.
 *   gravity     velY drives vertical motion; terrain only supplies the floor.
 *               Jumping is therefore a real ballistic arc, not a tween.
 *   stepping    walking into a 1-block terrace climbs it instantly (voxel
 *               step-up), anything taller blocks the axis. Axis-by-axis slide
 *               keeps you moving along a cliff instead of stopping dead.
 *   buffering   a jump pressed up to 120 ms early fires on landing; a jump
 *               pressed up to 100 ms after leaving a ledge still fires
 *               (coyote time). Both are the standard forgiveness windows.
 *   click-move  a ground click sets moveTarget; the controller paths there and
 *               any manual input cancels the order immediately.
 *
 * RENDER vs PHYSICS: physics Y snaps (collision stays honest), and the render
 * Y eases only when grounded, so terraces glide but jumps stay crisp. Squash
 * and landing impact are render-side only — they never touch collision.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot, keys, input, boatPose, view } from './state';
import { canSailTo, VILLAGE_ORIGIN } from './world';
import { islandAt, nearestShoreIsland } from './terrain';
import { STEP_UP, tryMove, floorBelow } from './collision';
import { findPath } from './navigation';
import { useInteraction } from './interactionStore';

const WALK_SPEED = 4.6;
const RUN_SPEED = 8.4;
const STEP = 1 / 60;

const GRAVITY = 26;
const JUMP_V = 8.5; // apex ≈ 1.39 blocks
const JUMP_BUFFER = 0.12;
const COYOTE = 0.1;
const ARRIVE = 0.9;

const BODY_H = 1.7; // character height, blocks

export function VoxelCharacter() {
  const acc = useRef(0);
  const lastZone = useRef('Starting Island');
  const prevJump = useRef(false);
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  /** Publish the zone label to the HUD store, but only when it actually changes. */
  function publishZone(): void {
    let zone: string;
    if (pilot.mode === 'boat') {
      zone = 'At sea — Docker Whale';
    } else {
      // piers/jetties sit over water: credit them to the island they serve
      const isl =
        islandAt(pilot.pos.x, pilot.pos.z) ??
        nearestShoreIsland(pilot.pos.x, pilot.pos.z, 24);
      zone = isl ? isl.label : 'At sea';
      if (
        zone === 'Welcome Harbour' &&
        Math.abs(pilot.pos.x - VILLAGE_ORIGIN.x) < 17 &&
        Math.abs(pilot.pos.z - VILLAGE_ORIGIN.z) < 17
      ) {
        zone = 'Portfolio Village';
      }
    }
    if (zone !== lastZone.current) {
      lastZone.current = zone;
      useInteraction.getState().setZone(zone);
    }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.2);
    acc.current = Math.min(acc.current + dt, 0.25);
    while (acc.current >= STEP) {
      acc.current -= STEP;
      stepPhysics();
    }
    // publish every frame so teleports/idle can never leave a stale zone label
    publishZone();

    // ---- character transform + animation ---------------------------------
    if (groupRef.current) {
      groupRef.current.position.set(pilot.pos.x, pilot.visualY, pilot.pos.z);
      groupRef.current.rotation.y = pilot.heading;

      const stride = pilot.stride;
      const walking = pilot.moving && pilot.grounded;
      const animSpeed = walking ? 14 : 5;

      // leg swing (opposite phases)
      if (leftLegRef.current && rightLegRef.current) {
        const swing = Math.sin(stride * animSpeed) * 0.3;
        leftLegRef.current.rotation.x = walking ? swing : 0;
        rightLegRef.current.rotation.x = walking ? -swing : 0;
      }

      // arm swing (opposite to legs)
      if (leftArmRef.current && rightArmRef.current) {
        const swing = Math.sin(stride * animSpeed + Math.PI) * 0.25;
        leftArmRef.current.rotation.x = walking ? swing : 0;
        rightArmRef.current.rotation.x = walking ? -swing : 0;
      }

      // body bob + head height
      if (bodyRef.current && headRef.current) {
        const bob = walking ? Math.abs(Math.sin(stride * animSpeed)) * 0.04 : 0;
        bodyRef.current.position.y = bob;
        headRef.current.position.y = BODY_H - 0.45 + bob;
      }
    }
  });

  function stepPhysics() {
    pilot.simTime += STEP;

    // ---- 1. read intent --------------------------------------------------
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

    // jump edge → buffer (input-systems: remember the press briefly)
    const jumpDown = !!keys[' '];
    if (jumpDown && !prevJump.current) pilot.jumpBuffer = JUMP_BUFFER;
    prevJump.current = jumpDown;
    pilot.jumpBuffer = Math.max(0, pilot.jumpBuffer - STEP);
    pilot.coyote = Math.max(0, pilot.coyote - STEP);

    // ---- 2. click-to-move: manual input always wins ----------------------
    if (manual) {
      pilot.moveTarget = null;
      pilot.path = null;
    } else if (pilot.moveTarget && pilot.mode === 'walk') {
      // walk the planned route waypoint-by-waypoint; the final waypoint is
      // the moveTarget itself, so plain orders (no route) behave as before
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
        // SEGMENT PROJECTION: once past the first waypoint, steer along the
        // validated polyline instead of straight at the waypoint. A character
        // pushed off the line by geometry must get back ON the validated
        // segment before closing on the waypoint, or it grinds into the very
        // obstacle the route was steering around.
        if (pilot.pathIndex > 0) {
          const prev = pilot.path[pilot.pathIndex - 1];
          const sx = tx - prev.x;
          const sz = tz - prev.z;
          const len2 = sx * sx + sz * sz || 1;
          let t = ((pilot.pos.x - prev.x) * sx + (pilot.pos.z - prev.z) * sz) / len2;
          t = Math.max(0, Math.min(1, t));
          const px = prev.x + sx * t;
          const pz = prev.z + sz * t;
          const ahead = (pilot.pos.x - px) * sx + (pilot.pos.z - pz) * sz;
          if (ahead < -0.05) {
            // behind the projection: walk back to the validated line first
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
          // the backing-out manoeuvre finished — resume the original order
          const goal = pilot.retreatGoal;
          pilot.retreatGoal = null;
          const route = findPath({ x: pilot.pos.x, z: pilot.pos.z }, goal);
          if (route.ok && route.points.length > 0) {
            pilot.path = route.points;
            pilot.pathIndex = 0;
            pilot.moveTarget = { x: route.points[route.points.length - 1].x, z: route.points[route.points.length - 1].z };
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
      // STUCK DETECTION: if the distance to the active waypoint stops
      // shrinking (pushed against geometry mid-route), re-plan from where the
      // character actually is instead of grinding into the wall.
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
            // even the backing-out manoeuvre is stuck: give up cleanly
            pilot.moveTarget = null;
            pilot.path = null;
            pilot.retreatGoal = null;
            pilot.replanCount = 0;
          } else {
            pilot.replanCount += 1;
            if (pilot.replanCount >= 2) {
              if (pilot.retreatCount >= 3) {
                // three backing-out cycles changed nothing: the destination
                // is unreachable from here — stop cleanly, never grind
                pilot.moveTarget = null;
                pilot.path = null;
                pilot.retreatGoal = null;
                pilot.replanCount = 0;
              } else {
                // two consecutive re-plans changed nothing: walk back to the
                // previous waypoint (open ground the character came from),
                // keeping the original destination queued, instead of grinding
                const back =
                  pilot.path && pilot.pathIndex > 0 ? pilot.path[pilot.pathIndex - 1] : null;
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
              const route = findPath({ x: pilot.pos.x, z: pilot.pos.z }, goal);
              if (route.ok && route.points.length > 0) {
                pilot.path = route.points;
                pilot.pathIndex = 0;
                // deliberately keep lastPathDist: the no-progress measurement
                // must continue across re-plans or the retreat never arms and
                // the character oscillates between re-plan and grind forever
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

    // ---- 3. boarding / disembark glide -----------------------------------
    if (pilot.boardFrom) {
      if (pilot.mode === 'walk' && pilot.moving) {
        pilot.boardFrom = null;
      } else {
        pilot.boardFrom.t += STEP / 0.55;
        const k = Math.min(1, pilot.boardFrom.t);
        const e = k * k * (3 - 2 * k);
        pilot.pos.x = pilot.boardFrom.x + (pilot.boatPos.x - pilot.boardFrom.x) * e;
        pilot.pos.z = pilot.boardFrom.z + (pilot.boatPos.z - pilot.boardFrom.z) * e;
        if (k >= 1) pilot.boardFrom = null;
      }
    }

    if (pilot.mode === 'walk') {
      // ---- 4. horizontal: camera-relative, axis slide, step-up -----------
      if (pilot.moving) {
        const nx0 = ix / len;
        const nz0 = iz / len;
        const wx = view.camRight.x * nx0 + view.camFwd.x * -nz0;
        const wz = view.camRight.z * nx0 + view.camFwd.z * -nz0;
        const speed = run ? RUN_SPEED : WALK_SPEED;
        const nx = pilot.pos.x + wx * speed * STEP;
        const nz = pilot.pos.z + wz * speed * STEP;

        // step-up tolerance is generous while grounded, near-zero while airborne
        const tol = pilot.grounded ? STEP_UP : 0.06;
        const feet = pilot.pos.y;

        // PHYSICAL COLLISION: walls, stalls, props and foundations are solid
        // (collision.ts); terrain, decks and solid tops remain the floor.
        // Axis-by-axis slide is unchanged — try the combined move, then each
        // axis alone, so the character keeps sliding along a wall.
        const m3 = tryMove(feet, nx, nz, tol);
        const m1 = tryMove(feet, nx, pilot.pos.z, tol);
        const m2 = tryMove(feet, pilot.pos.x, nz, tol);
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
          pilot.moveTarget = null; // blocked: drop the order rather than grind
          pilot.path = null;
        }
        pilot.heading = Math.atan2(wx, wz);
        pilot.stride += speed * STEP * 2.6;
      }

      // ---- 5. vertical: gravity, landing, jump ---------------------------
      // The floor is the highest standing surface at or below the feet —
      // terrain, a pier deck, or a solid top (plinth, counter, stair block).
      // No step-up here: climbing happens only through validated horizontal
      // moves, never by snapping upward in place.
      const floorY = floorBelow(pilot.pos.x, pilot.pos.z, pilot.pos.y + 0.01) ?? pilot.pos.y;

      if (pilot.grounded) {
        // stick to the floor; if the floor dropped away, start falling
        if (pilot.pos.y - floorY > 0.12) {
          pilot.grounded = false;
          pilot.coyote = COYOTE;
        } else {
          pilot.pos.y = floorY;
        }
      }

      if (!pilot.grounded) {
        pilot.velY -= GRAVITY * STEP;
        pilot.pos.y += pilot.velY * STEP;
        if (pilot.pos.y <= floorY) {
          // landing: clamp, record impact for the renderer, restore grounding
          pilot.landImpact = Math.min(1, Math.abs(pilot.velY) / 12);
          pilot.pos.y = floorY;
          pilot.velY = 0;
          pilot.grounded = true;
        }
      }

      // jump consumes buffer when grounded or inside the coyote window
      if (pilot.jumpBuffer > 0 && (pilot.grounded || pilot.coyote > 0)) {
        pilot.velY = JUMP_V;
        pilot.grounded = false;
        pilot.coyote = 0;
        pilot.jumpBuffer = 0;
      }
    } else {
      // ---- sailing -------------------------------------------------------
      const speed = run ? 13 : 8.5;
      if (pilot.moving) {
        const nx0 = ix / len;
        const nz0 = iz / len;
        const wx = view.camRight.x * nx0 + view.camFwd.x * -nz0;
        const wz = view.camRight.z * nx0 + view.camFwd.z * -nz0;
        const nx = pilot.boatPos.x + wx * speed * STEP;
        const nz = pilot.boatPos.z + wz * speed * STEP;
        if (canSailTo(nx, pilot.boatPos.z)) pilot.boatPos.x = nx;
        if (canSailTo(pilot.boatPos.x, nz)) pilot.boatPos.z = nz;
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

  return (
    <group ref={groupRef}>
      {/* Legs (blue jeans) */}
      <mesh ref={leftLegRef} position={[-0.2, 0, 0]}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshLambertMaterial color={0x2a5fc4} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.2, 0, 0]}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshLambertMaterial color={0x2a5fc4} />
      </mesh>
      {/* Body (blue shirt) */}
      <mesh ref={bodyRef} position={[0, 0.85, 0]}>
        <boxGeometry args={[0.6, 1.0, 0.4]} />
        <meshLambertMaterial color={0x4a90e2} />
      </mesh>
      {/* Head (skin) */}
      <mesh ref={headRef} position={[0, BODY_H - 0.45, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshLambertMaterial color={0xe0ac70} />
      </mesh>
      {/* Arms (skin) */}
      <mesh ref={leftArmRef} position={[-0.35, 0.95, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshLambertMaterial color={0xe0ac70} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.35, 0.95, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshLambertMaterial color={0xe0ac70} />
      </mesh>
    </group>
  );
}
