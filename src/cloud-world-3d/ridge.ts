import * as THREE from 'three';

/**
 * Angular low-poly ridge geometry (2026-10-17 mountain polish).
 *
 * WHY NOT DISPLACED SPHERES ANYMORE
 * The previous mountain was built from displaced icosphere "domes". No matter
 * how they overlap, an icosphere silhouette is ROUND — the massif read as a
 * pile of boulders (vision-audited twice). Real low-poly mountains are made of
 * PLANES: a ridge line, sloping faces down from it, straight base edges.
 *
 * THE SHAPE: a "ridge wedge". A crest runs along +z with a peaked
 * cross-section (apex height h at lateral position a), straight sloping faces
 * drop to the ground on both sides, and slanted caps close the two ends. The
 * crest is subdivided into segments of varying height so the ridge line itself
 * rises and falls — a mountain RANGE, not a tent.
 *
 * Faceting comes from flat-shaded triangles (non-indexed geometry → per-face
 * normals). The bore-clearance gate still applies to every wedge, so the
 * tunnel can never be blocked.
 */

export interface RidgeSpec {
  /** Center x at the ridge's mid point. */
  cx: number;
  /** Center z. */
  cz: number;
  /** Total ridge length along z. */
  length: number;
  /** Max apex height above local ground at the tallest segment. */
  height: number;
  /** Half-width of the base (full base = 2·halfWidth). */
  halfWidth: number;
  /** Deterministic seed for the segment height profile. */
  seed: number;
  /** Apex lean: per-ridge sinusoidal apex drift (−1..1). 0 = symmetric. */
  lean?: number;
  /**
   * Minimum envelope (0..1). 0 = ridge tapers to nothing at both ends (a
   * mountain dying into the terrain); ~0.8 = plateau — the end caps stay
   * nearly as tall as the peak (a cliff face / mount panel).
   */
  edgeFloor?: number;
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

/** Triangles for one planar quad (two tris). */
function quad(
  positions: number[],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  d: [number, number, number],
): void {
  positions.push(...a, ...b, ...c, ...a, ...c, ...d);
}

/**
 * Build one angular ridge as a non-indexed BufferGeometry (flat facets).
 *
 * Segment i and segment i+1 SHARE their cross-section points at the boundary
 * z (identical recomputation), so consecutive wedges connect into one
 * continuous silhouette — that is what kills the "separate boulders" read.
 * Bases sink 1.2u below the sampled ground so the ridge foot always meets the
 * terrain (no floating, no gaps).
 */
export function buildRidgeGeometry(
  spec: RidgeSpec,
  groundAt: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const { cx, cz, length, height, halfWidth } = spec;
  const rnd = rng(spec.seed);
  const lean = spec.lean ?? 0;
  const segments = 6;

  // Crest profile: envelope rises to a mid-ridge peak and tapers at the ends
  // (so the ridge dies into the terrain), with per-point jitter for variety.
  const hs: number[] = [];
  const apexX: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const rawEnv = Math.sin(Math.PI * Math.min(1, Math.max(0.08, t))) ** 0.7;
    const floor = spec.edgeFloor ?? 0;
    const envelope = floor + (rawEnv * (1 - floor));
    hs.push(height * envelope * (0.82 + rnd() * 0.36));
    apexX.push(cx + (rnd() - 0.5) * halfWidth * 0.5 + lean * halfWidth * 0.3 * Math.sin(t * Math.PI));
  }

  const positions: number[] = [];

  for (let i = 0; i < segments; i++) {
    const z0 = cz - length / 2 + (i / segments) * length;
    const z1 = cz - length / 2 + ((i + 1) / segments) * length;

    // Cross-section at one crest point: shoulder pair at the apex height and
    // base pair sunk 1.2u into the ground.
    const mk = (z: number, i2: number) => {
      const g = groundAt(apexX[i2], z);
      const h = hs[i2];
      const ax = apexX[i2];
      const cL: [number, number, number] = [ax - halfWidth * 0.16, g + h, z];
      const cR: [number, number, number] = [ax + halfWidth * 0.16, g + h, z];
      const bL: [number, number, number] = [ax - halfWidth, g - 1.2, z];
      const bR: [number, number, number] = [ax + halfWidth, g - 1.2, z];
      return { cL, cR, bL, bR };
    };

    const A = mk(z0, i);
    const B = mk(z1, i + 1);

    // Left slope (faces -x): crest line down to the base.
    quad(positions, A.cL, B.cL, B.bL, A.bL);
    // Crest table (the flat top between the shoulder points).
    quad(positions, A.cR, B.cR, B.cL, A.cL);
    // Right slope (faces +x).
    quad(positions, B.cR, A.cR, A.bR, B.bR);

    if (i === 0) {
      // Front cap (faces -z, toward the approach).
      quad(positions, A.cL, A.cR, A.bR, A.bL);
    }
    if (i === segments - 1) {
      // Back cap (faces +z).
      quad(positions, B.cR, B.cL, B.bL, B.bR);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals(); // non-indexed → flat facets
  return geo;
}

/**
 * Bounding volume of a built ridge, for the bore-clearance gate. The gate in
 * MountainPassage tests an AABB (x/z) plus apex height against the corridor —
 * far simpler than the old ellipsoid math and exactly right for planar wedges.
 */
export function ridgeBounds(spec: RidgeSpec): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxH: number;
} {
  // Apex drift is bounded by halfWidth·(0.25 + 0.3·|lean|); heights by the
  // envelope (≤1) times jitter (≤1.18).
  const drift = spec.halfWidth * (0.25 + 0.3 * Math.abs(spec.lean ?? 0));
  return {
    minX: spec.cx - spec.halfWidth - drift,
    maxX: spec.cx + spec.halfWidth + drift,
    minZ: spec.cz - spec.length / 2,
    maxZ: spec.cz + spec.length / 2,
    maxH: spec.height * 1.18,
  };
}
