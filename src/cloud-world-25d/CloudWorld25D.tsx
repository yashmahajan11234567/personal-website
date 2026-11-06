/**
 * CloudWorld25D — shell for the 2.5D cartoon river expedition (route #/cloud-world-25d).
 * Welcome Harbour prototype: Canvas + HUD + info card. Scroll isolation is enforced
 * by App.tsx (body overflow hidden while a world route is mounted).
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment, WORLD_FOG } from './environment';
import { WhaleBoat } from './boat';
import { Character, pilot } from './character';
import { walkable, terrainHeight } from './world25d';
import { PORTFOLIO } from '../content';
import './cw25d.css';

/** QA-only: when true, QualityController never degrades (for screenshots on real GPUs/headless). */
export const qualityOverride = { high: false };
let glHandle: { gl: import('three').WebGLRenderer; scene: import('three').Scene } | null = null;

function Lights() {
  return (
    <group>
      <hemisphereLight args={['#cfe8ff', '#7a9a6a', 0.95]} />
      <directionalLight
        position={[28, 42, 18]}
        intensity={1.7}
        color="#fff5e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
      />
    </group>
  );
}

/** QA-only camera zoom factor (1 = default framing). */
export const camZoom = { f: 1 };

/** 2.5D follow camera: fixed offset, smooth lerp, looks at the pilot/boat. */
function CameraRig() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(14, 1, 3));
  const camPos = useRef(new THREE.Vector3(17, 16, 37));
  useEffect(() => {
    camera.position.copy(camPos.current);
    camera.lookAt(target.current);
  }, [camera]);
  useFrame((_, dt) => {
    const focus = pilot.mode === 'boat' ? pilot.boatPos : pilot.pos;
    target.current.set(focus.x, (pilot.mode === 'boat' ? 1 : pilot.pos.y) + 0.8, focus.z);
    const zf = camZoom.f;
    const want = new THREE.Vector3(target.current.x + 3 * zf, target.current.y + 15 * zf, target.current.z + 34 * zf);
    camPos.current.lerp(want, 1 - Math.exp(-4.5 * dt));
    camera.position.copy(camPos.current);
    camera.lookAt(target.current);
    (window as unknown as Record<string, unknown>).__campos = [camera.position.x, camera.position.y, camera.position.z, zf];
  });
  return null;
}

/** Keeps the boat mesh glued to pilot.boatPos (WhaleBoat only owns y-bob/tilt). */
function BoatDriver({ groupRef }: { groupRef: React.MutableRefObject<THREE.Group | null> }) {
  useFrame(() => {
    const g = groupRef.current;
    if (g) {
      g.position.x = pilot.boatPos.x;
      g.position.z = pilot.boatPos.z;
      g.rotation.y = pilot.mode === 'boat' && pilot.moving ? pilot.heading : g.rotation.y;
    }
  });
  return null;
}

/** Adaptive quality: if sustained fps < 28, drop pixel ratio to 1 and disable shadow maps. */
function QualityController({ fpsRef }: { fpsRef: React.MutableRefObject<{ frames: number; t: number; fps: number }> }) {
  const { gl, scene } = useThree();
  const lowStreak = useRef(0);
  const degraded = useRef(false);
  useFrame(() => {
    if (qualityOverride.high) return;
    if (degraded.current) return;
    if (fpsRef.current.fps > 0 && fpsRef.current.fps < 28) {
      lowStreak.current += 1;
      if (lowStreak.current >= 3) {
        degraded.current = true;
        gl.setPixelRatio(1);
        gl.shadowMap.enabled = false;
        scene.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.Material | undefined;
          if (m) m.needsUpdate = true;
        });
      }
    } else {
      lowStreak.current = 0;
    }
  });
  return null;
}

/** Floating "E — board" prompt above the boat when the pilot is near the dock end. */
function BoardPrompt() {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(20,32,48,0.82)';
    ctx.beginPath(); ctx.roundRect(8, 20, 240, 88, 18); ctx.fill();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 40px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('E — board', 128, 62);
    ctx.fillStyle = '#ffffff'; ctx.font = '26px "Trebuchet MS", sans-serif';
    ctx.fillText('the Docker whale', 128, 96);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const near = pilot.mode === 'walk' && Math.hypot(pilot.pos.x - pilot.boatPos.x, pilot.pos.z - pilot.boatPos.z) < 7;
    m.visible = near;
    if (near) {
      m.position.set(pilot.boatPos.x, 3.4 + Math.sin(clock.elapsedTime * 2.4) * 0.15, pilot.boatPos.z);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.92;
    }
  });
  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[2.6, 1.3]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

interface CardState { id: string; kind: string; label: string }

function InfoCard({ card, onClose }: { card: CardState; onClose: () => void }) {
  const body = useMemo(() => {
    if (card.kind === 'about') {
      return {
        title: 'About me',
        lines: [
          'Yash Mahajan — Cloud / DevOps portfolio world.',
          'This harbour is the 2.5D cartoon rebuild of Cloud World: walk the dock, board the Docker whale, visit the skill and project harbours.',
        ],
        chips: [] as string[],
      };
    }
    if (card.kind === 'sign') {
      return {
        title: card.label,
        lines: ['WASD / arrow keys to move · SHIFT to run · E to board / leave the boat · click glowing buildings and signs.'],
        chips: [] as string[],
      };
    }
    const skill = PORTFOLIO.skills[card.id];
    if (skill) {
      const chips = (card as CardState & { skills?: string[] });
      return {
        title: skill.name,
        lines: [skill.summary],
        chips: (chips.skills ?? []).map((id) => PORTFOLIO.skills[id]?.name ?? id),
      };
    }
    const proj = PORTFOLIO.projects[card.id];
    if (proj) {
      return {
        title: proj.title,
        lines: [proj.description, ...(proj.workflow?.stages ?? []).slice(0, 3).map((s) => s.label)],
        chips: (proj.technologies ?? []).slice(0, 8),
      };
    }
    return { title: card.label, lines: [''], chips: [] as string[] };
  }, [card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cw25d-card" role="dialog" aria-label={body.title}>
      <header>
        <h2>{body.title}</h2>
        <button onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="cw25d-card-body">
        {body.lines.filter(Boolean).map((l, i) => <p key={i}>{l}</p>)}
        {body.chips.length > 0 && (
          <div className="cw25d-chips">
            {body.chips.map((c: string) => <span key={c} className="cw25d-chip">{c}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function CloudWorld25D({ onExit }: { onExit: () => void }) {
  const boatRef = useRef<THREE.Group>(null);
  const charRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [card, setCard] = useState<(CardState & { skills?: string[] }) | null>(null);
  const errors = useRef<string[]>([]);
  const fpsRef = useRef({ frames: 0, t: 0, fps: 0 });

  const openHotspot = (id: string) => {
    const hs = id === 'about'
      ? { id, kind: 'about', label: 'About me' }
      : { id, kind: 'sign', label: 'How to play' };
    setCard(hs as CardState & { skills?: string[] });
  };

  // QA / automation hook
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__cw25d = {
      get mode() { return pilot.mode; },
      get pos() { return { x: pilot.pos.x, y: pilot.pos.y, z: pilot.pos.z }; },
      get boat() { return { x: pilot.boatPos.x, z: pilot.boatPos.z }; },
      get fps() { return fpsRef.current.fps; },
      get errors() { return errors.current; },
      get card() { return card?.id ?? null; },
      teleport: (x: number, z: number) => {
        const h = walkableSafe(x, z);
        if (h !== null) pilot.pos.set(x, h, z);
      },
      board: () => { pilot.pos.set(29, 0.55, 0); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); },
      disembark: () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' })); },
      key: (k: string, down = true) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: k })),
      clickHotspot: openHotspot,
      closeCard: () => setCard(null),
      zoom: (f: number) => { camZoom.f = f; },
      forceHigh: () => {
        qualityOverride.high = true;
        const h = glHandle;
        if (h) {
          h.gl.setPixelRatio(1.75);
          h.gl.shadowMap.enabled = true;
          h.scene.traverse((o) => {
            const m = (o as import('three').Mesh).material as import('three').Material | undefined;
            if (m) m.needsUpdate = true;
          });
        }
      },
    };
    window.addEventListener('error', (e) => errors.current.push(String(e.message).slice(0, 140)));
    return () => { w.__cw25d = undefined; };
  }, [card]);

  return (
    <div className="cw25d-shell">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [17, 16, 37], fov: 40, near: 0.5, far: 700 }}
        onCreated={({ gl, scene }) => {
          glHandle = { gl, scene };
          gl.setClearColor(WORLD_FOG.color);
          const loop = () => {
            fpsRef.current.frames++;
            const now = performance.now();
            if (now - fpsRef.current.t >= 1000) {
              fpsRef.current.fps = Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.t));
              fpsRef.current.frames = 0;
              fpsRef.current.t = now;
            }
            requestAnimationFrame(loop);
          };
          fpsRef.current.t = performance.now();
          requestAnimationFrame(loop);
        }}
      >
        <fog attach="fog" args={[WORLD_FOG.color, WORLD_FOG.near, WORLD_FOG.far]} />
        <Lights />
        <CameraRig />
        <QualityController fpsRef={fpsRef} />
        <Suspense fallback={null}>
          <Environment onHover={setHovered} onClick={openHotspot} hovered={hovered} />
          <WhaleBoat groupRef={boatRef} />
          <BoatDriver groupRef={boatRef} />
          <BoardPrompt />
          <Character groupRef={charRef} />
        </Suspense>
      </Canvas>

      <div className="cw25d-hud">
        <div className="cw25d-title">
          <h1>THE RIVER EXPEDITION</h1>
          <p>Welcome Harbour</p>
        </div>
        <button type="button" className="cw25d-back" onClick={onExit}>← Back to Portfolio</button>
        <p className="cw25d-hint">WASD / arrows move · SHIFT run · E board boat · click signs &amp; buildings</p>
      </div>

      {hovered && !card && (
        <div className="cw25d-tooltip">{hovered === 'about' ? 'About me — click' : 'How to play — click'}</div>
      )}
      {card && <InfoCard card={card} onClose={() => setCard(null)} />}
    </div>
  );
}

function walkableSafe(x: number, z: number): number | null {
  return walkable(x, z) !== null ? terrainHeight(x, z) : null;
}

export default CloudWorld25D;
