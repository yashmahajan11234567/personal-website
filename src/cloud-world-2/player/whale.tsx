/**
 * Cloud World 2.0 — the Docker Whale: mesh, bob animation, deck tracking.
 *
 * Fresh component wrapping the fresh geometry from core/structures/
 * whaleGeometry. States (doc 02 §1.5): docked = gentle bob + slight pitch;
 * sailing = forward undulation + heading. Every frame while aboard, the whale
 * publishes `boatPose` so the character rides the deck.
 *
 * Instance matrices are filled in the ref callback (commit time) — the
 * useFrame-lazy build rendered degenerate bounds for one frame and crashed
 * frustum culling.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { boatPose, pilot } from './state';
import { BERTHS } from '../core/registry';
import { buildWhaleBody } from '../core/structures/whaleGeometry';
import type { Block } from '../core/types';

const dummy = new THREE.Object3D();
const colorHelper = new THREE.Color();

export function DockerWhale(): React.ReactElement {
  const group = useRef<THREE.Group>(null);
  const blocks = useMemo<Block[]>(() => buildWhaleBody(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.05 }),
    [],
  );

  const attach = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      mesh.count = blocks.length;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.sx ?? 1, b.sy ?? 1, b.sz ?? 1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        colorHelper.setHex(b.c);
        mesh.setColorAt(i, colorHelper);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    },
    [blocks],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!group.current) return;

    /* position: at the active berth when docked, at boatPos when sailing */
    if (pilot.mode === 'boat') {
      group.current.position.set(pilot.boatPos.x, 0, pilot.boatPos.z);
      group.current.rotation.y = pilot.boatHeading;
    } else {
      // moored at the berth nearest the pilot (the one they'll board at)
      let best = BERTHS[0];
      let bestD = Infinity;
      for (const b of BERTHS) {
        const d = Math.hypot(b.x - pilot.pos.x, b.z - pilot.pos.z);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      group.current.position.set(best.x, 0, best.z);
      group.current.rotation.y = best.heading;
    }

    /* bob + roll; stronger roll while sailing (undulation read) */
    const sailing = pilot.mode === 'boat' && pilot.moving;
    const amp = sailing ? 0.1 : 0.14;
    boatPose.worldY = Math.sin(t * 0.9) * amp;
    boatPose.deckY = 1.8;
    group.current.position.y = boatPose.worldY;
    group.current.rotation.x = Math.sin(t * 0.7) * (sailing ? 0.035 : 0.02);
    group.current.rotation.z = Math.sin(t * 0.55 + 1.2) * (sailing ? 0.05 : 0.025);
  });

  return (
    <group ref={group}>
      <instancedMesh
        ref={attach}
        args={[geometry, material, Math.max(1, blocks.length)]}
        castShadow
        receiveShadow
      />
    </group>
  );
}
