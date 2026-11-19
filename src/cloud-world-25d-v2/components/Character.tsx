/**
 * Character - rigged KayKit Adventurers GLB with AnimationMixer.
 * Walk, run, idle animations + procedural foot placement.
 */
import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { WORLD } from '../world';
import { CHARACTER_ASSETS, CHARACTER_ANIMS } from '../assets';

export interface Pilot {
  mode: 'walk' | 'boat';
  pos: THREE.Vector3;
  boatPos: THREE.Vector3;
  heading: number;
  speed: number;
  moving: boolean;
}

export const pilot: Pilot = {
  mode: 'walk',
  pos: new THREE.Vector3(WORLD.SPAWN.x, 0, WORLD.SPAWN.z),
  boatPos: new THREE.Vector3(WORLD.BOAT_SPAWN.x, 0, WORLD.BOAT_SPAWN.z),
  heading: Math.PI / 2,
  speed: 0,
  moving: false,
};

const WALK_SPEED = 4.0;
const RUN_SPEED = 7.5;
const TURN_RATE = 12;
const PHYS_DT = 1 / 60;

export function Character({ groupRef }: { groupRef: React.MutableRefObject<THREE.Group | null> }) {
  const { nodes, animations } = useGLTF(CHARACTER_ASSETS.knight);
  const { scene } = useThree();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRefs = useRef<Record<string, THREE.AnimationAction>>({});
  const keys = useRef<Record<string, boolean>>({});
  const acc = useRef(0);
  const phase = useRef(0);
  const isRunningRef = useRef(false);
  const mountedRef = useRef(false);

  // Store scene reference after Canvas is mounted
  useEffect(() => {
    sceneRef.current = scene;
    mountedRef.current = true;
  }, [scene]);

  // Initialize mixer and actions
  useEffect(() => {
    if (!nodes || !animations || !sceneRef.current) return;

    const root = Object.values(nodes).find(n => (n as any).isGroup || n.type === 'Group') as THREE.Group;
    if (!root) return;

    mixerRef.current = new THREE.AnimationMixer(root);
    const clips = animations.map((clip: THREE.AnimationClip) => clip);

    clips.forEach(clip => {
      const action = mixerRef.current!.clipAction(clip);
      actionRefs.current[clip.name] = action;
    });

    const idle = actionRefs.current[CHARACTER_ANIMS.idle];
    if (idle) {
      idle.play();
      idle.setEffectiveTimeScale(1);
      idle.setEffectiveWeight(1);
    }

    sceneRef.current!.add(root);
    groupRef.current = root;

    pilot.pos.set(WORLD.SPAWN.x, WORLD.terrainHeight(WORLD.SPAWN.x, WORLD.SPAWN.z), WORLD.SPAWN.z);
    root.position.copy(pilot.pos);
    root.scale.setScalar(0.01);

    return () => {
      sceneRef.current?.remove(root);
      mixerRef.current?.uncacheRoot(root);
    };
  }, [nodes, animations, groupRef]);

  // Input
  useEffect(() => {
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

  // Boarding (E key)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'e') return;
      if (pilot.mode === 'walk') {
        if (pilot.pos.x > WORLD.DOCK.x1 - 1 && Math.abs(pilot.pos.z) < 2.5) {
          pilot.mode = 'boat';
          pilot.boatPos.set(Math.max(pilot.boatPos.x, WORLD.DOCK.x1 + 2), 0, THREE.MathUtils.clamp(pilot.pos.z, -2, 2));
        }
      } else {
        const b = pilot.boatPos;
        if (b.x > WORLD.DOCK.x0 && b.x < WORLD.DOCK.x1 + 1 && Math.abs(b.z) < WORLD.DOCK.z1 + 1) {
          pilot.mode = 'walk';
          pilot.pos.set(THREE.MathUtils.clamp(b.x, WORLD.DOCK.x0, WORLD.DOCK.x1), WORLD.DOCK.y, THREE.MathUtils.clamp(b.z, -WORLD.DOCK.z1, WORLD.DOCK.z1));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Physics + Animation update - extracted to helper to avoid parser issues
  const stepPhysics = useCallback((dt: number) => {
    if (!mixerRef.current || !mountedRef.current) return;
    mixerRef.current.update(dt);

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
      isRunningRef.current = run;

      if (pilot.mode === 'walk') {
        const sp = run ? RUN_SPEED : WALK_SPEED;
        const len = Math.hypot(ix, iz);
        pilot.moving = len > 0;
        if (len > 0) {
          ix /= len; iz /= len;
          const nx = pilot.pos.x + ix * sp * PHYS_DT;
          const nz = pilot.pos.z + iz * sp * PHYS_DT;
          const h1 = WORLD.walkableHeight(nx, pilot.pos.z);
          const h2 = WORLD.walkableHeight(pilot.pos.x, nz);
          const h3 = WORLD.walkableHeight(nx, nz);
          if (h3 !== null) { pilot.pos.x = nx; pilot.pos.z = nz; pilot.pos.y = h3; }
          else if (h1 !== null) { pilot.pos.x = nx; pilot.pos.y = h1; }
          else if (h2 !== null) { pilot.pos.z = nz; pilot.pos.y = h2; }
          pilot.heading = Math.atan2(ix, iz);
          pilot.speed = sp;
        } else pilot.speed = 0;
      } else {
        const sp = 6.5;
        const len = Math.hypot(ix, iz);
        pilot.moving = len > 0;
        if (len > 0) {
          ix /= len; iz /= len;
          const b = pilot.boatPos;
          const nx = b.x + ix * sp * PHYS_DT;
          const nz = b.z + iz * sp * PHYS_DT;
          const r = Math.hypot(nx, nz);
          if (r <= WORLD.SEA_R && r >= 27) { b.x = nx; b.z = nz; }
          pilot.heading = Math.atan2(ix, iz);
          pilot.speed = sp;
          pilot.pos.set(b.x, 1.05, b.z);
        } else {
          pilot.speed = 0;
          pilot.pos.set(pilot.boatPos.x, 1.05, pilot.boatPos.z);
        }
      }
    }
  }, []);

  const stepAnimation = useCallback((dt: number) => {
    if (!groupRef.current || !mountedRef.current) return;

    const g = groupRef.current;
    g.position.copy(pilot.pos);

    const targetYaw = pilot.moving ? pilot.heading : g.rotation.y;
    let dy = targetYaw - g.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    g.rotation.y += dy * Math.min(1, dt * TURN_RATE);

    const idleAction = actionRefs.current[CHARACTER_ANIMS.idle];
    const walkAction = actionRefs.current[CHARACTER_ANIMS.walk];
    const runAction = actionRefs.current[CHARACTER_ANIMS.run];

    if (pilot.mode === 'walk' && pilot.moving) {
      const run = isRunningRef.current;
      const target = run ? runAction : walkAction;
      const other = run ? walkAction : runAction;
      if (idleAction) idleAction.crossFadeTo(target!, 0.2, true);
      if (other) other.crossFadeTo(target!, 0.2, true);
      if (target) {
        target.play();
        target.setEffectiveTimeScale(run ? 1.3 : 1.0);
      }
      phase.current += dt * pilot.speed * 2.0;
    } else {
      if (walkAction) walkAction.crossFadeTo(idleAction!, 0.3, true);
      if (runAction) runAction.crossFadeTo(idleAction!, 0.3, true);
      if (idleAction) {
        idleAction.play();
        idleAction.setEffectiveTimeScale(1);
      }
    }
  }, [groupRef]);

  useFrame((_, dt) => {
    stepPhysics(dt);
    stepAnimation(dt);
  });

  return null;
}