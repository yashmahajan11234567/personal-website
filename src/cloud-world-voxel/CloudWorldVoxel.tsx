/**
 * CloudWorldVoxel — The River Expedition.
 * Route: #/cloud-world-voxel
 *
 * A self-contained voxel world. It lives beside the other Cloud World routes
 * rather than replacing them: the 497-GLB v2 harbour, the 2.5D prototype and
 * the iso shell are all still mounted and still work. Choosing the voxel world
 * is two lines in App.tsx, and undoing it is the same two lines.
 *
 * Nothing here loads over the network. The entire archipelago, the ocean, the
 * whale and the visitor are generated from code at first render, which is why
 * there is no asset loader, no progress bar and no way for the world to come up
 * half-missing.
 */
import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import './cloudWorldVoxel.css';

import { C } from './palette';
import { BERTHS, HOTSPOTS, staticWorld, walkableHeight } from './world';
import { Voxels } from './VoxelMesh';
import { VoxelOcean } from './Ocean';
import { CloudShadows, VoxelClouds, VoxelSky } from './VoxelSky';
import { VoxelLighting } from './Lighting';
import { VoxelCharacter } from './VoxelCharacter';
import { DockerWhale } from './DockerWhale';
import { VillageLabels } from './VillageLabels';
import { CameraRig } from './CameraRig';
import { InteractionSystem } from './InteractionSystem';
import {
  ActionPrompt,
  HUD,
  HoverTooltip,
  InfoPanel,
  LoadingOverlay,
  TouchControls,
  WelcomeToast,
} from './Overlays';
import { keys, pilot, view } from './state';
import { useInteraction } from './interactionStore';

/** The static archipelago. Built once, never rebuilt. */
const WORLD_BLOCKS = staticWorld();

function SceneContents() {
  return (
    <Suspense fallback={null}>
      <fogExp2 attach="fog" args={[C.skyHorizon, 0.0016]} />
      <VoxelSky />
      <VoxelClouds />
      <CloudShadows />
      <VoxelLighting />
      <Voxels blocks={WORLD_BLOCKS} />
      <VoxelOcean />
      <DockerWhale />
      <VoxelCharacter />
      <VillageLabels />
      <InteractionSystem />
      <CameraRig />
    </Suspense>
  );
}

/** Inside the Canvas: route isolation, keyboard capture, QA hooks. */
function WorldEffects() {
  const { gl, camera, scene } = useThree();

  // scroll isolation — a world route must never scroll the portfolio beneath it
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
    };
  }, []);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return;
      }
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    const blur = () => {
      for (const k of Object.keys(keys)) keys[k] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  // first-frame signal for the loading overlay
  useEffect(() => {
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        view.ready = true;
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  // QA / debugging hooks: read-only handles onto live world state.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__cwv = {
      pilot,
      view,
      hotspots: HOTSPOTS,
      berths: BERTHS,
      open: (id: string) => useInteraction.getState().open(id),
      close: () => useInteraction.getState().close(),
      teleport: (x: number, z: number, mode: 'walk' | 'boat' = 'walk') => {
        pilot.mode = mode;
        if (mode === 'walk') {
          pilot.pos.set(x, walkableHeight(x, z) ?? 2, z);
          pilot.visualY = pilot.pos.y;
          pilot.grounded = true;
          pilot.velY = 0;
          pilot.moveTarget = null;
        } else {
          pilot.boatPos.set(x, 0, z);
          pilot.pos.set(x, pilot.visualY, z);
        }
      },
      look: (orbit: number, zoom = 1, pitch?: number) => {
        view.orbit = orbit;
        view.zoom = zoom;
        if (typeof pitch === 'number') view.pitch = pitch;
      },
      /** QA: press jump exactly like the player does (buffered, fixed-step) */
      jump: () => {
        keys[' '] = true;
        window.setTimeout(() => {
          keys[' '] = false;
        }, 60);
      },
      /** QA: hold the jump key down for `ms` */
      holdJump: (ms: number) => {
        keys[' '] = true;
        window.setTimeout(() => {
          keys[' '] = false;
        }, ms);
      },
      /** QA: order a walk to a ground point, exactly like a click does */
      moveTo: (x: number, z: number) => {
        pilot.moveTarget = { x, z };
      },
      renderer: gl,
      camera,
      scene,
      groundAt: (x: number, z: number) => walkableHeight(x, z),
    };
  }, [gl, camera, scene]);

  return null;
}

export function CloudWorldVoxel({ onExit }: { onExit: () => void }) {
  return (
    <div className="cwv-root">
      <HUD onExit={onExit} />
      <Canvas
        camera={{ fov: 34, near: 0.4, far: 2400, position: [0, 40, 40] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          // preserveDrawingBuffer costs a full buffer copy per frame on real
          // GPUs; only pay it when the QA harness asks for it (?qa=1)
          preserveDrawingBuffer: new URLSearchParams(window.location.search).has('qa'),
        }}
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.6]}
        style={{ width: '100%', height: '100dvh' }}
      >
        <WorldEffects />
        <SceneContents />
      </Canvas>
      <HoverTooltip />
      <ActionPrompt />
      <InfoPanel />
      <WelcomeToast />
      <TouchControls />
      <LoadingOverlay />
    </div>
  );
}

export default CloudWorldVoxel;
