/**
 * VoxelMesh — the instancing layer.
 *
 * Every static thing in the world is one unit cube, batched into one
 * InstancedMesh per colour. The whole archipelago lands in the low tens of
 * draw calls because 19,000 terrain blocks and ~58,000 ocean tiles are not
 * 77,000 objects: they are about thirty.
 *
 * Flat Lambert shading with no tone mapping is deliberate. The reference art
 * is flat pastel voxel, and ACES filmic tone mapping would desaturate the
 * palette into mud — the exact failure this redesign exists to avoid.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { byColor, type VoxelList } from './voxel';

/** Shared clock for shader-side animation (no per-frame JS matrix work). */
export const oceanTime = { value: 0 };

const BOX = new THREE.BoxGeometry(1, 1, 1);

interface BucketProps {
  list: VoxelList;
  color: number;
  castShadow: boolean;
  receiveShadow: boolean;
  /** gentle vertical bob driven from instance position, for the ocean */
  wave?: boolean;
}

function Bucket({ list, color, castShadow, receiveShadow, wave = false }: BucketProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff });
    if (wave) {
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = oceanTime;
        shader.vertexShader =
          'uniform float uTime;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             float phase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
             transformed.y += sin(uTime * 0.85 + phase) * 0.055;`,
          );
      };
    }
    return m;
  }, [wave]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const mat4 = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const eul = new THREE.Euler();
    const col = new THREE.Color();


    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      pos.set(v.x, v.y, v.z);
      scl.set(v.sx ?? 1, v.sy ?? 1, v.sz ?? 1);
      if (v.ry || v.rx || v.rz) {
        eul.set(v.rx ?? 0, v.ry ?? 0, v.rz ?? 0);
        quat.setFromEuler(eul);
      } else {
        quat.identity();
      }
      mat4.compose(pos, quat, scl);
      mesh.setMatrixAt(i, mat4);
      col.setHex(color, THREE.SRGBColorSpace);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // InstancedMesh culls against its own bounding sphere; without this the
    // whole ocean would vanish whenever the origin left the frustum.
    mesh.computeBoundingSphere();
  }, [list, color]);

  return (
    <instancedMesh
      ref={ref}
      args={[BOX, material, list.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

export function Voxels({
  blocks,
  castShadow = true,
  receiveShadow = true,
  wave = false,
}: {
  blocks: VoxelList;
  castShadow?: boolean;
  receiveShadow?: boolean;
  wave?: boolean;
}) {
  const buckets = useMemo(() => Array.from(byColor(blocks).entries()), [blocks]);
  return (
    <>
      {buckets.map(([color, list]) => (
        <Bucket
          key={color}
          list={list}
          color={color}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          wave={wave}
        />
      ))}
    </>
  );
}

/**
 * FarSea — a flat disc that follows the camera and fills the ocean from the
 * edge of the tile grid out to the horizon, so the world never ends in a seam.
 */
export function FarSea({ radius, y }: { radius: number; y: number }) {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(radius, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [radius]);
  return (
    <mesh geometry={geo} position={[0, y, 0]} renderOrder={-1}>
      <meshLambertMaterial color={0x1a6aa8} />
    </mesh>
  );
}
