/**
 * Lighting — one warm sun, one sky/ground hemisphere fill.
 *
 * The sun RIG FOLLOWS THE PLAYER. A single shadow map cannot cover a 500-unit
 * ocean at a useful resolution, so the shadow camera is a tight 90-unit box
 * parked over the visitor: crisp shadows where they are looked at, and no
 * shadow acne at the horizon where they are not.
 *
 * The target object is added to the scene so three's own per-frame
 * `scene.updateMatrixWorld()` keeps its world matrix current — attaching it to
 * the light instead would leave it stale and swing every shadow.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot } from './state';
import { SUN_DIR } from './VoxelSky';

export function VoxelLighting() {
  const ref = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const light = ref.current;
    if (!light) return;
    light.target = target;
  }, [target]);

  useFrame(() => {
    const light = ref.current;
    if (!light) return;
    const p = pilot.pos;
    target.position.set(p.x, p.y, p.z);
    light.position.set(
      p.x + SUN_DIR.x * 95,
      p.y + SUN_DIR.y * 95,
      p.z + SUN_DIR.z * 95,
    );
  });

  return (
    <>
      <ambientLight intensity={0.62} color={0xdcecff} />
      <hemisphereLight args={[0xcfe6ff, 0xf2e2b8, 1.35]} />
      <directionalLight
        ref={ref}
        intensity={2.35}
        color={0xfff3e0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={280}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-bias={-0.0007}
        shadow-normalBias={0.03}
      />
      <primitive object={target} />
    </>
  );
}
