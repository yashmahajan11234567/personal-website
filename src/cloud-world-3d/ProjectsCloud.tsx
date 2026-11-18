import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import {
  PROJECTS_CLOUD_X,
  PROJECTS_CLOUD_Z,
  CLOUD_DOOR_Z,
  CLOUD_SCALE,
  terrainHeight,
} from './world';

// ============================================================
// ProjectsCloud — the giant enterable cloud building.
// Exterior: smooth metaball surface via MarchingCubes.
// Interior doorway, sign, lanterns, steps, cobble, plants preserved.
// All architecture derived from CLOUD_SCALE (≈2.5×).
// ============================================================

// Metaball definition (local units, will be multiplied by CLOUD_SCALE).
// Hand-tuned to give a fluffy, cohesive cloud ~140×90×115 world units.
const METABALLS: { x: number; y: number; z: number; r: number }[] = [
  // Base layer — broad, slightly flattened
  { x: -18, y: 6, z: 4, r: 22 },
  { x: 18, y: 6, z: 4, r: 22 },
  { x: -28, y: 9, z: 0, r: 16 },
  { x: 28, y: 9, z: -2, r: 16 },
  { x: 0, y: 18, z: -1, r: 14 },
  { x: -20, y: 12, z: -6, r: 12 },
  { x: 20, y: 12, z: 6, r: 12 },
  { x: -12, y: 22, z: -2, r: 11 },
  { x: 12, y: 22, z: 2, r: 11 },
  { x: 0, y: 30, z: 0, r: 10 },
  { x: -30, y: 8, z: -8, r: 10 },
  { x: 30, y: 8, z: 8, r: 10 },
  { x: -14, y: 16, z: -10, r: 9 },
  { x: 14, y: 16, z: 10, r: 9 },
  { x: 0, y: 12, z: 14, r: 11 },
];

// Procedural texture generators (run once per session)
function generateAlbedoTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Base gradient: darker underside → bright crown
  const grad = ctx.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0, '#E8DCC8'); // warm shade
  grad.addColorStop(0.45, '#FAF3E4'); // mid cream
  grad.addColorStop(1, '#FFFDF8'); // highlight
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // Overlay low-frequency noise for organic variation
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random() * 0.06 - 0.03; // ±3% luminance jitter
    data[i] = Math.min(255, Math.max(0, data[i] + n * 255));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 255));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 255));
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function generateRoughnessTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // High-frequency noise → roughness variation 0.85–0.98
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Simple value noise via hash
      const h = ((x * 1291 + y * 7919 + 1337) * 2654435761) >>> 0;
      const v = (h / 0xffffffff) * 0.13 + 0.85; // 0.85–0.98
      const idx = (y * size + x) * 4;
      const val = Math.round(v * 255);
      data[idx] = data[idx + 1] = data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.NoColorSpace; // data texture
  return tex;
}

function generateNormalTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Generate a height field first (same hash as roughness but lower freq)
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = ((x * 431 + y * 967 + 9001) * 2654435761) >>> 0;
      height[y * size + x] = (h / 0xffffffff) * 0.5; // 0–0.5
    }
  }
  // Sobel to normal map (tangent space, +Z up)
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const hl = height[y * size + (x - 1)];
      const hr = height[y * size + (x + 1)];
      const ht = height[(y - 1) * size + x];
      const hb = height[(y + 1) * size + x];
      const dx = (hr - hl) * 0.5;
      const dy = (hb - ht) * 0.5;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  // edges
  for (let y = 0; y < size; y++) {
    const idx = y * size * 4;
    data[idx] = data[idx + 1] = 128; data[idx + 2] = 255; data[idx + 3] = 255;
    const idx2 = (y + 1) * size * 4 - 4;
    data[idx2] = data[idx2 + 1] = 128; data[idx2 + 2] = 255; data[idx2 + 3] = 255;
  }
  for (let x = 0; x < size; x++) {
    const idx = x * 4;
    data[idx] = data[idx + 1] = 128; data[idx + 2] = 255; data[idx + 3] = 255;
    const idx2 = (size - 1) * size * 4 + x * 4;
    data[idx2] = data[idx2 + 1] = 128; data[idx2 + 2] = 255; data[idx2 + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function buildSignTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8B5E34';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(90, 60, 35, 0.18)';
  for (let i = 0; i < 5; i++) ctx.fillRect(0, 30 + i * 46, w, 8);
  const txt = 'PROJECTS';
  let fontSize = 170;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (fontSize > 60) {
    ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
    if (ctx.measureText(txt).width <= w * 0.8) break;
    fontSize -= 12;
  }
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.92)';
  ctx.strokeText(txt, w / 2, h / 2 + 6);
  ctx.fillStyle = '#33200F';
  ctx.fillText(txt, w / 2, h / 2 + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ProjectsCloud({
  insideRef,
  avatarPosRef,
}: {
  /** true while the player is inside the cloud interior */
  insideRef: React.RefObject<boolean>;
  /** live avatar position, drives the door swing */
  avatarPosRef: React.RefObject<THREE.Vector3 | null>;
}) {
  const S = CLOUD_SCALE;
  const groundY = terrainHeight(PROJECTS_CLOUD_X, PROJECTS_CLOUD_Z);

  // ---- Metaball cloud geometry (MarchingCubes) ----
  const cloudGeo = useMemo(() => {
    const resolution = 80; // voxel resolution — balance detail / perf
    const mc = new MarchingCubes(resolution, new THREE.MeshStandardMaterial(), true, false);
    mc.isolation = 85; // iso-surface threshold
    // Add scaled metaballs
    for (const b of METABALLS) {
      mc.addBall(b.x * S, b.y * S, b.z * S, b.r * S, 1.0);
    }
    mc.update();
    const geo = mc.geometry;
    geo.computeVertexNormals();
    // The MarchingCubes geometry is centered at (0,0,0). Translate so its base sits near groundY.
    // Find min Y to align bottom.
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    let minY = Infinity;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < minY) minY = y;
    }
    geo.translate(0, -minY + 0.5, 0); // slight lift so base kisses terrain
    return geo;
  }, []);

  // ---- Procedural hybrid materials ----
  const cloudMat = useMemo(() => {
    const albedo = generateAlbedoTexture();
    const rough = generateRoughnessTexture();
    const normal = generateNormalTexture();
    return new THREE.MeshStandardMaterial({
      map: albedo,
      roughnessMap: rough,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.92,
      metalness: 0.0,
    });
  }, []);

  // ---- Architectural materials (unchanged palette) ----
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8B5E34', roughness: 0.9 }), []);
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5A4632', roughness: 0.95 }), []);
  const stoneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#B09578', roughness: 1, flatShading: true }),
    [],
  );
  const lanternMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFD9A0',
        emissive: new THREE.Color('#FFB45E'),
        emissiveIntensity: 1.6,
        roughness: 0.4,
      }),
    [],
  );
  const borderMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFD9A0',
        emissive: new THREE.Color('#FFB45E'),
        emissiveIntensity: 0.9,
        roughness: 0.5,
      }),
    [],
  );
  const signTex = useMemo(buildSignTexture, []);
  const signTitleMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  const doorwayMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#241812' }), []);

  // ---- Door swing logic (same as before, scaled positions) ----
  const doorPivotRef = useRef<THREE.Group>(null);
  const doorwayRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const avatar = avatarPosRef.current;
    const inside = insideRef.current;
    let open = inside;
    if (avatar) {
      const d = Math.hypot(avatar.x - PROJECTS_CLOUD_X, avatar.z - CLOUD_DOOR_Z);
      if (d < 7 * S) open = true;
    }
    if (doorPivotRef.current) {
      const target = open ? -1.75 : 0;
      const k = 1 - Math.exp(-6 * Math.min(delta, 1 / 30));
      doorPivotRef.current.rotation.y += (target - doorPivotRef.current.rotation.y) * k;
    }
    if (doorwayRef.current) doorwayRef.current.visible = !inside;
    // lantern pulse — never fully dark
    const t = performance.now() / 1000;
    lanternMat.emissiveIntensity = 1.4 + Math.sin(t * 1.4) * 0.25;
    borderMat.emissiveIntensity = 0.95 + Math.sin(t * 1.3) * 0.2;
  });

  // QA instrumentation
  if (typeof window !== 'undefined') {
    (window as any).__cwProjectsCloud = {
      x: PROJECTS_CLOUD_X,
      z: PROJECTS_CLOUD_Z,
      groundY,
      doorZ: CLOUD_DOOR_Z,
    };
  }

  const doorZ = CLOUD_DOOR_Z - PROJECTS_CLOUD_Z; // local z of the door plane

  // Resource cleanup on unmount
  useEffect(() => {
    return () => {
      cloudGeo.dispose();
      cloudMat.map?.dispose();
      cloudMat.roughnessMap?.dispose();
      cloudMat.normalMap?.dispose();
      cloudMat.dispose();
      woodMat.dispose();
      frameMat.dispose();
      stoneMat.dispose();
      lanternMat.dispose();
      borderMat.dispose();
      signTex.dispose();
      signTitleMat.dispose();
      doorwayMat.dispose();
    };
  }, []);

  return (
    <group position={[PROJECTS_CLOUD_X, groundY, PROJECTS_CLOUD_Z]}>
      {/* Smooth metaball cloud body */}
      <mesh geometry={cloudGeo} material={cloudMat} castShadow receiveShadow />

      {/* Door frame: posts + arch (scaled) */}
      <mesh castShadow material={frameMat} position={[-3.5 * S, 3.9 * S, doorZ]}>
        <boxGeometry args={[0.8 * S, 7.8 * S, 0.8 * S]} />
      </mesh>
      <mesh castShadow material={frameMat} position={[3.5 * S, 3.9 * S, doorZ]}>
        <boxGeometry args={[0.8 * S, 7.8 * S, 0.8 * S]} />
      </mesh>
      <mesh castShadow material={frameMat} position={[0, 7.8 * S, doorZ]}>
        <torusGeometry args={[3.5 * S, 0.45 * S, 10, 22, Math.PI]} />
      </mesh>

      {/* Dark doorway behind the slab (hidden once inside) */}
      <mesh ref={doorwayRef} position={[0, 3.8 * S, doorZ + 0.5 * S]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[6.4 * S, 7.6 * S]} />
        <primitive object={doorwayMat} attach="material" />
      </mesh>
      {/* Warm glow at threshold */}
      <pointLight position={[0, 4.5 * S, doorZ + 2.5 * S]} color="#FFB45E" intensity={12 * S} distance={18 * S} decay={2} />

      {/* Swinging door slab, pivoted on left post */}
      <group ref={doorPivotRef} position={[-3.2 * S, 0, doorZ]}>
        <mesh castShadow material={woodMat} position={[3.2 * S, 3.8 * S, 0.08 * S]}>
          <boxGeometry args={[6.4 * S, 7.6 * S, 0.35 * S]} />
        </mesh>
        <mesh material={frameMat} position={[3.2 * S, 5.6 * S, 0.29 * S]}>
          <boxGeometry args={[4.4 * S, 3.0 * S, 0.08 * S]} />
        </mesh>
        <mesh material={frameMat} position={[3.2 * S, 1.8 * S, 0.29 * S]}>
          <boxGeometry args={[4.4 * S, 2.6 * S, 0.08 * S]} />
        </mesh>
      </group>

      {/* Stone steps + cobble entrance path (scaled) */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`step-${i}`}
          castShadow
          receiveShadow
          material={stoneMat}
          position={[0, 0.12 * S - i * 0.05 * S, doorZ - 1.1 * S - i * 1.3 * S]}
          scale={[1 + i * 0.16, 1, 1]}
        >
          <cylinderGeometry args={[4.4 * S, 4.7 * S, 0.3 * S, 16]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh
          key={`cob-${i}`}
          receiveShadow
          material={stoneMat}
          position={[Math.sin(i * 1.7) * 0.8 * S, 0.07 * S, doorZ - 5.2 * S - i * 1.6 * S]}
          rotation={[0, i * 0.9, 0]}
        >
          <cylinderGeometry args={[1.05 * S, 1.2 * S, 0.16 * S, 7]} />
        </mesh>
      ))}

      {/* PROJECTS sign above door (scaled) */}
      <group position={[0, 0, doorZ + 0.4 * S]}>
        <mesh castShadow material={frameMat} position={[-5.1 * S, 8.3 * S, 0]}>
          <boxGeometry args={[0.4 * S, 16.6 * S, 0.4 * S]} />
        </mesh>
        <mesh castShadow material={frameMat} position={[5.1 * S, 8.3 * S, 0]}>
          <boxGeometry args={[0.4 * S, 16.6 * S, 0.4 * S]} />
        </mesh>
        <mesh castShadow receiveShadow material={woodMat} position={[0, 15.0 * S, 0]}>
          <boxGeometry args={[10.2 * S, 2.8 * S, 0.35 * S]} />
        </mesh>
        {/* Frame beams */}
        {(
          [
            [0, 16.45 * S, 9.95 * S, 0.4 * S],
            [0, 13.55 * S, 9.95 * S, 0.4 * S],
            [-5.15 * S, 15.0 * S, 0.4 * S, 3.1 * S],
            [5.15 * S, 15.0 * S, 0.4 * S, 3.1 * S],
          ] as [number, number, number, number][]
        ).map(([x, y, w, h], i) => (
          <mesh key={i} castShadow material={frameMat} position={[x, y, -0.22 * S]}>
            <boxGeometry args={[w, h, 0.45 * S]} />
          </mesh>
        ))}
        {/* Emissive border */}
        {(
          [
            [0, 16.15 * S, 9.4 * S, 0.15 * S],
            [0, 13.85 * S, 9.4 * S, 0.15 * S],
            [-4.8 * S, 15.0 * S, 0.15 * S, 2.45 * S],
            [4.8 * S, 15.0 * S, 0.15 * S, 2.45 * S],
          ] as [number, number, number, number][]
        ).map(([x, y, w, h], i) => (
          <mesh key={`b${i}`} material={borderMat} position={[x, y, -0.27 * S]}>
            <boxGeometry args={[w, h, 0.08 * S]} />
          </mesh>
        ))}
        {/* Title plane */}
        <mesh position={[0, 15.0 * S, -0.19 * S]} rotation={[0, Math.PI, 0]} scale={[9.6 * S, 2.5 * S, 1]}>
          <planeGeometry args={[1, 1]} />
          <primitive object={signTitleMat} attach="material" />
        </mesh>
        {/* Warm wash light on sign face */}
        <pointLight position={[0, 15.0 * S, -4.5 * S]} color="#FFC069" intensity={9 * S} distance={18 * S} decay={2} />
      </group>

      {/* Flanking entrance lanterns (scaled) */}
      {[-6.8 * S, 6.8 * S].map((lx) => (
        <group key={lx} position={[lx, 0, doorZ - 1.5 * S]}>
          <mesh castShadow material={frameMat} position={[0, 2.4 * S, 0]}>
            <cylinderGeometry args={[0.14 * S, 0.17 * S, 4.8 * S, 8]} />
          </mesh>
          <mesh position={[0, 5.0 * S, 0]} material={lanternMat}>
            <sphereGeometry args={[0.45 * S, 12, 10]} />
          </mesh>
          <pointLight position={[0, 5.0 * S, 0]} color="#FFB45E" intensity={16 * S} distance={20 * S} decay={2} />
        </group>
      ))}

      {/* Potted plants flanking entrance (scaled) */}
      {[-10.5 * S, 10.5 * S].map((lx) => (
        <group key={`p${lx}`} position={[lx, 0, doorZ - 0.8 * S]}>
          <mesh castShadow material={frameMat}>
            <cylinderGeometry args={[0.8 * S, 0.68 * S, 1.0 * S, 10]} />
          </mesh>
          <mesh castShadow position={[0, 2.0 * S, 0]} material={new THREE.MeshStandardMaterial({ color: '#4A7A33', roughness: 0.9 })}>
            <icosahedronGeometry args={[1.35 * S, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}