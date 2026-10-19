import { useMemo } from 'react';
import * as THREE from 'three';
import { buildRidgeGeometry, ridgeBounds } from './ridge';
import { pathCenterX, terrainHeight } from './world';
import { ProjectsBillboard } from './ProjectsBillboard';

// Open Valley — two asymmetrical sandstone cliffs framing a wide open center.
// No tunnel, no bore, no arch, no enclosed passage. The valley floor is the
// shared Terrain mesh; the dirt path is painted into it. One PROJECTS
// billboard spans the opening high above the path on wooden posts.
//
// WHY buildRidgeGeometry (not buildMountainSurface): the surface builder
// spreads each cross-section row around pathCenterX(z) and derives the row
// width from crestHeight AT the row center — a height field anchored away
// from the centerline makes that probe return 0 and the taper never engages
// (verified numerically 2026-10-19: rowHW stayed 68 at every z, leaving
// 100u+ height discontinuities between adjacent vertices). The ridge builder
// takes an explicit {cx, cz, length, height, halfWidth} wedge with its own
// envelope — independent, grounded (bases sink 1.2u below terrain),
// flat-faceted, straight base edges.

interface CliffSpec {
  cx: number;
  cz: number;
  length: number;
  height: number;
  halfWidth: number;
  lean: number;
  seed: number;
}

// Asymmetry: left cliff taller, spans z 62..174; right cliff slightly
// shorter, further into the scene (z 105..199). Feet stay clear of the
// walkable band (|x| ≤ 24): inner base edge = |cx| − (halfWidth + drift),
// drift = halfWidth·(0.25 + 0.3·|lean|) → left 27.5u, right 32.3u clear.
const LEFT_CLIFF: CliffSpec = { cx: -56, cz: 118, length: 112, height: 92, halfWidth: 22, lean: -0.15, seed: 801 };
const RIGHT_CLIFF: CliffSpec = { cx: 58, cz: 152, length: 94, height: 76, halfWidth: 20, lean: 0.12, seed: 802 };

export function MountainPassage() {
  const parts = useMemo(() => {
    const cliffMat = new THREE.MeshStandardMaterial({
      color: '#C9A075',
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });

    const makeCliff = (spec: CliffSpec): THREE.Mesh => {
      const geo = buildRidgeGeometry(
        {
          cx: spec.cx,
          cz: spec.cz,
          length: spec.length,
          height: spec.height,
          halfWidth: spec.halfWidth,
          seed: spec.seed,
          lean: spec.lean,
          edgeFloor: 0.35, // substantial end faces — cliffs, not dying spurs
        },
        terrainHeight,
      );
      const mesh = new THREE.Mesh(geo, cliffMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const leftCliff = makeCliff(LEFT_CLIFF);
    const rightCliff = makeCliff(RIGHT_CLIFF);

    if (typeof window !== 'undefined') {
      // QA mirror (same consumer shape as before: AABB center + half-extents).
      const toBox = (spec: CliffSpec) => {
        const b = ridgeBounds({ ...spec, edgeFloor: 0.35 });
        const gy = terrainHeight(spec.cx, spec.cz);
        return {
          x: spec.cx,
          y: gy + b.maxH / 2,
          z: spec.cz,
          sx: (b.maxX - b.minX) / 2,
          sy: b.maxH / 2,
          sz: (b.maxZ - b.minZ) / 2,
        };
      };
      (window as any).__cwMountainDomes = [toBox(LEFT_CLIFF), toBox(RIGHT_CLIFF)];
      (window as any).__cwMountainFootprint = {
        zStart: Math.min(LEFT_CLIFF.cz, RIGHT_CLIFF.cz) - 60,
        zEnd: Math.max(LEFT_CLIFF.cz, RIGHT_CLIFF.cz) + 60,
        halfWidth: 100,
      };
    }

    return { leftCliff, rightCliff };
  }, []);

  // Billboard spans the opening BETWEEN the cliffs, high above the path.
  // Board bottom (local y −2.55, frame −2.83) lands at ground+13.45 →
  // clears the character (~2u) and the follow camera (~7.5u) with margin;
  // posts run down to the ground at x=±7.9 (world), ~5u clear of the widest
  // path edge (pathHalfWidth ≈2.9 in the straightened canyon stretch).
  const signPos = useMemo(() => {
    const z = 118;
    const cx = pathCenterX(z);
    const ground = terrainHeight(cx, z);
    return { x: cx, y: ground + 16, z, yaw: Math.PI };
  }, []);

  return (
    <group>
      <primitive object={parts.leftCliff} />
      <primitive object={parts.rightCliff} />
      <ProjectsBillboard position={[signPos.x, signPos.y, signPos.z]} yaw={signPos.yaw} postLength={15.5} />
    </group>
  );
}
