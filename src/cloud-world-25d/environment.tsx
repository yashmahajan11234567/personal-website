/**
 * Welcome Harbour environment — stylized 2.5D cartoon, matching the Experience
 * section's visual language (vertex-colored low-poly terrain, gradient sky dome,
 * puff clouds, soft fog) with AI textures from public/assets/cw25d/.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BEACH_R, DOCK, ISLAND_R, WORLD_FOG, terrainHeight, HOTSPOTS } from './world25d';
import { useTex, makeSignTexture } from './materials';

/* ---------- sky dome (Experience SkyDome pattern) ---------- */
export function SkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#2a6db0');
    g.addColorStop(0.35, '#5d9bd4');
    g.addColorStop(0.62, '#a8cfee');
    g.addColorStop(0.85, '#e8f2fa');
    g.addColorStop(1, '#fdf3dd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[480, 32, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

/* ---------- cartoon clouds (Experience CloudPuff pattern) ---------- */
function CloudPuff({ position, scale, speed, seed }: { position: [number, number, number]; scale: number; speed: number; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const geos = useMemo(() =>
    [0, 1, 2].map((i) => {
      const g = new THREE.IcosahedronGeometry(1, 1);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < p.count; v++) {
        p.setXYZ(v,
          p.getX(v) * (1 + 0.22 * Math.sin(v * 1.7 + seed + i)),
          p.getY(v) * (0.62 + 0.18 * Math.cos(v * 2.1 + seed)),
          p.getZ(v) * (1 + 0.22 * Math.cos(v * 1.3 + seed * 1.3)));
      }
      g.computeVertexNormals();
      return g;
    }), [seed]);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x = position[0] + Math.sin(clock.elapsedTime * speed + seed) * 6;
      ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.4 + seed) * 0.5;
    }
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} position={[(i - 1) * 1.15, i === 1 ? 0.35 : 0, (i % 2) * 0.3]}>
          <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Clouds() {
  const puffs = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      position: [(-60 + i * 24 + (i % 3) * 7) as number, 9 + (i % 4) * 2, -12 + (i % 5) * 7] as [number, number, number],
      scale: 2.2 + (i % 3) * 0.9,
      speed: 0.02 + (i % 3) * 0.012,
      seed: i * 2.3,
    })), []);
  return (
    <group>
      {puffs.map((p, i) => <CloudPuff key={i} {...p} />)}
    </group>
  );
}

/* ---------- distant mountains ring ---------- */
export function DistantRidge() {
  const cones = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      const r = 105 + (i % 3) * 14;
      return { pos: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number], h: 16 + ((i * 7) % 5) * 5, r: 16 + ((i * 5) % 4) * 5 };
    }), []);
  return (
    <group>
      {cones.map((c, i) => (
        <mesh key={i} position={[c.pos[0], c.h / 2 - 2, c.pos[2]]}>
          <coneGeometry args={[c.r, c.h, 5]} />
          <meshStandardMaterial color="#9db8d6" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- animated water ---------- */
export function Water() {
  const tex = useTex('tex_water');
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshStandardMaterial;
    if (m?.map) {
      m.map.offset.set(clock.elapsedTime * 0.012, clock.elapsedTime * 0.007);
    }
  });
  return (
    <group>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial map={tex} color="#9fdcf0" transparent opacity={0.93} roughness={0.12} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1b6f9e" roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------- island: radial heightfield, vertex-colored (Experience pattern) ---------- */
export function Island() {
  const grass = useTex('tex_grass');
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(70, 70, 110, 110);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const cGrass = new THREE.Color('#69a84f'), cGrass2 = new THREE.Color('#7cb85e');
    const cSand = new THREE.Color('#ecd9a2'), cRock = new THREE.Color('#8a7a5f'), cWet = new THREE.Color('#b59a6a');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      if (r <= ISLAND_R) {
        tmp.copy(cGrass).lerp(cGrass2, (Math.sin(x * 2.1) * Math.cos(z * 1.7) + 1) / 2);
        if (h < 0.4) tmp.lerp(cWet, 0.6);
      } else if (r <= BEACH_R) {
        tmp.copy(cSand);
      } else {
        tmp.copy(cWet).lerp(cRock, Math.min(1, (r - BEACH_R) / 4));
      }
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors map={grass} roughness={0.95} />
    </mesh>
  );
}

/* ---------- stone plaza (dock approach) ---------- */
export function Plaza() {
  const stone = useTex('tex_stone');
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[21.5, terrainHeight(21.5, 0) + 0.03, 0]} receiveShadow>
      <circleGeometry args={[4.2, 28]} />
      <meshStandardMaterial map={stone} roughness={1} />
    </mesh>
  );
}

/* ---------- wooden dock ---------- */
export function Dock() {
  const wood = useTex('tex_wood');
  const len = DOCK.x1 - DOCK.x0, cx = (DOCK.x0 + DOCK.x1) / 2;
  return (
    <group position={[cx, DOCK.y, 0]}>
      <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, 0.25, DOCK.z * 2]} />
        <meshStandardMaterial map={wood} roughness={0.9} />
      </mesh>
      {[DOCK.x0 + 0.4 - cx, DOCK.x1 - 0.4 - cx].map((px, i) =>
        [-DOCK.z + 0.2, DOCK.z - 0.2].map((pz, j) => (
          <mesh key={`${i}-${j}`} position={[px, -0.55, pz]}>
            <cylinderGeometry args={[0.13, 0.15, 1.4, 8]} />
            <meshStandardMaterial color="#6b4a2a" roughness={1} />
          </mesh>
        )),
      )}
      {/* lamp posts */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (len / 2 - 0.5), 0, s * (DOCK.z - 0.25)]}>
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 1.7, 8]} />
            <meshStandardMaterial color="#33415c" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.78, 0]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#ffe9a8" emissive="#ffca5f" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- welcome house (About hotspot) — textured planes + prism roof ---------- */
export function WelcomeHouse({ onHover, onClick, hovered }: { onHover: (id: string | null) => void; onClick: (id: string) => void; hovered: string | null }) {
  const wall = useTex('tex_wall_house');
  const roof = useTex('tex_roof');
  const x = 13, z = -9, y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI / 6, 0]}>
      <mesh castShadow receiveShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[4.6, 3, 3.8]} />
        <meshStandardMaterial color="#f6efdd" roughness={0.9} />
      </mesh>
      {/* facade planes front/back */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 1.5, s * 1.91]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[4.6, 3]} />
          <meshStandardMaterial map={wall} roughness={0.9} />
        </mesh>
      ))}
      {/* gable roof: two slanted slabs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.15, 3.85, 0]} rotation={[0, 0, -s * 0.72]} castShadow>
          <boxGeometry args={[2.5, 0.16, 4.3]} />
          <meshStandardMaterial map={roof} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[2.4, 1.5, 3.8]} />
        <meshStandardMaterial color="#f6efdd" roughness={0.9} />
      </mesh>
      <mesh position={[1.6, 4.6, 0]} castShadow>
        <boxGeometry args={[0.5, 1.1, 0.5]} />
        <meshStandardMaterial color="#a5533a" roughness={0.8} />
      </mesh>
      {/* invisible hotspot volume */}
      <mesh
        position={[0, 2, 0]}
        userData={{ hotspot: 'about' }}
        onPointerOver={(e) => { e.stopPropagation(); onHover('about'); }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onClick('about'); }}
      >
        <cylinderGeometry args={[3.4, 3.4, 6, 10]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {/* hover ring */}
      {hovered === 'about' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[3.0, 3.5, 32]} />
          <meshBasicMaterial color="#ffe9a8" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/* ---------- sign board with crisp canvas text ---------- */
export function SignBoard({ id, text, sub, x, z, onHover, onClick }: { id: string; text: string; sub?: string; x: number; z: number; onHover: (id: string | null) => void; onClick: (id: string) => void }) {
  const tex = useMemo(() => makeSignTexture(text, sub), [text, sub]);
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 2.0, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh
        position={[0, 2.15, 0]}
        userData={{ hotspot: id }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(id); }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onClick(id); }}
        castShadow
      >
        <boxGeometry args={[2.4, 1.2, 0.08]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ---------- vegetation & rocks ---------- */
const TREE_SPOTS: [number, number][] = [
  [-14, 6], [-17, -2], [-12, -13], [-4, -16], [4, -15], [12, -12], [16, -4],
  [13, 9], [5, 13], [-2, 17], [-16, 12], [19, 6],
];
export function Vegetation() {
  const canopy = useTex('tex_canopy');
  const rock = useTex('tex_rock');
  return (
    <group>
      {TREE_SPOTS.map(([x, z], i) => {
        const y = terrainHeight(x, z);
        const s = 0.85 + ((i * 37) % 10) / 22;
        return (
          <group key={`t${i}`} position={[x, y, z]} scale={s}>
            <mesh position={[0, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, 2.0, 7]} />
              <meshStandardMaterial color="#6b4a2a" roughness={1} />
            </mesh>
            <mesh position={[0, 2.5, 0]} castShadow>
              <icosahedronGeometry args={[1.45, 1]} />
              <meshStandardMaterial map={canopy} color="#b9e2a4" roughness={1} flatShading />
            </mesh>
            <mesh position={[0.55, 1.8, 0.3]} castShadow>
              <icosahedronGeometry args={[0.9, 1]} />
              <meshStandardMaterial map={canopy} color="#b9e2a4" roughness={1} flatShading />
            </mesh>
          </group>
        );
      })}
      {[[-19, 4], [8, -19], [18, 12], [-6, 20], [22, -8]].map(([x, z], i) => (
        <mesh key={`r${i}`} position={[x, terrainHeight(x, z) + 0.15, z]} castShadow rotation={[i, i * 2, 0]} scale={0.7 + ((i * 13) % 10) / 14}>
          <dodecahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial map={rock} color="#ffffff" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- buoys bobbing in the channel ---------- */
export function Buoys() {
  const spots: [number, number][] = [[33, 6], [38, -7], [44, 9], [50, -5]];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <Buoy key={i} x={x} z={z} seed={i * 1.7} />
      ))}
    </group>
  );
}
function Buoy({ x, z, seed }: { x: number; z: number; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 0.1 + Math.sin(clock.elapsedTime * 1.4 + seed) * 0.12;
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + seed) * 0.12;
    }
  });
  return (
    <group ref={ref} position={[x, 0.1, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.9, 10]} />
        <meshStandardMaterial color="#e0483e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.2, 0.45, 0.35, 10]} />
        <meshStandardMaterial color="#f6f2e8" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ---------- shoreline: shallow tint + animated foam ring ---------- */
export function Shoreline() {
  const foamRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = foamRef.current?.material as THREE.MeshBasicMaterial;
    if (m) m.opacity = 0.35 + Math.sin(clock.elapsedTime * 1.6) * 0.15;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[28, 40, 48]} />
        <meshBasicMaterial color="#8fdcec" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh ref={foamRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <ringGeometry args={[27.0, 28.8, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------- environment root ---------- */
export function Environment(props: { onHover: (id: string | null) => void; onClick: (id: string) => void; hovered: string | null }) {
  return (
    <group>
      <SkyDome />
      <Clouds />
      <DistantRidge />
      <Water />
      <Shoreline />
      <Island />
      <Plaza />
      <Dock />
      <WelcomeHouse {...props} />
      <SignBoard id="sign_tutorial" text="RIVER EXPEDITION" sub="WASD move · SHIFT run · E board" x={24.6} z={2.6} {...props} />
      <Vegetation />
      <Buoys />
    </group>
  );
}

export { WORLD_FOG, HOTSPOTS };
