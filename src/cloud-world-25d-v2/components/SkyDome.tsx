/**
 * SkyDome — solid color test to verify mesh renders.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

export function SkyDome() {
  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3a8fd8, // vibrant blue
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
    });
    return mat;
  }, []);

  return (
    <mesh
      geometry={new THREE.SphereGeometry(200, 32, 32)}
      material={material}
      renderOrder={-10}
    />
  );
}