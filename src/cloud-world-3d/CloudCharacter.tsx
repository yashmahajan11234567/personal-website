import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  pathCenterX,
  terrainHeight,
  PROJECTS_CLOUD_X,
  PROJECTS_CLOUD_Z,
  CLOUD_R_EXT,
  CLOUD_R_INT,
  CLOUD_DOOR_HALF,
} from './world';

// Player avatar: a soft volumetric cloud character built from overlapping
// squashed spheres, grounded via the shared analytic terrainHeight() so it
// can never float or sink relative to the visible terrain.
//
// Movement: acceleration + linear damping (frame-rate independent), locks to
// the path centerline at low lateral distance (guided journey), camera-relative
// direction from the live OrbitControls azimuth.

const ACCEL = 55; // u/s²
const MAX_SPEED = 8.5; // u/s
const DAMPING = 5.2; // 1/s — v *= exp(-DAMPING*dt)
const REVERSAL_BOOST = 2.5; // extra damping multiplier when wish opposes velocity
const YAW_RATE = 14; // body-yaw lerp rate (1/s)
const YAW_MAX_STEP = 0.35; // max body-yaw change per frame (rad) — no snapping
// Fixed-timestep physics: real-world seconds are accumulated and consumed in
// constant 1/60 substeps (max 8 per frame). Movement speed is therefore
// independent of render frame rate, and a starved/tab-background gap can
// never integrate as one huge step.
const PHYSICS_DT = 1 / 60;
const MAX_SUBSTEPS = 8;
const FRAME_CREDIT = 0.2; // max real seconds credited per frame

export function CloudCharacter({
  controlsRef,
  avatarPosRef,
  avatarVelRef,
  insideRef,
}: {
  controlsRef: React.RefObject<{
    getAzimuthalAngle(): number;
    object?: THREE.Camera;
    target?: THREE.Vector3;
  } | null>;
  avatarPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
  avatarVelRef?: React.MutableRefObject<THREE.Vector3>;
  /** published true while the player is inside the Projects Cloud interior */
  insideRef?: React.MutableRefObject<boolean>;
}) {
  const characterRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const velRef = useRef(new THREE.Vector3());
  // Test instrumentation: trajectory ring buffer on window (harmless in prod).
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__cwAvatarHist) {
      (window as any).__cwAvatarHist = [];
    }
  }, []);
  // Spawn just left of the path at valley center, grounded.
  const spawn = useMemo(() => {
    const z = 0;
    const x = pathCenterX(z) - 3;
    return new THREE.Vector3(x, terrainHeight(x, z), z);
  }, []);
  const posRef = useRef(spawn.clone());
  // True while the player is inside the Projects Cloud interior. Flips when
  // the player crosses the interior radius through the door corridor.
  const insideCloudRef = useRef(false);

  // QA hook: tests may teleport the avatar to an exact (x, z) — works even
  // while __cwInputLocked is set, since it writes posRef directly.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__cwTeleport = (x: number, z: number) => {
      posRef.current.set(x, terrainHeight(x, z), z);
      velRef.current.set(0, 0, 0);
    };
    return () => {
      if ((window as any).__cwTeleport) delete (window as any).__cwTeleport;
    };
  }, []);

  useEffect(() => {
    const isTypingTarget = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      );
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget()) return;
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    const clearKeys = () => {
      keysRef.current = {};
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const wish = useMemo(() => new THREE.Vector3(), []);
  const accRef = useRef(0); // physics substep accumulator
  const puffRef = useRef<THREE.Group>(null); // mount puffs (idle bob target)

  useFrame((_, delta) => {
    const character = characterRef.current;
    if (!character) return;

    // Accumulate real time, consume in fixed substeps (frame-rate
    // independent integration; cap prevents huge catch-up steps).
    accRef.current += Math.min(Math.max(delta, 0), FRAME_CREDIT);
    let substeps = 0;
    while (accRef.current >= PHYSICS_DT && substeps < MAX_SUBSTEPS) {
      accRef.current -= PHYSICS_DT;
      substeps++;
      const dt = PHYSICS_DT;

      let ix = 0;
      let iz = 0;
      if (keysRef.current['w'] || keysRef.current['arrowup']) iz += 1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) iz -= 1;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) ix -= 1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) ix += 1;

      if (ix !== 0 || iz !== 0) {
        // Camera-relative movement: the movement basis IS the live
        // camera→target direction, so "W" always goes the way the player is
        // looking — inside the cloud and outside, at every orbit angle.
        //
        // The previous version rebuilt the basis from getAzimuthalAngle():
        //   forward = (sin az, 0, −cos az), right = (cos az, 0, sin az)
        // That is a mirrored basis — it only matches the real view direction
        // at azimuth ≈ 0 and ±π. The trailing outdoor camera sits at ≈ ±π, so
        // the error was invisible outside and every rotated camera (i.e. the
        // whole time the player is inside the cloud) read inverted/sideways.
        const controls = controlsRef.current;
        const camObj = controls?.object;
        const tgt = controls?.target;
        if (camObj && tgt) {
          forward.set(tgt.x - camObj.position.x, 0, tgt.z - camObj.position.z);
        } else {
          forward.set(0, 0, -1);
        }
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
        forward.normalize();
        // Screen right = cross(forward, up) with up = +Y  →  (−fz, 0, fx).
        right.set(-forward.z, 0, forward.x);
        wish.set(0, 0, 0).addScaledVector(forward, iz).addScaledVector(right, ix);
        if (wish.lengthSq() > 0) wish.normalize();

        velRef.current.addScaledVector(wish, ACCEL * dt);
        const speed = velRef.current.length();
        if (speed > MAX_SPEED) velRef.current.multiplyScalar(MAX_SPEED / speed);
      }

      // Linear damping — frame-rate independent exponential decay. Reversing
      // against current velocity gets boosted damping so direction changes
      // feel snappy without raising top speed.
      const opposing =
        (ix !== 0 || iz !== 0) && velRef.current.dot(wish) < 0;
      const damp = Math.exp(-DAMPING * (opposing ? REVERSAL_BOOST : 1) * dt);
      velRef.current.multiplyScalar(damp);
      if (velRef.current.lengthSq() < 0.0004) velRef.current.set(0, 0, 0);

      const pos = posRef.current;
      const locked =
        typeof window !== 'undefined' && (window as any).__cwInputLocked;
      if (!locked) {
        pos.x += velRef.current.x * dt;
        pos.z += velRef.current.z * dt;
      }

      // Journey bounds.
      pos.x = THREE.MathUtils.clamp(pos.x, -36, 36);
      pos.z = THREE.MathUtils.clamp(pos.z, -60, 235);

      // Projects Cloud collision: a solid disc of radius CLOUD_R_EXT with a
      // door corridor cut into its -z face. Once through the corridor past
      // the interior radius, the player is "inside" and the boundary becomes
      // CLOUD_R_INT until they step back out through the corridor.
      const cdx = pos.x - PROJECTS_CLOUD_X;
      const cdz = pos.z - PROJECTS_CLOUD_Z;
      const cd = Math.hypot(cdx, cdz);
      const inDoorCorridor =
        Math.abs(cdx) < CLOUD_DOOR_HALF &&
        cdz > -CLOUD_R_EXT - 3 &&
        cdz < -CLOUD_R_INT + 3;
      if (!insideCloudRef.current) {
        if (cd < CLOUD_R_INT) {
          // Already deep inside (covers QA teleports straight into the
          // interior) — checked BEFORE the exterior push-out below.
          insideCloudRef.current = true;
        } else if (cd < CLOUD_R_EXT && !inDoorCorridor) {
          const s = CLOUD_R_EXT / Math.max(cd, 1e-6);
          pos.x = PROJECTS_CLOUD_X + cdx * s;
          pos.z = PROJECTS_CLOUD_Z + cdz * s;
        } else if (cd < CLOUD_R_INT + 1.5 && inDoorCorridor) {
          // Walking in through the door corridor.
          insideCloudRef.current = true;
        }
      } else {
        if (cd > CLOUD_R_INT && !inDoorCorridor) {
          const s = CLOUD_R_INT / Math.max(cd, 1e-6);
          pos.x = PROJECTS_CLOUD_X + cdx * s;
          pos.z = PROJECTS_CLOUD_Z + cdz * s;
        }
        if (inDoorCorridor && cdz < -CLOUD_R_EXT + 0.5) {
          insideCloudRef.current = false;
        }
      }
    }

    // Exact analytic grounding (outside substeps — pure function of x,z).
    const pos = posRef.current;
    pos.y = terrainHeight(pos.x, pos.z);

    character.position.copy(pos);

    // Publish live position + velocity for the camera target rig.
    if (avatarPosRef) avatarPosRef.current = pos;
    if (avatarVelRef) avatarVelRef.current.copy(velRef.current);
    // Publish interior state (drives the camera interior mode + door swing).
    if (insideRef) insideRef.current = insideCloudRef.current;
    if (typeof window !== 'undefined') (window as any).__cwInside = insideCloudRef.current;

    // Idle bob — applied ONLY to the visual puff group (and the rider that
    // rides inside it), never to the physics position or grounding.
    if (puffRef.current) {
      const t = performance.now() / 1000;
      puffRef.current.position.y = Math.sin(t * 2 * Math.PI * 0.6) * 0.05;
    }

    // Test instrumentation (harmless in prod): ring buffer of recent avatar
    // states with wall-clock time, so browser automation can read trajectories
    // instead of spot samples that can go stale between evaluate() calls.
    if (typeof document !== 'undefined') {
      const hist = (window as any).__cwAvatarHist;
      const now = performance.now();
      if (hist) {
        hist.push({ t: now, x: pos.x, y: pos.y, z: pos.z, vx: velRef.current.x, vz: velRef.current.z });
        if (hist.length > 600) hist.splice(0, hist.length - 600);
      }
    }

    // Face travel direction — smooth, rate-limited (never snaps on reversal).
    const moving = velRef.current.lengthSq() > 0.25;
    if (moving) {
      const dt = Math.min(delta, 0.25);
      let targetRot = Math.atan2(velRef.current.x, velRef.current.z);
      // Shortest angular difference in [-π, π].
      let diff = targetRot - character.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const maxStep = YAW_MAX_STEP;
      const step = THREE.MathUtils.clamp(
        diff * (1 - Math.exp(-YAW_RATE * dt)),
        -maxStep,
        maxStep,
      );
      character.rotation.y += step;
    }
  });

  return (
    <group ref={characterRef} position={spawn.toArray()} rotation={[0, Math.PI * 0.78, 0]}>
      {/* Contact shadow — stays grounded at root level, outside the bob group. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {/* Bob group: all visual puffs + face + rider ride the idle bob together. */}
      <group ref={puffRef}>
        {/* Main cloud body */}
        <mesh castShadow position={[0, 1.1, 0]} scale={[1.5, 1.15, 1.4]}>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.55} metalness={0} />
        </mesh>
        {/* Top tuft accent (behind-right of the rider) */}
        <mesh castShadow position={[0.5, 2.05, 0.45]} scale={[0.62, 0.55, 0.6]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.55} metalness={0} />
        </mesh>
        {/* Side puffs */}
        <mesh castShadow position={[-0.9, 0.85, 0.15]} scale={[0.62, 0.5, 0.6]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#FDFBF6" roughness={0.6} metalness={0} />
        </mesh>
        <mesh castShadow position={[0.9, 0.9, -0.1]} scale={[0.58, 0.48, 0.58]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#FDFBF6" roughness={0.6} metalness={0} />
        </mesh>
        {/* Back cushion — the raised seat the rider sits on */}
        <mesh castShadow position={[0, 1.9, -0.5]} scale={[1.2, 0.85, 1.05]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.55} metalness={0} />
        </mesh>
        {/* Base puff — grounds the silhouette */}
        <mesh castShadow position={[0, 0.45, 0]} scale={[1.05, 0.55, 1.0]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#F8F4EC" roughness={0.65} metalness={0} />
        </mesh>
        {/* Face — mounted ON the main body's front surface (ellipsoid radii
            1.5/1.15/1.4 centered [0,1.1,0]; features placed just proud of the
            solved surface so they can never end up buried inside the body). */}
        <mesh position={[-0.3, 1.85, 1.08]} scale={[0.13, 0.17, 0.08]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#2A2A35" roughness={0.4} />
        </mesh>
        <mesh position={[0.3, 1.85, 1.08]} scale={[0.13, 0.17, 0.08]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#2A2A35" roughness={0.4} />
        </mesh>
        <mesh position={[-0.62, 1.6, 1.13]} scale={[0.14, 0.1, 0.07]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#FFB199" roughness={0.7} />
        </mesh>
        <mesh position={[0.62, 1.6, 1.13]} scale={[0.14, 0.1, 0.07]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#FFB199" roughness={0.7} />
        </mesh>
        {/* Smile: half-torus arc (∪) — solved to sit proud of the body
            ellipsoid (surface limit at y=1.56 is z≤1.28; arc sits at 1.31). */}
        <mesh position={[0, 1.56, 1.31]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.16, 0.034, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#2A2A35" roughness={0.4} />
        </mesh>
        {/* Soft warm shading underneath */}
        <mesh position={[0, 0.28, 0]} scale={[0.95, 0.3, 0.9]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#F0E4D0" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
