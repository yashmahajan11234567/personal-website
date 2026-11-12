/**
 * The visitor: controller + voxel body.
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
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildCharacter, HIP_Y, SHOULDER_Y } from './character';
import { pilot, keys, input, boatPose, view, REDUCED_MOTION } from './state';
import { canSailTo, walkableHeight, VILLAGE_ORIGIN } from './world';
import { islandAt, nearestShoreIsland } from './terrain';
import { useInteraction } from './interactionStore';

const WALK_SPEED = 4.6;
const RUN_SPEED = 8.4;
const TURN_RATE = 13;
const STEP = 1 / 60;

const GRAVITY = 26;
const JUMP_V = 8.5; // apex ≈ 1.39 blocks
const STEP_UP = 1.15; // one voxel of terrace is walkable
const JUMP_BUFFER = 0.12;
const COYOTE = 0.1;
const ARRIVE = 0.75;

const ARM_X = 0.3;
const LEG_X = 0.13;

export function VoxelCharacter() {
  const parts = useMemo(() => buildCharacter(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  // cartoon ink outline: same geometry, back faces only, slightly larger
  const ink = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x2b2118, side: THREE.BackSide }),
    [],
  );

  const root = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const acc = useRef(0);
  const lastZone = useRef('Starting Island');
  const prevJump = useRef(false);
  const squash = useRef(0);

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

    // render-side vertical: crisp while airborne, eased on terraces
    const deckTarget = pilot.mode === 'boat' ? boatPose.worldY + boatPose.deckY : pilot.pos.y;
    if (pilot.grounded || pilot.mode === 'boat') {
      pilot.visualY += (deckTarget - pilot.visualY) * Math.min(1, dt * 14);
    } else {
      pilot.visualY = deckTarget;
    }

    const g = root.current;
    if (g) {
      g.position.set(pilot.pos.x, pilot.visualY, pilot.pos.z);
      let dy = pilot.heading - g.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      g.rotation.y += dy * Math.min(1, dt * TURN_RATE);
    }

    animate(dt);
  });

  function stepPhysics() {
    pilot.simTime += STEP;

    // ---- 1. read intent ---------------------------------------------------
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

    // ---- 2. click-to-move: manual input always wins -----------------------
    if (manual) {
      pilot.moveTarget = null;
    } else if (pilot.moveTarget && pilot.mode === 'walk') {
      const dx = pilot.moveTarget.x - pilot.pos.x;
      const dz = pilot.moveTarget.z - pilot.pos.z;
      const d = Math.hypot(dx, dz);
      if (d <= ARRIVE) {
        pilot.moveTarget = null;
      } else {
        ix = dx / d;
        iz = dz / d;
      }
    }

    const len = Math.hypot(ix, iz);
    pilot.running = run && len > 0.05;
    pilot.moving = len > 0.05;

    // ---- 3. boarding / disembark glide ------------------------------------
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

        // step-up tolerance is generous while grounded, zero while airborne
        const tol = pilot.grounded ? STEP_UP : 0.06;
        const feet = pilot.pos.y;
        const ok = (h: number | null) => h !== null && h - feet <= tol;

        const h3 = walkableHeight(nx, nz);
        const h1 = walkableHeight(nx, pilot.pos.z);
        const h2 = walkableHeight(pilot.pos.x, nz);
        if (ok(h3)) {
          pilot.pos.x = nx;
          pilot.pos.z = nz;
          if (pilot.grounded) pilot.pos.y = h3 as number;
        } else if (ok(h1)) {
          pilot.pos.x = nx;
          if (pilot.grounded) pilot.pos.y = h1 as number;
        } else if (ok(h2)) {
          pilot.pos.z = nz;
          if (pilot.grounded) pilot.pos.y = h2 as number;
        } else {
          pilot.moveTarget = null; // blocked: drop the order rather than grind
        }
        pilot.heading = Math.atan2(wx, wz);
        pilot.stride += speed * STEP * 2.6;
      }

      // ---- 5. vertical: gravity, landing, jump ---------------------------
      const ground = walkableHeight(pilot.pos.x, pilot.pos.z);
      const floorY = ground === null ? pilot.pos.y : ground;

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

  function animate(dt: number) {
    const airborne = !pilot.grounded && pilot.mode === 'walk';
    const moving = pilot.moving && pilot.mode === 'walk' && !airborne;
    const fast = pilot.running && pilot.mode === 'walk';
    const swing = moving ? Math.sin(pilot.stride * 2) * (fast ? 1.0 : 0.62) : 0;

    // airborne pose: legs tuck, arms rise — reads as a jump from any angle
    const tuck = airborne ? 0.85 : 0;

    if (legL.current) legL.current.rotation.x = swing + tuck;
    if (legR.current) legR.current.rotation.x = -swing + tuck * 0.6;
    if (armL.current) {
      armL.current.rotation.x = airborne ? -1.5 : -swing * 0.8;
      armL.current.rotation.z = airborne ? 0.5 : 0.07;
    }
    if (armR.current) {
      armR.current.rotation.x = airborne ? -1.5 : swing * 0.8;
      armR.current.rotation.z = airborne ? -0.5 : -0.07;
    }

    // landing impact decays fast; drives a vertical squash that conserves volume
    pilot.landImpact = Math.max(0, pilot.landImpact - dt * 4.5);
    const impact = pilot.landImpact;
    if (impact > 0.01) squash.current = impact * 0.55;
    squash.current *= 1 - Math.min(1, dt * 9);

    if (bob.current) {
      const idle = REDUCED_MOTION ? 0 : Math.sin(performance.now() * 0.0018) * 0.018;
      bob.current.position.y = moving
        ? Math.abs(Math.sin(pilot.stride * 2)) * (fast ? 0.055 : 0.032)
        : idle;
      bob.current.rotation.x = fast ? -0.13 : 0;
      // squash on landing, stretch on the way up
      const stretch = airborne ? THREE.MathUtils.clamp(pilot.velY * 0.014, -0.1, 0.14) : 0;
      bob.current.scale.set(1 + squash.current * 0.5, 1 - squash.current + stretch, 1 + squash.current * 0.5);
    }
  }

  return (
    <group ref={root}>
      <group ref={bob}>
        <mesh geometry={parts.body} material={material} castShadow receiveShadow />
        <mesh geometry={parts.body} material={ink} scale={1.08} />
        <group ref={armL} position={[-ARM_X, SHOULDER_Y, 0]}>
          <mesh geometry={parts.armL} material={material} castShadow />
          <mesh geometry={parts.armL} material={ink} scale={1.12} />
        </group>
        <group ref={armR} position={[ARM_X, SHOULDER_Y, 0]}>
          <mesh geometry={parts.armR} material={material} castShadow />
          <mesh geometry={parts.armR} material={ink} scale={1.12} />
        </group>
        <group ref={legL} position={[-LEG_X, HIP_Y, 0]}>
          <mesh geometry={parts.legL} material={material} castShadow />
          <mesh geometry={parts.legL} material={ink} scale={1.12} />
        </group>
        <group ref={legR} position={[LEG_X, HIP_Y, 0]}>
          <mesh geometry={parts.legR} material={material} castShadow />
          <mesh geometry={parts.legR} material={ink} scale={1.12} />
        </group>
      </group>
    </group>
  );
}