/**
 * Vegetation — InstancedMesh for all scatter vegetation.
 * Uses useGLTF with runtime-safe node access.
 */
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TREE_SPOTS, BUSH_SPOTS, GRASS_SPOTS, FLOWER_SPOTS, ROCK_SPOTS } from '../world';
import { TREE_ASSETS, BUSH_ASSET, GRASS_ASSETS, ROCK_ASSETS } from '../assets';

export function makeInstanceMatrix(positions: { x: number; y: number; z: number; scale: number; rotY: number }[]) {
  const matrices = new Float32Array(positions.length * 16);
  positions.forEach((p, i) => {
    const m = new THREE.Matrix4();
    m.makeTranslation(p.x, p.y, p.z);
    m.scale(new THREE.Vector3(p.scale, p.scale, p.scale));
    m.makeRotationY(p.rotY).multiply(m);
    matrices.set(m.elements, i * 16);
  });
  return new THREE.InstancedBufferAttribute(matrices, 16);
}

export function makeInstanceColor(positions: { color: THREE.Color }[]) {
  const colors = new Float32Array(positions.length * 3);
  positions.forEach((p, i) => {
    colors[i * 3] = p.color.r;
    colors[i * 3 + 1] = p.color.g;
    colors[i * 3 + 2] = p.color.b;
  });
  return new THREE.InstancedBufferAttribute(colors, 3);
}

export function getMeshData(nodes: any) {
  for (const key of Object.keys(nodes)) {
    const node = nodes[key];
    if (node?.geometry) return { geometry: node.geometry, material: node.material };
  }
  return { geometry: new THREE.BufferGeometry(), material: new THREE.MeshStandardMaterial() };
}

// Trees
export function InstancedTrees() {
  const { nodes } = useGLTF(TREE_ASSETS.twisted);
  const { geometry, material } = getMeshData(nodes);

  const instances = TREE_SPOTS.map((spot) => ({
    x: spot.x,
    y: 0,
    z: spot.z,
    scale: 1.0 + Math.random() * 0.15,
    rotY: Math.random() * Math.PI * 2,
    color: new THREE.Color().setHSL(0.32, 0.4, 0.35 + Math.random() * 0.1),
  }));

  const instanceMatrix = makeInstanceMatrix(instances);
  const instanceColor = makeInstanceColor(instances);

  return (
    <instancedMesh
      args={[geometry, material, instances.length]}
      instanceMatrix={instanceMatrix}
      instanceColor={instanceColor}
      castShadow
      receiveShadow
    />
  );
}

// Bushes
export function InstancedBushes() {
  const { nodes } = useGLTF(BUSH_ASSET);
  const { geometry, material } = getMeshData(nodes);

  const instances = BUSH_SPOTS.map((spot) => ({
    x: spot.x,
    y: 0,
    z: spot.z,
    scale: 0.8 + Math.random() * 0.4,
    rotY: Math.random() * Math.PI * 2,
    color: new THREE.Color().setHSL(0.3, 0.35, 0.25 + Math.random() * 0.1),
  }));

  const instanceMatrix = makeInstanceMatrix(instances);
  const instanceColor = makeInstanceColor(instances);

  return (
    <instancedMesh
      args={[geometry, material, instances.length]}
      instanceMatrix={instanceMatrix}
      instanceColor={instanceColor}
      castShadow
      receiveShadow
    />
  );
}

// Grass
export function InstancedGrass() {
  const { nodes } = useGLTF(GRASS_ASSETS[0]);
  const { geometry, material } = getMeshData(nodes);

  const instances = GRASS_SPOTS.map((spot) => ({
    x: spot.x,
    y: 0,
    z: spot.z,
    scale: 0.7 + Math.random() * 0.3,
    rotY: Math.random() * Math.PI * 2,
    color: new THREE.Color().setHSL(0.3, 0.4, 0.3 + Math.random() * 0.1),
  }));

  const instanceMatrix = makeInstanceMatrix(instances);
  const instanceColor = makeInstanceColor(instances);

  return (
    <instancedMesh
      args={[geometry, material, instances.length]}
      instanceMatrix={instanceMatrix}
      instanceColor={instanceColor}
      castShadow
      receiveShadow
    />
  );
}

// Flowers (simple quads)
export function InstancedFlowers() {
  const geometry = new THREE.PlaneGeometry(0.3, 0.3);
  const { nodes } = useGLTF(GRASS_ASSETS[0]);
  const { material } = getMeshData(nodes);
  if (material) {
    material.side = THREE.DoubleSide;
    material.transparent = true;
    material.alphaTest = 0.1;
  }

  const instances = FLOWER_SPOTS.map((spot) => ({
    x: spot.x,
    y: 0.15,
    z: spot.z,
    scale: 0.7 + Math.random() * 0.3,
    rotY: Math.random() * Math.PI * 2,
    color: new THREE.Color(spot.color),
  }));

  const instanceMatrix = makeInstanceMatrix(instances);
  const instanceColor = makeInstanceColor(instances);

  return (
    <instancedMesh
      args={[geometry, material, instances.length]}
      instanceMatrix={instanceMatrix}
      instanceColor={instanceColor}
    />
  );
}

// Rocks
export function InstancedRocks() {
  const { nodes } = useGLTF(ROCK_ASSETS[0]);
  const { geometry, material } = getMeshData(nodes);

  const instances = ROCK_SPOTS.map((spot) => ({
    x: spot.x,
    y: 0,
    z: spot.z,
    scale: 0.8 + Math.random() * 0.4,
    rotY: Math.random() * Math.PI * 2,
    color: new THREE.Color().setHSL(0.08, 0.1, 0.3 + Math.random() * 0.1),
  }));

  const instanceMatrix = makeInstanceMatrix(instances);
  const instanceColor = makeInstanceColor(instances);

  return (
    <instancedMesh
      args={[geometry, material, instances.length]}
      instanceMatrix={instanceMatrix}
      instanceColor={instanceColor}
      castShadow
      receiveShadow
    />
  );
}

// Main vegetation group
export function Vegetation() {
  return (
    <group>
      <InstancedTrees />
      <InstancedBushes />
      <InstancedGrass />
      <InstancedFlowers />
      <InstancedRocks />
    </group>
  );
}