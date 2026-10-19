import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ============================================================
// ProjectsBillboard — the rectangular landmark (2026-10-17).
//
// A broad horizontal wooden board with a strong frame, warm illuminated
// border, and small cloud-shaped lights around the frame that pulse with
// per-light phase offsets (never all dark at once, no per-frame allocations).
// The board hangs at the given anchor point, no posts.
// ============================================================

/** One small cloud puff: 3 merged squashed spheres (built once). */
function buildPuffGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const [dx, dy, s] of [
    [-0.24, -0.02, 0.72],
    [0.04, 0.08, 0.95],
    [0.3, -0.04, 0.66],
  ] as [number, number, number][]) {
    const g = new THREE.SphereGeometry(1, 8, 6);
    g.scale(s * 0.55, s * 0.38, s * 0.4);
    g.translate(dx, dy, 0);
    parts.push(g);
  }
  return mergeGeometries(parts, false);
}

export function ProjectsBillboard({
  position,
  yaw,
  postLength,
}: {
  position: [number, number, number];
  yaw: number;
  /** Length of the two grounding posts below the board. Omit → no posts. */
  postLength?: number;
}) {
  // Materials (created once per mount).
  const boardMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8B5E34', roughness: 0.9 }),
    [],
  );
  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5A4632', roughness: 0.95 }),
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
  const cloudMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFF3D6',
        emissive: new THREE.Color('#FFC069'),
        emissiveIntensity: 1,
        roughness: 0.4,
      }),
    [],
  );
  const puffGeo = useMemo(() => buildPuffGeometry(), []);

  // "PROJECTS" canvas texture — bold, high-contrast, generous padding.
  const titleTex = useMemo(() => {
    const w = 2048;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    // Wood-tone backing matching the board so the text plane blends in.
    ctx.fillStyle = '#8B5E34';
    ctx.fillRect(0, 0, w, h);
    // Warm horizontal grain streaks (subtle, static).
    ctx.fillStyle = 'rgba(90, 60, 35, 0.18)';
    for (let i = 0; i < 7; i++) {
      const y = 40 + i * 68 + (i % 3) * 8;
      ctx.fillRect(0, y, w, 10);
    }
    ctx.font = 'bold 340px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shrink font if needed so "PROJECTS" fits fully with padding inside canvas.
    const txt = 'PROJECTS';
    const maxW = w * 0.74; // leave wide margins so stroke + fill never clip
    let fontSize = 340;
    while (fontSize > 120) {
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", serif`;
      if (ctx.measureText(txt).width <= maxW) break;
      fontSize -= 20;
    }
    // Cream halo for contrast, then dark serif fill.
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255, 244, 214, 0.9)';
    ctx.strokeText(txt, w / 2, h / 2 + 8);
    ctx.fillStyle = '#33200F';
    ctx.fillText(txt, w / 2, h / 2 + 8);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  const titleMat = useMemo(() => new THREE.MeshBasicMaterial({ map: titleTex }), [titleTex]);

  // Cloud lights: fixed layout around the frame with per-light phase offsets.
  const cloudRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const cloudLights = useMemo(() => {
    const pts: [number, number][] = [];
    const W = 9.4;
    const H = 3.1;
    for (let i = 0; i < 5; i++) pts.push([-W + (i * 2 * W) / 4, H]); // top row
    for (let i = 0; i < 5; i++) pts.push([-W + (i * 2 * W) / 4, -H]); // bottom row
    pts.push([-W, 0], [W, 0]); // sides
    return pts;
  }, []);

  // Flicker: staggered phases; never all dark (base 0.85 ± swing bounded below
  // 0.3). Scalar writes only — no per-frame allocations.
  useFrame(() => {
    const t = performance.now() / 1000;
    for (let i = 0; i < cloudLights.length; i++) {
      const m = cloudRefs.current[i];
      if (!m) continue;
      const phase = i * 1.7;
      // Floor ≈ 0.55: individual lights dim, never die; phases are staggered
      // so at most a few are low at once and the frame always shows lit clouds.
      m.emissiveIntensity = 1.0 + Math.sin(t * 2.1 + phase) * 0.35 + Math.sin(t * 5.3 + phase * 2) * 0.1;
    }
    // Border strip breathes gently and stays warm throughout.
    borderMat.emissiveIntensity = 0.95 + Math.sin(t * 1.3) * 0.2;
  });

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Grounding posts (when postLength given): land beside the path */}
      {postLength !== undefined &&
        ([-7.9, 7.9] as const).map((px, i) => (
          <mesh
            key={`post-${i}`}
            castShadow
            receiveShadow
            material={frameMat}
            position={[px, -2.55 - postLength / 2, -0.1]}
          >
            <boxGeometry args={[0.7, postLength, 0.7]} />
          </mesh>
        ))}
      {/* Main board: broad horizontal rectangle */}
      <mesh castShadow receiveShadow material={boardMat}>
        <boxGeometry args={[17, 4.5, 0.5]} />
      </mesh>
      {/* Strong wooden frame: 4 beams around the board */}
      {([
        [0, 2.55, 17.9, 0.55],
        [0, -2.55, 17.9, 0.55],
        [-8.75, 0, 0.55, 5.65],
        [8.75, 0, 0.55, 5.65],
      ] as [number, number, number, number][]).map(([x, y, w, h], i) => (
        <mesh key={i} castShadow receiveShadow material={frameMat} position={[x, y, 0]}>
          <boxGeometry args={[w, h, 0.72]} />
        </mesh>
      ))}
      {/* Warm illuminated border strip: thin emissive frame inset on the board */}
      {([
        [0, 2.0, 16.2, 0.16],
        [0, -2.0, 16.2, 0.16],
        [-8.1, 0, 0.16, 4.1],
        [8.1, 0, 0.16, 4.1],
      ] as [number, number, number, number][]).map(([x, y, w, h], i) => (
        <mesh key={i} material={borderMat} position={[x, y, 0.28]}>
          <boxGeometry args={[w, h, 0.08]} />
        </mesh>
      ))}
      {/* Title plane */}
      <mesh position={[0, 0, 0.28]} scale={[15.5, 3.9, 1]}>
        <planeGeometry args={[1, 1]} />
        <primitive object={titleMat} attach="material" />
      </mesh>
      {/* Cloud-shaped lights around the frame (decorative, pulsing) */}
      {cloudLights.map(([x, y], i) => (
        <mesh
          key={i}
          geometry={puffGeo}
          position={[x, y, 0.55]}
          scale={1.15}
          ref={(m) => {
            // Per-light material clone: each light needs its OWN
            // emissiveIntensity for the staggered flicker (a shared material
            // would make all 12 pulse in lockstep).
            if (m) {
              if (!(m as any).__ownMat) {
                const own = cloudMat.clone();
                (m as any).__ownMat = own;
                m.material = own;
              }
              cloudRefs.current[i] = (m as any).__ownMat as THREE.MeshStandardMaterial;
            }
          }}
        />
      ))}
      {/* One warm point light washing the face (capped, no shadows) */}
      <pointLight position={[0, 0, 4]} color="#FFC069" intensity={6} distance={16} decay={2} />
    </group>
  );
}
