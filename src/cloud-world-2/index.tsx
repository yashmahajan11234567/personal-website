/**
 * Cloud World 2.0 — the world route.
 *
 * Fresh composition for the greenfield implementation. Mounts the R3F canvas,
 * assembles the world once, and wires every system: environment, voxels,
 * whale, character, camera, interactions, HTML overlays. Self-contained —
 * shares nothing with the legacy cloud-world modules except the site shell.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import './styles/cloudWorld2.css';

import { staticWorld, renderPartition } from './core/world';
import { buildCollisionIndex } from './player/collision';
import { terrainY } from './core/world';
import { partitionBlocks, Voxels } from './core/voxel/mesh';
import { Sky } from './core/environment/Sky';
import { VoxelOcean, FoamRings } from './core/environment/Ocean';
import { VoxelClouds, CloudShadows } from './core/environment/Clouds';
import { VoxelLighting, applyRendererSetup } from './core/environment/Lighting';
import { SceneFog } from './core/environment/Fog';
import { DockerWhale } from './player/whale';
import { VoxelCharacter } from './player/character';
import { CameraRig } from './player/camera';
import { InteractionSystem } from './gameplay/interaction';
import { VillageLabels } from './ui/VillageLabels';
import { HUD } from './ui/HUD';
import { Minimap } from './ui/Minimap';
import { HoverTooltip, ActionPrompt, InfoPanel, WelcomeToast, LoadingOverlay } from './ui/Overlays';
import { TouchControls } from './ui/TouchControls';
import { view } from './player/state';
import { ISLANDS } from './core/registry';

function RendererSetup(): null {
  const { gl, scene } = useThree();
  useEffect(() => {
    applyRendererSetup(gl);
    (window as unknown as Record<string, unknown>).__cw2Scene = scene;
  }, [gl, scene]);
  return null;
}

function WorldEffects(): null {
  useEffect(() => {
    /* scroll isolation — a world route never scrolls the portfolio beneath it */
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

  /* keyboard */
  useEffect(() => {
    void import('./player/state').then(() => undefined);
    return undefined;
  }, []);

  return null;
}

function Keys(): null {
  useEffect(() => {
    void (async () => {
      const { keys } = await import('./player/state');
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
    })();
  }, []);
  return null;
}

function FirstFrameSignal(): null {
  const [, setReady] = useState(false);
  useEffect(() => {
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        view.ready = true;
        setReady(true);
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);
  return null;
}

/** QA hooks — one read-only handle onto live world state for Playwright. */
function QAHook(): null {
  useEffect(() => {
    void (async () => {
      const [{ pilot, view, keys }, { collisionStats }] = await Promise.all([
        import('./player/state'),
        import('./player/collision'),
      ]);
      const { gridStats, findPath, lineWalkable, cellWalkable } = await import('./player/navigation');
      const { terrainY } = await import('./core/world');
      const { useInteraction, allHotspots } = await import('./gameplay/store');
      const w = window as unknown as Record<string, unknown>;
      w.__cw2 = {
        pilot,
        view,
        keys,
        get ui() {
          return useInteraction.getState();
        },
        get hotspotList() {
          return allHotspots();
        },
        walkLine: (ax: number, az: number, bx: number, bz: number) =>
          lineWalkable({ x: ax, z: az }, { x: bx, z: bz }, terrainY),
        columnAt: (x: number, z: number) => {
          const { solid } = staticWorld();
          return solid.columnAt(x, z);
        },
        cellWalkable: (x: number, z: number) => cellWalkable(x, z),
        terrainY: (x: number, z: number) => terrainY(x, z),
        get camera() {
          return (w.__cw2Camera as THREE.Camera | undefined) ?? null;
        },
        get scene() {
          return (w.__cw2Scene as THREE.Scene | undefined) ?? null;
        },
        teleport: (x: number, z: number, mode: 'walk' | 'boat' = 'walk') => {
          pilot.mode = mode;
          if (mode === 'walk') {
            const y = terrainY(x, z) ?? 2;
            pilot.pos.set(x, y, z);
            pilot.visualY = y;
            pilot.grounded = true;
            pilot.velY = 0;
            pilot.moveTarget = null;
            pilot.path = null;
          } else {
            pilot.boatPos.set(x, 0, z);
            pilot.pos.set(x, pilot.visualY, z);
            pilot.moveTarget = null;
            pilot.path = null;
          }
        },
        moveTo: (x: number, z: number) => {
          void import('./player/navigation').then(({ findPath: fp }) => {
            const route = fp({ x: pilot.pos.x, z: pilot.pos.z }, { x, z }, terrainY);
            if (route.ok) {
              pilot.path = route.points;
              pilot.pathIndex = 0;
              const last = route.points[route.points.length - 1];
              pilot.moveTarget = { x: last.x, z: last.z };
            } else {
              console.warn(`[cw2] moveTo(${x}, ${z}) unreachable: ${route.reason}`);
              pilot.moveTarget = null;
              pilot.path = null;
            }
          });
        },
        open: (id: string) => useInteraction.getState().open(id),
        close: () => useInteraction.getState().close(),
        get store() {
          return useInteraction;
        },
        get blocks() {
          return staticWorld().world.length;
        },
        get collision() {
          return collisionStats();
        },
        get grid() {
          try {
            return gridStats();
          } catch {
            return null;
          }
        },
        get zone() {
          return useInteraction.getState().zone;
        },
        get hotspots() {
          return staticWorld().hotspots.length;
        },
      };
      void findPath;
    })();
  }, []);
  return null;
}

/** Inside the Canvas: the whole 3D world. */
function SceneContents(): React.ReactElement {
  const assembled = useMemo(() => staticWorld(), []);
  useMemo(() => buildCollisionIndex(assembled.solid), [assembled.solid]);
  const partition = useMemo(() => renderPartition(), []);
  const groups = useMemo(() => partitionBlocks(assembled.world, partition.terrainKeys, partition.vegKeys), [assembled.world, partition]);

  return (
    <Suspense fallback={null}>
      <SceneFog />
      <Sky />
      <VoxelClouds />
      <CloudShadows />
      <VoxelLighting lanterns={assembled.lanterns.map(([x, y, z]) => ({ x, y, z }))} />
      <Voxels groups={groups} />
      <VoxelOcean />
      <FoamRings islands={ISLANDS} />
      <DockerWhale />
      <VoxelCharacter />
      <VillageLabels labels={assembled.labels} />
      <InteractionSystem />
      <CameraRig />
    </Suspense>
  );
}

export function CloudWorld2({ onExit }: { onExit: () => void }): React.ReactElement {
  return (
    <div className="cw2-root">
      <HUD onExit={onExit} />
      <Canvas
        camera={{ fov: 66, near: 0.4, far: 2200, position: [0, 40, 40] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: new URLSearchParams(window.location.search).has('qa'),
        }}
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.6]}
        style={{ width: '100%', height: '100dvh' }}
      >
        <RendererSetup />
        <WorldEffects />
        <Keys />
        <FirstFrameSignal />
        <QAHook />
        <SceneContents />
      </Canvas>
      <Minimap />
      <HoverTooltip />
      <ActionPrompt />
      <InfoPanel />
      <WelcomeToast />
      <TouchControls />
      <LoadingOverlay />
    </div>
  );
}

export default CloudWorld2;
