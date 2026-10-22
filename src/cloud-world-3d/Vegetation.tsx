import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  mulberry32,
  pathCenterX,
  pathHalfWidth,
  terrainHeight,
} from './world';

// Vegetation and rocks: deterministic scatter, exact analytic grounding
// (position y = terrainHeight at that spot), path clearance for all trees so
// the trail stays walkable. Two tree recipes (pine + broadleaf), framing
// pines at the valley mouth, shrubs clumped near trees, boulder clusters,
// and tiny warm flowers along the path edges. All InstancedMesh — one draw
// call per part.

// ============================================================
// Trees — two recipes:
//  pine:      tapered trunk + 3 stacked cone tiers (dark greens)
//  broadleaf: taller thin trunk + 3 sphere-cluster canopy blobs
//             (warmer green-gold), mixed ~35%
// Per-instance hue jitter via instanceColor (no shader change).
// ============================================================

export type TreeSpec = {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotY: number;
  kind: 'pine' | 'broadleaf';
  framing?: boolean; // framing pines: tiers widened ~15% (plan Stage 3)
};

// Module singleton so shrubs can cluster near actual tree positions.
let treeSpecsSingleton: TreeSpec[] | null = null;

export function getTreeSpecs(): TreeSpec[] {
  if (treeSpecsSingleton) return treeSpecsSingleton;
  const rnd = mulberry32(1337);
  const specs: TreeSpec[] = [];
  let attempts = 0;
  while (specs.length < 90 && attempts < 4000) {
    attempts++;
    const z = -105 + rnd() * 345; // z -105..240
    const x = (rnd() * 2 - 1) * 125;
    const dist = Math.hypot(x, z - 60);
    if (dist < 18) continue; // keep mid-valley clearing open
    const d = Math.abs(x - pathCenterX(z));
    if (d < 6.5) continue; // path clearance (broadleaf canopy can reach ~3.1u)
    const y = terrainHeight(x, z);
    // Depth layers: foreground big, background smaller.
    let scale: number;
    if (z > 150) {
      scale = 0.55 + rnd() * 0.35;
    } else if (Math.abs(x) > 55 || z < -60) {
      scale = 0.6 + rnd() * 0.5;
    } else {
      scale = 0.95 + rnd() * 0.75;
    }
    specs.push({
      x,
      z,
      y,
      scale,
      rotY: rnd() * Math.PI * 2,
      kind: rnd() < 0.35 ? 'broadleaf' : 'pine',
    });
  }
  // Foreground framing pines: hand-placed flanking the default camera view
  // (spawn ≈ (-1.6, 0), camera behind at z ≈ -17 looking +Z). Deterministic,
  // path-clearance-guarded.
  const framing: [number, number][] = [
    [-9, -12],
    [8, -8],
    [-10, -4],
    [9, 2],
    [-8, 6],
    [10, 10],
  ];
  for (const [x, z] of framing) {
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    specs.push({
      x,
      z,
      y: terrainHeight(x, z),
      scale: 1.45 + rnd() * 0.15,
      rotY: rnd() * Math.PI * 2,
      kind: 'pine',
      framing: true,
    });
  }
  treeSpecsSingleton = specs;
  return specs;
}

let sharedGeos: {
  trunk: THREE.BufferGeometry;
  tiers: THREE.BufferGeometry[];
  bTrunk: THREE.BufferGeometry;
  blobs: THREE.BufferGeometry[];
} | null = null;

function getSharedGeos() {
  if (!sharedGeos) {
    sharedGeos = {
      trunk: new THREE.CylinderGeometry(0.16, 0.3, 1.6, 6),
      tiers: [
        new THREE.ConeGeometry(1.5, 2.4, 8),
        new THREE.ConeGeometry(1.15, 2.0, 8),
        new THREE.ConeGeometry(0.8, 1.6, 8),
      ],
      bTrunk: new THREE.CylinderGeometry(0.13, 0.2, 2.3, 6),
      blobs: [
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.SphereGeometry(1, 12, 10),
      ],
    };
  }
  return sharedGeos;
}

let sharedMats: {
  trunk: THREE.MeshStandardMaterial;
  bTrunk: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial[];
  bFoliage: THREE.MeshStandardMaterial[];
} | null = null;

function getSharedMats() {
  if (!sharedMats) {
    sharedMats = {
      trunk: new THREE.MeshStandardMaterial({ color: '#6B4226', roughness: 0.95, emissive: '#202018', emissiveIntensity: 0.15 }),
      bTrunk: new THREE.MeshStandardMaterial({ color: '#5A3A22', roughness: 0.95, emissive: '#202018', emissiveIntensity: 0.15 }),
      foliage: [
        new THREE.MeshStandardMaterial({ color: '#2E5D2B', roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ color: '#3E7040', roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ color: '#58855B', roughness: 0.75 }),
      ],
      bFoliage: [
        new THREE.MeshStandardMaterial({ color: '#6E8B3A', roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ color: '#7FA045', roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ color: '#8FB050', roughness: 0.75 }),
      ],
    };
  }
  return sharedMats;
}

// Per-instance color jitter: instanceColor multiplies the material color, so
// near-white tints give subtle hue/lightness variation per tree.
function applyJitter(mesh: THREE.InstancedMesh, count: number, rnd: () => number) {
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    c.setRGB(1, 1, 1);
    c.offsetHSL((rnd() - 0.5) * 0.05, 0, (rnd() - 0.5) * 0.06);
    mesh.setColorAt(i, c);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function Trees() {
  const parts = useMemo(() => {
    const geos = getSharedGeos();
    const mats = getSharedMats();
    const specs = getTreeSpecs();
    const rnd = mulberry32(2024);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    const pines = specs.filter((sp) => sp.kind === 'pine');
    const broad = specs.filter((sp) => sp.kind === 'broadleaf');

    // ---- Pine meshes (existing recipe) ----
    const trunkMesh = new THREE.InstancedMesh(geos.trunk, mats.trunk, pines.length);
    const tierMeshes = geos.tiers.map(
      (geo, t) => new THREE.InstancedMesh(geo, mats.foliage[t], pines.length),
    );
    pines.forEach((spec, idx) => {
      e.set(0, spec.rotY, 0);
      q.setFromEuler(e);
      s.set(spec.scale, spec.scale, spec.scale);
      p.set(spec.x, spec.y + 0.8 * spec.scale, spec.z);
      m4.compose(p, q, s);
      trunkMesh.setMatrixAt(idx, m4);
      const baseY = spec.y + 1.5 * spec.scale;
      const dys = [1.0, 2.3, 3.4];
      // Framing pines: widen tiers ~15% (x/z only, height untouched)
      const tierW = spec.framing ? 1.15 : 1.0;
      dys.forEach((dy, t) => {
        p.set(spec.x, baseY + dy * spec.scale, spec.z);
        s.set(spec.scale * tierW, spec.scale, spec.scale * tierW);
        m4.compose(p, q, s);
        tierMeshes[t].setMatrixAt(idx, m4);
      });
    });

    // ---- Broadleaf meshes ----
    const bTrunkMesh = new THREE.InstancedMesh(geos.bTrunk, mats.bTrunk, broad.length);
    const blobMeshes = geos.blobs.map(
      (geo, b) => new THREE.InstancedMesh(geo, mats.bFoliage[b], broad.length),
    );
    // Blob layout: local offset + local scale (× per-tree scale).
    const blobDefs = [
      { o: [0, 2.7, 0], s: [1.5, 1.2, 1.5] },
      { o: [-0.75, 3.6, 0.25], s: [1.05, 0.9, 1.05] },
      { o: [0.7, 3.8, -0.3], s: [0.95, 0.8, 0.95] },
    ];
    broad.forEach((spec, idx) => {
      e.set(0, spec.rotY, 0);
      q.setFromEuler(e);
      s.set(spec.scale, spec.scale, spec.scale);
      p.set(spec.x, spec.y + 1.15 * spec.scale, spec.z);
      m4.compose(p, q, s);
      bTrunkMesh.setMatrixAt(idx, m4);
      blobDefs.forEach((bd, b) => {
        p.set(
          spec.x + bd.o[0] * spec.scale,
          spec.y + bd.o[1] * spec.scale,
          spec.z + bd.o[2] * spec.scale,
        );
        s.set(spec.scale * bd.s[0], spec.scale * bd.s[1], spec.scale * bd.s[2]);
        m4.compose(p, q, s);
        blobMeshes[b].setMatrixAt(idx, m4);
      });
    });

    [trunkMesh, ...tierMeshes, bTrunkMesh, ...blobMeshes].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true;
    });
    // Hue jitter on foliage only (keep bark uniform).
    tierMeshes.forEach((m) => applyJitter(m, pines.length, rnd));
    blobMeshes.forEach((m) => applyJitter(m, broad.length, rnd));

    return { trunkMesh, tierMeshes, bTrunkMesh, blobMeshes };
  }, []);

  return (
    <group>
      <primitive object={parts.trunkMesh} />
      {parts.tierMeshes.map((m, i) => (
        <primitive key={`t${i}`} object={m} />
      ))}
      <primitive object={parts.bTrunkMesh} />
      {parts.blobMeshes.map((m, i) => (
        <primitive key={`b${i}`} object={m} />
      ))}
    </group>
  );
}

// ============================================================
// Rocks (clustered), shrubs (clumped near trees), grass tufts,
// and warm flowers along the path edges.
// ============================================================
export function RocksAndGrass() {
  const parts = useMemo(() => {
    const rnd = mulberry32(4242);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#9A8B78',
      roughness: 0.95,
    });
    const rockMatDark = new THREE.MeshStandardMaterial({
      color: '#7A6C5C',
      roughness: 0.95,
    });

    // Boulder clusters: 5 deterministic centers, 3-6 rocks each — reads as a
    // landscape with history instead of uniform scatter.
    const clusterCenters: [number, number][] = [
      [-9, -20],
      [10, 5],
      [-18, 30],
      [16, 55],
      [-14, 88],
    ];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    const rocks: { mesh: THREE.InstancedMesh; count: number }[] = [
      { mesh: new THREE.InstancedMesh(rockGeo, rockMat, 40), count: 0 },
      { mesh: new THREE.InstancedMesh(rockGeo, rockMatDark, 40), count: 0 },
    ];
    let placedRocks = 0;
    for (const [cx, cz] of clusterCenters) {
      const n = 3 + Math.floor(rnd() * 4); // 3-6 rocks per cluster
      for (let r = 0; r < n && placedRocks < 80; r++) {
        const x = cx + (rnd() * 2 - 1) * 4.5;
        const z = cz + (rnd() * 2 - 1) * 4.5;
        const d = Math.abs(x - pathCenterX(z));
        if (d < 6.0) continue; // never block the path (new-req r2: rock reach ≤1.5u + margin)
        const y = terrainHeight(x, z);
        const sc = 0.4 + rnd() * 1.1;
        e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
        q.setFromEuler(e);
        s.set(sc, sc * (0.55 + rnd() * 0.35), sc);
        p.set(x, y + sc * 0.35, z);
        m4.compose(p, q, s);
        const bucket = rocks[placedRocks % 2];
        bucket.mesh.setMatrixAt(bucket.count++, m4);
        placedRocks++;
      }
    }
    rocks.forEach((b) => {
      b.mesh.count = b.count;
      b.mesh.instanceMatrix.needsUpdate = true;
      b.mesh.castShadow = true;
      b.mesh.receiveShadow = true;
    });

    // Grass tufts: small dark-green cones hugging the ground.
    const tuftGeo = new THREE.ConeGeometry(0.22, 0.55, 5);
    const tuftMat = new THREE.MeshStandardMaterial({
      color: '#4A7A33',
      roughness: 0.9,
    });
    const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, 220);
    let ti = 0;
    let guard = 0;
    while (ti < 220 && guard < 1500) {
      guard++;
      const z = -100 + rnd() * 330;
      const x = (rnd() * 2 - 1) * 115;
      const d = Math.abs(x - pathCenterX(z));
      if (d < 2.9) continue;
      const y = terrainHeight(x, z);
      const sc = 0.6 + rnd() * 0.8;
      e.set(0, rnd() * Math.PI, 0);
      q.setFromEuler(e);
      s.set(sc, sc, sc);
      p.set(x, y + 0.2 * sc, z);
      m4.compose(p, q, s);
      tufts.setMatrixAt(ti++, m4);
    }
    tufts.instanceMatrix.needsUpdate = true;

    // Shrubs: squashed dark spheres clumped NEAR trees (undergrowth).
    const shrubGeo = new THREE.SphereGeometry(1, 10, 8);
    const shrubMat = new THREE.MeshStandardMaterial({
      color: '#3E6B2E',
      roughness: 0.9,
    });
    const shrubs = new THREE.InstancedMesh(shrubGeo, shrubMat, 120);
    const treeSpecs = getTreeSpecs();
    let si = 0;
    guard = 0;
    while (si < 120 && guard < 800) {
      guard++;
      const t = treeSpecs[Math.floor(rnd() * treeSpecs.length)];
      const x = t.x + (rnd() * 2 - 1) * 2.8;
      const z = t.z + (rnd() * 2 - 1) * 2.8;
      const d = Math.abs(x - pathCenterX(z));
      if (d < 4.2) continue; // shrubs outside the corridor (reach ≤0.9u + margin)
      const y = terrainHeight(x, z);
      const sc = 0.45 + rnd() * 0.45;
      e.set(0, rnd() * Math.PI, 0);
      q.setFromEuler(e);
      s.set(sc, sc * 0.55, sc);
      p.set(x, y + sc * 0.28, z);
      m4.compose(p, q, s);
      shrubs.setMatrixAt(si++, m4);
    }
    shrubs.count = si;
    shrubs.instanceMatrix.needsUpdate = true;
    // Shrubs don't cast shadows: small, dark, low to the ground — SSAO
    // provides contact depth. Saves a 120-instance shadow-pass draw.
    shrubs.receiveShadow = true;

    // Flowers: stem + squashed-sphere petal head (kill spikes); two instanced meshes share placements
    const stemGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.34, 5);
    stemGeo.translate(0, 0.17, 0);
    const headGeo = new THREE.SphereGeometry(0.11, 8, 6);
    headGeo.scale(1, 0.62, 1);
    headGeo.translate(0, 0.38, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: '#4A7A33', roughness: 0.9 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.7, emissive: '#3A2A10', emissiveIntensity: 0.25 });
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, 40);
    const heads = new THREE.InstancedMesh(headGeo, flowerMat, 40);
    const petal = new THREE.Color();
    const palette = ['#FFB74D', '#FFD54F', '#FF8A65'];
    let fi = 0;
    guard = 0;
    while (fi < 40 && guard < 400) {
      guard++;
      const z = -30 + rnd() * 255;
      // VIS-002 fix (2026-10-22): no flowers inside the mountain passage.
      // The bore spans z 100..170 and its mouths open into stone aprons —
      // nothing grows there. The old placement hiked the path edge
      // (lateral 2.9..5.0u), which lands INSIDE the ±5.2u bore radius, so 6
      // instances grew in the tunnel interior and 5 more in the mouth aprons
      // (one directly on the exit walkway at z≈176.6, vision-confirmed
      // "flowers scattered on the path outside the exit"). Resampling z
      // keeps the full flower count (40) — rejected draws consume only the
      // z rnd(), flowers are the LAST consumers of this PRNG stream, and
      // the ~66% accept rate sits far inside the 400-draw guard.
      // Window (92, 178) = the canyon entry/exit ramps (same bounds as
      // pathCenterX's canyon smoothstep), so valley and sunset zones keep
      // their flowers.
      if (z > 92 && z < 178) continue;
      const side = rnd() < 0.5 ? -1 : 1;
      const d = pathHalfWidth(z) + 0.6 + rnd() * 1.8;
      const x = pathCenterX(z) + side * d;
      const y = terrainHeight(x, z);
      const sc = 0.7 + rnd() * 0.5;
      e.set((rnd() - 0.5) * 0.2, rnd() * Math.PI, (rnd() - 0.5) * 0.2);
      q.setFromEuler(e);
      s.set(sc, sc, sc);
      p.set(x, y, z); // sit on terrain (geom pivot at stem base)
      m4.compose(p, q, s);
      stems.setMatrixAt(fi, m4);
      heads.setMatrixAt(fi, m4);
      petal.set(palette[fi % palette.length]);
      heads.setColorAt(fi, petal);
      fi++;
    }
    stems.count = fi; heads.count = fi;
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    return { rocks, tufts, shrubs, stems, heads };
  }, []);

  return (
    <group>
      {parts.rocks.map((b, i) => (
        <primitive key={i} object={b.mesh} />
      ))}
      <primitive object={parts.tufts} />
      <primitive object={parts.shrubs} />
      <primitive object={parts.stems} />
      <primitive object={parts.heads} />
    </group>
  );
}

// ============================================================
// Sky clouds — cream-white lumpy puff clusters drifting along +X,
// wrapping around. Each formation's lobes are MERGED into one
// geometry (12 draw calls total, not ~70). Speed in units/second;
// baseline was 0 (the old InstancedClouds had no animation at all).
// ============================================================
const CLOUD_SPEED = 1.1; // units/second
const CLOUD_PHYSICS_DT = 1 / 60;
const WRAP_MIN_X = -140;
const WRAP_MAX_X = 140;

type CloudSpec = {
  x: number;
  y: number;
  z: number;
  lobes: { dx: number; dy: number; dz: number; s: number; flat: boolean }[];
  speedMul: number;
  bobPhase: number;
};

function buildCloudSpecs(): CloudSpec[] {
  const rnd = mulberry32(777);
  const specs: CloudSpec[] = [];
  for (let i = 0; i < 12; i++) {
    const lobeCount = 5 + Math.floor(rnd() * 3); // 5-8 lobes: fuller cumulus
    const lobes: CloudSpec['lobes'] = [];
    const mainS = 4 + rnd() * 5;
    // Bottom lobe: widest and FLATTENED (scale-y ×0.45) — flat-based cumulus
    // read, not a ball cluster.
    lobes.push({ dx: 0, dy: 0, dz: 0, s: mainS, flat: true });
    for (let l = 1; l < lobeCount; l++) {
      lobes.push({
        dx: (rnd() * 2 - 1) * mainS * 0.9,
        dy: rnd() * mainS * 0.4 + mainS * 0.18, // pile ABOVE the base
        dz: (rnd() * 2 - 1) * mainS * 0.5,
        s: mainS * (0.4 + rnd() * 0.45),
        flat: false,
      });
    }
    specs.push({
      x: -130 + rnd() * 260,
      y: 30 + rnd() * 25, // raised band: 30-55, safely above camera zoom
      z: -110 + rnd() * 300,
      lobes,
      speedMul: 0.7 + rnd() * 0.6,
      bobPhase: rnd() * Math.PI * 2,
    });
  }
  return specs;
}

export function Clouds() {
  const specs = useMemo(buildCloudSpecs, []);
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const accRef = useRef(0); // drift substep accumulator

  // Merge each formation's lobes into ONE geometry. Distant formations (|z -
  // 60| > 90 from the journey center) get ×1.6 perspective scale — far
  // clouds should read larger near the horizon.
  const formationGeos = useMemo(() => {
    const unit = new THREE.IcosahedronGeometry(1, 1);
    return specs.map((spec) => {
      const persp = Math.abs(spec.z - 60) > 90 ? 1.6 : 1.0;
      const lobes = spec.lobes.map((lobe) => {
        const g = unit.clone();
        const sy = lobe.flat ? lobe.s * 0.45 : lobe.s * 0.8;
        g.scale(lobe.s * persp, sy * persp, lobe.s * 0.75 * persp);
        g.translate(lobe.dx * persp, lobe.dy * persp, lobe.dz * persp);
        return g;
      });
      return mergeGeometries(lobes, false);
    });
  }, [specs]);

  const cloudMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFF6E8',
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.92,
      }),
    [],
  );

  useFrame((_, delta) => {
    // Fixed-timestep drift: accumulate real time, consume in 1/60 substeps
    // (max 5/frame) so cloud speed is frame-rate independent.
    accRef.current += Math.min(Math.max(delta, 0), 0.25);
    let substeps = 0;
    while (accRef.current >= CLOUD_PHYSICS_DT && substeps < 5) {
      accRef.current -= CLOUD_PHYSICS_DT;
      substeps++;
      const t = performance.now() / 1000;
      for (let i = 0; i < specs.length; i++) {
        const g = groupRefs.current[i];
        if (!g) continue;
        g.position.x += CLOUD_SPEED * specs[i].speedMul * CLOUD_PHYSICS_DT;
        if (g.position.x > WRAP_MAX_X) g.position.x = WRAP_MIN_X;
        // Per-formation vertical bob (phased) — visible motion even during wraps.
        g.position.y = specs[i].y + Math.sin(t * 0.4 + specs[i].bobPhase) * 0.3;
      }
    }
    // Test instrumentation: trajectory ring buffer for QA measurement.
    const first = groupRefs.current[0];
    if (first && typeof window !== 'undefined') {
      let hist = (window as any).__cwCloudHist;
      if (!hist) {
        hist = (window as any).__cwCloudHist = [];
      }
      hist.push({
        t: performance.now(),
        x: first.position.x,
        y: first.position.y,
        z: first.position.z,
      });
      if (hist.length > 600) hist.splice(0, hist.length - 600);
    }
  });

  return (
    <group>
      {specs.map((spec, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={[spec.x, spec.y, spec.z]}
        >
          <mesh geometry={formationGeos[i]} material={cloudMat} />
        </group>
      ))}
    </group>
  );
}
