/**
 * Cloud World 2.0 — blocky drifting clouds + their ground shadows.
 *
 * Fresh implementation. One shared deterministic instance set drives both the
 * cloud InstancedMesh and the flat shadow quads beneath them. Geometry and
 * material are created with useMemo and matrices are filled in the ref
 * callback — the effect-then-render pattern here produced null-geometry meshes
 * that crashed frustum culling.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { view } from '../../player/state';

const CLOUD_COUNT = 26;
const CLOUD_Y_MIN = 60;
const CLOUD_Y_MAX = 95;
const DRIFT_SPEED_MIN = 0.4;
const DRIFT_SPEED_MAX = 0.8;
const WRAP_X = 420;

/** Deterministic shared instance set — clouds and shadows stay in lockstep. */
const CLOUD_SEED = 0xc100d2;
let _cloudRngState = CLOUD_SEED;
function cloudRandom(): number {
  _cloudRngState = (_cloudRngState * 1664525 + 1013904223) >>> 0;
  return _cloudRngState / 0xffffffff;
}

interface CloudInstance {
  x: number;
  z: number;
  y: number;
  speed: number;
  sx: number;
  sy: number;
  sz: number;
}

const SHARED_CLOUD_INSTANCES: CloudInstance[] = (() => {
  const instances: CloudInstance[] = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const x = (cloudRandom() - 0.5) * WRAP_X * 2;
    const z = (cloudRandom() - 0.5) * 300 - 100;
    const y = CLOUD_Y_MIN + cloudRandom() * (CLOUD_Y_MAX - CLOUD_Y_MIN);
    const speed = DRIFT_SPEED_MIN + cloudRandom() * (DRIFT_SPEED_MAX - DRIFT_SPEED_MIN);
    const sx = 6 + cloudRandom() * 8;
    const sy = 1.2;
    const sz = 4 + cloudRandom() * 5;
    instances.push({ x, z, y, speed, sx, sy, sz });
  }
  return instances;
})();

const dummy = new THREE.Object3D();

/** Blocky clouds — sunset: white/pink, night: dim purple, drifting +x. */
export function VoxelClouds(): React.ReactElement {
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xfdf0f5,
        transparent: true,
        opacity: 0.92,
        fog: true,
      }),
    [],
  );

  const attach = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false; // clouds wrap across the whole sky
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const inst = SHARED_CLOUD_INSTANCES[i];
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(inst.sx, inst.sy, inst.sz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    // night transition
    const targetOpacity = view.night ? 0.5 : 0.92;
    const targetColor = view.night ? 0x8a86b8 : 0xfdf0f5;
    if (Math.abs(material.opacity - targetOpacity) > 0.001) material.opacity = targetOpacity;
    if (material.color.getHex() !== targetColor) material.color.setHex(targetColor);
    // drift + wrap
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const inst = SHARED_CLOUD_INSTANCES[i];
      inst.x += inst.speed * dt;
      if (inst.x > WRAP_X) inst.x = -WRAP_X;
      if (inst.x < -WRAP_X) inst.x = WRAP_X;
    }
  });

  return <instancedMesh args={[geometry, material, CLOUD_COUNT]} ref={attach} />;
}

/** Flat dark quads under each cloud, moving in lockstep. */
export function CloudShadows(): React.ReactElement {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x2a4a6a,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        fog: true,
      }),
    [],
  );
  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  const attach = useCallback((mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    meshRef.current = mesh;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const inst = SHARED_CLOUD_INSTANCES[i];
      dummy.position.set(inst.x, 0.06, inst.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(inst.sx * 0.55, inst.sz * 0.55, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  useFrame((_, rawDt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(rawDt, 0.1);
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const inst = SHARED_CLOUD_INSTANCES[i];
      inst.x += inst.speed * dt;
      if (inst.x > WRAP_X) inst.x = -WRAP_X;
      if (inst.x < -WRAP_X) inst.x = WRAP_X;
      dummy.position.set(inst.x, 0.06, inst.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(inst.sx * 0.55, inst.sz * 0.55, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh args={[geometry, material, CLOUD_COUNT]} ref={attach} />;
}
