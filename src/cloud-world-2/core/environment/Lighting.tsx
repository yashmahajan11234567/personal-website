/**
 * Cloud World 2.0 — lighting: sunset (demo default) + night rig.
 *
 * Fresh implementation. Lights are rendered as R3F children (the prior
 * version created them imperatively in an effect without attaching them, so
 * the scene rendered black). The night flag (view.night) swaps the rig in a
 * frame loop.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { view } from '../../player/state';

export interface LanternPosition {
  x: number;
  y: number;
  z: number;
}

const SUNEAST = new THREE.Vector3(5, 10, 7);
const MOONWEST = new THREE.Vector3(-10, 15, -10);

export function VoxelLighting({ lanterns }: { lanterns: LanternPosition[] }) {
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const prevNight = useRef(view.night);

  useFrame(() => {
    const hemi = hemiRef.current;
    const key = keyRef.current;
    if (!hemi || !key) return;
    if (view.night === prevNight.current) return;
    prevNight.current = view.night;
    if (view.night) {
      hemi.color.setHex(0x4a148c);
      hemi.groundColor.setHex(0x1a1a2e);
      hemi.intensity = 0.35;
      key.color.setHex(0xe8e8ff);
      key.intensity = 0.85;
      key.position.copy(MOONWEST);
    } else {
      hemi.color.setHex(0xbbddff);
      hemi.groundColor.setHex(0x443322);
      hemi.intensity = 1.0;
      key.color.setHex(0xffffff);
      key.intensity = 2.5;
      key.position.copy(SUNEAST);
    }
    key.shadow.camera.updateProjectionMatrix();
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={[0xbbddff, 0x443322, 1.0]} />
      <directionalLight
        ref={keyRef}
        position={[5, 10, 7]}
        intensity={2.5}
        color={0xffffff}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      {lanterns.map((pos, i) => (
        <pointLight
          key={`lantern-${i}`}
          position={[pos.x, pos.y + 1.6, pos.z]}
          color={0xffb300}
          intensity={1.6}
          distance={9}
          decay={2}
        />
      ))}
    </>
  );
}

/** Tone mapping + shadow setup — call once from the parent after renderer init. */
export function applyRendererSetup(gl: THREE.WebGLRenderer): void {
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.0;
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFShadowMap;
}
