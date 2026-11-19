/**
 * Voxel engine — the only geometry layer in Cloud World Voxel.
 *
 * Two rendering strategies, both from ONE unit cube:
 *
 *   <Voxels>       InstancedMesh per colour. Used for anything that repeats
 *                  (terrain, ocean, scatter, docks, buildings). ~15 draw calls
 *                  for the entire world.
 *   mergeVoxels()  One merged, vertex-coloured BufferGeometry. Used for
 *                  articulated things (the character's limbs, the whale) that
 *                  must be rotated as a unit.
 *
 * Everything is deterministic: the same seed always builds the same world, so
 * a QA screenshot can be compared against a later one.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** A single box. `x/y/z` are the CENTRE; sizes default to one voxel unit. */
export interface Voxel {
  x: number;
  y: number;
  z: number;
  c: number;
  sx?: number;
  sy?: number;
  sz?: number;
  /** yaw in radians */
  ry?: number;
  rx?: number;
  rz?: number;
}

export type VoxelList = Voxel[];

/**
 * Integer-coordinate voxel accumulator with overwrite semantics, so a builder
 * can lay down walls and then stamp windows, doors and signs on top of them.
 */
export class Chunk {
  private m = new Map<string, Voxel>();

  put(x: number, y: number, z: number, c: number, sx = 1, sy = 1, sz = 1): this {
    this.m.set(`${x},${y},${z}`, { x, y, z, c, sx, sy, sz });
    return this;
  }

  /** Put an overlapping box at fractional size (awnings, lantern light, glass). */
  putBox(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: number): this {
    return this.put(x, y, z, c, sx, sy, sz);
  }

  del(x: number, y: number, z: number): this {
    this.m.delete(`${x},${y},${z}`);
    return this;
  }

  /** Solid cuboid, inclusive of both corners. */
  fill(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number): this {
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0];
    const [ay, by] = y0 <= y1 ? [y0, y1] : [y1, y0];
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0];
    for (let x = ax; x <= bx; x++)
      for (let y = ay; y <= by; y++)
        for (let z = az; z <= bz; z++) this.put(x, y, z, c);
    return this;
  }

  /** Hollow rectangular ring (walls) between two inclusive corners. */
  walls(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number): this {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        this.put(x, y, z0, c);
        this.put(x, y, z1, c);
      }
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++) {
        this.put(x0, y, z, c);
        this.put(x1, y, z, c);
      }
    return this;
  }

  /** Line of blocks between two points (used for masts, ropes, poles). */
  line(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      this.put(
        Math.round(x0 + (x1 - x0) * t),
        Math.round(y0 + (y1 - y0) * t),
        Math.round(z0 + (z1 - z0) * t),
        c,
      );
    }
    return this;
  }

  get size(): number {
    return this.m.size;
  }

  list(): VoxelList {
    return Array.from(this.m.values());
  }
}

/**
 * Rotate a local chunk into world space by a multiple of 90 degrees and
 * append it to `out`. Buildings stay axis-aligned, which keeps the stepped
 * voxel silhouette honest from an isometric camera.
 */
export function place(
  chunk: Chunk,
  out: VoxelList,
  cx: number,
  baseLayer: number,
  cz: number,
  quarter = 0,
): void {
  const q = ((quarter % 4) + 4) % 4;
  const swap = q === 1 || q === 3;
  for (const v of chunk.list()) {
    let x = v.x;
    let z = v.z;
    if (q === 1) {
      x = v.z;
      z = -v.x;
    } else if (q === 2) {
      x = -v.x;
      z = -v.z;
    } else if (q === 3) {
      x = -v.z;
      z = v.x;
    }
    // Chunk local y is a LAYER INDEX; Voxel.y is a centre, so the ground
    // layer (local y = 0) sits inside world layer `baseLayer`.
    out.push({
      x: cx + x,
      y: baseLayer + v.y + 0.5,
      z: cz + z,
      c: v.c,
      sx: swap ? v.sz : v.sx,
      sy: v.sy,
      sz: swap ? v.sx : v.sz,
      ry: v.ry,
      rx: v.rx,
      rz: v.rz,
    });
  }
}

/** Same as `place`, but returns a fresh list (used by the character/whale). */
export function local(chunk: Chunk): VoxelList {
  return chunk.list();
}

const BOX = new THREE.BoxGeometry(1, 1, 1);

/**
 * Merge voxels into one vertex-coloured geometry. Used for articulated parts:
 * the whole limb becomes a single Mesh that can simply be rotated.
 */
export function mergeVoxels(list: VoxelList): THREE.BufferGeometry {
  if (list.length === 0) return new THREE.BufferGeometry();
  const geos: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();

  for (const v of list) {
    const g = BOX.clone();
    pos.set(v.x, v.y, v.z);
    scl.set(v.sx ?? 1, v.sy ?? 1, v.sz ?? 1);
    euler.set(v.rx ?? 0, v.ry ?? 0, v.rz ?? 0);
    quat.setFromEuler(euler);
    m.compose(pos, quat, scl);
    g.applyMatrix4(m);
    col.setHex(v.c, THREE.SRGBColorSpace);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) return new THREE.BufferGeometry();
  merged.computeVertexNormals();
  return merged;
}

/** Group voxels by colour — the instancing buckets. */
export function byColor(list: VoxelList): Map<number, VoxelList> {
  const map = new Map<number, VoxelList>();
  for (const v of list) {
    let bucket = map.get(v.c);
    if (!bucket) {
      bucket = [];
      map.set(v.c, bucket);
    }
    bucket.push(v);
  }
  return map;
}

/** Deterministic 0..1 hash of two integers plus a seed. */
export function hash2(x: number, z: number, seed: number): number {
  let h = (x | 0) * 374761393 + (z | 0) * 668265263 + (seed | 0) * 1442695041;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/** Seeded LCG returning 0..1 (scatter placement). */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
