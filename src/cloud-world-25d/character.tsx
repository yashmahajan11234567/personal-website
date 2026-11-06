/**
 * Low-poly humanoid character — primitive-built (capsule body, head, swinging
 * limbs), grounded via the shared analytic terrainHeight, walk/run animation,
 * fixed-timestep input (pattern from cloud-world-3d/CloudCharacter).
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DOCK, SEA_R, terrainHeight, walkable } from './world25d';

export interface Pilot {
  mode: 'walk' | 'boat';
  pos: THREE.Vector3;      // character world pos
  boatPos: THREE.Vector3;  // boat world pos
  heading: number;
  speed: number;           // current planar speed (for anim + wake)
  moving: boolean;
}

export const pilot: Pilot = {
  mode: 'walk',
  pos: new THREE.Vector3(14, 0, 3),
  boatPos: new THREE.Vector3(32, 6, 0),
  heading: Math.PI / 2,
  speed: 0,
  moving: false,
};

const WALK = 4.2, RUN = 7.5, BOAT = 6.5;
const PHYS_DT = 1 / 60;

export function Character({ groupRef }: { groupRef: React.MutableRefObject<THREE.Group | null> }) {
  const body = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const keys = useRef<Record<string, boolean>>({});
  const phase = useRef(0);
  const acc = useRef(0);

  useEffect(() => {
    pilot.pos.set(14, terrainHeight(14, 3), 3);
    const down = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    const blur = () => { keys.current = {}; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // E = board / disembark
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e') return;
      if (pilot.mode === 'walk') {
        if (pilot.pos.x > 27.5 && Math.abs(pilot.pos.z) < 2.4) {
          pilot.mode = 'boat';
          pilot.boatPos.set(Math.max(pilot.boatPos.x, 33.5), 0, THREE.MathUtils.clamp(pilot.pos.z, -2, 2));
        }
      } else {
        const b = pilot.boatPos;
        if (b.x > DOCK.x0 && b.x < DOCK.x1 + 0.5 && Math.abs(b.z) < DOCK.z + 0.8) {
          pilot.mode = 'walk';
          pilot.pos.set(THREE.MathUtils.clamp(b.x, DOCK.x0, DOCK.x1), DOCK.y, THREE.MathUtils.clamp(b.z, -DOCK.z, DOCK.z));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame((_, dt) => {
    acc.current = Math.min(acc.current + dt, 0.2);
    while (acc.current >= PHYS_DT) {
      acc.current -= PHYS_DT;
      const k = keys.current;
      let ix = 0, iz = 0;
      if (k['w'] || k['arrowup']) iz -= 1;
      if (k['s'] || k['arrowdown']) iz += 1;
      if (k['a'] || k['arrowleft']) ix -= 1;
      if (k['d'] || k['arrowright']) ix += 1;
      const run = !!k['shift'];
      if (pilot.mode === 'walk') {
        const sp = run ? RUN : WALK;
        const len = Math.hypot(ix, iz);
        pilot.moving = len > 0;
        if (len > 0) {
          ix /= len; iz /= len;
          const nx = pilot.pos.x + ix * sp * PHYS_DT;
          const nz = pilot.pos.z + iz * sp * PHYS_DT;
          const h1 = walkable(nx, pilot.pos.z);
          const h2 = walkable(pilot.pos.x, nz);
          const h3 = walkable(nx, nz);
          if (h3 !== null) { pilot.pos.x = nx; pilot.pos.z = nz; pilot.pos.y = h3; }
          else if (h1 !== null) { pilot.pos.x = nx; pilot.pos.y = h1; }
          else if (h2 !== null) { pilot.pos.z = nz; pilot.pos.y = h2; }
          pilot.heading = Math.atan2(ix, iz);
          pilot.speed = sp;
        } else pilot.speed = 0;
      } else {
        const sp = BOAT;
        const len = Math.hypot(ix, iz);
        pilot.moving = len > 0;
        if (len > 0) {
          ix /= len; iz /= len;
          const b = pilot.boatPos;
          const nx = b.x + ix * sp * PHYS_DT;
          const nz = b.z + iz * sp * PHYS_DT;
          const r = Math.hypot(nx, nz);
          if (r <= SEA_R && r >= 27.2) { b.x = nx; b.z = nz; }
          pilot.heading = Math.atan2(ix, iz);
          pilot.speed = sp;
          pilot.pos.set(b.x, 1.05, b.z); // rides on deck
        } else {
          pilot.speed = 0;
          pilot.pos.set(pilot.boatPos.x, 1.05, pilot.boatPos.z);
        }
      }
    }

    const g = groupRef.current;
    if (!g) return;
    g.position.copy(pilot.pos);
    // model forward = +z
    const targetYaw = pilot.moving ? pilot.heading : g.rotation.y;
    let dy = targetYaw - g.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    g.rotation.y += dy * Math.min(1, dt * 12);

    if (pilot.moving && pilot.mode === 'walk') {
      phase.current += dt * pilot.speed * 2.4;
      const s = Math.sin(phase.current) * 0.55;
      if (armL.current) armL.current.rotation.x = s;
      if (armR.current) armR.current.rotation.x = -s;
      if (legL.current) legL.current.rotation.x = -s;
      if (legR.current) legR.current.rotation.x = s;
      if (body.current) body.current.position.y = 1.05 + Math.abs(Math.sin(phase.current)) * 0.05;
    } else {
      if (armL.current) armL.current.rotation.x *= 0.8;
      if (armR.current) armR.current.rotation.x *= 0.8;
      if (legL.current) legL.current.rotation.x *= 0.8;
      if (legR.current) legR.current.rotation.x *= 0.8;
      // idle: gentle breathing bob + slow arm sway
      if (body.current && pilot.mode === 'walk') {
        const t = performance.now() / 1000;
        body.current.position.y = 1.05 + Math.sin(t * 2.1) * 0.025;
        if (armL.current) armL.current.rotation.x = Math.sin(t * 2.1) * 0.06;
        if (armR.current) armR.current.rotation.x = -Math.sin(t * 2.1) * 0.06;
      }
    }
  });

  const skin = '#f2c89b', jacket = '#2496ed', pants = '#2c3e50', hair = '#4a3220';
  return (
    <group ref={groupRef}>
      <group ref={body} position={[0, 1.05, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.34, 0.55, 6, 12]} />
          <meshStandardMaterial color={jacket} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.27, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.9, -0.06]}>
          <sphereGeometry args={[0.275, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* eyes (front = +z) */}
        <mesh position={[-0.1, 0.8, 0.235]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color="#12232e" roughness={0.3} />
        </mesh>
        <mesh position={[0.1, 0.8, 0.235]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color="#12232e" roughness={0.3} />
        </mesh>
        <mesh ref={armL} position={[-0.42, 0.32, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.42, 4, 8]} />
          <meshStandardMaterial color={jacket} roughness={0.7} />
        </mesh>
        <mesh ref={armR} position={[0.42, 0.32, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.42, 4, 8]} />
          <meshStandardMaterial color={jacket} roughness={0.7} />
        </mesh>
      </group>
      <group position={[0, 0.63, 0]}>
        <mesh ref={legL} position={[-0.17, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.5, 4, 8]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
        <mesh ref={legR} position={[0.17, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.5, 4, 8]} />
          <meshStandardMaterial color={pants} roughness={0.8} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshBasicMaterial color="#1a2a3a" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}
