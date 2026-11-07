/**
 * CloudWorldV2 — Welcome Harbour experience (FULL).
 * Route: #/cloud-world-v2
 */
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Clouds } from './components/Clouds';
import { Water } from './components/Water';
import { Terrain } from './components/Terrain';
import { Vegetation } from './components/Vegetation';
import { Harbour } from './components/Harbour';
import { DistantMountains } from './components/DistantMountains';
import { Lighting } from './components/Lighting';
import { Fog } from './components/Fog';
import { Character } from './components/Character';
import { WhaleBoat } from './components/WhaleBoat';
import { CameraRig } from './components/CameraRig';
import { InteractionSystem } from './components/Interaction';
import { InteractionProvider } from './components/InteractionContext';
import { HUD } from './components/HUD';
import { HoverTooltip, InfoCard, BoardingPrompt, LoadingOverlay } from './components/InteractionOverlay';

const characterGroupRef = { current: null as THREE.Group | null };

function SceneContent() {
  return (
    <Suspense fallback={null}>
      <Clouds />
      <DistantMountains />
      <Fog />
      <Lighting />
      <Terrain />
      <Water />
      <Vegetation />
      <Harbour />
      <Character groupRef={characterGroupRef} />
      <WhaleBoat />
      <InteractionSystem />
      <CameraRig />
    </Suspense>
  );
}

// Runs INSIDE <Canvas> — owns R3F hooks (useThree) and route isolation effects.
function WorldEffects() {
  const { gl, scene } = useThree();

  // Route isolation
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow, y: window.scrollY };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      const restore = () => window.scrollTo(0, prev.y);
      requestAnimationFrame(() => requestAnimationFrame(restore));
      window.setTimeout(restore, 120);
    };
  }, []);

  // Adaptive quality
  useEffect(() => {
    let frames = 0;
    let lastTime = performance.now();
    let fps = 60;
    const quality = { level: 'high' as 'high' | 'medium' | 'low' };

    const check = (now: number) => {
      frames++;
      if (now - lastTime >= 1000) {
        fps = frames;
        frames = 0;
        lastTime = now;

        if (fps < 28 && quality.level !== 'low') {
          quality.level = 'low';
          applyQuality('low');
        } else if (fps < 45 && quality.level === 'high') {
          quality.level = 'medium';
          applyQuality('medium');
        } else if (fps > 55 && quality.level !== 'high') {
          quality.level = 'high';
          applyQuality('high');
        }
      }
    };

    function applyQuality(level: typeof quality.level) {
      if (level === 'low') {
        gl.setPixelRatio(Math.min(1, window.devicePixelRatio));
        (scene as any).traverse((obj: any) => {
          if (obj.material?.map) obj.material.map.minFilter = THREE.LinearFilter;
        });
      } else if (level === 'medium') {
        gl.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
      } else {
        gl.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
      }
    }

    const id = setInterval(() => check(performance.now()), 1000);
    return () => clearInterval(id);
  }, [gl, scene]);

  return null;
}

export function CloudWorldV2({ onExit }: { onExit: () => void }) {
  return (
    <InteractionProvider>
      <HUD onBack={onExit} />
      <LoadingOverlay />
      <Canvas
        camera={{ position: [0, 18, 28], fov: 60 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        shadows={{ type: THREE.PCFSoftShadowMap, autoUpdate: false }}
        dpr={[1, 1.75]}
        style={{ width: '100%', height: '100dvh' }}
      >
        <WorldEffects />
        <SceneContent />
      </Canvas>
      {/* HTML overlays outside Canvas */}
      <HoverTooltip />
      <InfoCard />
      <BoardingPrompt />
    </InteractionProvider>
  );
}

export default CloudWorldV2;