/**
 * The visitor: controller + voxel body.
 *
 * Movement reuses the v2 controller's approach — normalised input, fixed-step
 * integration, and an axis-by-axis slide so walking into a cliff face does not
 * stop you dead. The one thing v2 did not do is SMOOTH THE VERTICAL: with
 * terrain quantised to whole blocks, a terrace edge would snap the character up
 * a full unit and look like a teleport. Here the physics position is snapped
 * (so collision stays honest) while the rendered position eases toward it.
 *
 * While aboard, the character stands on the whale's deck and the whale drives
 * the position; the controller keeps animating so the visitor is never a statue.
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

  /** Publish the zone label to the HUD store, but only when it actually changes. */
  function publishZone(): void {
    let zone: string;
    if (pilot.mode === 'boat') {
      zone = 'At sea — Docker Whale';
    } else {
      // piers/jetties sit over water: credit them to the island they serve
      // (berths are up to ~16 blocks offshore, so the margin must be generous)
      const isl = islandAt(pilot.pos.x, pilot.pos.z) ?? nearestShoreIsland(pilot.pos.x, pilot.pos.z, 24);
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
    // publish every frame, not only while moving, so teleports/idle edge cases
    // can never leave a stale zone label in the HUD (store dedupes on change)
    publishZone();

    // render-side vertical easing: the feet glide between terrace levels
    const targetY = pilot.mode === 'boat' ? boatPose.worldY + boatPose.deckY : pilot.pos.y;
    pilot.visualY += (targetY - pilot.visualY) * Math.min(1, dt * 14);

    const g = root.current;
    if (g) {
      g.position.set(pilot.pos.x, pilot.visualY, pilot.pos.z);
      let dy = pilot.heading - g.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      g.rotation.y += dy * Math.min(1, dt * TURN_RATE);
    }

    animate();
  });

  function stepPhysics() {
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
    const len = Math.hypot(ix, iz);
    const run = !!keys['shift'] || input.run;
    pilot.running = run && len > 0.05;
    pilot.moving = len > 0.05;

    // boarding / disembark ease: glide pos between pier and deck instead of
    // snapping, in whichever mode we are entering
    if (pilot.boardFrom) {
      // if the player starts walking mid-glide, let movement take over
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
      if (!pilot.moving) return;
      ix /= len;
      iz /= len;
      // Input is camera-relative: "forward" always means away from the camera,
      // whatever the orbit angle happens to be. The basis vectors are published
      // by CameraRig from the real blended offset each frame.
      const wx = view.camRight.x * ix + view.camFwd.x * -iz;
      const wz = view.camRight.z * ix + view.camFwd.z * -iz;
      const speed = run ? RUN_SPEED : WALK_SPEED;
      const nx = pilot.pos.x + wx * speed * STEP;
      const nz = pilot.pos.z + wz * speed * STEP;
      const h3 = walkableHeight(nx, nz);
      const h1 = walkableHeight(nx, pilot.pos.z);
      const h2 = walkableHeight(pilot.pos.x, nz);
      if (h3 !== null) pilot.pos.set(nx, h3, nz);
      else if (h1 !== null) pilot.pos.set(nx, h1, pilot.pos.z);
      else if (h2 !== null) pilot.pos.set(pilot.pos.x, h2, nz);
      pilot.heading = Math.atan2(wx, wz);
      pilot.stride += speed * STEP * 2.6;
    } else {
      // boarding ease moved to the top of stepPhysics so both transitions glide
      const speed = run ? 13 : 8.5;
      if (pilot.moving) {
        ix /= len;
        iz /= len;
        // same camera-relative basis as walking, so the whale steers where the
        // screen points, not where world +z happens to be
        const wx = view.camRight.x * ix + view.camFwd.x * -iz;
        const wz = view.camRight.z * ix + view.camFwd.z * -iz;
        const nx = pilot.boatPos.x + wx * speed * STEP;
        const nz = pilot.boatPos.z + wz * speed * STEP;
        if (canSailTo(nx, pilot.boatPos.z)) pilot.boatPos.x = nx;
        if (canSailTo(pilot.boatPos.x, nz)) pilot.boatPos.z = nz;
        pilot.boatHeading = Math.atan2(wx, wz);
        pilot.heading = pilot.boatHeading;
        pilot.stride += speed * STEP * 1.1;
      }
      pilot.pos.set(pilot.boatPos.x, boatPose.worldY + boatPose.deckY, pilot.boatPos.z);
    }
  }

  function animate() {
    const moving = pilot.moving && pilot.mode === 'walk';
    const fast = pilot.running && pilot.mode === 'walk';
    const swing = moving ? Math.sin(pilot.stride * 2) * (fast ? 1.0 : 0.62) : 0;

    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) {
      armL.current.rotation.x = -swing * 0.8;
      armL.current.rotation.z = 0.07;
    }
    if (armR.current) {
      armR.current.rotation.x = swing * 0.8;
      armR.current.rotation.z = -0.07;
    }
    if (bob.current) {
      // idle bob is an infinite ambient loop — collapse it under reduced motion
      const idle = REDUCED_MOTION ? 0 : Math.sin(performance.now() * 0.0018) * 0.018;
      bob.current.position.y = moving
        ? Math.abs(Math.sin(pilot.stride * 2)) * (fast ? 0.055 : 0.032)
        : idle;
      bob.current.rotation.x = fast ? -0.13 : 0;
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
