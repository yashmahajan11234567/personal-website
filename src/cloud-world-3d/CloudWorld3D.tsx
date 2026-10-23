import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, EffectGroup } from '@react-three/postprocessing';
import { Vignette, Noise } from '@react-three/postprocessing';
import { N8AO } from '@react-three/postprocessing';
import { EffectComposer as EffectComposerType } from 'postprocessing';
import * as THREE from 'three';
import './CloudWorld3D.css';
import { DistantMountains, Terrain } from './Terrain';
import { Clouds, RocksAndGrass, Trees } from './Vegetation';
import { MountainPassage } from './MountainPassage';
import { Sky } from './Sky';
import { CloudCharacter } from './CloudCharacter';
import {
  ProjectMarker,
  SkillMarker,
  type ProjectInfo,
} from './Markers';
import { FOG_COLOR, FOG_FAR, FOG_NEAR, SKILL_SIGN_STATIONS, clearSignPosition, pathCenterX, terrainHeight } from './world';
import { SKILL_CATEGORIES } from './categories';
import { CloudCard } from './CloudCard';
import { PORTFOLIO } from '../content';

// Module-level flag to prevent duplicate FrameDriver loops in React.StrictMode
let frameDriverRunning = false;

function FrameDriver({ composerRef }: { composerRef: React.RefObject<EffectComposerType | null> }) {
  const { gl, advance, camera: cam, scene } = useThree();
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  const composerReadyRef = useRef(false);

  // QA instrumentation (harmless in prod): scene handle for live graph audits.
  useEffect(() => {
    if (typeof window !== 'undefined') (window as any).__cwScene = scene;
    return () => { if ((window as any).__cwScene === scene) (window as any).__cwScene = undefined; };
  }, [scene]);

  useEffect(() => {
    // Prevent multiple loops - use module-level flag
    if (frameDriverRunning) {
      console.log('[FrameDriver] Loop already running (module-level), skipping');
      return;
    }
    frameDriverRunning = true;

    // Accumulate render stats across all composer passes of a frame.
    const glInfo = (gl as any).info;
    if (glInfo) glInfo.autoReset = false;

    console.log('[FrameDriver] Effect started');
    // Manual render loop for frameloop="never"
    let frameCount = 0;

    const loop = (time: number) => {
      frameIdRef.current = requestAnimationFrame(loop);
      frameCount++;

      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // R3F v9's frameloop="never" branch computes the useFrame delta as
      // `timestamp - clock.elapsedTime` in RAW rAF MILLISECONDS — it never
      // divides by 1000. Passing the ms timestamp made every seconds-based
      // delta consumer (terrain auto-rotation, character speed) run ~1000x
      // too fast (measured: ProjectsSunsetZone at 2.99985 rad/s for a coded
      // 0.003). rAF time is in ms, clock time is in seconds, so we hand R3F
      // seconds; our own ms-scale `delta` above stays untouched.
      // DO NOT change this back to a millisecond timestamp.
      advance(time / 1000, true);

      // Render via EffectComposer once it is mounted
      if (composerRef.current && !composerReadyRef.current) {
        composerReadyRef.current = true;
      }

      if (composerReadyRef.current && composerRef.current) {
        // Let composer handle autoClear and render to screen
        composerRef.current.render(delta);
      }

      // Test instrumentation: rolling FPS onto the DOM for QA runs.
      // gl.info autoReset is disabled (once, below) and reset HERE per frame,
      // so calls/triangles accumulate across all composer passes of a frame.
      if (frameCount % 30 === 0 && typeof document !== 'undefined') {
        document.documentElement.dataset.cwFps = String(frameCount);
        document.documentElement.dataset.cwFpsAt = String(time);
        const glAny = gl as any;
        if (glAny.info) {
          document.documentElement.dataset.cwDrawCalls = String(glAny.info.render.calls);
          document.documentElement.dataset.cwTriangles = String(glAny.info.render.triangles);
        }
      }
      const glInfo = (gl as any).info;
      if (glInfo) glInfo.reset();

      // Test instrumentation: camera world position ring buffer for QA
      // (camera-distance assertions without poking three.js internals).
      if (typeof document !== 'undefined') {
        let hist = (window as any).__cwCamHist;
        if (!hist) hist = (window as any).__cwCamHist = [];
        hist.push({ t: time, x: cam.position.x, y: cam.position.y, z: cam.position.z });
        if (hist.length > 600) hist.splice(0, hist.length - 600);
      }
    };

    frameIdRef.current = requestAnimationFrame(loop);

    return () => {
      console.log('[FrameDriver] Cleanup, frames rendered:', frameCount);
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      frameDriverRunning = false;
      composerReadyRef.current = false;
    };
  }, [gl, advance, composerRef]);

  return null;
}

// Skill sign stations live in world.ts (single source of truth) so sign
// placement stays clear of obstacles. The 2026-10-16 redesign groups the
// skills into FOUR category boards (see categories.ts) instead of one sign
// per skill — the individual boards crowded the valley and obscured the
// mountain approach. All skills remain accessible through their category's
// overlay; nothing is removed from the content model.
// Category marker render data: position from the shared stations, title
// from the category definition, overlay resolution by stable category id.
const CATEGORY_STOPS = SKILL_CATEGORIES.map((cat, i) => {
  const station = SKILL_SIGN_STATIONS[i % SKILL_SIGN_STATIONS.length];
  const pos = clearSignPosition(station.z, station.side, 11.5);
  return {
    id: cat.id,
    title: cat.title,
    x: pos.x,
    z: pos.z,
    side: station.side,
  };
});
// Project data — the CLOUD WORLD's own projects (user-approved switch):
// RxVerify, DevOps Masterclass (replacing MediGen), Go Microservices,
// matching `worlds.data.ts` projectOrder. Titles/technologies come from
// PORTFOLIO (single source of truth); positions in the Sunset zone below.
// The cloud project entries carry a `github` URL field in projects.cloud.ts.
const PROJECT_DATA: ProjectInfo[] = ['rxverify', 'devops-masterclass', 'go-microservices'].map((id) => {
  const p = PORTFOLIO.projects[id] as unknown as (ProjectInfo & { github?: string }) | undefined;
  return {
    id,
    title: p?.title ?? id,
    github: p?.github ?? 'https://github.com/yashmahajan11234567',
    technologies: [...(p?.technologies ?? [])],
  };
});

// Project markers in the Projects Sunset zone (world z≈196-226). Positions
// follow the winding path centerline in the Sunset stretch, alternating
// sides. ±13u offset (new-req r2 Stage 1): project boards are scale 3.6
// (half-width ≈5.6u), so 13u keeps the board edge ≥3.5u clear of the path.
const PROJECT_MARKER_POSITIONS: [number, number][] = (() => {
  const zs = [196, 206, 216, 226];
  return zs.map((z, i) => {
    const dir = i % 2 === 0 ? -1 : 1;
    return [pathCenterX(z) + dir * 13, z] as [number, number];
  });
})();

// Concentric sunset rings lying on the ground at the sunset overlook — kept
// from the old zone (reduced 6→5, radius 20-80 → 7-27) but grounded on the
// terrain and pulled into the final meadow instead of sprawling over the
// whole valley.
const FOLLOW_DISTANCE = 15; // u
const FOLLOW_EASE_RATE = 1.2; // 1/s
const FOLLOW_MAX_DELTA_SQUARED = 0.0025;
// Inside the mountain bore the ceiling is ~4.8u above the walking floor, so
// the normal 15u orbit (camera ~7.5u up) would sit inside rock. While the
// avatar is in the canyon stretch, pull the orbit closer and clamp the
// camera under the bore ceiling so the view stays inside the carved passage.
const CANYON_Z0 = 97;
// Clamp stays on past the bore exit (CANYON_Z1 + margin): the camera trails
// the avatar by ~9-15u, so while the avatar exits (z 173→178) the camera is
// still INSIDE the bore — turning the clamp off at the bore edge pops the
// camera up into the crown rock mid-exit.
const CANYON_Z1 = 178;
const CANYON_FOLLOW_DISTANCE = 9.5; // u — closer third-person inside the bore
const BORE_CEILING_CLEAR = 4.0; // max camera height above the floor inside
// Bore arch (shell) radius — mirrors MountainPassage.tsx SHELL_R (BORE_R-0.4):
// the visible free space inside the bore is this half-cylinder centered at
// floor+0.2. The lateral clamp derives its height-aware limit from it.
const BORE_SHELL_R = 4.8;
function CameraTargetRig({
  controlsRef,
  targetPosRef,
  velRef,
}: {
  controlsRef: React.MutableRefObject<any>;
  targetPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  velRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const desired = useMemo(() => new THREE.Vector3(), []);
  const camOffset = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const charPos = targetPosRef.current;
    if (!controls || !charPos) return;
    // QA hook: tests may pin the camera to an exact pose via
    // window.__cwQaCam = { pos: [x,y,z], target: [x,y,z] } for identical A/B
    // screenshots across builds. No-op during normal gameplay (undefined).
    const qaCam = typeof window !== 'undefined' ? (window as any).__cwQaCam : undefined;
    if (qaCam) {
      const cam = controls.object as THREE.Camera;
      cam.position.set(qaCam.pos[0], qaCam.pos[1], qaCam.pos[2]);
      controls.target.set(qaCam.target[0], qaCam.target[1], qaCam.target[2]);
      controls.update();
      return;
    }
    desired.copy(charPos);
    desired.y += 1.8;
    const k = 1 - Math.exp(-5.5 * Math.min(delta, 1 / 30));
    controls.target.lerp(desired, k);

    // Canyon/bore: closer follow + camera clamped under the bore ceiling.
    const inCanyon = charPos.z > CANYON_Z0 && charPos.z < CANYON_Z1;
    const followDist = inCanyon ? CANYON_FOLLOW_DISTANCE : FOLLOW_DISTANCE;

    // Ease orbit distance to the follow distance while moving.
    const moving = velRef.current.lengthSq() > FOLLOW_MAX_DELTA_SQUARED;
    if (moving) {
      const cam = controls.object as THREE.Camera;
      camOffset.copy(cam.position).sub(controls.target);
      const dist = camOffset.length();
      if (Math.abs(dist - followDist) > 0.05) {
        const newDist = THREE.MathUtils.lerp(
          dist,
          followDist,
          1 - Math.exp(-FOLLOW_EASE_RATE * Math.min(delta, 1 / 30)),
        );
        camOffset.setLength(newDist);
        cam.position.copy(controls.target).add(camOffset);
      }
    }

    // Inside the bore: THIRD-PERSON CAMERA COLLISION. The camera orbits the
    // avatar, so its azimuth can swing it ±9u sideways — inside a ±4.4u-wide
    // bore that lands it in the flank rock (screen reads as solid warm rock:
    // backfaces are culled, you see through the dome into the lit mass).
    // Clamp the camera back into the walkable corridor every frame AFTER
    // controls.update() (update() re-derives its spherical state from the
    // clamped position, so the clamp persists and the camera slides along
    // the passage walls like standard third-person camera collision).
    const cam = controls.object as THREE.Camera;
    if (cam.position.z > CANYON_Z0 - 2 && cam.position.z < CANYON_Z1) {
      const axisX = pathCenterX(cam.position.z);
      const floorY = terrainHeight(axisX, cam.position.z);
      // VIS-001 fix (2026-10-22): the lateral limit is HEIGHT-AWARE. The bore
      // free space is the arched shell (radius BORE_SHELL_R centered
      // floor+0.2): a flat ±3.4 clamp validated only at low heights let the
      // camera reach the clamp-box corner (x=±3.4, y=floor+4.0), which sits
      // OUTSIDE the arch (free half-width at y=4.0 is 2.44u) — corner-test
      // screenshots showed 88% flat warm-rock fill (camera inside the dome
      // rock, vision-confirmed). At the camera's height h the free half-width
      // is sqrt(BORE_SHELL_R^2 − (h−floor−0.2)^2); keep a 1.0u margin and
      // never exceed the old flat cap. Order matters: clamp y FIRST, then
      // derive the lateral limit from the clamped height.
      const maxY = floorY + BORE_CEILING_CLEAR;
      if (cam.position.y > maxY) cam.position.y = THREE.MathUtils.lerp(cam.position.y, maxY, 0.5);
      const minY = floorY + 0.9;
      if (cam.position.y < minY) cam.position.y = THREE.MathUtils.lerp(cam.position.y, minY, 0.5);
      const archH = Math.min(
        Math.max(0, cam.position.y - floorY - 0.2),
        BORE_SHELL_R - 0.01,
      );
      const maxLateral = Math.min(
        3.4,
        Math.sqrt(Math.max(0, BORE_SHELL_R * BORE_SHELL_R - archH * archH)) - 1.0,
      );
      if (Math.abs(cam.position.x - axisX) > maxLateral) {
        cam.position.x = axisX + Math.sign(cam.position.x - axisX) * maxLateral;
      }
    }

    controls.update();

    // Re-apply after update(): OrbitControls overwrites position from its
    // internal spherical each update, so the corridor clamps must win.
    if (cam.position.z > CANYON_Z0 - 2 && cam.position.z < CANYON_Z1) {
      const axisX = pathCenterX(cam.position.z);
      const floorY = terrainHeight(axisX, cam.position.z);
      const maxY = floorY + BORE_CEILING_CLEAR;
      if (cam.position.y > maxY) cam.position.y = maxY;
      const minY = floorY + 0.9;
      if (cam.position.y < minY) cam.position.y = minY;
      const archH = Math.min(
        Math.max(0, cam.position.y - floorY - 0.2),
        BORE_SHELL_R - 0.01,
      );
      const maxLateral = Math.min(
        3.4,
        Math.sqrt(Math.max(0, BORE_SHELL_R * BORE_SHELL_R - archH * archH)) - 1.0,
      );
      if (Math.abs(cam.position.x - axisX) > maxLateral) {
        cam.position.x = axisX + Math.sign(cam.position.x - axisX) * maxLateral;
      }
    }
  });
  return null;
}

interface CloudWorld3DProps {
  onExit: () => void;
}

export const CloudWorld3D = ({ onExit }: CloudWorld3DProps) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<EffectComposerType>(null);
  const controlsRef = useRef<any>(null);
  const avatarPosRef = useRef<THREE.Vector3 | null>(null);
  // Live avatar velocity, published by CloudCharacter, read by CameraTargetRig
  // to ease the orbit distance to the follow distance while moving.
  const avatarVelRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const [cardData, setCardData] = useState<{ kind: 'skill' | 'project' | 'category'; id: string } | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    try {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setWebglAvailable(!!gl);
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Don't hijack Escape while the visitor is typing in a text field.
      const el = document.activeElement;
      if (el instanceof HTMLElement) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return;
      }
      onExit();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  if (!webglAvailable) {
    return (
      <div className="cloud-world-fallback" role="region" aria-label="Cloud World - WebGL not available">
        <div className="fallback-content">
          <h1>Cloud World</h1>
          <p>Your browser doesn't support WebGL, which is required for the 3D experience.</p>
          <button onClick={onExit} className="exit-button">Return to Portfolio</button>
        </div>
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div className="cloud-world-reduced" role="region" aria-label="Cloud World - Reduced motion">
        <div className="reduced-content">
          <h1>Cloud World</h1>
          <p>Reduced motion is enabled. The 3D experience is disabled for comfort.</p>
          <button onClick={onExit} className="exit-button">Return to Portfolio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cloud-world-container" ref={containerRef}>
      <Canvas
        camera={{ position: [0, 7.5, -17], fov: 50, near: 0.1, far: 20000 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
        style={{ touchAction: 'none' }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false, stencil: true, depth: true, powerPreference: 'high-performance' }}
        frameloop="never"
        shadows={false}
      >
        <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

        {/* Sky sphere + sun sprite + directional sun light + hemisphere fill */}
        <Sky />

        {/* Continuous displaced terrain with painted winding path */}
        <Terrain />
        <DistantMountains />
        <MountainPassage />
                <Trees />
        <RocksAndGrass />
        <Clouds />

        {/* Skill and project markers (interactive, click → overlay).
            Skills render as FOUR category boards (2026-10-16 redesign);
            each board's click resolves its category overlay, not a skill. */}
        {CATEGORY_STOPS.map((stop) => (
          <SkillMarker
            key={stop.id}
            stop={{ id: stop.id, name: stop.title, x: stop.x, z: stop.z, side: stop.side }}
            scale={2.4}
            onClick={(id) => setCardData({ kind: 'category', id })}
          />
        ))}
        {PROJECT_DATA.map((project, i) => (
          <ProjectMarker
            key={project.id}
            project={project}
            position={PROJECT_MARKER_POSITIONS[i % PROJECT_MARKER_POSITIONS.length]}
            onClick={(id) => setCardData({ kind: 'project', id })}
          />
        ))}

        {/* Player avatar — ground-level cloud character */}
        <CloudCharacter
          controlsRef={controlsRef}
          avatarPosRef={avatarPosRef}
          avatarVelRef={avatarVelRef}
        />

        {/* Orbit target follows the avatar; mouse-look orbits around the player */}
        <CameraTargetRig
          controlsRef={controlsRef}
          targetPosRef={avatarPosRef}
          velRef={avatarVelRef}
        />
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={12}
          maxDistance={38}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
        />

        {/* Frame driver for frameloop="never" */}
        <FrameDriver composerRef={composerRef} />

        {/* Post-processing effects */}
        <EffectComposer
          ref={composerRef}
          multisampling={0}
          autoRenderToScreen
          renderPriority={1}
        >
          <EffectGroup>
            {/* SSAO adds contact-shadow depth. Gated by measured FPS in QA:
              if headed FPS drops below 30, remove this effect (plan Stage 5). */}
            <N8AO
              aoRadius={0.6}
              intensity={2.2}
              distanceFalloff={0.5}
              halfRes
            />
            <Noise opacity={0.015} />
            <Vignette offset={0.35} darkness={0.4} eskil={false} />
          </EffectGroup>
        </EffectComposer>
      </Canvas>

      {/* Interactive overlay for skill/project details */}
      <div className="cloud-world-overlay">
        <div className="overlay-content">
          <header className="overlay-header">
            <h2 id="overlay-title">Cloud World</h2>
            <button onClick={onExit} className="exit-button" aria-label="Exit Cloud World">×</button>
          </header>
          <main className="overlay-main">
            <div id="overlay-body">
              <p className="placeholder-text">
                Journey through Skills Valley → Mountain Passage → Projects Sunset
              </p>
              <div className="journey-hint">
                <kbd>WASD</kbd> / <kbd>Arrow Keys</kbd> Move Character &nbsp;
                <kbd>Mouse</kbd> Look Around &nbsp;
                <kbd>Click</kbd> on markers for details &nbsp;
                <kbd>Esc</kbd> Exit
              </div>
            </div>
          </main>
        </div>
      </div>
      <CloudCard data={cardData} onClose={() => setCardData(null)} />
    </div>
  );
};

export default CloudWorld3D;
