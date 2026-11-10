import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  PROJECTS_CLOUD_X,
  PROJECTS_CLOUD_Z,
  CLOUD_INTERIOR_R,
  CLOUD_INTERIOR_YSCALE,
  CLOUD_INTERIOR_CAM_R,
  CLOUD_SHELL_DOOR_HALF,
  CLOUD_SHELL_DOOR_TOP,
  displacedSphereGeometry,
  terrainHeight,
} from './world';
import { PORTFOLIO } from '../content';

// ============================================================
// ProjectsCloudInterior — the walkable gallery inside the cloud.
//
// Architecture (rebuilt after playtest feedback: the old room was
// cramped, the camera jammed against the shell, and the shell had no
// door opening so the entrance read as a solid cream wall):
//   • ONE coherent inward-facing shell, radius CLOUD_INTERIOR_R (21.5),
//     stretched CLOUD_INTERIOR_YSCALE (1.18) so the ceiling clears the
//     third-person camera. Displacement is small (0.05) so the surface
//     stays smooth instead of chunky.
//   • A real opening is CUT through the shell at the door, framed by a
//     cream entrance tunnel (side jambs + lintel) that hides the cut
//     edges — the doorway is walkable and visible from inside.
//   • Displays sit at r≈16 (inside the player's 17u walkable radius) so
//     every project can be walked up to; the shell keeps ~5u of clear
//     space behind them.
//   • Decoration is pushed to the perimeter; the centre of the room is
//     empty walking space.
// ============================================================

// Display order matches the brief: Go Microservices (left),
// RxVerify (center), Full-Stack AI DevOps Masterclass (right).
const DISPLAYS: { id: string; short: string; icon: 'server' | 'shield' | 'infinity' }[] = [
  { id: 'go-microservices', short: 'Go Microservices', icon: 'server' },
  { id: 'rxverify', short: 'RxVerify', icon: 'shield' },
  { id: 'devops-masterclass', short: 'DevOps Masterclass', icon: 'infinity' },
];

// Display layout: a balanced arc on the back half of the room, all facing
// the door (-z). [x, z, rotY]. r ≈ 16 for every display so each is equally
// approachable and none sits outside the player's walkable radius.
const DISPLAY_POS: [number, number, number][] = [
  [-10.5, 12.0, Math.PI + 0.32],
  [0, 16.0, Math.PI],
  [10.5, 12.0, Math.PI - 0.32],
];

const DISPLAY_R = Math.hypot(-10.5, 12.0); // ≈ 15.95 — used by tests

function drawIcon(ctx: CanvasRenderingContext2D, icon: string, cx: number, cy: number, s: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.09;
  if (icon === 'server') {
    for (let i = 0; i < 3; i++) {
      const y = cy - s * 0.55 + i * s * 0.38;
      ctx.strokeRect(cx - s * 0.55, y, s * 1.1, s * 0.3);
      ctx.beginPath();
      ctx.arc(cx - s * 0.38, y + s * 0.15, s * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (icon === 'shield') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.75);
    ctx.lineTo(cx + s * 0.6, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.6, cy + s * 0.15);
    ctx.quadraticCurveTo(cx + s * 0.6, cy + s * 0.55, cx, cy + s * 0.8);
    ctx.quadraticCurveTo(cx - s * 0.6, cy + s * 0.55, cx - s * 0.6, cy + s * 0.15);
    ctx.lineTo(cx - s * 0.6, cy - s * 0.45);
    ctx.closePath();
    ctx.stroke();
    ctx.fillRect(cx - s * 0.07, cy - s * 0.3, s * 0.14, s * 0.75);
    ctx.fillRect(cx - s * 0.32, cy - s * 0.05, s * 0.64, s * 0.14);
  } else {
    // infinity
    ctx.beginPath();
    ctx.arc(cx - s * 0.3, cy, s * 0.3, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(cx + s * 0.3, cy, s * 0.3, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();
  }
}

const texCache = new Map<string, THREE.CanvasTexture>();
function displayTexture(id: string, short: string, icon: string): THREE.CanvasTexture {
  const key = id + icon;
  const cached = texCache.get(key);
  if (cached) return cached;
  const project = PORTFOLIO.projects[id];
  const subtitle = project?.title ?? id;
  const w = 1024;
  const h = 640;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  // dark screen with a warm top glow
  ctx.fillStyle = '#1E1B26';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255, 150, 70, 0.28)');
  g.addColorStop(0.5, 'rgba(255, 150, 70, 0.05)');
  g.addColorStop(1, 'rgba(120, 80, 200, 0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // icon
  drawIcon(ctx, icon, w / 2, h * 0.34, 150, '#FFD9A0');
  // title (auto-shrink to fit one line)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 92;
  while (size > 34) {
    ctx.font = `bold ${size}px Verdana, sans-serif`;
    if (ctx.measureText(short).width <= w * 0.86) break;
    size -= 6;
  }
  ctx.fillStyle = '#FFF6E8';
  ctx.fillText(short, w / 2, h * 0.68);
  // subtitle (project title, shrink to fit one line)
  let s2 = 40;
  while (s2 > 20) {
    ctx.font = `${s2}px Verdana, sans-serif`;
    if (ctx.measureText(subtitle).width <= w * 0.9) break;
    s2 -= 3;
  }
  ctx.fillStyle = 'rgba(255, 214, 160, 0.85)';
  ctx.fillText(subtitle, w / 2, h * 0.84);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

function ProjectDisplay({
  id,
  short,
  icon,
  position,
  onProjectClick,
}: {
  id: string;
  short: string;
  icon: 'server' | 'shield' | 'infinity';
  position: [number, number, number];
  onProjectClick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const tex = useMemo(() => displayTexture(id, short, icon), [id, short, icon]);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex }), [tex]);
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3A2E22',
        roughness: 0.6,
        emissive: new THREE.Color('#37C8E8'),
        emissiveIntensity: 0.06,
      }),
    [],
  );
  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFB45E',
        emissive: new THREE.Color('#FF9A3C'),
        emissiveIntensity: 1.2,
        roughness: 0.4,
      }),
    [],
  );
  const podiumMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#A97748', roughness: 0.85 }),
    [],
  );
  const frameRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    if (frameRef.current) {
      const target = hovered ? 0.85 : 0.06;
      const k = 1 - Math.exp(-8 * Math.min(delta, 1 / 30));
      frameRef.current.emissiveIntensity += (target - frameRef.current.emissiveIntensity) * k;
    }
  });

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, position[2], 0]}>
      {/* podium */}
      <mesh receiveShadow material={podiumMat} position={[0, 0.7, 0]}>
        <cylinderGeometry args={[1.8, 2.0, 1.4, 14]} />
      </mesh>
      {/* monitor body */}
      <mesh
        receiveShadow
        material={frameMat}
        position={[0, 3.7, 0]}
        ref={(m) => {
          if (m) frameRef.current = m.material as THREE.MeshStandardMaterial;
        }}
      >
        <boxGeometry args={[5.8, 3.9, 0.45]} />
      </mesh>
      {/* glowing backlight bar behind the monitor */}
      <mesh material={glowMat} position={[0, 3.7, -0.32]}>
        <boxGeometry args={[6.0, 0.4, 0.12]} />
      </mesh>
      {/* screen */}
      <mesh position={[0, 3.7, 0.24]}>
        <planeGeometry args={[5.3, 3.4]} />
        <primitive object={screenMat} attach="material" />
      </mesh>
      {/* feet */}
      {[-1.8, 1.8].map((fx) => (
        <mesh key={fx} material={frameMat} position={[fx, 1.32, 0]}>
          <boxGeometry args={[0.25, 0.16, 0.7]} />
        </mesh>
      ))}
      {/* invisible hit target — sized to the monitor (was a 3.8u sphere that
          swallowed a third of the walk lane and made neighbouring displays
          hard to click) */}
      <mesh
        name={`project-display-${id}`}
        position={[0, 3.6, 0]}
        userData={{ projectId: id }}
        onClick={(e) => {
          e.stopPropagation();
          onProjectClick(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <boxGeometry args={[6.4, 4.6, 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export function ProjectsCloudInterior({
  onProjectClick,
}: {
  onProjectClick: (id: string) => void;
}) {
  const groundY = terrainHeight(PROJECTS_CLOUD_X, PROJECTS_CLOUD_Z);

  // ---- one coherent inward-facing shell, with a real door opening cut out ----
  const shellGeo = useMemo(() => {
    const g = displacedSphereGeometry(CLOUD_INTERIOR_R, 3, 0.05, 909);
    g.scale(1, CLOUD_INTERIOR_YSCALE, 1);

    // Cut the doorway: drop every triangle whose centroid falls inside the
    // door prism (front of the shell, within the door width, below the top).
    // The shell mesh is positioned at y=1.5 in group space, so the cut's top
    // edge sits at local y = CLOUD_SHELL_DOOR_TOP − 1.5.
    const cutTopLocal = CLOUD_SHELL_DOOR_TOP - 1.5;
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const index = g.getIndex()!;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const a = index.getX(t);
      const b = index.getX(t + 1);
      const c = index.getX(t + 2);
      const cxx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
      const cyy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      const czz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
      const inDoor =
        czz < -14 && Math.abs(cxx) < CLOUD_SHELL_DOOR_HALF && cyy < cutTopLocal;
      if (!inDoor) kept.push(a, b, c);
    }
    g.setIndex(kept);

    // Soft cream vertex gradient (brighter than the old shell so the walls
    // read as cloud, not as a brown mass): floor-ward shade → sunlit cream.
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(p.count * 3);
    const base = new THREE.Color('#FFF8EC');
    const shade = new THREE.Color('#F0E2C8');
    const cc = new THREE.Color();
    const span = CLOUD_INTERIOR_R * CLOUD_INTERIOR_YSCALE * 2;
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.max(0, p.getY(i) / span + 0.5));
      cc.copy(shade).lerp(base, Math.min(1, t * 1.35));
      const j = (((i * 13 + 7) * 9301 + 49297) % 233280) / 233280;
      cc.offsetHSL(0, 0, (j - 0.5) * 0.025);
      colors[i * 3] = cc.r;
      colors[i * 3 + 1] = cc.g;
      colors[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const shellMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        flatShading: true,
        // DoubleSide: opaque from inside (the room's wall, and what hides the
        // hollowed-out exterior lobes beyond it) and also visible from outside
        // through the gaps the lobe clipping leaves around the entrance.
        side: THREE.DoubleSide,
        // gentle self-lift so the interior reads warm cream under lantern light
        emissive: new THREE.Color('#5A4C3A'),
        emissiveIntensity: 0.34,
      }),
    [],
  );
  // Entrance tunnel — hides the cut shell edges and reads as a doorway from
  // inside. DoubleSide because both faces are visible during entry/exit.
  const tunnelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#F6EBD6',
        roughness: 0.95,
        flatShading: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color('#4A4034'),
        emissiveIntensity: 0.28,
      }),
    [],
  );
  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9A6B3F', roughness: 0.8 }),
    [],
  );
  const inlayMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#C79C64', roughness: 0.85 }),
    [],
  );
  const rugMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#C9A075', roughness: 1 }),
    [],
  );
  const lanternMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFD9A0',
        emissive: new THREE.Color('#FFB45E'),
        emissiveIntensity: 1.5,
        roughness: 0.4,
      }),
    [],
  );
  const potMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7A4A2B', roughness: 0.95 }),
    [],
  );
  const leafMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#4A7A33', roughness: 0.9 }),
    [],
  );

  // gentle lantern pulse
  useFrame(() => {
    const t = performance.now() / 1000;
    lanternMat.emissiveIntensity = 1.35 + Math.sin(t * 1.6) * 0.25;
  });

  // Hanging lanterns: high on the back half so they light the displays and the
  // shell without dangling into the walk lane or the camera's path.
  const lanterns: [number, number, number][] = [
    [-11, 13.0, 13.5],
    [0, 14.5, 8.0],
    [11, 13.0, 13.5],
    [0, 13.0, -3.0],
  ];

  if (typeof window !== 'undefined') {
    (window as any).__cwProjectsCloudInterior = true;
    (window as any).__cwInterior = {
      shellR: CLOUD_INTERIOR_R,
      camR: CLOUD_INTERIOR_CAM_R,
      displayR: DISPLAY_R,
      displays: DISPLAYS.map((d, i) => ({
        id: d.id,
        x: PROJECTS_CLOUD_X + DISPLAY_POS[i][0],
        z: PROJECTS_CLOUD_Z + DISPLAY_POS[i][1],
      })),
    };
  }

  // Doorway opening in group space (the shell cut + the tunnel both use it).
  const doorZLocal = -21; // CLOUD_DOOR_Z − PROJECTS_CLOUD_Z
  const tunnelLen = 7.0;
  // Spans ≈ −20.8 … −13.8: the front face sits just BEHIND the wooden door
  // plane (−21) so no cream slab pokes out in front of the entrance, while the
  // back end reaches past the shell cut so the opening is fully framed.
  const tunnelCenterZ = doorZLocal + 3.2;

  return (
    <group position={[PROJECTS_CLOUD_X, groundY, PROJECTS_CLOUD_Z]}>
      {/* wooden floor + lighter inlay ring */}
      <mesh receiveShadow material={floorMat} position={[0, -0.12, 0]}>
        <cylinderGeometry args={[20.5, 20.5, 0.3, 44]} />
      </mesh>
      <mesh material={inlayMat} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.5, 11.0, 48]} />
      </mesh>
      {/* round rug in the centre */}
      <mesh material={rugMat} position={[0, 0.05, 2.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.0, 32]} />
      </mesh>
      {/* faceted cloud shell (inside view) with the doorway cut out */}
      <mesh geometry={shellGeo} material={shellMat} position={[0, 1.5, 0]} />

      {/* entrance tunnel: two jambs + lintel framing the shell opening */}
      {[-1, 1].map((s) => (
        <mesh
          key={`jamb${s}`}
          material={tunnelMat}
          position={[s * (CLOUD_SHELL_DOOR_HALF - 0.55), CLOUD_SHELL_DOOR_TOP / 2, tunnelCenterZ]}
        >
          <boxGeometry args={[1.1, CLOUD_SHELL_DOOR_TOP, tunnelLen]} />
        </mesh>
      ))}
      <mesh material={tunnelMat} position={[0, CLOUD_SHELL_DOOR_TOP + 1.2, tunnelCenterZ]}>
        <boxGeometry args={[CLOUD_SHELL_DOOR_HALF * 2, 2.4, tunnelLen]} />
      </mesh>

      {/* hanging lanterns */}
      {lanterns.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh material={potMat} position={[0, 2.75, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 5.5, 6]} />
          </mesh>
          <mesh material={lanternMat}>
            <sphereGeometry args={[0.5, 12, 10]} />
          </mesh>
          <pointLight position={[0, 0, 0]} color="#FFB45E" intensity={16} distance={22} decay={2} />
        </group>
      ))}
      {/* central skylight wash — lifts the whole gallery so the displays and
          the cream shell stay readable from any camera angle */}
      <pointLight position={[0, 17.0, 2.0]} color="#FFF0D8" intensity={42} distance={46} decay={2} />
      {/* purple accent glow on the back wall (matches reference) */}
      <pointLight position={[0, 10.0, 16.0]} color="#B48AE0" intensity={8} distance={28} decay={2} />

      {/* the three project displays */}
      {DISPLAYS.map((d, i) => (
        <ProjectDisplay
          key={d.id}
          id={d.id}
          short={d.short}
          icon={d.icon}
          position={DISPLAY_POS[i]}
          onProjectClick={onProjectClick}
        />
      ))}

      {/* decoration, pushed to the perimeter (r ≈ 18.5) so the centre of the
          room stays clear walking space */}
      {[-1, 1].map((s) => (
        <group key={`ip${s}`} position={[s * 17.0, 0, -2.0]}>
          <mesh material={potMat}>
            <cylinderGeometry args={[0.8, 0.68, 1.0, 12]} />
          </mesh>
          <mesh material={leafMat} position={[0, 2.0, 0]}>
            <icosahedronGeometry args={[1.4, 1]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`cr${s}`}
          receiveShadow
          material={floorMat}
          position={[s * 17.5, 1.2, 8.0]}
          rotation={[0, s * 0.7, 0]}
        >
          <boxGeometry args={[2.4, 2.4, 2.4]} />
        </mesh>
      ))}
    </group>
  );
}
