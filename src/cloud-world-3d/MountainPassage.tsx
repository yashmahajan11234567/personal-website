import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pathCenterX, smoothstep, terrainHeight } from './world';
import { buildMountainSurface } from './mountainSurface';
import { ProjectsBillboard } from './ProjectsBillboard';

// Mountain Passage — TUNNEL MOUNTAIN (user request 2026-10-20):
// a single sandstone mountain that the path runs INTO; the PROJECTS sign is
// mounted on the rock face above a carved arched tunnel, and the Projects
// Sunset zone lies on the far side of the bore. Restores the proven
// 2026-10-17/18 architecture (massif bridging the corridor + arch shell +
// mouth tubes + portal stones + lanterns + bore lights), with the massif
// crest field rebuilt around the path centerline (the one mistake of the
// 2026-10-19 cliff attempt was anchoring the height field OFF the centerline,
// which broke buildMountainSurface's probe — see the comment on crestLine).
//
// Gameplay-critical pieces kept identical to the previous tunnel build:
//   - bore-clearance gate (boxClearsCorridor) for portal stones
//   - inner arched shell, mouth tubes, arch rings, portal stone rings
//   - lanterns with pulse + bore point lights
//   - mount face above the entrance carrying the PROJECTS billboard
//   - QA mirrors: __cwMountainDomes, __cwMountainFootprint, __cwMountFace,
//     __cwLanternMat

const TUNNEL_Z0 = 100;
const TUNNEL_Z1 = 170;
const BORE_R = 5.2;
// Tunnel roof crown height above ground (matches the arch shell top so the
// exterior surface is continuous with the carved bore).
const ROOF_CROWN = 6.2;
const CORRIDOR_EDGE = 6.5;

/** Ridge AABB in the same shape the QA audit consumes. */
interface Box {
  x: number; // center x
  y: number; // base ground y (center of the mass)
  z: number; // center z
  sx: number; // half-extent x
  sy: number; // half-extent y (apex above base)
  sz: number; // half-extent z
}

// The walkable bore corridor: sample points along the path at walking heights.
// A stone is admissible only if its AABB stays clear of every sample.
function boxClearsCorridor(b: Box): boolean {
  const margin = BORE_R * 0.22 + 0.5; // ≈1.64u
  for (let z = TUNNEL_Z0 - 2; z <= TUNNEL_Z1 + 2; z += 2) {
    const cx = pathCenterX(z);
    const gy = terrainHeight(cx, z);
    for (const dx of [0, -(BORE_R - 0.8), BORE_R - 0.8]) {
      for (const h of [0.5, 2.5, 4.5]) {
        const insideX = Math.abs(cx + dx - b.x) < b.sx + margin;
        const insideZ = Math.abs(z - b.z) < b.sz + margin;
        const insideY = gy + h > b.y - b.sy - margin && gy + h < b.y + b.sy + margin;
        if (insideX && insideZ && insideY) return false;
      }
    }
  }
  return true;
}

export function MountainPassage() {
  const parts = useMemo(() => {
    // ---- 1. The connected mountain surface ----
    // ONE continuous mesh bridging the walkable corridor. The crest field is
    // measured FROM THE PATH CENTERLINE (not an offset anchor — that was the
    // 2026-10-19 taper bug): height rises with lateral distance from the
    // path, floors over the bore (ROOF_CROWN inside the tunnel zone), and
    // ramps up along z after the mouth so the arch zone stays low while the
    // summit towers behind it.
    const Z_START = TUNNEL_Z0 - 42;
    const Z_END = TUNNEL_Z1 + 16;
    const HALF_W = 88; // broad foot band — the massif rises from the valley
    const PEAK_H = 150; // central summit height above ground
    const PEAK_Z = 140; // summit z
    const PSZ = 28; // broad summit along z
    const crestLine = (z: number): number => {
      const main = PEAK_H * Math.exp(-((z - PEAK_Z) ** 2) / (2 * PSZ ** 2));
      const leftShoulder = 60 * Math.exp(-((z - 112) ** 2) / (2 * 22 ** 2));
      const rightShoulder = 55 * Math.exp(-((z - 168) ** 2) / (2 * 20 ** 2));
      const ramp = Math.min(1, Math.max(0, (z - 92) / 26));
      return Math.max(0, main * ramp + leftShoulder * Math.min(1, ramp * 1.4) + rightShoulder * ramp);
    };
    // Tapered footprint: wide at the foot, narrow at the crest (88 → 24).
    const halfWidthAt = (_z: number, crest: number): number => {
      const t = Math.min(1, Math.max(0, crest / PEAK_H));
      return HALF_W - (HALF_W - 24) * t;
    };
    const crestHeight = (z: number, x: number): number => {
      const cx = pathCenterX(z);
      const corridorDist = Math.abs(x - cx);
      const crest = crestLine(z);
      const hw = halfWidthAt(z, crest);
      const u = corridorDist / hw;
      if (u >= 1) return 0; // foot meets valley terrain
      if (corridorDist === 0) return crest; // probe value for halfWidthAt
      const inTunnel = z >= TUNNEL_Z0 && z <= TUNNEL_Z1;
      // Inside the tunnel bore: rock ceiling matches the arch top, tapering
      // to ground at the corridor edge — nothing sits above empty air.
      if (inTunnel && corridorDist < CORRIDOR_EDGE) {
        const t = 1 - corridorDist / CORRIDOR_EDGE;
        return ROOF_CROWN * t * t;
      }
      // Outside the tunnel zone, within the corridor: clear approach path.
      if (!inTunnel && corridorDist < CORRIDOR_EDGE) {
        return 0;
      }
      // Outside the corridor: rise from ground at the corridor edge toward
      // the crest. The lateral exponent MORPHS with z: parabolic (t²) in the
      // far field, but fast-rising (t^0.5) in the mouth zone — otherwise the
      // flank beside the portal brow is <1u tall and sky shows through the
      // vertical slit between the brow edge and the flank (defect seen in
      // the 2026-10-20 screenshot).
      const w = smoothstep(118, 96, z); // 1 at the mouth → 0 past the summit
      const lateralExp = 2 - 1.5 * w; // 0.5 at mouth → 2.0 far field
      const t = (corridorDist - CORRIDOR_EDGE) / (hw - CORRIDOR_EDGE);
      const flank = crest * Math.pow(t, lateralExp);
      // Mouth-zone floor: the flank never sits below MOUTH_FLOOR across the
      // portal brow's full z-band (mountZ−5.5 … mountZ+6 ≈ 92..103.5) and the
      // floor EXCEEDS the brow top (22u) so the brow's edges always have rock
      // behind them — no sky slit beside or above the brow. The floor's z
      // ramp (84→92 in, fade 103→114 out) is matched to the brow band: the
      // old 86→100 ramp left the floor at only 8-23u INSIDE the brow band,
      // which read as a ground-to-top sky slit right of the arch.
      const MOUTH_FLOOR = 26;
      const floorZ = MOUTH_FLOOR * smoothstep(84, 92, z) * (1 - smoothstep(103, 114, z));
      const floor = floorZ * Math.min(1, (corridorDist - CORRIDOR_EDGE) / 2);
      return Math.max(flank, floor);
    };
    const surfaceGeo = buildMountainSurface(
      { zStart: Z_START, zEnd: Z_END, zStep: 5, halfWidth: HALF_W, seed: 501, crestHeight, edgeFloor: 0.12, halfWidthAt },
      pathCenterX,
      terrainHeight,
    );

    // VERTEX-COLOR STRATA: per-vertex height banding (sandstone/ochre family).
    const mergedMass = surfaceGeo;
    const massColor = new THREE.Color();
    const rockLow = new THREE.Color('#A87B52');
    const rockMid = new THREE.Color('#C9A075');
    const rockHigh = new THREE.Color('#E2BE8F');
    {
      const pos = mergedMass.attributes.position as THREE.BufferAttribute;
      const colors = new Float32Array(pos.count * 3);
      let minY = pos.getY(0);
      let maxY = minY;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const span = Math.max(1e-3, maxY - minY);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = (y - minY) / span;
        massColor.copy(rockLow).lerp(rockMid, Math.min(1, t * 1.8));
        if (t > 0.55) massColor.lerp(rockHigh, (t - 0.55) * 1.4);
        massColor.offsetHSL(0, 0, Math.sin(y * 0.35 + pos.getX(i) * 0.11) * 0.02);
        colors[i * 3] = massColor.r;
        colors[i * 3 + 1] = massColor.g;
        colors[i * 3 + 2] = massColor.b;
      }
      mergedMass.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const rockA = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 1,
      vertexColors: true,
      flatShading: true,
    });
    const massMesh = new THREE.Mesh(mergedMass, rockA);
    massMesh.castShadow = true;
    massMesh.receiveShadow = true;

    // ---- 2. Portal brow — solid rock mount face directly above the arch ---
    // A tall rock face (crest ~22u above ground) spanning the tunnel mouth,
    // narrow enough (±9u) to hold the PROJECTS board without intruding into
    // the walkable corridor vertically (corridor ceiling is 4.5u; the face
    // rock sits entirely above it). The board reads as fixed to the mountain.
    const mountZ = TUNNEL_Z0 - 2.5;
    const mountCx = pathCenterX(mountZ);
    const mountGround = terrainHeight(mountCx, mountZ);
    const mountFaceY = mountGround + 16;
    const faceGeo = buildMountainSurface(
      { zStart: mountZ - 5.5, zEnd: mountZ + 6, zStep: 5, halfWidth: 16, seed: 502, crestHeight: () => 22, edgeFloor: 0.85 },
      pathCenterX,
      terrainHeight,
    );
    const faceMesh = new THREE.Mesh(faceGeo, rockA);
    faceMesh.castShadow = true;
    faceMesh.receiveShadow = true;
    const faceFrontZ = mountZ - 4;
    // QA mirror: the mount-face rect for sign-placement audits.
    if (typeof window !== 'undefined') {
      (window as any).__cwMountFace = {
        x: mountCx,
        y: mountFaceY,
        z: faceFrontZ,
        mountZ,
        mountGround,
        halfW: 18,
        halfH: 11,
      };
    }
    const mountFace = {
      x: mountCx,
      y: mountFaceY - 1.5,
      z: faceFrontZ - 1.1,
      mountZ,
      mountGround,
    };

    // ---- 3. Portal stone rings (angular chunks) ----
    // Polish pass 2026-10-20: stones ABOVE the arch shoulders (sin > 0.42)
    // hovered in front of the dark bore and read as floating rocks above the
    // apex — vision-flagged in the exit-area screenshot. The tube rim +
    // arch ring already outline the mouth; only grounded side/base stones stay.
    const stones: Box[] = [];
    const stoneGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0, TUNNEL_Z1]) {
      const cx = pathCenterX(pz);
      const ground = terrainHeight(cx, pz);
      for (let a = -60; a <= 240; a += 30) {
        const rad = (a * Math.PI) / 180;
        if (Math.sin(rad) > 0.42) continue; // skip hovering shoulder/apex stones
        const ringR = 9.2;
        const s = 2.2;
        const box: Box = {
          x: cx + Math.cos(rad) * ringR,
          y: ground + 0.4 + Math.max(0, Math.sin(rad)) * ringR * 0.85,
          z: pz,
          sx: s,
          sy: s,
          sz: s,
        };
        if (!boxClearsCorridor(box)) continue; // stones never intrude on the bore
        stones.push(box);
        const g = new THREE.IcosahedronGeometry(1, 0);
        g.scale(s, s * 0.8, s);
        g.translate(box.x, box.y, box.z);
        stoneGeos.push(g);
      }
    }
    // ---- 3b. Mouth surround — faceted stone ring bridging tube rim → massif face ----
    // Phase A (2026-10-20): the tunnel mouth previously read as disconnected slabs
    // (horizontal seam + floating block below arch). A ring of faceted stone chunks
    // now bridges the tube's outer edge to the massif face, making the mouth read
    // as one continuous carved opening.
    const surroundGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0 - 0.8, TUNNEL_Z1 + 0.8]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      for (let a = 0; a < 360; a += 20) {
        const rad = (a * Math.PI) / 180;
        const ringR = BORE_R + 2.2;
        const s = 1.6;
        const x = cx + Math.cos(rad) * ringR;
        const z = pz;
        const y = gy + (rad > Math.PI ? 0.2 : 1.0) + Math.abs(Math.sin(rad)) * 0.6;
        const g = new THREE.IcosahedronGeometry(s, 0);
        g.translate(x, y, z);
        surroundGeos.push(g);
      }
    }
    const stoneMesh = new THREE.Mesh(mergeGeometries(stoneGeos, false), rockA);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;

    const surroundMesh = new THREE.Mesh(mergeGeometries(surroundGeos, false), rockA);
    surroundMesh.castShadow = true;
    surroundMesh.receiveShadow = true;

    // ---- 4. Stone lining tubes at each mouth (the visible bore rim) ----
    const tubeGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0 - 0.8, TUNNEL_Z1 + 0.8]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      const tube = new THREE.CylinderGeometry(BORE_R + 2.1, BORE_R + 2.5, 3.6, 24, 1, true);
      tube.rotateX(Math.PI / 2);
      tube.translate(cx, gy + 0.25, pz);
      tubeGeos.push(tube);
    }
    const tubeMat = new THREE.MeshStandardMaterial({
      color: '#A97F58',
      roughness: 1,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const tubeMesh = new THREE.Mesh(mergeGeometries(tubeGeos, false), tubeMat);
    tubeMesh.receiveShadow = true;

    // ---- 5. Arch rings at each mouth ----
    const archGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0 - 0.2, TUNNEL_Z1 + 0.2]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      const arch = new THREE.TorusGeometry(BORE_R + 0.9, 0.55, 10, 28, Math.PI);
      arch.translate(cx, gy + 0.3, pz);
      archGeos.push(arch);
    }
    const archMesh = new THREE.Mesh(
      mergeGeometries(archGeos, false),
      new THREE.MeshStandardMaterial({ color: '#B08A60', roughness: 1 }),
    );

    // ---- 6. Inner tunnel shell: arched ceiling + upper walls (lit depth) ----
    const shellSegs: THREE.BufferGeometry[] = [];
    const SHELL_R = BORE_R - 0.4;
    for (let z = TUNNEL_Z0 + 2; z < TUNNEL_Z1; z += 4) {
      const cx = pathCenterX(z);
      const gy = terrainHeight(cx, z);
      const seg = new THREE.CylinderGeometry(SHELL_R, SHELL_R + 0.3, 4.4, 24, 1, true, Math.PI / 2, Math.PI);
      seg.rotateX(Math.PI / 2);
      seg.translate(cx, gy + 0.2, z + 2);
      shellSegs.push(seg);
    }
    const shellMesh = new THREE.Mesh(
      mergeGeometries(shellSegs, false),
      new THREE.MeshStandardMaterial({
        // Darkened (polish pass): #8A6A48 → #6E5238 — a deeper bore reads as a
        // real carved tunnel from the approach instead of a shallow notch.
        color: '#6E5238',
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    shellMesh.receiveShadow = true;

    // Depth occluders (polish pass): dark discs just inside each mouth. From
    // the approach the tunnel interior previously read as a bright notch; a
    // near-black warm disc at depth sells "carved into rock, goes somewhere".
    // Shape fix 2026-10-20: full circles poked through the arched roof (disc
    // top at ground+7.9 vs roof crown 6.2 — visible as floating black slabs
    // inside the mouth). Clipped to a half-disc BELOW spring-line height so
    // the occluder can never exceed the bore's own ceiling.
    const occluderGeos: THREE.BufferGeometry[] = [];
    // ENTRANCE ONLY (z = TUNNEL_Z0 + 4): from the bright valley the entrance
    // needs a dark backwall so the bore reads deep. The EXIT gets no occluder —
    // QA (2026-10-20 exit-approach capture) showed a black plate covering the
    // mouth from outside, killing the sunset reveal that is the reward for
    // walking through. The exit keeps its bore lights for backlit depth.
    for (const pz of [TUNNEL_Z0 + 4]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      const r = BORE_R - 0.5;
      // Bottom half-disc (theta π..2π) with its flat edge at ground+0.35r:
      // every point sits at or below y = 0.35r ≈ 1.65u — far under the roof
      // crown (6.2u), so nothing can poke through the arch ceiling.
      const disc = new THREE.CircleGeometry(r, 24, Math.PI, Math.PI);
      disc.translate(cx, gy + r * 0.35, pz);
      occluderGeos.push(disc);
    }
    const occluderMesh = new THREE.Mesh(
      mergeGeometries(occluderGeos, false),
      new THREE.MeshBasicMaterial({ color: '#241509' }),
    );

    // ---- 7b. Mouth frame walls (see-through fix, 2026-10-20) ----
    // QA on the user's approach screenshot showed you can see STRAIGHT THROUGH
    // the mountain next to the arch: the tube rim tops out at y≈7.5u, the massif's
    // inner-face floor starts at y≈26u, and the brow is an open-ended strip —
    // the band (lateral 7.3–18u, y 7.5–26u) was open air at both mouths. Solid
    // sandstone piers + a lintel now fill it at BOTH mouths, while the carved
    // arch silhouette (opening up to y≈7.3u) stays untouched.
    // ---- 7b. Mouth frame walls (see-through fix, 2026-10-20) ----
    // QA on the user's approach screenshot showed you can see STRAIGHT THROUGH
    // the mountain next to the arch. Solid sandstone piers + a lintel now fill
    // it at BOTH mouths, while the carved arch silhouette stays untouched.
    //
    // NATURAL-LOOK PASS (2026-10-20): the first version read as a flat slab
    // glued on (uniform color, smooth plane). Now we facet the merged geometry
    // with per-vertex jitter + warm-brown vertex color variation so it reads as
    // carved rock that is part of the massif. A darker crease is added where the
    // frame meets the massif flank (the visible seam from the previous pass).
    const frameGeos: THREE.BufferGeometry[] = [];
    const FRAME_MAT_H = 27;
    const LATERAL_IN = 6.4;
    const LATERAL_OUT = 26;
    const FRAME_D = 6;
    const LINTEL_BOTTOM = 7.0;
    for (const pz of [TUNNEL_Z0 - 1, TUNNEL_Z1 + 1]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      const g = (w: number, h: number, d: number, x: number, y: number) => {
        const box = new THREE.BoxGeometry(w, h, d, 4, 5, 2);
        box.translate(cx + x, gy + y, pz);
        frameGeos.push(box);
      };
      g(LATERAL_OUT - LATERAL_IN, FRAME_MAT_H, FRAME_D, -(LATERAL_IN + LATERAL_OUT) / 2, FRAME_MAT_H / 2);
      g(LATERAL_OUT - LATERAL_IN, FRAME_MAT_H, FRAME_D, (LATERAL_IN + LATERAL_OUT) / 2, FRAME_MAT_H / 2);
      g(LATERAL_OUT * 2, FRAME_MAT_H - LINTEL_BOTTOM, FRAME_D, 0, LINTEL_BOTTOM + (FRAME_MAT_H - LINTEL_BOTTOM) / 2);
    }
    const mergedFrame = mergeGeometries(frameGeos, false)!;
    // Facet: jitter vertices along their local normal-ish direction + assign
    // vertex colors with warm-brown variation so flatShading reads as low-poly rock.
    const pos = mergedFrame.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const rng = (n: number) => {
      let x = (n * 9301 + 49297) % 233280;
      return x / 233280;
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const jx = (rng(i * 3 + 1) - 0.5) * 0.55;
      const jy = (rng(i * 3 + 2) - 0.5) * 0.55;
      const jz = (rng(i * 3 + 3) - 0.5) * 0.55;
      pos.setXYZ(i, x + jx, y + jy, z + jz);
      // warm brown palette matching the cliffs: base #C9A075 with jitter
      const t = rng(i * 5 + 7);
      col[i * 3] = 0.78 + t * 0.12;
      col[i * 3 + 1] = 0.62 + t * 0.10;
      col[i * 3 + 2] = 0.46 + t * 0.08;
    }
    // Attach the color buffer BEFORE the strata pass reads it (getAttribute
    // returns undefined until setAttribute is called — this ordering was the
    // blank-page crash on 2026-10-20: setXYZ on undefined killed the chunk).
    mergedFrame.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // Per-vertex color pass matching the massif strata so the frame wall blends
    // with the mountain's warm-brown layered look (was uniform #C9A075).
    {
      const pos = mergedFrame.getAttribute('position') as THREE.BufferAttribute;
      const col = mergedFrame.getAttribute('color') as THREE.BufferAttribute;
      let minY = pos.getY(0), maxY = minY;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const span = Math.max(1e-3, maxY - minY);
      const mcolor = new THREE.Color();
      const rLow = new THREE.Color('#A87B52');
      const rMid = new THREE.Color('#C9A075');
      const rHigh = new THREE.Color('#E2BE8F');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = (y - minY) / span;
        mcolor.copy(rLow).lerp(rMid, Math.min(1, t * 1.8));
        if (t > 0.55) mcolor.lerp(rHigh, (t - 0.55) * 1.4);
        mcolor.offsetHSL(0, 0, Math.sin(y * 0.35 + pos.getX(i) * 0.11) * 0.02);
        col.setXYZ(i, mcolor.r, mcolor.g, mcolor.b);
      }
      col.needsUpdate = true;
    }
    pos.needsUpdate = true;
    mergedFrame.computeVertexNormals();
    const frameMesh = new THREE.Mesh(
      mergedFrame,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
    );
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;

    // QA instrumentation: the placed stone boxes + the mountain footprint.
    if (typeof window !== 'undefined') {
      (window as any).__cwMountainDomes = [...stones];
      (window as any).__cwMountainFootprint = { zStart: Z_START, zEnd: Z_END, halfWidth: HALF_W };
    }

    return { massMesh, faceMesh, stoneMesh, tubeMesh, archMesh, shellMesh, occluderMesh, frameMesh, surroundMesh, mountFace };
  }, []);

  // ---- 8. Journey's end plaza (polish pass 2026-10-20) ----
  // QA walk-through showed z 230..260 as dead fog space: the path just stops
  // after the last project marker (z=226). A small stone plaza with twin
  // lanterns (mirroring the entrance) gives the journey a destination.
  const plaza = useMemo(() => {
    const PZ = 242;
    const cx = pathCenterX(PZ);
    const gy = terrainHeight(cx, PZ);
    // Cobble ring: 14 low flat stones in a circle r=6.5 around the path end.
    const cobbleGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const sx = cx + Math.cos(a) * 6.5;
      const sz = PZ + Math.sin(a) * 6.5;
      const g = new THREE.CylinderGeometry(0.85, 1.0, 0.4, 6);
      g.rotateY(a);
      g.translate(sx, terrainHeight(sx, sz) + 0.12, sz);
      cobbleGeos.push(g);
    }
    const cobbleMesh = new THREE.Mesh(
      mergeGeometries(cobbleGeos, false),
      new THREE.MeshStandardMaterial({ color: '#B09578', roughness: 1, flatShading: true }),
    );
    cobbleMesh.castShadow = true;
    cobbleMesh.receiveShadow = true;
    // Center stone: a low broad marker rock the path flows into.
    const heart = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: '#C9A075', roughness: 1, flatShading: true }),
    );
    heart.scale.set(1.3, 0.6, 1.1);
    heart.position.set(cx, gy + 0.35, PZ + 2.5);
    heart.castShadow = true;
    heart.receiveShadow = true;
    // Twin lantern posts at the plaza mouth (same recipe as the entrance).
    const lposts: [number, number][] = [
      [cx - 4.6, PZ - 6],
      [cx + 4.6, PZ - 6],
    ].map(([x, z]) => [x, z] as [number, number]);
    return { cobbleMesh, heart, lposts, PZ };
  }, []);

  // ---- 9. Lanterns: two warm posts flanking the entrance, always lit ----
  const lanterns = useMemo(() => {
    const z = TUNNEL_Z0 - 8;
    const cx = pathCenterX(z);
    const pts: [number, number][] = [
      [cx - 4.6, z],
      [cx + 4.6, z],
    ];
    return pts.map(([x, zz]) => ({ x, z: zz, y: terrainHeight(x, zz) }));
  }, []);

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
  const postMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5A4632', roughness: 0.9 }),
    [],
  );

  // Gentle pulse — never fully dark (min intensity 1.15).
  useFrame(() => {
    const t = performance.now() / 1000;
    lanternMat.emissiveIntensity = 1.4 + Math.sin(t * 1.4) * 0.25;
  });
  // QA instrumentation: expose the lantern material for browser tests.
  if (typeof window !== 'undefined' && !(window as any).__cwLanternMat) {
    (window as any).__cwLanternMat = lanternMat;
  }

  // Billboard anchor: mounted on the mountain face directly above the tunnel
  // mouth (the proven 2026-10-18 placement — verified non-buried, non-floating).
  const signPos = useMemo(() => {
    const face = parts.mountFace as any;
    return {
      x: face.x,
      y: face.mountGround + 27, // mid-face, directly above the tunnel arch
      z: face.mountZ - 4.5, // proud of the face front cap
      yaw: Math.PI + Math.atan2(pathCenterX(101.5) - pathCenterX(94.5), 7) * 0.35,
    };
  }, [parts.mountFace]);

  return (
    <group>
      <primitive object={parts.massMesh} />
      <primitive object={parts.faceMesh} />
      <primitive object={parts.stoneMesh} />
      <primitive object={parts.tubeMesh} />
      <primitive object={parts.archMesh} />
      <primitive object={parts.shellMesh} />
      <primitive object={parts.occluderMesh} />
      <primitive object={parts.frameMesh} />
      <primitive object={parts.surroundMesh} />
      {lanterns.map((l, i) => (
        <group key={i} position={[l.x, l.y, l.z]}>
          <mesh castShadow position={[0, 1.6, 0]} material={postMat}>
            <cylinderGeometry args={[0.09, 0.11, 3.2, 8]} />
          </mesh>
          <mesh position={[0, 3.35, 0]} material={lanternMat}>
            <sphereGeometry args={[0.28, 12, 10]} />
          </mesh>
          {/* Capped point light: warm, no shadows, small radius */}
          <pointLight
            position={[0, 3.35, 0]}
            color="#FFB45E"
            intensity={10}
            distance={14}
            decay={2}
          />
        </group>
      ))}
      {/* Interior bore lights — warm, capped, no shadow casting */}
      {(() => {
        const out: { pos: [number, number, number]; intensity: number }[] = [];
        for (const z of [TUNNEL_Z0 - 1, TUNNEL_Z0 + 6, 118, 135, 152, TUNNEL_Z1 - 2]) {
          const cx = pathCenterX(z);
          out.push({
            pos: [cx, terrainHeight(cx, z) + 3, z],
            intensity: z <= TUNNEL_Z0 + 6 || z === TUNNEL_Z1 - 2 ? 20 : 6,
          });
        }
        return out.map((l, i) => (
          <pointLight key={i} position={l.pos} color="#FFB45E" intensity={l.intensity} distance={14} decay={2} />
        ));
      })()}
      {/* PROJECTS billboard — mounted on the mountain face above the tunnel */}
      <ProjectsBillboard position={[signPos.x, signPos.y, signPos.z]} yaw={signPos.yaw} />
      {/* Journey's end plaza — stone ring, heart rock, twin lanterns */}
      <primitive object={plaza.cobbleMesh} />
      <primitive object={plaza.heart} />
      {plaza.lposts.map(([x, z], i) => (
        <group key={`pl-${i}`} position={[x, terrainHeight(x, z), z]}>
          <mesh castShadow position={[0, 1.6, 0]} material={postMat}>
            <cylinderGeometry args={[0.09, 0.11, 3.2, 8]} />
          </mesh>
          <mesh position={[0, 3.35, 0]} material={lanternMat}>
            <sphereGeometry args={[0.28, 12, 10]} />
          </mesh>
          <pointLight position={[0, 3.35, 0]} color="#FFB45E" intensity={10} distance={14} decay={2} />
        </group>
      ))}
    </group>
  );
}
