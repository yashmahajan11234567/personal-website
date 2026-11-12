/**
 * Distant Mountains — layered stylized mountains with atmospheric perspective.
 * Multiple depth layers, flat-shaded, Garden Warfare silhouette style.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

const LAYERS = [
  // Far layer - blue/purple, low detail
  { count: 8, radius: 180, height: [18, 35], baseY: -10, color: { h: 0.62, s: 0.35, l: 0.42 }, opacity: 0.6 },
  // Mid layer - teal/green, medium detail
  { count: 10, radius: 140, height: [25, 45], baseY: -5, color: { h: 0.48, s: 0.3, l: 0.4 }, opacity: 0.8 },
  // Near layer - warm earth tones, more detail
  { count: 12, radius: 100, height: [30, 55], baseY: 0, color: { h: 0.55, s: 0.25, l: 0.38 }, opacity: 1.0 },
];

export function DistantMountains() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    const seededRandom = (seed: number) => {
      let s = seed >>> 0;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
    };

    LAYERS.forEach((layer, layerIdx) => {
      const rand = seededRandom(layerIdx * 1000 + 42);
      const colorBase = new THREE.Color().setHSL(layer.color.h, layer.color.s, layer.color.l);

      for (let i = 0; i < layer.count; i++) {
        const theta = (i / layer.count) * Math.PI * 2 + rand() * 0.15;
        const r = layer.radius + (rand() - 0.5) * 15;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        const h = layer.height[0] + rand() * (layer.height[1] - layer.height[0]);
        const baseRadius = 6 + rand() * 5;

        // Create mountain as merged cone + noise
        const coneGeo = new THREE.ConeGeometry(baseRadius, h, 5 + Math.floor(rand() * 3));
        coneGeo.translate(x, layer.baseY + h * 0.3, z);

        // Noise deformation for interesting silhouette
        const pos = coneGeo.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const vx = pos.getX(v);
          const vy = pos.getY(v);
          const vz = pos.getZ(v);
          const n = Math.sin(vx * 0.08 + rand() * 10) * Math.cos(vz * 0.08 + rand() * 10) * 0.6;
          pos.setX(v, vx + n);
          pos.setZ(v, vz + n);
          // Ridge pinch near top
          if (vy > h * 0.6) {
            const pinch = (vy - h * 0.6) / (h * 0.4) * 0.3;
            pos.setX(v, pos.getX(v) * (1 - pinch));
            pos.setZ(v, pos.getZ(v) * (1 - pinch));
          }
        }
        coneGeo.computeVertexNormals();

        // Merge
        const p = coneGeo.attributes.position;
        const n = coneGeo.attributes.normal;
        for (let v = 0; v < p.count; v++) {
          positions.push(p.getX(v), p.getY(v), p.getZ(v));
          normals.push(n.getX(v), n.getY(v), n.getZ(v));
          // Color variation by height with atmospheric perspective
          const y = p.getY(v) - layer.baseY;
          const t = Math.min(1, y / h);
          const c = colorBase.clone();
          // Higher = cooler/darker
          c.offsetHSL(0, 0, -t * 0.12);
          // Add slight hue shift for variety
          c.offsetHSL((rand() - 0.5) * 0.04, 0, 0);
          colors.push(c.r, c.g, c.b);
        }
      }
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, []);

  const material = useMemo(() =>
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true,
    }), []);

  return (
    <mesh
      geometry={geometry}
      material={material}
      receiveShadow
      position={[0, -5, 0]}
    />
  );
}