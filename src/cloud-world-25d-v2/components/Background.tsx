/**
 * Background — sets scene background and renderer clear color synchronously.
 * Runs in useLayoutEffect to execute before paint.
 */
import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function Background() {
  const { scene, gl, camera } = useThree();

  useLayoutEffect(() => {
    // Set both scene background and renderer clear color
    scene.background = new THREE.Color(0x3a8fd8);
    gl.setClearColor(0x3a8fd8, 1);
    // Force a render to apply immediately
    gl.render(scene, camera);
  }, [scene, gl, camera]);

  return null;
}