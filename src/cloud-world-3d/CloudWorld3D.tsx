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
import { Sky } from './Sky';
import { CloudCharacter } from './CloudCharacter';
import { SkillMarker } from './Markers';
import { FOG_COLOR, FOG_FAR, FOG_NEAR, SKILL_SIGN_STATIONS, clearSignPosition, terrainHeight, PROJECTS_CLOUD_X, PROJECTS_CLOUD_Z, CLOUD_INTERIOR_CAM_R } from './world';
import { SKILL_CATEGORIES } from './categories';
import { CloudCard } from './CloudCard';
import { ProjectsCloud } from './ProjectsCloud';
import { ProjectsCloudInterior } from './ProjectsCloudInterior';

// Module-level flag to prevent duplicate FrameDriver loops in React.StrictMode
let frameDriverRunning = false;

function FrameDriver({ composerRef }: { composerRef: React.RefObject<EffectComposerType | null> }) {
  const { gl, advance, camera: cam, scene } = useThree();
  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());
  const composerReadyRef = useRef(false);

  // QA instrumentation (harmless in prod): scene handle for live graph audits.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__cwScene = scene;
      (window as any).__cwCamera = cam;
    }
    return () => {
      if ((window as any).__cwScene === scene) (window as any).__cwScene = undefined;
      if ((window as any).__cwCamera === cam) (window as any).__cwCamera = undefined;
    };
  }, [scene, cam]);

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
// Project data lives inside the Projects Cloud building (see ProjectsCloud.tsx);
// the outdoor Projects Sunset markers are gone with the old destination.

// QA mirror: live category-stop positions for browser tests.
if (typeof window !== 'undefined') {
  (window as any).__cwCategoryStops = CATEGORY_STOPS.map((s) => ({ id: s.id, x: s.x, z: s.z }));
}

const FOLLOW_DISTANCE = 15; // u (outside)
const FOLLOW_DISTANCE_INSIDE = 7.5; // u (inside the Projects Cloud gallery)
const FOLLOW_EASE_RATE = 1.2; // 1/s
const FOLLOW_MAX_DELTA_SQUARED = 0.0025;
function CameraTargetRig({
  controlsRef,
  targetPosRef,
  velRef,
  insideRef,
}: {
  controlsRef: React.MutableRefObject<any>;
  targetPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  velRef: React.MutableRefObject<THREE.Vector3>;
  /** true while the avatar is inside the Projects Cloud interior */
  insideRef: React.RefObject<boolean>;
}) {
  const desired = useMemo(() => new THREE.Vector3(), []);
  const camOffset = useMemo(() => new THREE.Vector3(), []);
  // 0 = outdoor rig, 1 = interior rig. Eased so crossing the doorway never
  // snaps the follow distance or the spring arm.
  const insideMix = useRef(0);
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

    // Inside the Projects Cloud the camera tightens up: shorter follow
    // distance and a spring arm that keeps it inside the gallery shell.
    const inside = insideRef.current;
    insideMix.current +=
      ((inside ? 1 : 0) - insideMix.current) * (1 - Math.exp(-4 * Math.min(delta, 1 / 30)));
    const followDist =
      FOLLOW_DISTANCE + (FOLLOW_DISTANCE_INSIDE - FOLLOW_DISTANCE) * insideMix.current;

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

    controls.update();

    // Spring arm (inside the gallery): SHORTEN the camera's distance along the
    // same target→camera ray until it fits inside the shell.
    //
    // The previous version scaled the camera radially about the cloud centre
    // instead. That moved the camera to whichever side of the player the ray
    // happened to point at, so on entry it slid THROUGH the player to the far
    // side (measured: camera z 165.4 with the avatar at 158.0, azimuth flipped
    // 0 instead of ≈π). The view then faced the doorway, and because movement
    // is camera-relative, W walked the player back out — the "inverted
    // controls". Shortening along the ray can never cross the player, so the
    // camera stays behind them and the azimuth is preserved.
    if (insideMix.current > 0.001) {
      const cam = controls.object as THREE.Camera;
      const groundY = terrainHeight(PROJECTS_CLOUD_X, PROJECTS_CLOUD_Z);
      const shellR = CLOUD_INTERIOR_CAM_R + 0.7; // stay just inside the shell
      const ox = controls.target.x - PROJECTS_CLOUD_X;
      const oz = controls.target.z - PROJECTS_CLOUD_Z;
      const ddx = cam.position.x - controls.target.x;
      const ddz = cam.position.z - controls.target.z;
      const dist = Math.hypot(ddx, ddz);
      if (dist > 1e-4) {
        const ux = ddx / dist;
        const uz = ddz / dist;
        // |o + u·t|² = shellR²  →  t² + 2(o·u)t + (|o|² − shellR²) = 0
        const b = ox * ux + oz * uz;
        const c = ox * ox + oz * oz - shellR * shellR;
        const disc = b * b - c;
        let tMax = Infinity;
        if (disc >= 0) tMax = -b + Math.sqrt(disc); // far intersection = exit
        const clamped = Math.max(Math.min(dist, tMax), 2.6);
        const blend = insideMix.current;
        const newDist = dist + (clamped - dist) * blend;
        if (Math.abs(newDist - dist) > 0.01) {
          cam.position.x = controls.target.x + ux * newDist;
          cam.position.z = controls.target.z + uz * newDist;
        }
      }
      // Keep the camera above the floor and below the ceiling.
      const clampedY = THREE.MathUtils.clamp(cam.position.y, groundY + 1.4, groundY + 8.5);
      cam.position.y += (clampedY - cam.position.y) * insideMix.current;
    }

    // QA mirror: interior rig state (used by the controls/transition tests).
    if (typeof window !== 'undefined') {
      const cam = controls.object as THREE.Camera;
      (window as any).__cwRigDbg = {
        insideMix: +insideMix.current.toFixed(3),
        followDist: +followDist.toFixed(2),
        camZ: +cam.position.z.toFixed(2),
        targetZ: +controls.target.z.toFixed(2),
        avatarZ: +charPos.z.toFixed(2),
      };
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
  // True while the avatar is inside the Projects Cloud — drives the camera
  // interior mode and the entrance door swing.
  const avatarInsideRef = useRef(false);
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

  // QA mirror: live OrbitControls instance (tests relax min/max distance for
  // close-up screenshots). controlsRef fills after child commit, so poll briefly.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setInterval(() => {
      if (controlsRef.current && !(window as any).__cwControls) {
        (window as any).__cwControls = controlsRef.current;
        window.clearInterval(t);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, []);

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
        <Trees />
        <RocksAndGrass />
        <Clouds />

        {/* Projects Cloud building — the giant enterable destination that
            replaced the old Mountain Passage. Exterior + interior shells;
            displays inside open the project CloudCard via onProjectClick. */}
        <ProjectsCloud insideRef={avatarInsideRef} avatarPosRef={avatarPosRef} />
        <ProjectsCloudInterior onProjectClick={(id) => setCardData({ kind: 'project', id })} />

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
        {/* Player avatar — ground-level cloud character */}
        <CloudCharacter
          controlsRef={controlsRef}
          avatarPosRef={avatarPosRef}
          avatarVelRef={avatarVelRef}
          insideRef={avatarInsideRef}
        />

        {/* Orbit target follows the avatar; mouse-look orbits around the player */}
        <CameraTargetRig
          controlsRef={controlsRef}
          targetPosRef={avatarPosRef}
          velRef={avatarVelRef}
          insideRef={avatarInsideRef}
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
                Journey through Skills Valley → Projects Cloud
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
