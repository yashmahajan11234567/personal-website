import { useMemo } from 'react';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  displacedSphereGeometry,
  terrainColorAt,
  terrainHeight,
} from './world';

// Continuous terrain: one displaced plane covering the whole journey
// (z -120 .. 260), colored per-vertex. Replaces the old flat green plane +
// floating translucent hill spheres + cone mountains.
const SIZE_X = 300;
const SIZE_Z = 380;
const CENTER_Z = 70; // plane spans z = CENTER_Z ± SIZE_Z/2 → -120..260
const SEG_X = 120;
const SEG_Z = 152;

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE_X, SIZE_Z, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + CENTER_Z;
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      terrainColorAt(x, z, h, c);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.translate(0, 0, CENTER_Z);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.88} metalness={0} />
    </mesh>
  );
}

// Distant mountain ranges: smooth lumpy domes (not 6-segment cones), opaque,
// grounded, fading into the warm fog for real atmospheric perspective.
// Heights varied 26–58 for a livelier ridgeline; 4 mid-distance domes
// (radius ~30) layered between valley and far range for depth.
// [x, z, radius, height, colorIndex, seed]
type MountainSpec = [number, number, number, number, number, number];
const MOUNTAINS: MountainSpec[] = [
  // Far ring
  [-95, -60, 42, 30, 0, 1.3],
  [-45, -95, 50, 50, 1, 2.7],
  [10, -105, 55, 42, 0, 4.1],
  [70, -92, 46, 58, 1, 5.9],
  [120, -55, 48, 26, 0, 7.2],
  [-130, -15, 52, 36, 1, 8.6],
  [135, 5, 50, 44, 0, 9.4],
  [-120, 75, 44, 28, 1, 10.8],
  [125, 85, 46, 32, 0, 11.5],
  [-90, 150, 40, 26, 1, 12.9],
  [95, 155, 42, 30, 0, 13.7],
  [-30, -120, 60, 52, 1, 14.2],
  // Mid-distance layer (closer, smaller — depth between valley and far ring)
  [-62, -38, 30, 20, 1, 21.3],
  [55, -42, 28, 24, 0, 22.7],
  [-28, -52, 26, 18, 1, 24.1],
  [38, -30, 27, 22, 0, 25.9],
];
const MOUNTAIN_COLORS = ['#D9B48F', '#C9A075'];

export function DistantMountains() {
  // All 16 mountain domes MERGED into one geometry with baked vertex colors
  // (per-mountain hue/lightness jitter preserved) — 1 draw call instead of
  // 16, and 1 shadow-pass draw instead of 16.
  const mergedGeo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    MOUNTAINS.forEach(([x, z, radius, height, colorIdx, seed]) => {
      const g = displacedSphereGeometry(1, 4, 0.16, seed);
      const c = new THREE.Color(MOUNTAIN_COLORS[colorIdx]);
      c.offsetHSL(
        (((seed * 13.7) % 1) - 0.5) * 0.04,
        0,
        (((seed * 7.3) % 1) - 0.5) * 0.05,
      );
      const count = g.attributes.position.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      g.rotateY(seed * 0.7);
      g.scale(radius, height, radius * 0.8);
      g.translate(x, terrainHeight(x, z) + height * 0.18, z);
      geos.push(g);
    });
    return mergeGeometries(geos, false);
  }, []);

  return (
    <mesh geometry={mergedGeo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}
