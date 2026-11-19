/**
 * The visitor, built from voxels.
 *
 * The v2 character was a rigged KayKit GLB — smooth, animated, and completely
 * incompatible with a block world. The brief allows replacing it if it cannot
 * be adapted convincingly, and a smooth-skinned human next to stepped voxel
 * buildings is exactly the "collection of downloaded models" the brief forbids.
 *
 * So: five merged geometries, one per articulated part. Walk, run and idle come
 * from rotating those parts, which is all a voxel character ever needed — no
 * skinning, no mixer, no GLB fetch.
 *
 * Local space has the character's feet at y = 0 and faces +z, matching the
 * heading convention used everywhere else in the world.
 */
import { Chunk, mergeVoxels } from './voxel';
import type * as THREE from 'three';

const SKIN = 0xf0c49a;
const SKIN_DARK = 0xd9a97e;
const HAIR = 0xc0392b;
const SHIRT = 0x2f6fd0;
const SHIRT_DARK = 0x2456a8;
const PANTS = 0x2d3d57;
const BOOT = 0x3a2b21;
const BELT = 0x1e2733;
const EYE = 0x241c1a;

export const HIP_Y = 0.8;
export const SHOULDER_Y = 1.3;

export interface CharacterParts {
  body: THREE.BufferGeometry;
  armL: THREE.BufferGeometry;
  armR: THREE.BufferGeometry;
  legL: THREE.BufferGeometry;
  legR: THREE.BufferGeometry;
}

export function buildCharacter(): CharacterParts {
  // ---- torso, head and hair: one static mass ----
  const body = new Chunk();
  body.putBox(0, 1.06, 0, 0.46, 0.58, 0.28, SHIRT); // torso
  body.putBox(0, 1.32, 0, 0.44, 0.10, 0.30, SHIRT_DARK); // shoulder trim
  body.putBox(0, 0.76, 0, 0.48, 0.12, 0.30, BELT); // belt
  body.putBox(0, 1.58, 0, 0.38, 0.36, 0.34, SKIN); // head
  body.putBox(0.1, 1.6, 0.18, 0.09, 0.09, 0.04, EYE);
  body.putBox(-0.1, 1.6, 0.18, 0.09, 0.09, 0.04, EYE);
  body.putBox(0, 1.76, 0.02, 0.42, 0.14, 0.38, HAIR); // hair top
  body.putBox(0, 1.62, -0.17, 0.42, 0.36, 0.10, HAIR); // hair back
  body.putBox(0, 1.74, 0.19, 0.42, 0.10, 0.06, HAIR); // fringe
  body.putBox(0.0, 1.5, 0.18, 0.06, 0.06, 0.04, SKIN_DARK); // nose shadow
  body.putBox(0, 1.24, 0.15, 0.16, 0.16, 0.03, SHIRT_DARK); // chest pocket

  // ---- arms: geometry is relative to the shoulder pivot, which the renderer
  //      positions at ±ARM_OFFSET, so one geometry serves both sides ----
  const armChunk = new Chunk();
  armChunk.putBox(0, -0.18, 0, 0.16, 0.38, 0.22, SHIRT);
  armChunk.putBox(0, -0.46, 0, 0.14, 0.22, 0.18, SKIN);
  armChunk.putBox(0, -0.62, 0, 0.15, 0.14, 0.18, SKIN_DARK);
  const arm = mergeVoxels(armChunk.list());

  // ---- legs: geometry is relative to the hip pivot ----
  const legChunk = new Chunk();
  legChunk.putBox(0, -0.22, 0, 0.21, 0.46, 0.24, PANTS);
  legChunk.putBox(0, -0.54, 0, 0.19, 0.26, 0.21, PANTS);
  legChunk.putBox(0, -0.73, 0.02, 0.21, 0.16, 0.28, BOOT);
  const leg = mergeVoxels(legChunk.list());

  return {
    body: mergeVoxels(body.list()),
    armL: arm,
    armR: arm,
    legL: leg,
    legR: leg,
  };
}
