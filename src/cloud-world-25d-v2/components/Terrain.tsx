/**
 * Terrain — painted stylized terrain with shader-based biome blending.
 * Sand / grass / dirt / rock / cliff / snow by height & slope.
 */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { TerrainMaterial } from '../shaders/materials';
import * as THREE from 'three';
import { WORLD } from '../world';

const SEGMENTS = 120;
const SIZE = WORLD.BEACH_R * 2;

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = WORLD.terrainHeight(x, z);
      positions.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const material = useMemo(() => new TerrainMaterial({
    uSandColor: new THREE.Color(0xf4e4bc),
    uGrassColor: new THREE.Color(0x6fc45c),
    uGrassDark: new THREE.Color(0x4aa03a),
    uDirtColor: new THREE.Color(0x9b7a5a),
    uRockColor: new THREE.Color(0x7a6b5e),
    uCliffColor: new THREE.Color(0x5a5048),
    uSnowColor: new THREE.Color(0xf0f0f0),
  }), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      receiveShadow
      castShadow
    />
  );
}