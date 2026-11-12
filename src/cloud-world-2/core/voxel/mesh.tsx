/**
 * Cloud World 2.0 — instanced voxel renderer.
 *
 * Fresh renderer for the greenfield world. Splits the static block list into
 * four InstancedMesh groups so each gets its own material response and
 * frustum culling (doc 04 §3.2): terrain (no shadows), structures (cast +
 * receive), props (cast + receive), vegetation (unlit, walk-through, no
 * shadows). Per-instance colour via instanceColor; per-instance scale via
 * matrix compose for slabs/steps/boards.
 */

import { useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { Block, BlockList } from '../types';

const dummy = new THREE.Object3D();
const colour = new THREE.Color();

export interface VoxelGroup {
  key: string;
  blocks: BlockList;
  /** cast shadows */
  cast?: boolean;
  /** receive shadows */
  receive?: boolean;
  /** unlit flat material (vegetation) */
  unlit?: boolean;
}

function groupMaterial(unlit: boolean): THREE.Material {
  return unlit
    ? new THREE.MeshLambertMaterial()
    : new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.04 });
}

/** One InstancedMesh built from a block list. Matrices are filled in the ref
 * callback (commit time), so the first render pass already sees real instance
 * data — a useFrame-lazy build rendered one frame of degenerate bounds and
 * crashed frustum culling. */
function VoxelGroupMesh({ group }: { group: VoxelGroup }): React.ReactElement {
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => groupMaterial(group.unlit ?? false), [group.unlit]);

  const attach = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      const n = group.blocks.length;
      mesh.count = n;
      for (let i = 0; i < n; i++) {
        const b = group.blocks[i];
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.sx ?? 1, b.sy ?? 1, b.sz ?? 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        colour.setHex(b.c);
        mesh.setColorAt(i, colour);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
    [group],
  );

  return (
    <instancedMesh
      ref={attach}
      args={[geometry, material, Math.max(1, group.blocks.length)]}
      castShadow={group.cast ?? false}
      receiveShadow={group.receive ?? false}
      userData={{ cw2Solid: !group.unlit, cw2Terrain: group.key === 'terrain' }}
    />
  );
}

/** Render a set of voxel groups (empty groups are skipped — an InstancedMesh
 * with zero real instances has a degenerate bounding sphere that crashes
 * frustum culling). */
export function Voxels({ groups }: { groups: VoxelGroup[] }): React.ReactElement {
  return (
    <>
      {groups
        .filter((g) => g.blocks.length > 0)
        .map((g) => (
          <VoxelGroupMesh key={g.key} group={g} />
        ))}
    </>
  );
}

/** Partition a block list into the four render groups. */
export function partitionBlocks(world: BlockList, terrainKeys: Set<string>, vegKeys: Set<string>): VoxelGroup[] {
  const terrain: Block[] = [];
  const structures: Block[] = [];
  const props: Block[] = [];
  const vegetation: Block[] = [];
  for (const b of world) {
    const k = `${b.x},${b.y},${b.z}`;
    if (terrainKeys.has(k)) terrain.push(b);
    else if (vegKeys.has(k)) vegetation.push(b);
    else if ((b.sx ?? 1) * (b.sy ?? 1) * (b.sz ?? 1) >= 0.4) structures.push(b);
    else props.push(b);
  }
  return [
    { key: 'terrain', blocks: terrain, receive: true },
    { key: 'structures', blocks: structures, cast: true, receive: true },
    { key: 'props', blocks: props, cast: true, receive: true },
    { key: 'vegetation', blocks: vegetation, unlit: true },
  ];
}
