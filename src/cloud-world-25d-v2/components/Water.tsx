/**
 * Water — stylized turquoise water with foam lines, caustics, sparkle, shore foam.
 * Garden Warfare inspired.
 */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { WaterMaterial } from '../shaders/materials';
import * as THREE from 'three';
import { WORLD } from '../world';

export function Water() {
  const material = useMemo(() => new WaterMaterial({
    uShallowColor: new THREE.Color(0x4fe0d0),
    uDeepColor: new THREE.Color(0x1a7a8a),
    uFoamColor: new THREE.Color(0xffffff),
    uFoamLineColor: new THREE.Color(0xffffff),
    uSparkleColor: new THREE.Color(0xffffee),
    uDepth: 12.0,
    uShoreDist: 0.0, // updated per-frame via onBeforeRender if needed
  }), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.15, 0]}
      geometry={new THREE.PlaneGeometry(WORLD.SEA_R * 2, WORLD.SEA_R * 2, 64, 64)}
      material={material}
      receiveShadow
    />
  );
}