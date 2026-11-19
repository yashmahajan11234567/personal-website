import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import {
  PROJECTS_CLOUD_X,
  PROJECTS_CLOUD_Z,
  CLOUD_DOOR_Z,
  CLOUD_DOOR_CUT_DEPTH,
  CLOUD_DOOR_HALF,
  CLOUD_INTERIOR_R,
  CLOUD_SCALE,
  CLOUD_SHELL_DOOR_HALF,
  CLOUD_SHELL_DOOR_TOP,
  displacedSphereGeometry,
  mulberry32,
  terrainHeight,
} from './world';

// ============================================================
// ProjectsCloud — the medium enterable cloud building.
// Exterior: smooth metaball surface via MarchingCubes.
// Double wooden door, sign, lanterns, steps, cobble, plants,
// rocks/flowers around the base — all preserved.
// All architecture derived from CLOUD_SCALE.
// ============================================================

// Cloud lobes in LOCAL units (multiplied by CLOUD_SCALE on the mesh).
// Reference silhouette: a fluffy multi-lobed cartoon cloud — one wide soft
// base, bulbous lower side formations, scalloped upper-mid shoulders and a
// massive central upper cloud with crown tufts. Lobes overlap heavily and
// the smooth-union SDF (k=1.2) blends them into ONE continuous fluffy
// surface: scalloped outline with visible lobe bumps, no hard ball seams.
//
// 2026-11-19 calibration: added a low "skirt ring" (y≈2.2 lobes) so the base
// is wide enough to conceal the interior floor rim (r=27.6 world) at ground
// level, and extended the rear lobes (+z) so the whole rear of the interior
// shell/gallery stays hidden from exterior viewpoints. Front base bumps keep
// their original z so the frozen door corridor cut still opens the facade.
type CloudLobe = { x: number; y: number; z: number; r: number; sy: number };
const CLOUD_LOBES: CloudLobe[] = [
  // ---- base: wide, low, soft mass merging into the ground ----
  { x: 0, y: 4.5, z: 3, r: 17, sy: 0.42 },
  // ---- low skirt ring: hides the interior floor/baseboard rim at ground level ----
  { x: -16, y: 2.2, z: 0, r: 8.5, sy: 0.35 },
  { x: 16, y: 2.2, z: 0, r: 8.5, sy: 0.35 },
  { x: -10, y: 2.2, z: 7.5, r: 7.5, sy: 0.4 },
  { x: 10, y: 2.2, z: 7.5, r: 7.5, sy: 0.4 },
  { x: 0, y: 1.2, z: 13.5, r: 8, sy: 0.3 }, // rear skirt — covers floor rim at the back
  { x: -15, y: 1.5, z: -9, r: 7, sy: 0.3 },
  { x: 15, y: 1.5, z: -9, r: 7, sy: 0.3 },
  { x: -10, y: 2.2, z: -7, r: 7, sy: 0.4 },
  { x: 10, y: 2.2, z: -7, r: 7, sy: 0.4 },
  // ---- mid sides ----
  { x: -13, y: 6, z: 1, r: 8.5, sy: 0.6 },
  { x: 13, y: 6, z: 1, r: 8.5, sy: 0.6 },
  { x: -8.5, y: 6.5, z: -6, r: 7.5, sy: 0.65 },
  { x: 8.5, y: 6.5, z: -6, r: 7.5, sy: 0.65 },
  // front base — three bumps framing the door (scalloped front rim)
  { x: -4.5, y: 6, z: -10, r: 5, sy: 0.7 },
  { x: 0, y: 6.5, z: -11, r: 5.5, sy: 0.65 },
  { x: 4.5, y: 6, z: -10, r: 5, sy: 0.7 },
  // ---- lower side bulges (wide facade) ----
  { x: -18, y: 10.5, z: -2, r: 8, sy: 0.75 },
  { x: 18, y: 10.5, z: -2, r: 8, sy: 0.75 },
  { x: -12, y: 12.5, z: 4, r: 8, sy: 0.8 },
  { x: 12, y: 12.5, z: 4, r: 8, sy: 0.8 },
  { x: 0, y: 13, z: 7.5, r: 8.5, sy: 0.75 }, // back mid — extended rearward
  // ---- upper-mid shoulders (scalloped) ----
  { x: -6.5, y: 15, z: -5.5, r: 7.5, sy: 0.82 },
  { x: 6.5, y: 15, z: -5.5, r: 7.5, sy: 0.82 },
  { x: -9.5, y: 17.5, z: 2, r: 8, sy: 0.85 },
  { x: 9.5, y: 17.5, z: 2, r: 8, sy: 0.85 },
  { x: 0, y: 17.5, z: 7, r: 7.5, sy: 0.8 }, // upper back — extended rearward
  // ---- rear fill lobes: lowered and extended so no gap band remains between
  //      the skirt and the upper lobes (hides displays/lanterns from behind) ----
  { x: 0, y: 7.5, z: 10.5, r: 8.5, sy: 0.8 },
  { x: -8, y: 9.5, z: 11, r: 8, sy: 0.8 },
  { x: 8, y: 9.5, z: 11, r: 8, sy: 0.8 },
  { x: 0, y: 17, z: 10, r: 6.5, sy: 0.8 },
  { x: 0, y: 20, z: 6, r: 7, sy: 0.9 }, // rear crown scallop
  // ---- rear low wedge: closes the sightline gap between skirt top and the
  //      rear fill lobes so no rear camera angle sees into the gallery ----
  { x: 0, y: 4, z: 14.5, r: 8.5, sy: 0.55 },
  { x: -9, y: 5, z: 14, r: 7.5, sy: 0.6 },
  { x: 9, y: 5, z: 14, r: 7.5, sy: 0.6 },
  // ---- one dominant central top mass (reference: a single big crown
  //      sphere, not multiple tufts) flanked by two smaller lobes ----
  { x: 0, y: 21.5, z: 1, r: 10.5, sy: 1.0 },
  { x: -5.5, y: 19.5, z: -1.5, r: 7.5, sy: 0.9 },
  { x: 5.5, y: 19.5, z: 1.5, r: 7.5, sy: 0.9 },
];

// Sampling domain in local units. MarchingCubes vertices live in normalized
// [-1, 1] space, so after `update()` the geometry is scaled by these half
// extents and translated by these centers to recover local world units.
const CLOUD_DOMAIN = {
  xMin: -28, xMax: 28,
  yMin: -2, yMax: 36,
  // zMax=26: the rear closure lobes reach local z≈23; the sampling domain must
  // extend past them or MarchingCubes cuts the surface open at the boundary
  // (a hole in the rear that exposes the interior shell).
  zMin: -24, zMax: 26,
} as const;
const CLOUD_HALF = {
  x: (CLOUD_DOMAIN.xMax - CLOUD_DOMAIN.xMin) / 2,
  y: (CLOUD_DOMAIN.yMax - CLOUD_DOMAIN.yMin) / 2,
  z: (CLOUD_DOMAIN.zMax - CLOUD_DOMAIN.zMin) / 2,
};
const CLOUD_CENTER = {
  x: (CLOUD_DOMAIN.xMax + CLOUD_DOMAIN.xMin) / 2,
  y: (CLOUD_DOMAIN.yMax + CLOUD_DOMAIN.yMin) / 2,
  z: (CLOUD_DOMAIN.zMax + CLOUD_DOMAIN.zMin) / 2,
};

function ellipsoidSDF(x: number, y: number, z: number, rx: number, ry: number, rz: number): number {
  return Math.hypot(x / rx, y / ry, z / rz) - 1;
}
function boxSDF(x: number, y: number, z: number, hx: number, hy: number, hz: number): number {
  const dx = Math.abs(x) - hx, dy = Math.abs(y) - hy, dz = Math.abs(z) - hz;
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0), oz = Math.max(dz, 0);
  return Math.hypot(ox, oy, oz) + Math.min(Math.max(dx, Math.max(dy, dz)), 0);
}
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}
function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

// Signed distance to the solid cloud body with the doorway corridor
// subtracted. All inputs are LOCAL units (world / CLOUD_SCALE).
function cloudBodySDF(x: number, y: number, z: number): number {
  const S = CLOUD_SCALE;
  const shellR = CLOUD_INTERIOR_R / S;
  let d = Infinity;
  for (const b of CLOUD_LOBES) {
    d = smin(d, ellipsoidSDF(x - b.x, y - b.y, z - b.z, b.r, b.r * b.sy, b.r), 1.2);
  }
  // NOTE: no interior-cavity subtraction here. The exterior cloud is a SOLID
  // lobe union (the interior room is rendered by the shell mesh in
  // ProjectsCloudInterior, which is what the player sees once inside). A
  // cavity carve here would hollow the facade and let the shell's outer
  // backface show through — that is what made the building read as a smooth
  // tan mound instead of a fluffy white cloud.
  // Door corridor through the front (-z) face.
  const doorHalf = CLOUD_SHELL_DOOR_HALF / S;
  const doorTop = CLOUD_SHELL_DOOR_TOP / S;
  const doorDepth = CLOUD_DOOR_CUT_DEPTH / S;
  const doorCenterZ = -shellR + doorDepth / 2;
  d = smax(d, -boxSDF(x, y - doorTop / 2, z - doorCenterZ, doorHalf, doorTop / 2, doorDepth / 2 + 1.2), 0.45);
  return d;
}

// Procedural texture generators (run once per session)
function generateAlbedoTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Base gradient: darker underside → bright crown (kept subtle so no UV banding reads)
  const grad = ctx.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0, '#F5F0E6'); // soft warm shade (less tan than before)
  grad.addColorStop(0.45, '#FDFBF6'); // near-white cream
  grad.addColorStop(1, '#FFFFFF'); // bright crown — reference clouds read white, not tan
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
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    if (ctx.measureText(txt).width <= w * 0.8) break;
    fontSize -= 12;
  }
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(50, 30, 12, 0.85)';
  ctx.strokeText(txt, w / 2, h / 2 + 6);
  ctx.fillStyle = '#FFF8EE';
  ctx.fillText(txt, w / 2, h / 2 + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Vertical-plank wood texture for the door leaves (reference: arched wooden
// plank door). Plank seams run along x in texture space, which maps to the
// vertical direction on the extruded leaf's front face.
function generateDoorTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8B5E34';
  ctx.fillRect(0, 0, size, size);
  const plankW = size / 7;
  for (let p = 0; p < 7; p++) {
    const x0 = p * plankW;
    const base = 126 + Math.floor(Math.random() * 32);
    ctx.fillStyle = `rgb(${base}, ${Math.floor(base * 0.66)}, ${Math.floor(base * 0.42)})`;
    ctx.fillRect(x0 + 1, 0, plankW - 2, size);
    // vertical grain
    ctx.strokeStyle = 'rgba(50,30,15,0.22)';
    for (let g = 0; g < 14; g++) {
      const gx = x0 + 4 + Math.random() * (plankW - 8);
      ctx.lineWidth = 0.8 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + Math.sin(g) * 6, size * 0.33, gx - Math.cos(g) * 6, size * 0.66, gx + Math.sin(g * 2) * 5, size);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,18,8,0.6)';
    ctx.fillRect(x0, 0, 2, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Rounded-top (arched) door leaf profile, extruded to thickness — the
// reference double door has softly rounded leaf tops, not flat boxes.
function roundedDoorLeafGeo(w: number, h: number): THREE.BufferGeometry {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.9,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 3,
    steps: 1,
  });
  g.translate(0, 0, -0.45);
  return g;
}

const FLOWER_COLORS = ['#FF8FB1', '#FFD166', '#FFFFFF', '#C77DFF'];

// Door swing tuning (2026-11-19 entry/exit polish): the door starts opening
// before the player arrives, swings less far and slower so it never becomes
// the focus of the transition, and on exit stays open until the CAMERA has
// cleared the doorway — so it never closes in front of the viewer.
const DOOR_OPEN_DIST = 12; // world units from the door point
const DOOR_OPEN_ANGLE = 1.2; // rad — target swing of each leaf
const DOOR_SWING_RATE = 2.8; // 1/s — exponential approach rate
const DOOR_CAM_CLEAR = 1.5; // u past the door plane the camera must reach before close
const DOORWAY_FADE_BAND = 6; // u of camera travel over which the doorway plane fades —
// wide enough that the plane never fills the frame while the camera is at the
// threshold, but opacity stays 1 at normal outdoor follow distance

export function ProjectsCloud({
  insideRef,
  avatarPosRef,
  controlsRef,
}: {
  /** true while the player is inside the cloud interior */
  insideRef: React.RefObject<boolean>;
  /** live avatar position, drives the door swing */
  avatarPosRef: React.RefObject<THREE.Vector3 | null>;
  /** live OrbitControls instance — camera position drives the doorway fade and
      the exit-close clearance (no new component coupling, same ref the rig uses) */
  controlsRef: React.RefObject<any>;
}) {
  const S = CLOUD_SCALE;
  const groundY = terrainHeight(PROJECTS_CLOUD_X, PROJECTS_CLOUD_Z);

  // ---- Smooth SDF cloud geometry (MarchingCubes) ----
  const cloudGeo = useMemo(() => {
    const resolution = 96; // voxel resolution — crisp scalloped silhouette without excessive tris
    const mc = new MarchingCubes(resolution, new THREE.MeshStandardMaterial(), true, false, 500000);
    mc.isolation = 0;
    const half = resolution / 2;
    // Fill the normalized grid by evaluating the LOCAL-space SDF at the matching
    // world sample. This three.js MarchingCubes has no scale/offset constructor
    // args, so `addBall()` in world units would collapse the cloud to a ~2u blob.
    for (let iz = 0; iz < resolution; iz++) {
      const fz = (iz - half) / half;
      const wz = fz * CLOUD_HALF.z + CLOUD_CENTER.z;
      const zOff = iz * resolution * resolution;
      for (let iy = 0; iy < resolution; iy++) {
        const fy = (iy - half) / half;
        const wy = fy * CLOUD_HALF.y + CLOUD_CENTER.y;
        const yOff = zOff + iy * resolution;
        for (let ix = 0; ix < resolution; ix++) {
          const fx = (ix - half) / half;
          const wx = fx * CLOUD_HALF.x + CLOUD_CENTER.x;
          mc.field[yOff + ix] = -cloudBodySDF(wx, wy, wz);
        }
      }
    }
    mc.update();
    // MarchingCubes allocates a large non-indexed buffer and only fills
    // `drawRange`; trim to the used vertices, weld duplicates, THEN compute
    // normals — on the raw non-indexed buffer computeVertexNormals would make
    // per-face normals and the cloud would read faceted/angular.
    const src = mc.geometry;
    const used = src.drawRange.count;
    const trimmed = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv'] as const) {
      const a = src.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (a) trimmed.setAttribute(name, new THREE.BufferAttribute(a.array.slice(0, used * a.itemSize), a.itemSize));
    }
    let geo = mergeVertices(trimmed, 1e-4);
    geo.computeVertexNormals();
    // Convert normalized MarchingCubes vertices back to local world units, then
    // sit the cloud base on the terrain and let the mesh scale apply CLOUD_SCALE.
    geo.scale(CLOUD_HALF.x, CLOUD_HALF.y, CLOUD_HALF.z);
    geo.translate(CLOUD_CENTER.x, CLOUD_CENTER.y, CLOUD_CENTER.z);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    let minY = Infinity;
    for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
    geo.translate(0, -minY + 0.5, 0);
    geo.computeVertexNormals();
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
      normalScale: new THREE.Vector2(0.4, 0.4), // soft — avoids striation/crease artifacts at glancing angles
      roughness: 0.92,
      metalness: 0.0,
      // lift so the cloud reads white/cream under the warm sunset sun
      // (reference artwork shows near-white clouds, not tan)
      emissive: new THREE.Color('#EEF2FF'),
      emissiveIntensity: 0.22,
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
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A7A33', roughness: 0.9 }), []);
  const doorTex = useMemo(generateDoorTexture, []);
  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.85 }), [doorTex]);
  const knobMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#C9A227', roughness: 0.3, metalness: 0.8 }), []);
  const rockGeo = useMemo(() => displacedSphereGeometry(1.2 * CLOUD_SCALE, 1, 0.28, 77), []);
  const doorLeafGeo = useMemo(
    () => roundedDoorLeafGeo(CLOUD_SHELL_DOOR_HALF - 0.2, CLOUD_SHELL_DOOR_TOP - 0.6),
    [],
  );
  // Deterministic scatter of rocks/bushes/flowers around the base front arc.
  const baseDecor = useMemo(() => {
    const rnd = mulberry32(4242);
    const r = 20.5 * S;
    const items: { x: number; z: number; kind: number; s: number; c: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * (0.16 + rnd() * 0.68); // front arc — the door faces -z
      const x = Math.cos(a) * r * (0.92 + rnd() * 0.22);
      const z = Math.sin(a) * r * (0.92 + rnd() * 0.22);
      if (Math.abs(x) < CLOUD_DOOR_HALF + 2.4) continue; // keep the entrance walkway clear
      items.push({ x, z, kind: Math.floor(rnd() * 3), s: 0.7 + rnd() * 0.9, c: Math.floor(rnd() * 4) });
    }
    return items;
  }, [S]);
  const signTitleMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  // Warm illuminated threshold plane (was near-black #241812, which read as a
  // black rectangle and popped visibly when the inside flag flipped). Its
  // opacity is faded by camera z in the useFrame below — never a hard toggle.
  const doorwayMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#D9985A',
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    [],
  );

  // ---- Door swing logic — double door, both leaves swing together ----
  const doorPivotLRef = useRef<THREE.Group>(null);
  const doorPivotRRef = useRef<THREE.Group>(null);
  const doorwayRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const avatar = avatarPosRef.current;
    const inside = insideRef.current;
    const cam = controlsRef.current?.object as THREE.Camera | undefined;
    const camZ = cam ? cam.position.z : null;
    let open = inside;
    if (avatar) {
      const d = Math.hypot(avatar.x - PROJECTS_CLOUD_X, avatar.z - CLOUD_DOOR_Z);
      if (d < DOOR_OPEN_DIST) open = true;
    }
    // Exit lifecycle: leaves stay open until the camera has also cleared the
    // door plane, so the door never closes in front of the viewer.
    if (camZ != null && camZ > CLOUD_DOOR_Z + DOOR_CAM_CLEAR) open = true;
    if (doorPivotLRef.current && doorPivotRRef.current) {
      const target = open ? -DOOR_OPEN_ANGLE : 0;
      const k = 1 - Math.exp(-DOOR_SWING_RATE * Math.min(delta, 1 / 30));
      doorPivotLRef.current.rotation.y += (target - doorPivotLRef.current.rotation.y) * k;
      doorPivotRRef.current.rotation.y += (-target - doorPivotRRef.current.rotation.y) * k;
    }
    // Camera-aware doorway fade: opaque while the camera is outside the
    // entrance, smoothstep to invisible across DOORWAY_FADE_BAND of camera
    // travel through the plane, symmetric on exit. No pop, no black rectangle.
    if (doorwayRef.current) {
      const planeWorldZ = CLOUD_DOOR_Z + 0.6; // mesh sits at local doorZ + 0.6
      const t =
        camZ == null
          ? 1
          : THREE.MathUtils.clamp((planeWorldZ + DOORWAY_FADE_BAND - camZ) / (2 * DOORWAY_FADE_BAND), 0, 1);
      const opacity = t * t * (3 - 2 * t);
      doorwayMat.opacity = opacity;
      doorwayRef.current.visible = opacity > 0.02;
      if (typeof window !== 'undefined') {
        (window as any).__cwDoorwayOpacity = +opacity.toFixed(3);
        (window as any).__cwDoorAngles = [
          doorPivotLRef.current ? +doorPivotLRef.current.rotation.y.toFixed(3) : null,
          doorPivotRRef.current ? +doorPivotRRef.current.rotation.y.toFixed(3) : null,
        ];
      }
    }
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
      leafMat.dispose();
      rockGeo.dispose();
      doorLeafGeo.dispose();
      doorTex.dispose();
      doorMat.dispose();
      knobMat.dispose();
    };
  }, []);

  return (
    <group position={[PROJECTS_CLOUD_X, groundY, PROJECTS_CLOUD_Z]}>
      {/* Smooth SDF cloud body */}
      <mesh geometry={cloudGeo} material={cloudMat} scale={[S, S, S]} castShadow receiveShadow />

      {/* Door frame: posts + arch, sized from the shared shell opening */}
      <mesh castShadow material={frameMat} position={[-(CLOUD_SHELL_DOOR_HALF + 0.9), CLOUD_SHELL_DOOR_TOP / 2, doorZ]}>
        <boxGeometry args={[0.6, CLOUD_SHELL_DOOR_TOP + 1.0, 0.8]} />
      </mesh>
      <mesh castShadow material={frameMat} position={[CLOUD_SHELL_DOOR_HALF + 0.9, CLOUD_SHELL_DOOR_TOP / 2, doorZ]}>
        <boxGeometry args={[0.6, CLOUD_SHELL_DOOR_TOP + 1.0, 0.8]} />
      </mesh>
      <mesh castShadow material={frameMat} position={[0, CLOUD_SHELL_DOOR_TOP - (CLOUD_SHELL_DOOR_HALF + 0.2), doorZ]}>
        <torusGeometry args={[CLOUD_SHELL_DOOR_HALF + 0.2, 0.38 * S, 12, 28, Math.PI]} />
      </mesh>

      {/* Dark doorway behind the slab (hidden once inside) */}
      <mesh ref={doorwayRef} position={[0, CLOUD_SHELL_DOOR_TOP / 2, doorZ + 0.6]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CLOUD_SHELL_DOOR_HALF * 2, CLOUD_SHELL_DOOR_TOP]} />
        <primitive object={doorwayMat} attach="material" />
      </mesh>
      {/* Warm glow at threshold */}
      <pointLight position={[0, 6, doorZ + 3 * S]} color="#FFB45E" intensity={16 * S} distance={22 * S} decay={2} />

      {/* Swinging double door — two rounded-top wooden leaves on opposite jambs.
          The leaf shape is x-symmetric, so no mirroring is needed: each leaf
          just sits on the inner side of its pivot. */}
      {[-1, 1].map((side) => {
        const leafW = CLOUD_SHELL_DOOR_HALF - 0.2;
        return (
          <group key={side} ref={side < 0 ? doorPivotLRef : doorPivotRRef} position={[side * leafW, 0, doorZ]}>
            <mesh castShadow material={doorMat} geometry={doorLeafGeo} position={[-side * leafW / 2, 0, 0.25]} />
            {side === 1 && (
              <mesh material={knobMat} position={[-1.0, CLOUD_SHELL_DOOR_TOP * 0.5, 0.95]}>
                <sphereGeometry args={[0.5 * S, 12, 10]} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Stone threshold platform + stone steps + cobble entrance path (scaled) */}
      <mesh castShadow receiveShadow material={stoneMat} position={[0, 0.25 * S, doorZ - 0.8 * S]}>
        <boxGeometry args={[(CLOUD_SHELL_DOOR_HALF + 1.6) * 2, 0.5 * S, 1.8 * S]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`step-${i}`}
          castShadow
          receiveShadow
          material={stoneMat}
          position={[0, 0.10 * S - i * 0.07 * S, doorZ - 2.0 * S - i * 1.5 * S]}
        >
          <boxGeometry args={[9.0 * S + i * 1.8 * S, 0.34 * S, 1.7 * S]} />
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

      {/* PROJECTS sign — hanging wooden board above the door (reference) */}
      <group position={[0, 0, doorZ + 0.4 * S]}>
        {/* short hanging rods up into the cloud face */}
        <mesh castShadow material={frameMat} position={[-3.4 * S, 16.6 * S, 1.1 * S]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.3 * S, 3.2 * S, 0.3 * S]} />
        </mesh>
        <mesh castShadow material={frameMat} position={[3.4 * S, 16.6 * S, 1.1 * S]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.3 * S, 3.2 * S, 0.3 * S]} />
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
        {/* Title plane */}
        <mesh position={[0, 15.0 * S, -0.19 * S]} rotation={[0, Math.PI, 0]} scale={[9.6 * S, 2.5 * S, 1]}>
          <planeGeometry args={[1, 1]} />
          <primitive object={signTitleMat} attach="material" />
        </mesh>
        {/* Warm wash light on sign face */}
        <pointLight position={[0, 15.0 * S, -4.5 * S]} color="#FFC069" intensity={9 * S} distance={18 * S} decay={2} />
      </group>

      {/* Flanking wall sconces mounted on the cloud face beside the door (reference) */}
      {[-8.8 * S, 8.8 * S].map((lx) => (
        <group key={lx} position={[lx, 0, doorZ + 2.0 * S]}>
          {/* bracket arm from the wall */}
          <mesh castShadow material={frameMat} position={[0, 5.6 * S, -0.9 * S]} rotation={[Math.PI / 2.6, 0, 0]}>
            <cylinderGeometry args={[0.09 * S, 0.11 * S, 1.6 * S, 6]} />
          </mesh>
          <mesh position={[0, 5.2 * S, 0]} material={lanternMat}>
            <sphereGeometry args={[0.48 * S, 12, 10]} />
          </mesh>
          <pointLight position={[0, 5.2 * S, 0]} color="#FFB45E" intensity={16 * S} distance={20 * S} decay={2} />
        </group>
      ))}

      {/* Center hanging lantern below the sign, above the door arch (reference) */}
      <group position={[0, 0, doorZ - 1.4 * S]}>
        <mesh material={frameMat} position={[0, 13.1 * S, 1.2 * S]}>
          <cylinderGeometry args={[0.05 * S, 0.05 * S, 2.6 * S, 6]} />
        </mesh>
        <mesh position={[0, 12.2 * S, 0]} material={lanternMat}>
          <sphereGeometry args={[0.5 * S, 12, 10]} />
        </mesh>
        <pointLight position={[0, 12.2 * S, 0]} color="#FFB45E" intensity={14 * S} distance={18 * S} decay={2} />
      </group>

      {/* Potted plants flanking entrance (scaled) */}
      {[-10.5 * S, 10.5 * S].map((lx) => (
        <group key={`p${lx}`} position={[lx, 0, doorZ - 0.8 * S]}>
          <mesh castShadow material={frameMat}>
            <cylinderGeometry args={[0.8 * S, 0.68 * S, 1.0 * S, 10]} />
          </mesh>
          <mesh castShadow position={[0, 2.0 * S, 0]} material={leafMat}>
            <icosahedronGeometry args={[1.35 * S, 1]} />
          </mesh>
        </group>
      ))}

      {/* Rocks, bushes and flower clusters scattered around the base (front arc) */}
      {baseDecor.map((it, i) => {
        if (it.kind === 0)
          return (
            <mesh
              key={i}
              castShadow
              receiveShadow
              material={stoneMat}
              geometry={rockGeo}
              position={[it.x, 0.3 * S * it.s, it.z]}
              scale={[it.s, it.s * 0.72, it.s]}
            />
          );
        if (it.kind === 1)
          return (
            <mesh key={i} castShadow material={leafMat} position={[it.x, 0.85 * S * it.s, it.z]} scale={[it.s, it.s * 0.8, it.s]}>
              <icosahedronGeometry args={[1.1 * S, 1]} />
            </mesh>
          );
        return (
          <group key={i} position={[it.x, 0, it.z]}>
            {([0, 1, 2] as const).map((f) => (
              <group key={f} position={[(f - 1) * 0.5 * S * it.s, 0, (f % 2 - 0.5) * 0.4 * S]}>
                <mesh material={leafMat} position={[0, 0.28 * S, 0]}>
                  <cylinderGeometry args={[0.035 * S, 0.05 * S, 0.56 * S, 6]} />
                </mesh>
                <mesh position={[0, 0.62 * S, 0]}>
                  <sphereGeometry args={[0.18 * S * it.s, 8, 6]} />
                  <meshStandardMaterial color={FLOWER_COLORS[it.c]} roughness={0.55} />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}
      {/* Split-rail fences flanking the approach path (reference) */}
      {[-1, 1].map((side) => {
        const fx = side * (CLOUD_DOOR_HALF + 5.5 * S);
        const z0 = doorZ - 4 * S;
        return (
          <group key={`fence${side}`}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} castShadow material={woodMat} position={[fx, 0.8 * S, z0 - i * 3.0 * S]}>
                <boxGeometry args={[0.24 * S, 1.6 * S, 0.24 * S]} />
              </mesh>
            ))}
            {[1.25 * S, 0.7 * S].map((ry, ri) => (
              <mesh key={ri} castShadow material={woodMat} position={[fx, ry, z0 - 4.5 * S]}>
                <boxGeometry args={[0.14 * S, 0.16 * S, 9.6 * S]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}