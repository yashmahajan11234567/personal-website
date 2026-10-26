import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Shared world-space math for Cloud World.
//
// terrainHeight(), pathCenterX() and terrainColorAt() live here so the visual
// terrain mesh, the avatar grounding and every object placement sample the
// SAME functions — the character can never float or sink relative to what the
// player sees, and no raycasting is needed.

export const FOG_COLOR = '#FFC48A';
export const FOG_NEAR = 55;
export const FOG_FAR = 280;

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Winding path centerline: meanders through the open valley, straightens
// inside the mountain passage (z 95..175) so the canyon reads as one carved
// corridor, then opens again into the Projects Sunset stretch.
export function pathCenterX(z: number): number {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}

// Path half width varies gently so the trail breathes instead of reading as a
// uniform stripe.
export function pathHalfWidth(z: number): number {
  return 2.6 + Math.sin(z * 0.07) * 0.7 + 0.5 * Math.sin(z * 0.023 + 1.3);
}

// Analytic terrain height. The terrain mesh is DISPLACED from this function on
// the CPU, so sampling it for the avatar matches the visible ground exactly.
export function terrainHeight(x: number, z: number): number {
  const d = Math.abs(x - pathCenterX(z));
  // Multi-octave relief: broad swells + medium undulation + fine detail.
  // Amplitude ramps up away from the path corridor and toward map edges so
  // the playable valley stays gentle while the outskirts genuinely roll.
  const swell =
    2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) +
    1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium =
    0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) +
    0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d); // path corridor stays walkable-flat
  // Contain the playable bowl: rise steeply beyond |x|≈60 and behind spawn.
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const towardMountains = 1 - smoothstep(-95, -72, z); // rises toward far range
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + towardMountains * 2.2;
}

const GRASS_LOW = new THREE.Color('#5E8C2F');
const GRASS_HIGH = new THREE.Color('#8FBC8F');
const DRY_GRASS = new THREE.Color('#7E9450');
const SAND = new THREE.Color('#E0C097');
const SAND_WARM = new THREE.Color('#D9A066');
const ROCKY = new THREE.Color('#C2A077');
const TMP = new THREE.Color();

// Vertex color for the terrain: grass by height, slope-based dry-grass/rock
// banding, sandy path PAINTED into the surface (no tube geometry — the path
// IS the terrain, so it follows every undulation with natural soft edges),
// rocky toward the far range, warm sand in the Projects Sunset stretch.
export function terrainColorAt(x: number, z: number, h: number, out: THREE.Color): void {
  const t = Math.min(1, Math.max(0, (h + 0.6) / 1.8));
  out.copy(GRASS_LOW).lerp(GRASS_HIGH, t);

  // Slope-based coloring: sample the analytic height gradient (cheap — two
  // extra evaluations per vertex, CPU-time only) and band flat→dry→rocky.
  // Outside the path corridor only, so the trail keeps its sandy identity.
  const d = Math.abs(x - pathCenterX(z));
  const halfW = pathHalfWidth(z);
  if (d > halfW + 0.8) {
    const e = 0.6;
    const gx = (terrainHeight(x + e, z) - terrainHeight(x - e, z)) / (2 * e);
    const gz = (terrainHeight(x, z + e) - terrainHeight(x, z - e)) / (2 * e);
    const slope = Math.hypot(gx, gz); // |∇h|
    if (slope > 0.25) {
      out.lerp(DRY_GRASS, Math.min(1, (slope - 0.25) * 1.6));
    }
    if (slope > 0.55) {
      out.lerp(ROCKY, Math.min(1, (slope - 0.55) * 1.5));
    }
  }

  // Path paint with a slightly darker trodden rim just outside the sand.
  const edge = smoothstep(halfW + 1.6, halfW - 0.4, d);
  TMP.copy(SAND);
  if (z > 168) TMP.lerp(SAND_WARM, smoothstep(168, 215, z));
  out.lerp(TMP, edge);
  // Trodden rim: narrow band at the path edge — darkened 0.08 → 0.2 in the
  // polish pass so the path edge reads as a defined border, not a hard seam.
  const rim = smoothstep(halfW + 1.6, halfW + 0.7, d) * (1 - smoothstep(halfW - 0.1, halfW - 0.5, d));
  out.multiplyScalar(1 - rim * 0.2);

  const mountainBlend = 1 - smoothstep(-95, -70, z);
  out.lerp(ROCKY, mountainBlend * 0.75);
  out.lerp(SAND_WARM, smoothstep(180, 235, z) * 0.55);

  // VIDEO PASS 2026-10-24 — bore floor: inside the carved tunnel (z 100..170,
  // within the bore radius of the path center) the floor is still meadow
  // green, meeting the brown shell in a sharp line that read as a "hard seam /
  // two-tone floor" in the user's gameplay video. Blend the floor toward warm
  // sandstone with z-fades at both mouths so the interior reads as carved
  // rock floor; the transition is gradual (10u) so there is no new seam.
  // FORENSIC FIX 2026-10-25 (vis007/05+/08): the ramps were INVERTED —
  // `(1 - smoothstep(96,106,z)) * smoothstep(174,164,z)` is 1 for z<96 (the
  // open approach apron) and 0 for 106<z<164 (the actual bore) — it painted
  // the apron sandstone and left the bore floor green. Corrected to ramp IN
  // at the entrance and OUT at the exit.
  {
    const inBore = smoothstep(96, 106, z) * (1 - smoothstep(164, 174, z));
    const lateral = 1 - smoothstep(7.2, 11, Math.abs(x - pathCenterX(z)));
    const boreFloor = inBore * lateral;
    if (boreFloor > 0.001) {
      // Two-step blend: sandy walkway center, darker toward the walls so the
      // springing line (shell base meets floor) has no bright floor edge.
      TMP.set('#8F6F49');
      out.lerp(TMP, boreFloor * 0.8);
      const wallSide = smoothstep(2.5, 6.5, Math.abs(x - pathCenterX(z)));
      TMP.set('#6E5238'); // match the shell tone family
      out.lerp(TMP, boreFloor * wallSide * 0.72);
    }
  }

  // Macro color patches: two very-low-frequency HSL terms (wavelength ~40u)
  // so the meadow reads as patched, not uniform. Amplitudes raised 2026-10-20
  // (polish pass): 0.012/0.02 → 0.028/0.045 — at gameplay distance the old
  // values were sub-1% lightness variation, invisible; the meadow now bands
  // into readable patchwork like the reference art.
  const patchA = Math.sin(x * 0.16 + 1.2) * Math.sin(z * 0.13 - 0.6);
  const patchB = Math.sin(x * 0.07 - 2.0 + z * 0.09);
  out.offsetHSL(patchA * 0.028, 0, patchB * 0.045);

  // Organic per-vertex variation so large flats never look airbrushed.
  const v = Math.sin(x * 0.8 + z * 0.6) * Math.sin(x * 0.23 - z * 0.31);
  out.offsetHSL(0, 0, v * 0.03);
}

// Deterministic RNG — same scatter on every reload.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// Sign placement clearance — shared by the skill signs
// (CloudWorld3D) and the PROJECTS sign (MountainPassage).
//
// Rebuilds the deterministic tree positions with the SAME seed and
// consumption order as Vegetation.tsx getTreeSpecs(), plus the fixed
// boulder-cluster centers, then slides a candidate sign station along z
// until the spot is clear. One source of truth so every sign in the world
// is guaranteed clear of the actual rendered scatter.
// ============================================================

let signTreeObstaclesSingleton: { x: number; z: number }[] | null = null;

export function getSignTreeObstacles(): { x: number; z: number }[] {
  if (signTreeObstaclesSingleton) return signTreeObstaclesSingleton;
  const rnd = mulberry32(1337);
  const trees: { x: number; z: number }[] = [];
  let attempts = 0;
  while (trees.length < 90 && attempts < 4000) {
    attempts++;
    const z = -105 + rnd() * 345;
    const x = (rnd() * 2 - 1) * 125;
    if (Math.hypot(x, z - 60) < 18) continue;
    // 6.5 (was 5.5): broadleaf canopy can reach ~3.1u, so trunks must stay
    // far enough out that no branch overhangs the walking corridor.
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    trees.push({ x, z });
    rnd(); // scale
    rnd(); // rotY
    rnd(); // kind threshold
  }
  const framing: [number, number][] = [
    [-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10],
  ];
  for (const [x, z] of framing) {
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    trees.push({ x, z });
    rnd(); // scale
    rnd(); // rotY
  }
  signTreeObstaclesSingleton = trees;
  return trees;
}

// Boulder cluster centers (fixed constants from Vegetation.tsx).
export const SIGN_ROCK_CLUSTERS: [number, number][] = [
  [-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88],
];

// The four skill-CATEGORY sign stations (2026-10-16 redesign). The previous
// seven per-skill stations rendered as a crowded picket line that obscured
// the mountain approach; skills are now grouped into four category boards
// (see categories.ts) and the individual signs are gone. Stations alternate
// sides with ~15u spacing so each board has a clear approach view.
export const SKILL_SIGN_STATIONS: { z: number; side: 'left' | 'right' }[] = [
  { z: 18, side: 'left' },
  { z: 34, side: 'right' },
  { z: 50, side: 'left' },
  { z: 64, side: 'right' },
];

// Skill sign spots (station coords, BEFORE the obstacle slide — the slide
// moves a station at most 12u along +z, so ±13u around each station spot
// is a conservative keep-out zone for other signs).
export function getSkillSignSpots(): { x: number; z: number }[] {
  return SKILL_SIGN_STATIONS.map((s) => ({
    x: pathCenterX(s.z) + (s.side === 'left' ? -1 : 1) * 11.5,
    z: s.z,
  }));
}

// Slide a station along +z (1.5u steps, max 9 tries) until the sign spot is
// ≥3.5u from every tree and ≥7u from every boulder cluster center. Falls
// back to the station itself if nothing clears (never expected — meadow).
// offset defaults to 11.5u (new-req r2 Stage 1): the cloud board at scale
// 3.0 spans ~4.65u half-width, so its inner edge stays ≥4.4u clear of the
// corridor edge (> 1.5u required margin even on the widest path stretch).
export function clearSignPosition(
  zStation: number,
  side: 'left' | 'right',
  offset = 11.5,
  avoidSkillSigns = false,
): { x: number; z: number } {
  const dir = side === 'left' ? -1 : 1;
  const trees = getSignTreeObstacles();
  // Sign-on-sign exclusion: the slide must also keep other SIGNS clear —
  // the PROJECTS billboard previously slid from z=88 to z=95.5, directly
  // onto the Ansible skill sign at (-12.45, 96) (0.01u apart), hiding
  // both boards behind one another from the approach path. Trees and
  // rocks were checked; other signs were not. Keep-out is generous
  // (13u) because boards are ~11u wide at scale 3.4 and near-collinear
  // from the winding path.
  const signSpots = avoidSkillSigns ? getSkillSignSpots() : [];
  for (let attempt = 0; attempt < 16; attempt++) {
    const z = zStation + attempt * 1.5;
    const x = pathCenterX(z) + dir * offset;
    let clear = true;
    for (const t of trees) {
      if (Math.hypot(t.x - x, t.z - z) < 3.5) { clear = false; break; }
    }
    if (clear) {
      for (const [cx, cz] of SIGN_ROCK_CLUSTERS) {
        if (Math.hypot(cx - x, cz - z) < 7) { clear = false; break; }
      }
    }
    if (clear && signSpots.length > 0) {
      for (const s of signSpots) {
        if (Math.hypot(s.x - x, s.z - z) < 13) { clear = false; break; }
      }
    }
    if (clear) return { x, z };
  }
  return { x: pathCenterX(zStation) + dir * offset, z: zStation };
}

// Lumpy organic sphere for mountain domes and boulders. Vertices are WELDED
// first (mergeVertices) so computeVertexNormals produces SMOOTH shading —
// an un-welded icosahedron would give flat per-face normals and read as an
// angular low-poly rock instead of a rounded dome. Displacement is a pure
// function of position, so welded seam vertices displace identically.
export function displacedSphereGeometry(
  radius: number,
  detail: number,
  amp: number,
  seed: number,
): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(radius, detail);
  geo = mergeVertices(geo, 1e-4);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 3.1 + seed) *
        Math.sin(v.y * 2.7 + seed * 2.1) *
        Math.sin(v.z * 3.7 + seed * 3.3) +
      0.5 * Math.sin(v.x * 7.3 + seed * 4.2) * Math.sin(v.z * 6.1 + seed * 1.7);
    v.multiplyScalar(1 + n * amp);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
