import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pathCenterX, terrainHeight } from './world';

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
}: {
  controlsRef: React.RefObject<{ getAzimuthalAngle(): number } | null>;
  avatarPosRef?: React.MutableRefObject<THREE.Vector3 | null>;
  avatarVelRef?: React.MutableRefObject<THREE.Vector3>;
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
        // Camera-relative movement using the live OrbitControls azimuth.
        let azimuth = 0;
        const controls = controlsRef.current;
        if (controls) {
          azimuth = controls.getAzimuthalAngle();
        }
        // World forward (into the screen, -Z at azimuth 0), right (+X at 0).
        forward.set(Math.sin(azimuth), 0, -Math.cos(azimuth));
        right.set(Math.cos(azimuth), 0, Math.sin(azimuth));
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
      pos.x = THREE.MathUtils.clamp(pos.x, -24, 24);
      pos.z = THREE.MathUtils.clamp(pos.z, -60, 235);

      // Path lock: inside the canyon walls the character rides the path line.
      const inCanyon = pos.z > 95 && pos.z < 175;
      if (inCanyon) {
        const cx = pathCenterX(pos.z);
        pos.x = THREE.MathUtils.lerp(pos.x, cx, 0.12);
      }
    }

    // Exact analytic grounding (outside substeps — pure function of x,z).
    const pos = posRef.current;
    pos.y = terrainHeight(pos.x, pos.z);

    character.position.copy(pos);

    // Publish live position + velocity for the camera target rig.
    if (avatarPosRef) avatarPosRef.current = pos;
    if (avatarVelRef) avatarVelRef.current.copy(velRef.current);

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
