/**
 * Clouds — 3-layer volumetric procedural clouds using custom shader.
 * Layer 0: distant high clouds (large, slow)
 * Layer 1: mid clouds
 * Layer 2: near clouds (smaller, faster)
 */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CloudMaterial } from '../shaders/materials';
import * as THREE from 'three';

function CloudLayer({ layer, count, radius, y, scale }: {
  layer: 0 | 1 | 2;
  count: number;
  radius: number;
  y: number;
  scale: number;
}) {
  const material = useMemo(() => new CloudMaterial({
    uSunDir: new THREE.Vector3(0.3, 0.75, 0.4),
    uSunColor: new THREE.Color(0xfff5d8),
    uCloudColor: new THREE.Color(0xffffff),
    uShadowColor: new THREE.Color(0xc8d8e8),
    uLayer: layer,
  }), []);

  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });

  // Deterministic positions (seed = layer * 1000)
  const matrices = new Float32Array(count * 16);
  const seededRandom = (seed: number) => {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  };
  const rand = seededRandom(layer * 1000 + 42);

  for (let i = 0; i < count; i++) {
    const r = radius * (0.7 + rand() * 0.3);
    const theta = rand() * Math.PI * 2;
    const phi = (rand() - 0.5) * 0.3;
    const x = r * Math.cos(theta) * Math.cos(phi);
    const z = r * Math.sin(theta) * Math.cos(phi);
    const yPos = y + r * Math.sin(phi);

    const m = new THREE.Matrix4();
    m.makeTranslation(x, yPos, z);
    const s = scale * (0.7 + rand() * 0.5);
    m.scale(new THREE.Vector3(s, s * 0.5, s));
    m.makeRotationY(rand() * Math.PI * 2).multiply(m);

    matrices.set(m.elements, i * 16);
  }

  const instanceMatrix = new THREE.InstancedBufferAttribute(matrices, 16);

  return (
    <instancedMesh
      args={[new THREE.IcosahedronGeometry(1, 1), material, count]}
      instanceMatrix={instanceMatrix}
    />
  );
}

export function Clouds() {
  return (
    <group renderOrder={-5}>
      {/* Layer 0: High, distant, large, slow */}
      <CloudLayer layer={0} count={6} radius={80} y={60} scale={25} />
      {/* Layer 1: Mid */}
      <CloudLayer layer={1} count={8} radius={50} y={35} scale={15} />
      {/* Layer 2: Near, smaller, faster */}
      <CloudLayer layer={2} count={10} radius={35} y={22} scale={8} />
    </group>
  );
}