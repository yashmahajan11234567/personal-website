/**
 * VoxelOcean — the turquoise tile grid plus the far-sea disc.
 *
 * The animation is in the shader (see VoxelMesh's `wave` flag): one uniform is
 * written per frame and the GPU displaces every tile from its own instance
 * position. Nothing in JavaScript touches 60,000 matrices, which is the whole
 * reason the ocean can be this large and still hold its frame budget.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  FAR_SEA_RADIUS,
  FAR_SEA_Y,
  buildOcean,
  OCEAN_COUNT_DESKTOP,
  OCEAN_COUNT_MOBILE,
} from './oceanTiles';
import { FarSea, Voxels, oceanTime } from './VoxelMesh';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
}

export function VoxelOcean() {
  const mobile = useMemo(isMobileViewport, []);
  const count = mobile ? OCEAN_COUNT_MOBILE : OCEAN_COUNT_DESKTOP;
  const tiles = useMemo(() => buildOcean(count), [count]);

  useFrame((_, dt) => {
    oceanTime.value += dt;
  });

  return (
    <>
      <Voxels blocks={tiles} castShadow={false} receiveShadow wave />
      <FollowingFarSea />
    </>
  );
}

/** Keeps the horizon filling disc under the camera so the sea never ends. */
function FollowingFarSea() {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.x = camera.position.x;
      ref.current.position.z = camera.position.z;
    }
  });
  return (
    <group ref={ref}>
      <FarSea radius={FAR_SEA_RADIUS} y={FAR_SEA_Y} />
    </group>
  );
}
