import { Suspense, useEffect, useMemo, useRef, useState, Component } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './experience.css';

gsap.registerPlugin(ScrollTrigger);

/*
 * Atlas of Drifting Isles — final architecture.
 *
 * Exactly THREE islands, each ONE unified closed mesh (displaced cylinder:
 * organic silhouette, integrated rocky underside, vertex-colored grass->rock
 * blend). Landmarks are the original Atlas GLBs (blendi-remade/dioramas,
 * CC BY 4.0), auto-fitted by measured bounding box and grounded on terrain.
 * Distinct identities: Lighthouse = coastal cliffs, Windmill = rolling hills,
 * Pagoda = Japanese garden with cherry blossoms.
 */

type DestId = 'lighthouse' | 'windmill' | 'pagoda';

interface IslandSpec {
  id: DestId;
  pos: [number, number, number];
  r: number;
  depth: number;
  seed: number;
  grass: string;
  rock: string;
  modelHeight: number;
  flora: 'pine' | 'meadow' | 'cherry';
}

const ISLANDS: IslandSpec[] = [
  { id: 'lighthouse', pos: [-28, 2, -6],  r: 10,  depth: 15, seed: 1.3, grass: '#5d8f3c', rock: '#5c4a38', modelHeight: 9,   flora: 'pine' },
  { id: 'windmill',   pos: [2, 4, -22],   r: 8.5, depth: 12, seed: 4.1, grass: '#6d9a45', rock: '#6a5642', modelHeight: 10,  flora: 'meadow' },
  { id: 'pagoda',     pos: [30, 0, -2],   r: 10,  depth: 14, seed: 7.7, grass: '#5b8c3e', rock: '#58463a', modelHeight: 9.5, flora: 'cherry' },
];

/* Selected pose: island framed LEFT of screen centre, HTML panel occupies right. */
const POSES: Record<'overview' | DestId, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  overview:   { pos: [0, 14, 48],   target: [2, 5, -10],   fov: 50 },
  lighthouse: { pos: [-14, 9, 18],  target: [-20, 5, -6],  fov: 48 },
  windmill:   { pos: [14, 12, -10], target: [8, 8, -24],   fov: 44 },
  pagoda:     { pos: [44, 9, 16],   target: [38, 5, -4],   fov: 48 },
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


/* RNG removed */


class ModelBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(e: unknown) {
    console.error('[atlas] model failed to mount:', e);
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

interface AtlasModelProps {
  url: string;
  height: number;
  info: string;
  spin?: boolean;
}

function findSpinNode(root: THREE.Object3D): string {
  let found = '';
  root.traverse((o) => {
    if (!found && /blade|rotor|wing|propeller|fan/i.test(o.name)) found = o.name;
  });
  return found;
}

function AtlasModel({ url, height, info, spin = false }: AtlasModelProps) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group };
  const fitted = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = size.y > 0.0001 ? height / size.y : 1;
    const spinName = spin ? findSpinNode(clone) : '';
    return { clone, s, off: new THREE.Vector3(-center.x, -box.min.y, -center.z), spinName };
  }, [scene, height, spin]);

  useEffect(() => {
    const w = window as unknown as { __atlasModels?: Record<string, { target: string; srcHeight: string }> };
    w.__atlasModels = w.__atlasModels || {};
    w.__atlasModels[info] = { target: height.toFixed(1), srcHeight: (1 / fitted.s).toFixed(2) };
    console.info(`[atlas] mounted ${info}: normalized to ${height.toFixed(1)}u (src ~${(1 / fitted.s).toFixed(2)}u)`);
  }, [fitted, info, height]);

  useFrame((_, dt) => {
    if (!fitted.spinName) return;
    const node = fitted.clone.getObjectByName(fitted.spinName);
    if (node) node.rotation.y += dt * 1.1;
  });

  return (
    <group scale={fitted.s}>
      <group position={fitted.off}>
        <primitive object={fitted.clone} />
      </group>
    </group>
  );
}

/* ---------- unified island terrain: ONE closed organic mesh ---------- */
/* REMOVED - only showing diorama GLB
function makeIslandGeometry(spec: IslandSpec): THREE.BufferGeometry {
  const { r, depth, seed, grass, rock } = spec;
  const geo = new THREE.CylinderGeometry(r, r * 0.12, depth, 28, 10);
  geo.translate(0, -depth / 2, 0); // top surface sits at y = 0

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const grassC = new THREE.Color(grass);
  const rockC = new THREE.Color(rock);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const t = Math.min(1, Math.max(0, y / -depth)); // 0 top -> 1 bottom tip

    // Organic horizontal silhouette: layered angular wobble, strongest near top.
    const wob =
      1 +
      0.16 * Math.sin(ang * 3 + seed) +
      0.11 * Math.sin(ang * 5 - seed * 1.7) +
      0.07 * Math.sin(ang * 8 + seed * 2.3);
    const taper = 1 - t * 0.22 * (0.5 + 0.5 * Math.sin(ang * 2 + seed)); // asymmetric taper
    const s = Math.max(0.25, wob * taper);
    pos.setX(i, x * s);
    pos.setZ(i, z * s);

    // Bumpy grass surface on the top cap.
    if (y > -0.001) {
      const bump =
        0.32 * Math.sin(x * 0.5 + seed) * Math.cos(z * 0.45 - seed) +
        0.18 * Math.sin(x * 1.1 - seed) * Math.cos(z * 0.9 + seed * 2);
      pos.setY(i, bump);
    }

    // Vertex colour: grass cap blending into rock cliffs.
    const topness = Math.max(0, 1 - t * 5);
    tmp.copy(rockC).lerp(grassC, topness);
    const v = 0.92 + 0.08 * Math.sin(ang * 7 + y * 2);
    colors[i * 3] = tmp.r * v;
    colors[i * 3 + 1] = tmp.g * v;
    colors[i * 3 + 2] = tmp.b * v;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}


/* ---------- flora ---------- */
/* REMOVED */


/* ---------- sky, clouds, lighting ---------- */

function makeSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2c5aa0'); // zenith deep blue
  g.addColorStop(0.45, '#7db8e8');
  g.addColorStop(0.75, '#cfe6f5');
  g.addColorStop(1, '#f2e2c8'); // warm horizon
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function SkyDome() {
  const tex = useMemo(() => makeSkyTexture(), []);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[300, 32, 20]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

function CloudPuff({ position, scale, speed, seed }: { position: [number, number, number]; scale: number; speed: number; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      [0, 1, 2].map((i) => {
        const g = new THREE.IcosahedronGeometry(1, 1);
        const p = g.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < p.count; v++) {
          p.setXYZ(
            v,
            p.getX(v) * (1 + 0.22 * Math.sin(v * 1.7 + seed + i)),
            p.getY(v) * (0.62 + 0.18 * Math.cos(v * 2.1 + seed)),
            p.getZ(v) * (1 + 0.22 * Math.cos(v * 1.3 + seed * 1.3)),
          );
        }
        g.computeVertexNormals();
        return g;
      }),
    [seed],
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.x += dt * speed;
    if (ref.current.position.x > 110) ref.current.position.x = -110;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={puffs[0]}>
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.95} flatShading />
      </mesh>
      <mesh geometry={puffs[1]} position={[1.5, -0.18, 0.25]} scale={0.75}>
        <meshStandardMaterial color="#f4faff" roughness={1} transparent opacity={0.92} flatShading />
      </mesh>
      <mesh geometry={puffs[2]} position={[-1.35, -0.12, -0.2]} scale={0.8}>
        <meshStandardMaterial color="#f4faff" roughness={1} transparent opacity={0.92} flatShading />
      </mesh>
    </group>
  );
}

function CloudField() {
  return (
    <group>
      <CloudPuff position={[-55, 26, -70]} scale={4.2} speed={0.5} seed={2} />
      <CloudPuff position={[35, 32, -95]} scale={5.2} speed={0.35} seed={5} />
      <CloudPuff position={[62, 20, -50]} scale={3.4} speed={0.6} seed={8} />
      <CloudPuff position={[-20, 36, -110]} scale={4.8} speed={0.3} seed={12} />
      <CloudPuff position={[-85, 16, -40]} scale={3} speed={0.45} seed={17} />
      <CloudPuff position={[15, 14, -35]} scale={2.4} speed={0.55} seed={21} />
    </group>
  );
}

/* ---------- island assembly ---------- */

function Island({
  spec,
  selected,
  onSelect,
  registerRef,
}: {
  spec: IslandSpec;
  selected: boolean;
  onSelect: (id: DestId) => void;
  registerRef: (id: DestId, g: THREE.Group | null) => void;
}) {
  const outer = useRef<THREE.Group>(null);
  const float = useRef<THREE.Group>(null);

  useEffect(() => {
    registerRef(spec.id, outer.current);
    return () => registerRef(spec.id, null);
  });

  useFrame((state) => {
    if (float.current && !selected) {
      float.current.position.y = Math.sin(state.clock.elapsedTime * 0.3 + spec.seed) * 0.12;
      float.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2 + spec.seed) * 0.006;
    }
  });

  return (
    <group
      ref={outer}
      position={spec.pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spec.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <group ref={float}>
        {/* Only diorama/landmark from GLB - no procedural bottom platform */}
        <group position={[0, 0, 0]}>
          <ModelBoundary>
            <Suspense fallback={null}>
              <AtlasModel url={`/assets/atlas/${spec.id}.glb`} height={spec.modelHeight} info={spec.id} spin={spec.id === 'windmill'} />
            </Suspense>
          </ModelBoundary>
        </group>
      </group>
    </group>
  );
}

/* ---------- camera ---------- */

function CameraRig({ selected }: { selected: DestId | null }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...POSES.overview.target));

  useEffect(() => {
    const dur = prefersReducedMotion() ? 0 : 1.8;
    const pose = POSES[selected ?? 'overview'];
    gsap.killTweensOf(camera.position);
    gsap.to(camera.position, { x: pose.pos[0], y: pose.pos[1], z: pose.pos[2], duration: dur, ease: 'power2.inOut' });
    gsap.killTweensOf(target.current);
    gsap.to(target.current, { x: pose.target[0], y: pose.target[1], z: pose.target[2], duration: dur, ease: 'power2.inOut' });
    const cam = camera as THREE.PerspectiveCamera;
    gsap.killTweensOf(cam);
    gsap.to(cam, { fov: pose.fov, duration: dur, ease: 'power2.inOut', onUpdate: () => cam.updateProjectionMatrix() });
  }, [selected, camera]);

  useFrame(() => {
    camera.lookAt(target.current);
  });
  return null;
}

function Scene({
  selected,
  onSelect,
  registerRef,
}: {
  selected: DestId | null;
  onSelect: (id: DestId) => void;
  registerRef: (id: DestId, g: THREE.Group | null) => void;
}) {
  return (
    <>
      <SkyDome />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#cfe8ff', '#8fa87a', 0.85]} />
      <directionalLight
        position={[70, 90, 50]}
        intensity={2.2}
        color="#fff2dc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-70}
        shadow-camera-far={260}
      />
      {ISLANDS.map((spec) => (
        <Island key={spec.id} spec={spec} selected={selected === spec.id} onSelect={onSelect} registerRef={registerRef} />
      ))}
      <CloudField />
    </>
  );
}

/* ---------- HTML panels ---------- */

function DestPanel({ id }: { id: DestId }) {
  if (id === 'lighthouse') {
    return (
      <div className="dest-panel accent-lighthouse">
        <p className="dest-kicker">Lighthouse</p>
        <h3>Bluestock Fintech</h3>
        <p className="dest-role">Data Analytics Intern</p>
        <p className="dest-dates">20 June 2026 - 20 September 2026</p>
        <section><h4>Experience</h4><p>TODO: Description, responsibilities and achievements to be added.</p></section>
        <section><h4>Skills</h4><p>TODO: Skills to be added.</p></section>
        <section><h4>Certificate</h4><p>TODO: Certificate pending.</p></section>
        <section><h4>Project</h4><p>TODO: GitHub link will be added once the repository URL is verified.</p></section>
      </div>
    );
  }
  if (id === 'windmill') {
    return (
      <div className="dest-panel accent-windmill">
        <p className="dest-kicker">Windmill</p>
        <h3>Agratas Fintech</h3>
        <p className="dest-role">TODO: Official internship title (pending)</p>
        <p className="dest-dates">TODO: Dates (pending)</p>
        <section><h4>Experience</h4><p>TODO: Finance internship - learning and documentation responsibilities to be added.</p></section>
        <section><h4>Certificate</h4><p>TODO: Certificate pending.</p></section>
      </div>
    );
  }
  return (
    <div className="dest-panel accent-pagoda">
      <p className="dest-kicker">Pagoda</p>
      <h3>Career Growth</h3>
      <section><h4>Direction</h4><p>An ongoing transition into data-focused engineering: Data Analytics, Data Engineering, Cloud infrastructure and DevOps.</p></section>
      <section><h4>Next</h4><p>TODO: Certifications and milestones to be added.</p></section>
    </div>
  );
}

/* ---------- main ---------- */

export function ExperienceSection() {
  const [selected, setSelected] = useState<DestId | null>(null);
  const islandRefs = useRef<Partial<Record<DestId, THREE.Group | null>>>({});
  const sectionRef = useRef<HTMLElement>(null);

  const registerRef = (id: DestId, g: THREE.Group | null) => {
    islandRefs.current[id] = g;
  };

  useEffect(() => {
    const dur = prefersReducedMotion() ? 0 : 1.5;
    for (const spec of ISLANDS) {
      const g = islandRefs.current[spec.id];
      if (!g) continue;
      gsap.killTweensOf(g.scale);
      if (selected === null) {
        gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: dur, ease: 'power2.inOut' });
      } else if (selected !== spec.id) {
        gsap.to(g.scale, { x: 0.38, y: 0.38, z: 0.38, duration: dur, ease: 'power2.inOut' });
      } else {
        gsap.to(g.scale, { x: 1.04, y: 1.04, z: 1.04, duration: dur, ease: 'power2.inOut' });
      }
    }
  }, [selected]);

  useEffect(() => {
    const order: DestId[] = ['lighthouse', 'windmill', 'pagoda'];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected) setSelected(null);
      else if (e.key === 'ArrowRight' && selected) setSelected(order[(order.indexOf(selected) + 1) % order.length]);
      else if (e.key === 'ArrowLeft' && selected) setSelected(order[(order.indexOf(selected) + order.length - 1) % order.length]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  /* Cinematic hand-off into the next section (scrubbed, reversible). */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const env = section.querySelector('.atlas-environment') as HTMLElement | null;
    const header = section.querySelector('.experience-header-container') as HTMLElement | null;
    if (!env) return;
    const ctx = gsap.context(() => {
      gsap.to(env, {
        scale: 0.96,
        opacity: 0.65,
        y: -24,
        filter: 'blur(3px)',
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'bottom 82%', end: 'bottom 30%', scrub: 1 },
      });
      if (header) {
        gsap.to(header, {
          opacity: 0.5,
          y: -12,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'bottom 86%', end: 'bottom 36%', scrub: 1 },
        });
      }
    }, section);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    return () => {
      for (const spec of ISLANDS) {
        const g = islandRefs.current[spec.id];
        if (g) gsap.killTweensOf(g.scale);
      }
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const order: DestId[] = ['lighthouse', 'windmill', 'pagoda'];
    if (!selected) return;
    setSelected(order[(order.indexOf(selected) + dir + order.length) % order.length]);
  };

  const label = (id: DestId) => (id === 'lighthouse' ? 'Lighthouse' : id === 'windmill' ? 'Windmill' : 'Pagoda');
  const sub = (id: DestId) => (id === 'lighthouse' ? 'Bluestock Fintech' : id === 'windmill' ? 'Agratas Fintech' : 'Career Growth');

  return (
    <section ref={sectionRef} className="experience-section" id="experience">
      <div className="experience-header-container">
        <div className="experience-header">
          <div className="experience-divider" />
          <h2 className="experience-title">EXPERIENCE</h2>
          <div className="experience-divider" />
        </div>
      </div>

      <div className="atlas-environment">
        <Canvas
          camera={{ position: POSES.overview.pos, fov: POSES.overview.fov, near: 0.5, far: 700 }}
          shadows
          dpr={[1, 2]}
          gl={{ alpha: false, antialias: true }}
        >
          <fog attach="fog" args={['#cfe6f5', 90, 260]} />
          <CameraRig selected={selected} />
          <Suspense fallback={null}>
            <Scene selected={selected} onSelect={setSelected} registerRef={registerRef} />
          </Suspense>
        </Canvas>

        <div className="atlas-hud">
          <p className="atlas-hint">Atlas of Drifting Isles - choose a destination</p>

          {!selected && (
            <div className="dest-labels" role="group" aria-label="Destinations">
              {ISLANDS.map((spec) => (
                <button key={spec.id} type="button" data-dest={spec.id} className="dest-label" onClick={() => setSelected(spec.id)}>
                  <strong>{label(spec.id)}</strong>
                  <span>{sub(spec.id)}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <button type="button" className="back-btn" onClick={() => setSelected(null)}>
                Back to Islands
              </button>
              <div className="dest-nav">
                <button type="button" onClick={() => step(-1)} aria-label="Previous destination">
                  Prev
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next destination">
                  Next
                </button>
              </div>
              <aside key={selected} aria-live="polite" className="dest-panel-wrap">
                <DestPanel id={selected} />
              </aside>
            </>
          )}

          <p className="atlas-attribution">
            Island models from{' '}
            <a href="https://github.com/blendi-remade/dioramas" target="_blank" rel="noopener noreferrer">
              Atlas of Drifting Isles
            </a>{' '}
            by blendi-remade,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload('/assets/atlas/lighthouse.glb');
useGLTF.preload('/assets/atlas/windmill.glb');
useGLTF.preload('/assets/atlas/pagoda.glb');

export default ExperienceSection;
