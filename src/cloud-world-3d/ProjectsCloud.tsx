import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  PROJECTS_CLOUD_X,
  PROJECTS_CLOUD_Z,
  CLOUD_DOOR_Z,
  CLOUD_INTERIOR_R,
  CLOUD_INTERIOR_YSCALE,
  displacedSphereGeometry,
  terrainHeight,
} from './world';

// ============================================================
// ProjectsCloud — the giant enterable cloud building that
// replaces the old Mountain Passage destination. The cloud
// itself IS the building: one merged mesh of overlapping
// displaced low-poly lobes in soft cream, with a wooden arched
// door, a hanging PROJECTS sign, flanking lanterns, steps and
// a cobble entrance path. No face, no conventional house.
// Scaled as a major landmark: ~55u wide, ~32u tall, door
// 6.4u × 7.6u for the ~2.7u-tall cloud character.
// ============================================================

// [x, y, z, radius, squashY] — local to the cloud center. The
// front-center bottom is deliberately left open (split base
// lobes + front shoulders) so the doorway is a real opening,
// not a solid lobe behind the door.
const LOBES: [number, number, number, number, number][] = [
  [-8, 7.5, 5, 17, 0.6],      // base-left (door gap at center-front)
  [8, 7.5, 5, 17, 0.6],       // base-right
  [-14, 11, 3, 12, 0.85],     // left shoulder
  [14, 11, -3, 12, 0.85],     // right shoulder
  [-8, 17, -3, 10, 0.9],      // upper-left
  [8, 17, 3, 10, 0.9],        // upper-right
  [0, 23.5, 0, 9.5, 0.9],     // crown
  [-19, 8, -5, 8.5, 0.8],     // far-left flank
  [19, 8, 5, 8.5, 0.8],       // far-right flank
  [0, 13, 10, 11, 0.8],       // back bulk
  [-10, 14.5, -8, 7.5, 0.9],  // mid-left
  [10, 14.5, 8, 7.5, 0.9],    // mid-right
  [-11, 8, -13, 9, 0.75],     // front-left shoulder (frames the door)
  [11, 8, -13, 9, 0.75],      // front-right shoulder
  [-13, 8, -13, 9.5, 0.8],    // outer front-left flank (frames the entrance)
  [13, 8, -13, 9.5, 0.8],     // outer front-right flank
];

// The interior gallery is a room inside this cloud, so no lobe may cross into
// it: every lobe is CLIPPED to the shell radius (shell-normalised, matching the
// interior shell's 1.18 vertical stretch) before the lobes are merged. Without
// this, a lobe's own front surface sits ~3u in front of the camera just inside
// the doorway — the "chunky, obstructed interior" from the playtest.
const SHELL_CUT_R = CLOUD_INTERIOR_R + 0.8;

function clipLobeToShell(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const idx = geo.getIndex();
  if (!idx) return geo;
  const kept: number[] = [];
  const r2 = SHELL_CUT_R * SHELL_CUT_R;
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t);
    const b = idx.getX(t + 1);
    const c = idx.getX(t + 2);
    const mx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const my = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const mz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const nn = mx * mx + (my / CLOUD_INTERIOR_YSCALE) * (my / CLOUD_INTERIOR_YSCALE) + mz * mz;
    if (nn >= r2) kept.push(a, b, c);
  }
  geo.setIndex(kept);
  return geo;
}

// Bake a soft cream gradient into each lobe (shadowed underside →
// sunlit crown) so the merged cloud reads volumetric, not flat.
function bakeCream(geo: THREE.BufferGeometry): void {
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const c = new Float32Array(p.count * 3);
  const lo = new THREE.Color('#F0E4CC');
  const mid = new THREE.Color('#FAF3E4');
  const hi = new THREE.Color('#FFFDF8');
  let mn = p.getY(0);
  let mx = mn;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < mn) mn = y;
    if (y > mx) mx = y;
  }
  const sp = Math.max(1e-3, mx - mn);
  const cc = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - mn) / sp;
    cc.copy(lo).lerp(mid, Math.min(1, t * 1.6));
    if (t > 0.6) cc.lerp(hi, (t - 0.6) * 1.8);
    // slight per-vertex warm jitter so big flats never look airbrushed
    const j = (((i * 17 + 3) * 9301 + 49297) % 233280) / 233280;
    cc.offsetHSL(0.004 - j * 0.008, 0, (j - 0.5) * 0.04);
    c[i * 3] = cc.r;
    c[i * 3 + 1] = cc.g;
    c[i * 3 + 2] = cc.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

// "PROJECTS" hanging-sign canvas texture.
function buildSignTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#8B5E34';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(90, 60, 35, 0.18)';
  for (let i = 0; i < 5; i++) ctx.fillRect(0, 30 + i * 46, w, 8);
  const txt = 'PROJECTS';
  let fontSize = 170;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  while (fontSize > 60) {
    ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
    if (ctx.measureText(txt).width <= w * 0.8) break;
    fontSize -= 12;
  }
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.92)';
  ctx.strokeText(txt, w / 2, h / 2 + 6);
  ctx.fillStyle = '#33200F';
  ctx.fillText(txt, w / 2, h / 2 + 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ProjectsCloud({
  insideRef,
  avatarPosRef,
}: {
  /** true while the player is inside the cloud interior */
  insideRef: React.RefObject<boolean>;
  /** live avatar position, drives the door swing */
  avatarPosRef: React.RefObject<THREE.Vector3 | null>;
}) {
  const groundY = terrainHeight(PROJECTS_CLOUD_X, PROJECTS_CLOUD_Z);

  // ---- merged cloud body ----
  const cloudGeo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    LOBES.forEach(([x, y, z, r, sy], i) => {
      const g = displacedSphereGeometry(r, 3, 0.1, 611 + i * 37);
      g.scale(1, sy, 1);
      g.translate(x, y, z);
      clipLobeToShell(g); // keep the room inside the cloud hollow
      bakeCream(g);
      geos.push(g);
    });
    return mergeGeometries(geos, false);
  }, []);
  const cloudMat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }),
    [],
  );

  // ---- materials ----
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8B5E34', roughness: 0.9 }), []);
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5A4632', roughness: 0.95 }), []);
  const stoneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#B09578', roughness: 1, flatShading: true }),
    [],
  );
  const lanternMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFD9A0',
        emissive: new THREE.Color('#FFB45E'),
        emissiveIntensity: 1.6,
        roughness: 0.4,
      }),
    [],
  );
  const borderMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFD9A0',
        emissive: new THREE.Color('#FFB45E'),
        emissiveIntensity: 0.9,
        roughness: 0.5,
      }),
    [],
  );
  const signTex = useMemo(buildSignTexture, []);
  const signTitleMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  const doorwayMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#241812' }), []);

  // ---- door (swings open near the player / when inside) ----
  const doorPivotRef = useRef<THREE.Group>(null);
  const doorwayRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const avatar = avatarPosRef.current;
    const inside = insideRef.current;
    let open = inside;
    if (avatar) {
      const d = Math.hypot(avatar.x - PROJECTS_CLOUD_X, avatar.z - CLOUD_DOOR_Z);
      if (d < 7) open = true;
    }
    if (doorPivotRef.current) {
      const target = open ? -1.75 : 0;
      const k = 1 - Math.exp(-6 * Math.min(delta, 1 / 30));
      doorPivotRef.current.rotation.y += (target - doorPivotRef.current.rotation.y) * k;
    }
    if (doorwayRef.current) doorwayRef.current.visible = !inside;
    // lantern pulse — never fully dark
    const t = performance.now() / 1000;
    lanternMat.emissiveIntensity = 1.4 + Math.sin(t * 1.4) * 0.25;
    borderMat.emissiveIntensity = 0.95 + Math.sin(t * 1.3) * 0.2;
  });

  // QA instrumentation: placement mirror for browser tests.
  if (typeof window !== 'undefined') {
    (window as any).__cwProjectsCloud = {
      x: PROJECTS_CLOUD_X,
      z: PROJECTS_CLOUD_Z,
      groundY,
      doorZ: CLOUD_DOOR_Z,
    };
  }

  const doorZ = CLOUD_DOOR_Z - PROJECTS_CLOUD_Z; // local z of the door plane (-21)

  return (
    <group position={[PROJECTS_CLOUD_X, groundY, PROJECTS_CLOUD_Z]}>
      {/* cloud body */}
      <mesh geometry={cloudGeo} material={cloudMat} castShadow receiveShadow />

      {/* door frame: posts + arch */}
      <mesh castShadow material={frameMat} position={[-3.5, 3.9, doorZ]}>
        <boxGeometry args={[0.8, 7.8, 0.8]} />
      </mesh>
      <mesh castShadow material={frameMat} position={[3.5, 3.9, doorZ]}>
        <boxGeometry args={[0.8, 7.8, 0.8]} />
      </mesh>
      <mesh castShadow material={frameMat} position={[0, 7.8, doorZ]}>
        <torusGeometry args={[3.5, 0.45, 10, 22, Math.PI]} />
      </mesh>

      {/* dark doorway behind the slab (hidden once the player is inside) */}
      <mesh ref={doorwayRef} position={[0, 3.8, doorZ + 0.5]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[6.4, 7.6]} />
        <primitive object={doorwayMat} attach="material" />
      </mesh>
      {/* warm glow at the threshold so the opening reads lit from outside */}
      <pointLight position={[0, 4.5, doorZ + 2.5]} color="#FFB45E" intensity={12} distance={18} decay={2} />

      {/* swinging door slab, pivoted on the left post */}
      <group ref={doorPivotRef} position={[-3.2, 0, doorZ]}>
        <mesh castShadow material={woodMat} position={[3.2, 3.8, 0.08]}>
          <boxGeometry args={[6.4, 7.6, 0.35]} />
        </mesh>
        <mesh material={frameMat} position={[3.2, 5.6, 0.29]}>
          <boxGeometry args={[4.4, 3.0, 0.08]} />
        </mesh>
        <mesh material={frameMat} position={[3.2, 1.8, 0.29]}>
          <boxGeometry args={[4.4, 2.6, 0.08]} />
        </mesh>
      </group>

      {/* stone steps + cobble entrance path */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`step-${i}`}
          castShadow
          receiveShadow
          material={stoneMat}
          position={[0, 0.12 - i * 0.05, doorZ - 1.1 - i * 1.3]}
          scale={[1 + i * 0.16, 1, 1]}
        >
          <cylinderGeometry args={[4.4, 4.7, 0.3, 16]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh
          key={`cob-${i}`}
          receiveShadow
          material={stoneMat}
          position={[Math.sin(i * 1.7) * 0.8, 0.07, doorZ - 5.2 - i * 1.6]}
          rotation={[0, i * 0.9, 0]}
        >
          <cylinderGeometry args={[1.05, 1.2, 0.16, 7]} />
        </mesh>
      ))}

      {/* PROJECTS sign above the door, on two tall posts.
          Sign board centre y=15.0 → its bottom edge (13.6) sits 2.3u clear
          ABOVE the door arch crown (y=11.3); previously the board (bottom
          9.55) overlapped the arch by ~1.75u. The assembly sits just proud of
          the door plane (z = doorZ + 0.4) and the posts land against the
          cloud's front face, so it reads as mounted on the facade rather than
          as a freestanding signboard (the earlier −2.5 offset left a 4.7u gap
          that read as detached from oblique angles). */}
      <group position={[0, 0, doorZ + 0.4]}>
        <mesh castShadow material={frameMat} position={[-5.1, 8.3, 0]}>
          <boxGeometry args={[0.4, 16.6, 0.4]} />
        </mesh>
        <mesh castShadow material={frameMat} position={[5.1, 8.3, 0]}>
          <boxGeometry args={[0.4, 16.6, 0.4]} />
        </mesh>
        <mesh castShadow receiveShadow material={woodMat} position={[0, 15.0, 0]}>
          <boxGeometry args={[10.2, 2.8, 0.35]} />
        </mesh>
        {/* frame beams (proud of the board's player-facing -z face) */}
        {(
          [
            [0, 16.45, 9.95, 0.4],
            [0, 13.55, 9.95, 0.4],
            [-5.15, 15.0, 0.4, 3.1],
            [5.15, 15.0, 0.4, 3.1],
          ] as [number, number, number, number][]
        ).map(([x, y, w, h], i) => (
          <mesh key={i} castShadow material={frameMat} position={[x, y, -0.22]}>
            <boxGeometry args={[w, h, 0.45]} />
          </mesh>
        ))}
        {/* emissive border */}
        {(
          [
            [0, 16.15, 9.4, 0.15],
            [0, 13.85, 9.4, 0.15],
            [-4.8, 15.0, 0.15, 2.45],
            [4.8, 15.0, 0.15, 2.45],
          ] as [number, number, number, number][]
        ).map(([x, y, w, h], i) => (
          <mesh key={`b${i}`} material={borderMat} position={[x, y, -0.27]}>
            <boxGeometry args={[w, h, 0.08]} />
          </mesh>
        ))}
        {/* title plane (faces the approaching player, -z; proud of the board face) */}
        <mesh position={[0, 15.0, -0.19]} rotation={[0, Math.PI, 0]} scale={[9.6, 2.5, 1]}>
          <planeGeometry args={[1, 1]} />
          <primitive object={signTitleMat} attach="material" />
        </mesh>
        {/* warm wash light on the sign face */}
        <pointLight position={[0, 15.0, -4.5]} color="#FFC069" intensity={9} distance={18} decay={2} />
      </group>

      {/* flanking entrance lanterns */}
      {[-6.8, 6.8].map((lx) => (
        <group key={lx} position={[lx, 0, doorZ - 1.5]}>
          <mesh castShadow material={frameMat} position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.14, 0.17, 4.8, 8]} />
          </mesh>
          <mesh position={[0, 5.0, 0]} material={lanternMat}>
            <sphereGeometry args={[0.45, 12, 10]} />
          </mesh>
          <pointLight position={[0, 5.0, 0]} color="#FFB45E" intensity={16} distance={20} decay={2} />
        </group>
      ))}

      {/* potted plants flanking the entrance */}
      {[-10.5, 10.5].map((lx) => (
        <group key={`p${lx}`} position={[lx, 0, doorZ - 0.8]}>
          <mesh castShadow material={frameMat}>
            <cylinderGeometry args={[0.8, 0.68, 1.0, 10]} />
          </mesh>
          <mesh castShadow position={[0, 2.0, 0]} material={new THREE.MeshStandardMaterial({ color: '#4A7A33', roughness: 0.9 })}>
            <icosahedronGeometry args={[1.35, 1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
