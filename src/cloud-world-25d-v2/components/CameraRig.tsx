/**
 * CameraRig — smooth follow camera with QA hooks.
 * Adapted from v1 CameraRig with cinematic offset.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot } from './Character';

export const camZoom = { f: 1 };
export const forceHigh = { high: false };

export function CameraRig() {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3());

  // Expose for QA scripts
  if (typeof window !== 'undefined') {
    (window as any).__cw25d = (window as any).__cw25d || {};
    (window as any).__cw25d.camZoom = camZoom;
    (window as any).__cw25d.forceHigh = forceHigh;
    (window as any).__cw25d.getCamera = () => camera;
  }

  useFrame((_, dt) => {
    const p = pilot;
    if (!p) return;

    // Target position (character + slight height offset)
    const targetY = p.mode === 'boat' ? 1.0 : 0.8;
    targetRef.current.set(p.pos.x, targetY, p.pos.z);

    // Camera offset
    const baseOffset = new THREE.Vector3(3, 15, 34);
    const zoom = camZoom.f;
    const offset = baseOffset.clone().multiplyScalar(zoom);

    // Desired camera position
    const desired = targetRef.current.clone().add(offset);

    // Smooth lerp
    const lerpFactor = 1 - Math.exp(-4.5 * dt);
    camera.position.lerp(desired, lerpFactor);

    // Look at target
    camera.lookAt(targetRef.current.x, targetRef.current.y, targetRef.current.z);

    // Force high quality override
    if (forceHigh.high) {
      camZoom.f = 0.13;
    }
  });

  return null;
}