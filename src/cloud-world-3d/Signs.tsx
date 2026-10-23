import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { terrainHeight } from './world';
import { computeTitleLayout, TITLE_FONT } from './titleLayout';

// Wooden cloud-shaped signs (plan Stage 4/5/6 recipe). Each sign is a merged
// cloud-silhouette plank (flat-based, piled lobes — same read as the sky
// clouds but squashed into a board), an inset bevel layer, two timber posts
// grounded on the analytic terrain, a serif canvas-texture title, and a cyan
// #37C8E8 emissive outline that rests dim and brightens smoothly on hover
// (lerp, no flicker). An invisible generous hit-sphere makes clicks land.

const CYAN = '#37C8E8';

type Lobe = { dx: number; dy: number; sx: number; sy: number };

// Cloud silhouette: flat base + piled lobes. Shared across signs, scaled
// per-sign so every sign has the same recognizable cloud read.
const SIGN_LOBES: Lobe[] = [
  { dx: 0, dy: 0, sx: 1.55, sy: 0.62 }, // base slab (widest, flat-bottomed)
  { dx: -0.85, dy: 0.38, sx: 0.72, sy: 0.5 },
  { dx: 0.8, dy: 0.42, sx: 0.78, sy: 0.55 },
  { dx: -0.25, dy: 0.72, sx: 0.68, sy: 0.46 },
  { dx: 0.32, dy: 0.66, sx: 0.6, sy: 0.42 },
];

function buildPlank(depth: number, shrink: number): THREE.BufferGeometry {
  const geos = SIGN_LOBES.map((l) => {
    const g = new THREE.SphereGeometry(1, 14, 10);
    g.scale(l.sx * shrink, l.sy * shrink, depth);
    g.translate(l.dx * shrink, l.dy * shrink, 0);
    return g;
  });
  return mergeGeometries(geos, false);
}

// Serif title texture: dark text on transparent, one canvas per title.
// 2048×1024 canvas + anisotropy 16 (clamped by the renderer to the GPU max)
// so titles stay sharp at oblique approach angles.
//
// New-req r2 Stage 1/4: single-line auto-shrink produced ~87px smudges for
// long titles. Titles now WRAP (1→2→3 lines) by measuring words, with a
// font FLOOR (never below readability), a cream halo stroke for contrast on
// the wood, and a per-title layout chosen by actual measured width.
const textTexCache = new Map<string, THREE.CanvasTexture>();

function getTitleTexture(title: string, big: boolean): THREE.CanvasTexture {
  const key = title + (big ? '#big' : '');
  const cached = textTexCache.get(key);
  if (cached) return cached;
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#33200F';
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.85)';
  ctx.lineJoin = 'round';

  const layout = computeTitleLayout(ctx, title, big);
  const lines = layout.lines;
  const size = layout.size;
  ctx.font = `bold ${size}px ${TITLE_FONT}`;

  const lineH = size * 1.08;
  const totalH = lineH * lines.length;
  const startY = h / 2 - totalH / 2 + lineH / 2;
  lines.forEach((line, i) => {
    const y = startY + i * lineH;
    // Cream halo behind the dark serif strokes — contrast on warm wood.
    ctx.lineWidth = Math.max(10, size * 0.055);
    ctx.strokeText(line, w / 2, y);
    ctx.fillText(line, w / 2, y);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16; // renderer clamps to GPU max at upload
  tex.colorSpace = THREE.SRGBColorSpace;
  textTexCache.set(key, tex);
  return tex;
}

export function CloudSign({
  title,
  position,
  yaw = Math.PI,
  scale = 1.6,
  onClick,
  onHover,
  mounted = false,
}: {
  title: string;
  /** [x, z] = grounded (posts on terrain); [x, y, z] = wall-mounted (no posts). */
  position: [number, number] | [number, number, number];
  yaw?: number; // default faces -Z (the approach direction)
  scale?: number;
  onClick?: () => void;
  onHover?: (h: boolean) => void;
  /** Wall-mounted: no support posts, board anchored at the given point. */
  mounted?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const postMatRef = useRef<THREE.MeshStandardMaterial>(null);
  // Tuple-aware destructuring: [x, z] for grounded signs, [x, y, z] for wall
  // mounts. `const [cx, cz] = position` on a 3-tuple silently read Y as the
  // z coordinate — the PROJECTS sign rendered at z≈14 (the anchor height)
  // instead of the mountain face.
  const isMounted = mounted && position.length === 3;
  const cx = position[0];
  const cz = isMounted
    ? (position as [number, number, number])[2]
    : (position as [number, number])[1];
  const parts = useMemo(() => {
    const plank = buildPlank(0.25, 1);
    const bevel = buildPlank(0.16, 0.86);
    return { plank, bevel };
  }, []);

  // Shared materials per sign instance (emissive animated per-sign on hover).
  const woodMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8B5E34', roughness: 0.9 }),
    [],
  );
  const bevelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#A97748', roughness: 0.85 }),
    [],
  );
  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8B5E34',
        roughness: 0.75,
        emissive: new THREE.Color(CYAN),
        emissiveIntensity: 0.12, // rests dim
      }),
    [],
  );
  const postMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6B4A2B',
        roughness: 0.95,
        emissive: new THREE.Color(CYAN),
        emissiveIntensity: 0.06,
      }),
    [],
  );
  const titleTex = useMemo(() => getTitleTexture(title, scale > 1.2), [title, scale]);
  const titleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: titleTex,
        transparent: true,
        depthWrite: false,
      }),
    [titleTex],
  );

  // Ground both posts on the analytic terrain (posts sit at local ±1.15 x).
  // Posts extend 0.8u BELOW the anchor point and the anchor is the terrain
  // height at the sign center — on sloped ground the buried extra length
  // guarantees contact (no floating post toes on grades).
  // Wall-mounted signs skip terrain sampling entirely: position[1] IS the
  // anchor height, and the board is centered AT the anchor (postTop/2·s)
  // so the given point is the visual center of the mounted board — no
  // posts, no float, board hangs exactly where the mount was computed.
  const groundY = isMounted
    ? (position as [number, number, number])[1]
    : terrainHeight(cx, cz);
  const s = scale;
  const postTop = 2.35 * s;
  const postLen = postTop + 0.8; // + buried margin
  const postBaseY = -0.8; // cylinder centered so it starts 0.8u below ground
  // Vertical offset of the board stack within the group: grounded signs put
  // the board atop the posts; mounted signs center the board on the anchor.
  const boardLift = isMounted ? (postTop + 0.55 * s) / 2 : postTop + 0.55 * s;

  useFrame((_, delta) => {
    // Smooth emissive lerp — dim at rest, bright cyan on hover. No flicker.
    const k = 1 - Math.exp(-8 * Math.min(delta, 1 / 30));
    const target = hovered ? 0.95 : 0.12;
    if (glowRef.current) {
      glowRef.current.emissiveIntensity += (target - glowRef.current.emissiveIntensity) * k;
    }
    if (postMatRef.current) {
      const pt = hovered ? 0.3 : 0.06;
      postMatRef.current.emissiveIntensity += (pt - postMatRef.current.emissiveIntensity) * k;
    }
  });

  return (
    <group position={[cx, groundY, cz]} rotation={[0, yaw, 0]}>
      {/* Timber posts — grounded signs only; wall mounts hang on the rock */}
      {!isMounted && (
        <>
          <mesh castShadow position={[-1.15 * s, postBaseY + postLen / 2, 0]}>
            <cylinderGeometry args={[0.11 * s, 0.13 * s, postLen, 8]} />
            <primitive object={postMat} attach="material" ref={postMatRef} />
          </mesh>
          <mesh castShadow position={[1.15 * s, postBaseY + postLen / 2, 0]}>
            <cylinderGeometry args={[0.11 * s, 0.13 * s, postLen, 8]} />
            <primitive object={postMat} attach="material" />
          </mesh>
          {/* Boulder feet (polish pass 2026-10-20): small angular rocks sunk
              around each post base so the pole reads as planted, not floating
              on the grass — matches the reference art's rock-anchored signs. */}
          <mesh castShadow receiveShadow position={[-1.15 * s, -0.18, 0.05]} rotation={[0.4, 0.7, 0.2]}>
            <dodecahedronGeometry args={[0.42 * s, 0]} />
            <meshStandardMaterial color="#9A8B78" roughness={0.95} flatShading />
          </mesh>
          <mesh castShadow receiveShadow position={[1.15 * s, -0.16, -0.04]} rotation={[-0.3, 1.1, 0.35]}>
            <dodecahedronGeometry args={[0.38 * s, 0]} />
            <meshStandardMaterial color="#8A7C6A" roughness={0.95} flatShading />
          </mesh>
        </>
      )}
      {/* Back board: plain wood silhouette */}
      <mesh geometry={parts.plank} material={woodMat} castShadow receiveShadow scale={[s, s, s]} position={[0, boardLift, -0.06 * s]} />
      {/* Cyan outline layer: slightly larger, sits behind the bevel */}
      <mesh
        geometry={parts.plank}
        material={glowMat}
        scale={[s * 1.04, s * 1.04, s]}
        position={[0, boardLift, -0.12 * s]}
        ref={(m) => {
          if (m) glowRef.current = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
        }}
      />
      {/* Front bevel: inset lighter layer for the bevel read */}
      <mesh geometry={parts.bevel} material={bevelMat} castShadow scale={[s, s, s]} position={[0, boardLift, 0.12 * s]} />
      {/* Serif title */}
      <mesh position={[0, boardLift, 0.28 * s]} scale={[1.9 * s, 0.95 * s, 1]}>
        <planeGeometry args={[1, 1]} />
        <primitive object={titleMat} attach="material" />
      </mesh>
      {/* Generous invisible hit target so clicks never miss.
        stopPropagation: R3F fires EVERY intersected object's handler
        front-to-back; the hit-spheres are huge (r≈1.9·scale) and overlap
        when signs share a view ray, so without this the farthest sign's
        card replaced the clicked one (clicking RxVerify opened Go
        Microservices — the sign 20u behind it on the same ray). */}
      <mesh
        position={[0, boardLift, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover?.(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover?.(false);
        }}
      >
        <sphereGeometry args={[1.9 * s, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
