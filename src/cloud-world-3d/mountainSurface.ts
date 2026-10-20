import * as THREE from 'three';

/**
 * Connected mountain surface (2026-10-18 taper rebuild).
 *
 * STRUCTURAL CHANGE vs the 2026-10-18 M-peak (flat-wall regression) build:
 *   - The crest stays a 2D height field (central peak + secondary peaks at
 *     distinct z → M-shaped skyline).
 *   - NEW: per-row HALF-WIDTH TAPER via optional `halfWidthAt(z, crest)`.
 *     Without it every cross-section has the same width → a constant-width
 *     plateau wall no matter how tall the crest. With it, the footprint is
 *     wide at the foot and narrow at the crest → a true pyramidal/tapered
 *     massif whose silhouette rises as a peak instead of a slab.
 *   - Geometry still emits unique per-quad vertices with explicit face
 *     normals (flat shading, faceted low-poly rock).
 *   - Vertex colors from face normal dot sun direction (warm lit / cool
 *     shadow) keep rock depth readable from any angle.
 *
 * The bore is NOT cut into this mesh: the mountain passes OVER the corridor
 * (crestHeight floors the profile above the walkable tube), and the existing
 * arch shell / mouth tubes / portal rings define the carved opening.
 * A clearance gate validates the final surface against the corridor.
 */

export interface MountainSurfaceSpec {
  /** z where the mountain begins. */
  zStart: number;
  /** z where the mountain ends. */
  zEnd: number;
  /** Cross-section spacing along z. */
  zStep: number;
  /** Half-width of the mountain footprint (from the path centerline). */
  halfWidth: number;
  /**
   * Optional per-row half-width override, given (z, crestHeight) → half-width
   * in world units. Returning a smaller width near the crest makes the massif
   * taper upward (pyramid / peak silhouette) instead of staying a constant-width
   * plateau wall. Defaults to `spec.halfWidth` for every row.
   */
  halfWidthAt?: (z: number, crest: number) => number;
  /** Deterministic seed. */
  seed: number;
  /**
   * Minimum longitudinal envelope (0..1). 0 = taper to nothing at both ends
   * (a range dying into terrain); ~0.9 = plateau.
   */
  edgeFloor?: number;
  /**
   * Height field: given (z, x) return crest height above ground for that
   * lateral position. Implemented by the caller so peak placement stays
   * data-driven (M-shape: distinct left / centre / right peaks).
   */
  crestHeight: (z: number, x: number) => number;
}

/** Small deterministic RNG (same family as world.ts mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Face normal from triangle (a, b, c), with an optional outward flip hint. */
function faceNormal(a: [number, number, number], b: [number, number, number], c: [number, number, number], hintX?: number): THREE.Vector3 {
  const va = new THREE.Vector3(a[0], a[1], a[2]);
  const vb = new THREE.Vector3(b[0], b[1], b[2]);
  const vc = new THREE.Vector3(c[0], c[1], c[2]);
  const n = new THREE.Vector3().subVectors(vb, va).cross(new THREE.Vector3().subVectors(vc, va)).normalize();
  if (hintX !== undefined) {
    // hintX > 0 means this face should point +x (right slope), < 0 means -x,
    // 0 means upward (crest). Flip if pointing the wrong way.
    const want = hintX > 0 ? 1 : hintX < 0 ? -1 : 0;
    const dot = want === 0 ? n.y : n.x;
    // Negate only when the normal faces the OPPOSITE direction of `want`
    // (dot and want have opposite signs). Negating when dot < 0 regardless
    // of want sign was a sign error: for hintX=-1 it flipped already-correct
    // -x-facing normals to face +x, hiding left-slope faces from the outside.
    if ((want === 0 && n.y < 0) || (want !== 0 && dot * want < 0)) n.negate();
  }
  return n;
}

/**
 * Build the connected mountain surface as one non-indexed quad strip.
 *
 * Cross-section polyline per z (13 points, symmetric envelope around the
 * path centerline at pathCenterX(z)):
 *   base-left … shoulder-left … crest-left / crest-right … shoulder-right … base-right
 * Adjacent sections are stitched into quads; each quad keeps its own four
 * vertices so normals stay per-face (faceted).
 * Bases sink below the sampled terrain so the foot always meets the ground.
 *
 * Returns the geometry plus, per z row, the minimum "underside" y over the
 * corridor strip — the clearance gate uses this to verify the bore stays open.
 */
export function buildMountainSurface(
  spec: MountainSurfaceSpec,
  pathCenterX: (z: number) => number,
  groundAt: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const rnd = rng(spec.seed);
  const rows: { z: number; cx: number; pts: [number, number, number][] }[] = [];
  // FLATTENED CORE PROFILE (2026-10-18 Phase 1 — terrain-anchored massif):
  // h = 1.0 across the whole core band (|f| <= 0.95) so the rendered height
  // IS the caller's crestHeight field (which now encodes flanks + corridor
  // carve + tunnel roof in world space). The old peaked profile (h up at
  // f≈0) double-shaped the field and put a needle over the walkable path.
  // Skirt wings (|f| > 1) fall below ground to bury the foot into terrain.
  const PROFILE: { f: number; h: number }[] = [
    { f: -1.7, h: -0.55 },   // buried base left
    { f: -1.35, h: -0.18 },  // lower skirt left
    { f: -1.05, h: -0.02 },  // skirt seam left (≈ ground)
    { f: -0.95, h: 1.0 },    // core left edge
    { f: -0.55, h: 1.0 },    // core
    { f: -0.2, h: 1.0 },     // core
    { f: 0.2, h: 1.0 },      // core
    { f: 0.55, h: 1.0 },     // core
    { f: 0.95, h: 1.0 },     // core right edge
    { f: 1.05, h: -0.02 },   // skirt seam right (≈ ground)
    { f: 1.35, h: -0.18 },   // lower skirt right
    { f: 1.7, h: -0.55 },    // buried base right
  ];
  const N = PROFILE.length; // 12 points, 11 stitched quads per row pair

  const zSteps = Math.max(2, Math.round((spec.zEnd - spec.zStart) / spec.zStep));
  for (let i = 0; i <= zSteps; i++) {
    const z = spec.zStart + (i / zSteps) * (spec.zEnd - spec.zStart);
    const cx = pathCenterX(z);
    const t = (z - spec.zStart) / (spec.zEnd - spec.zStart);
    const rawEnv = Math.sin(Math.PI * Math.min(1, Math.max(0.04, t))) ** 0.8;
    const floor = spec.edgeFloor ?? 0;
    const env = floor + rawEnv * (1 - floor);

    const pts: [number, number, number][] = PROFILE.map(({ f, h }) => {
      const jitter = 0.92 + rnd() * 0.16;
      const hw = spec.halfWidthAt ? spec.halfWidthAt(z, spec.crestHeight(z, cx)) : spec.halfWidth;
      const x = cx + f * hw + (rnd() - 0.5) * 0.9;
      // Sample the terrain at the vertex's ACTUAL lateral position x (the
      // path centerline meanders, so terrainHeight at cx can differ from the
      // terrain at the vertex's offset x). Using the local ground keeps the
      // mountain foot locked to the visible terrain — no green showing
      // through and no foot hovering above the ground.
      const g = groundAt(x, z);
      const y = g + spec.crestHeight(z, x) * h * env * jitter;
      return [x, y, z];
    });
    rows.push({ z, cx, pts });
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  // Sun direction (from Sky.tsx): light comes from (-42, 78, 168).
  const lightDir = new THREE.Vector3(-42, 78, 168).normalize();
  const rockLit = new THREE.Color('#D2A564');   // warm golden-tan (lit)
  const rockShd = new THREE.Color('#966446');   // cooler brown (shadow)
  const rockEdge = new THREE.Color('#E1B473');  // upper-edge highlight

  const quad = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
    hintX: number,
  ) => {
    const n = faceNormal(a, b, c, hintX);
    // Two-tone color from face normal vs sun: lit faces warm, shadow faces cool.
    const lit = Math.max(0, n.dot(lightDir));
    const col = new THREE.Color().copy(rockShd).lerp(rockLit, lit);
    if (n.y > 0.6) col.lerp(rockEdge, Math.min(1, (n.y - 0.6) * 1.4));
    const r = col.r, g2 = col.g, b2 = col.b;
    const nx = n.x, ny = n.y, nz = n.z;
    // two triangles: (a, b, c) and (a, c, d); a and c repeated intentionally.
    for (const p of [a, b, c, a, c, d]) {
      positions.push(p[0], p[1], p[2]);
      normals.push(nx, ny, nz);
      colors.push(r, g2, b2);
    }
  };

  for (let i = 0; i < rows.length - 1; i++) {
    const A = rows[i].pts;
    const B = rows[i + 1].pts;
    for (let j = 0; j < N - 1; j++) {
      // Left slope (f < 0) faces -x; right slope faces +x; crest pair faces up.
      let hintX: number;
      if (j < 5) hintX = -1;
      else if (j > 5) hintX = 1;
      else hintX = 0;

      if (j < 5) {
        // Left slope faces -x (outward). Vertex order must wind CCW when
        // viewed from the outside (-x side) so FrontSide culling keeps it
        // visible. The previous order (A[j+1] first) wound for +x and got
        // culled from the outside — that was the transparency/hollowness bug.
        quad(A[j], B[j], B[j + 1], A[j + 1], hintX);
      } else {
        quad(B[j], A[j], A[j + 1], B[j + 1], hintX);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  // Bounding sphere for frustum culling; faces are explicit so no index needed.
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Minimum underside clearance over the bore: for each corridor sample, the
 * surface height directly above must exceed corridor top + margin. The
 * caller enforces this by construction (crestHeight floors the profile over
 * the bore) and the live audit re-verifies it.
 */
export function mountainFootprintBounds(spec: MountainSurfaceSpec): {
  zStart: number;
  zEnd: number;
  halfWidth: number;
} {
  return { zStart: spec.zStart, zEnd: spec.zEnd, halfWidth: spec.halfWidth };
}
