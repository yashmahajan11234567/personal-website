import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore — BufferGeometryUtils ships as ESM without bundled types here
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pathCenterX, smoothstep, terrainHeight, mulberry32 } from './world';
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
    const PEAK_H = 52; // central summit height above ground (RECON 2026-10-21:
    // composition tuned by projecting the profile into the 50° vFOV frame.
    // The first 150u crest filled the whole frame (no sky, wall-like); the
    // first 46u pass kept peaks but the 22u facade slab rose to y134, leaving
    // only ~40px of ridge above it — still a wall. 52u puts the summit at
    // +23.2° (frame y32) from the approach camera with the facade at y255,
    // so a real sky band (200px+) separates the facade band from the ridge.)
    // Asymmetric skewed peaks (RECON): max-composed, NOT summed — a sum makes
    // an M-row of near-equal humps; max() keeps each peak distinct with real
    // notches between. Heights differ (9/38/52/36) so the skyline is irregular.
    const skew = (z0: number, h: number, sl: number, sr: number) => (z: number) =>
      h * (z <= z0
        ? Math.exp(-((z - z0) ** 2) / (2 * sl * sl))
        : Math.exp(-((z - z0) ** 2) / (2 * sr * sr)));
    const pBrow = skew(97, 9, 8, 8); // gentle brow over the portal (facade carries the face)
    const pLeft = skew(120, 38, 10, 13); // left secondary peak (narrow)
    const pMain = skew(150, PEAK_H, 10, 13); // central summit: NARROW (the first
    // 16/18 sigmas made a 22u-long flat plateau — skyline read flat at y94
    // across the whole frame center; 10/13 keeps the crest a POINT)
    const pRight = skew(178, 36, 14, 18); // right shoulder beyond the exit
    // VIS-009: add asymmetric tertiary peaks for more natural, irregular silhouette
    const pLeft2 = skew(108, 22, 9, 11);
    const pRight2 = skew(190, 24, 12, 15);
    // Broken ridgeline: low-amplitude ridge noise, gated on past the brow so
    // the mouth zone stays smooth. This is what makes the skyline read
    // "eroded/jagged" instead of four smooth bumps. VIS-009: add subtle multi-octave
    // variation for a more natural, less periodic jagged silhouette.
    const ridgeNoise = (z: number) =>
      ((3.5 * Math.sin(z * 0.23 + 1.7) + 2.0 * Math.sin(z * 0.41 + 0.4)) +
       1.2 * Math.sin(z * 0.67 + 2.3) + 0.8 * Math.sin(z * 0.13 - 0.9)) * smoothstep(90, 104, z);
    const crestLine = (z: number): number =>
      Math.max(0, Math.max(pBrow(z), pLeft(z), pLeft2(z), pMain(z), pRight2(z), pRight(z)) + ridgeNoise(z));
    // Tapered footprint: wide at the foot (88), narrow at the crest (30).
    const halfWidthAt = (z: number, crest: number): number => {
      const t = Math.min(1, Math.max(0, crest / PEAK_H));
      // VIS-009: slight taper variation to break up straight silhouette edges
      const wiggle = 1 + 0.04 * Math.sin(z * 0.17);
      return (HALF_W - (HALF_W - 30) * t) * wiggle;
    };
    const crestHeight = (z: number, x: number): number => {
      const cx = pathCenterX(z);
      const corridorDist = Math.abs(x - cx);
      const crest = crestLine(z);
      const hw = halfWidthAt(z, crest);
      const u = corridorDist / hw;
      if (u >= 1) return 0; // foot meets valley terrain
      if (corridorDist === 0) return crest; // probe value for halfWidthAt
      // LATERAL DOME FALLOFF (RECON 2026-10-21): the crest is highest near
      // the path axis and decays toward the footprint flanks. Without this
      // every lateral x shares one crest height → the projected skyline is
      // a HORIZONTAL LINE (the nearest tall row), not a peak silhouette —
      // the "flat wall" read from the approach even with distinct z-peaks.
      // The SPUR modulation undulates the falloff in BOTH x and z, so
      // different z-peaks dominate different screen columns — a broken,
      // jagged skyline (verified numerically: per-column silhouette spans
      // el 13.5..24.3° with dominant-z shifting 92→116→130→156→144→124→114)
      // instead of one smooth dome. The falloff STRENGTHENS with z (far
      // peaks must fall off laterally faster or the summit band dominates
      // every screen column and the skyline flattens again).
      // VIS-009: add x-dependent ridge noise to break up flat polygon bands
      const fallAmt = 0.55 + 0.25 * smoothstep(150, 200, z);
      const spur = 1 + 0.35 * Math.sin(z * 0.19 + x * 0.16) + 0.2 * Math.sin(z * 0.37 - x * 0.31) + 0.12 * Math.sin(x * 0.43 + z * 0.11);
      const latFall = Math.min(1.15, (1 - fallAmt * Math.pow(u, 1.5)) * spur);
      const inTunnel = z >= TUNNEL_Z0 && z <= TUNNEL_Z1;
      // VIS-008 (2026-10-25): the tunnel-zone roof carve is REMOVED. A
      // single-sided heightfield cannot carry an open trench: the sparse
      // profile used to bridge it (the floating canopy — down-facing quads
      // n.y≈-0.9, the "flat underside + pillars" in video 135213), and once
      // profile columns sampled the carve the trench became a through-slot
      // (grazing rays pass between the flank walls → sky/plates at frame
      // top, diag004 P4 + vis007 01/02). The massif therefore passes OVER
      // the bore as a solid dome (the architecture's original contract:
      // "crestHeight floors the profile above the walkable tube"). The bore
      // void is formed by the inner shell (r 4.95), the facade carve, and
      // the mouth tubes — never by carving this sheet. ROOF_CLEAR keeps the
      // sheet above the shell + arch ring everywhere.
      // VIS-008 (2026-10-25): OUTSIDE the tunnel zone the corridor stays an
      // open approach floor (return 0). The canopy above it is gone because
      // the flank ramp below now rises SMOOTHLY from the corridor edge and
      // the new profile columns sample that ramp — no floating underside.
      if (!inTunnel && corridorDist < CORRIDOR_EDGE) {
        return 0;
      }
      // Outside the corridor: rise from the corridor edge toward the crest.
      // RECON 2026-10-21 ROOT-CAUSE FIX: the old flank rose with
      // t^lateralExp toward the FOOT (t→1 at the footprint edge), which
      // inverted the massif — a hollow RING ridge ~20-23u tall with a low
      // axis (bbox y-max measured 22.9u where the design summit is 52u;
      // the "flat wall" band in every screenshot). The correct shape is a
      // DOME: full crest at the axis, decaying toward the foot. The decay
      // is the latFall dome factor above (which already carries the spur
      // jaggedness); the corridor-edge lift below just rounds the shoulder
      // where the dome meets the carved corridor so the brow/portal flank
      // does not start with a knife edge.
      // VIS-008 RAMP FIX: the old lift `1 - ((dx-6.5)/14.3)²` measured ≈1
      // AT the edge and 0 beyond dx≈21 — an inverted ramp that jumped the
      // flank 0→full-crest within ~0.5u of the corridor (a vertical cliff
      // wall) and flattened everything past dx 21. That discontinuity was
      // the root cause of BOTH the floating canopy (the sparse profile
      // bridged across it with a flat ceiling) and the thin-plate walls
      // (diag004 P4) after the columns materialized it. Replaced with a
      // smooth rise whose WIDTH depends on z: narrow (7u) beside the tunnel
      // zone so the bore is framed by continuous rock walls on both
      // exterior sides (no sky slots beside the ±13u facade — diag004 P4
      // follow-up), widening to 18u toward the massif ends so the far
      // approach/exit flanks stay gentle valley slopes.
      // VIS-008: Z-MODULATED LIFT — near the mouths the flank must land at
      // the corridor edge (solid rock walls beside the bore, no sky slots
      // beside the ±13u facade); toward the massif ends it rises over 18u.
      const zIntoMassif = Math.min(
        smoothstep(Z_START + 4, TUNNEL_Z0 - 8, z),
        1 - smoothstep(TUNNEL_Z1 + 8, Z_END - 4, z),
      );
      const rampW = 18 - 11 * zIntoMassif; // 18u far → 7u beside the bore
      const lift = smoothstep(CORRIDOR_EDGE, CORRIDOR_EDGE + rampW, corridorDist);
      // Inside the tunnel zone the dome passes OVER the bore: clamp the
      // sheet to a 7u floor (shell r≈4.95 + arch ring 6.65 + margin) so the
      // bore void survives and the character never sees rock inside it.
      const ROOF_CLEAR = 7.0;
      const flank = Math.max(
        crest * latFall * Math.min(1, Math.max(0, lift)),
        inTunnel ? ROOF_CLEAR * Math.min(1, Math.max(0, lift)) : 0,
      );
      // Mouth-zone floor: SOLID MOUTH REBUILD (forensic plan Stage 1,
      // 2026-10-25): the old 18u sealing floor made the massif flanks rise to
      // a FLAT 18u slab around a 7.3u arch — the "enormous flat brown wall"
      // (numeric cross-sections in .hermes/plans/2026-10-25_010613). The seal
      // is now carried by explicit solid mouth blocks (see mouthBlocks below);
      // the heightfield floor drops to a low organic shoulder so the arch is
      // the dominant feature, not a notch in a cliff.
      const MOUTH_FLOOR = 4.5;
      const floorZ = MOUTH_FLOOR * smoothstep(84, 92, z) * (1 - smoothstep(103, 114, z));
      const floor = floorZ * Math.min(1, (corridorDist - CORRIDOR_EDGE) / 2);
      // EXIT-side floor: same treatment beyond z≈166 (Stage 1): low shoulder,
      // continuity carried by the solid exit blocks; the pRight crest keeps
      // the mountain silhouette above the exit opening.
      const EXIT_FLOOR = 4.5;
      const floorX = EXIT_FLOOR * smoothstep(158, 166, z) * (1 - smoothstep(174, 184, z));
      const floorExit = floorX * Math.min(1, (corridorDist - CORRIDOR_EDGE) / 2);
      return Math.max(flank, floor, floorExit);
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
    const stoneA = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 1,
      vertexColors: true,
      flatShading: true,
    });
    const massMesh = new THREE.Mesh(mergedMass, stoneA);
    massMesh.castShadow = true;
    massMesh.receiveShadow = true;

    // ---- 2. Portal brow — solid rock mount face directly above the arch ---
    // A rock face spanning the tunnel mouth: tall enough to carry the
    // PROJECTS board (board top ≈14.25u) with rock to spare, and narrow
    // enough (±9u) to never intrude into the walkable corridor vertically
    // (corridor ceiling is 4.5u; the face rock sits entirely above it). The
    // board reads as fixed to the mountain.
    // RECON 2026-10-21: crest 22 → 17. At 22u the facade slab projected to
    // frame y134 from the approach and capped the peaks behind it (only
    // ~40px of ridge above) — the "wall" read. At 17u the facade top sits at
    // y255 with the summit ridge at y32: a 200px+ sky band between them, and
    // the board (9.75..14.25u) still fully embedded with rock above.
    // STAGE 2 (forensic plan 2026-10-25): the old slab had NO opening — the
    // arch shell was embedded inside its volume and only "emerged" via
    // FrontSide culling (RC-3: the buried-arch read). The crest profile is
    // now CARVE-AWARE: full 17u outside the bore radius, arched cut (same
    // ROOF_CROWN·t² family as the massif carve) inside, so the arch opening
    // is a hole in the facade bounded by front-facing rock on all sides.
    const mountZ = TUNNEL_Z0 - 2.5;
    const mountCx = pathCenterX(mountZ);
    const mountGround = terrainHeight(mountCx, mountZ);
    const mountFaceY = mountGround + 16;
    const FACE_CARVE_R = CORRIDOR_EDGE; // match the massif corridor carve (6.5)
    const carvedFaceHeight = (z: number, x: number): number => {
      const dx = Math.abs(x - pathCenterX(z));
      if (dx >= FACE_CARVE_R) {
        // FORENSIC vision pass (vis007/02, 2026-10-25): a constant 17u crest
        // drew a straight horizontal top edge across the mouth — a slab read.
        // Rock-strata variation (three terms, ±2.6u) breaks the line, and a
        // gentle rise toward the outer edge (17→19.5 by |dx|=13) seats the
        // facade into the massif shoulder behind it.
        const strata = 1.7 * Math.sin(x * 0.42 + 1.1) + 1.1 * Math.sin(z * 0.55 + x * 0.2) + 0.8 * Math.sin(x * 0.18 - z * 0.31 + 2.2);
        const shoulder = 2.5 * smoothstep(7.5, 13, dx);
        return Math.max(8, 17 + strata + shoulder);
      }
      // Arched cut identical to the massif bore carve (ROOF_CROWN·t² over
      // CORRIDOR_EDGE) so facade opening and carved passage are one profile;
      // the torus ring (r 6.1) lines the inside edge and the tube rim
      // (r 7.3) rings it in front of the rock — both at the opening edge.
      const t = 1 - dx / FACE_CARVE_R;
      return Math.max(0, ROOF_CROWN * t * t);
    };
    const faceGeo = buildMountainSurface(
      { zStart: mountZ - 5.5, zEnd: mountZ + 6, zStep: 5, halfWidth: 13, seed: 502, crestHeight: carvedFaceHeight, edgeFloor: 0.6 },
      pathCenterX,
      terrainHeight,
    );
    const faceMesh = new THREE.Mesh(faceGeo, stoneA);
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
    // ---- 3b. Mouth surround — accent rocks only (VIS-006 fix, 2026-10-22) ----
    // History: v1 was a full 360° icosahedron ring (black — missing color attr —
    // with gaps that read as a broken seam in the user's video). v2 was an
    // upper-half chunk arc with baked sandstone (color fixed, but vision QA
    // still read "mosaic of assembled blocks with seams"). v3 tried ONE
    // continuous faceted half-torus band, but rotateX(π/2) laid the arc FLAT
    // into the XZ plane: instead of an upright arch course it became a
    // horizontal stone collar at ankle height arcing ~7u INTO the bore
    // (entrance band crossed the walkable centerline at z 105.3..108.3, top
    // y = ground+1.94; exit band at z 176.9..179.9, right on the exit path —
    // geometry-probe measured, 2026-10-22). It was never gated by
    // boxClearsCorridor, and from mid-bore it read as a wall of sheared rock
    // shards across the mouth (vision: "75-80% of the opening width, lower
    // 40% of its height"). An upright variant is not an option either: its
    // top would hover at y≈8 above the arch apex — the same "floating rocks
    // over the portal" read the 2026-10-20 pass already vision-flagged and
    // rejected. The tube rim + arch ring + portal stones already outline the
    // mouth (2026-10-20 note), so the band is removed outright. The springing
    // accent rocks stay (grounded beside the mouth, clear of the corridor).
    const surroundGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0 - 0.8, TUNNEL_Z1 + 0.8]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      // Accent rocks at the springing lines (grounded, small, hand-set look)
      for (const side of [-1, 1]) {
        const g = new THREE.IcosahedronGeometry(1.05, 0);
        g.translate(cx + side * (BORE_R + 2.6), gy + 0.7, pz + 0.3);
        surroundGeos.push(g);
      }
    }
    const stoneMesh = new THREE.Mesh(mergeGeometries(stoneGeos, false), stoneA);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;

    const surroundMesh = new THREE.Mesh(mergeGeometries(surroundGeos, false), stoneA);
    surroundMesh.castShadow = true;
    surroundMesh.receiveShadow = true;

    // ---- 3c. SOLID MOUTH BLOCKS (forensic plan Stage 1, 2026-10-25) ---
    // The massif is a single-sided heightfield: its "walls" around the bore
    // are 2D surfaces with no thickness, and the old 18u/26u sealing floors
    // read as enormous flat cliffs beside a 7.3u arch (RC-1). These blocks
    // are the actual sealing VOLUME: a low, lumpy rock skirt around each
    // mouth (both sides, both mouths) that closes the gap between the bore
    // shell and the terrain with real 3D rock — so nothing tall flanks the
    // opening and no backface stack is ever visible from outside.
    // VIS-009: add a grounding row of low flat rocks at the terrain contact
    // line so nothing reads as hovering above the ground (video showed a
    // gap/shadow line at the exit mouth where rock met grass).
    const mouthBlockGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0 - 1, TUNNEL_Z1 + 1]) {
      const cx = pathCenterX(pz);
      const rnd = mulberry32(pz > 130 ? 911 : 707);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          // Lateral band from just outside the bore wall out to ~13u; rows
          // tighten toward the exit so the skirt stays behind the portal.
          const t = i / 8; // 0..1 along the lateral band
          const lx = BORE_R + 0.9 + t * 7.2; // 6.1 .. 13.3 from centerline
          const bx = cx + side * lx + (rnd() - 0.5) * 1.6;
          const bz = pz + (rnd() - 0.5) * 4.2;
          // Rise gently with lateral distance: hugging the bore keeps the
          // opening low; the outer edge shoulders up toward the flank.
          const h = 1.1 + t * 2.6 + rnd() * 1.4;
          const w = 2.6 + rnd() * 1.5;
          const g = new THREE.IcosahedronGeometry(1, 0);
          g.scale(w, h, w * 0.85);
          g.translate(bx, terrainHeight(bx, bz) + h * 0.55, bz);
          mouthBlockGeos.push(g);
        }
        // Grounding row: low flat rocks sitting ON the terrain at the outer
        // edge of the skirt, bridging the skirt-to-terrain transition so the
        // rock reads as rooted, not floating.
        const gx = cx + side * (BORE_R + 16 + rnd() * 3);
        const gz = pz + (rnd() - 0.5) * 6;
        const gy = terrainHeight(gx, gz);
        const gw = 3.4 + rnd() * 2;
        const gh = 0.9 + rnd() * 0.8;
        const gd = 3.4 + rnd() * 2;
        const groundG = new THREE.BoxGeometry(gw, gh, gd, 3, 2, 2).toNonIndexed();
        groundG.translate(gx, gy + gh * 0.5, gz);
        mouthBlockGeos.push(groundG);
      }
    }
    const mouthBlocksMesh = new THREE.Mesh(mergeGeometries(mouthBlockGeos, false), stoneA);
    mouthBlocksMesh.castShadow = true;
    mouthBlocksMesh.receiveShadow = true;

    // BAKE VERTEX COLORS for the icosahedron-based meshes (stones + surround).
    // rockA has vertexColors: true; geometries without a 'color' attribute read
    // (0,0,0) on the GPU → rendered BLACK (the black-rocks bug in the user's
    // 2026-10-20 evening video). Painting height-stratified sandstone here puts
    // them in the same color family as the massif under the same material.
    const bakeSandstone = (geo: THREE.BufferGeometry) => {
      const p = geo.getAttribute('position') as THREE.BufferAttribute;
      const c = new Float32Array(p.count * 3);
      const lo = new THREE.Color('#8F6844'); // shadowed sandstone
      const mid = new THREE.Color('#B88A5A');
      const hi = new THREE.Color('#D9B183'); // sunlit sandstone
      let mn = p.getY(0), mx = mn;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y < mn) mn = y;
        if (y > mx) mx = y;
      }
      const sp = Math.max(1e-3, mx - mn);
      const cc = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const t = (p.getY(i) - mn) / sp;
        cc.copy(lo).lerp(mid, Math.min(1, t * 1.8));
        if (t > 0.55) cc.lerp(hi, (t - 0.55) * 1.4);
        // slight per-vertex warm jitter so flat facets read as varied stone
        const j = (((i * 17 + 3) * 9301 + 49297) % 233280) / 233280;
        cc.offsetHSL(0.005 - j * 0.01, 0, (j - 0.5) * 0.05);
        c[i * 3] = cc.r;
        c[i * 3 + 1] = cc.g;
        c[i * 3 + 2] = cc.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    };
    bakeSandstone(stoneMesh.geometry);
    bakeSandstone(surroundMesh.geometry);
    bakeSandstone(mouthBlocksMesh.geometry);

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
      // RECORDING 144628 (Fix C): the light smooth rim (#A97F58) against the
      // darker segmented shell behind it read as a disconnected "smooth arch
      // that doesn't join the ribs". Deepen the rim toward the shell family so
      // the mouth reads as one carved portal: rim shades into the first rib.
      color: '#96714E',
      roughness: 1,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const tubeMesh = new THREE.Mesh(mergeGeometries(tubeGeos, false), tubeMat);
    tubeMesh.receiveShadow = true;

    // ---- 5. Arch rings at each mouth ---
    const archGeos: THREE.BufferGeometry[] = [];
    // VIS-009: under-ceiling rock ledges beneath each mouth opening so the
    // underside of the bore reads as carved rock with irregular ledges,
    // not a flat planar ceiling (video showed flat undersides at entrance).
    const underLedgeGeos: THREE.BufferGeometry[] = [];
    for (const pz of [TUNNEL_Z0 - 0.2, TUNNEL_Z1 + 0.2]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      const arch = new THREE.TorusGeometry(BORE_R + 0.9, 0.55, 10, 28, Math.PI);
      arch.translate(cx, gy + 0.3, pz);
      archGeos.push(arch);
      // Ledges: short radial struts dropping from the shell crown down to
      // the arch crown, staggered around the bore so the underside reads
      // as stepped rock shelves rather than a smooth flat plane.
      for (let a = 0; a < 2 * Math.PI; a += Math.PI / 3) {
        const lx = Math.cos(a) * (BORE_R + 1.4);
        const lz = Math.sin(a) * 0.6;
        const lw = 0.9 + Math.sin(a * 3) * 0.35;
        const lh = 1.6 + Math.sin(a * 5) * 0.5;
        const ld = 1.0;
        const lg = new THREE.BoxGeometry(lw, lh, ld, 2, 2, 1);
        lg.translate(cx + lx, gy + 0.3 + BORE_R - lh / 2, pz + lz);
        lg.rotateZ(a);
        underLedgeGeos.push(lg);
      }
    }
    const archMesh = new THREE.Mesh(
      mergeGeometries(archGeos, false),
      new THREE.MeshStandardMaterial({ color: '#B08A60', roughness: 1 }),
    );

    // Under-ceiling rock ledges: stone material, baked sandstone colors.
    const underLedgeMesh = new THREE.Mesh(mergeGeometries(underLedgeGeos, false), stoneA);
    underLedgeMesh.castShadow = true;
    underLedgeMesh.receiveShadow = true;
    bakeSandstone(underLedgeMesh.geometry);

    // ---- 6. Inner tunnel shell: arched ceiling + upper walls (lit depth) ---
    const shellSegs: THREE.BufferGeometry[] = [];
    const SHELL_R = BORE_R - 0.4;
    // STAGE 3 (forensic plan 2026-10-25): lap the carved mouths by ~1.5u so
    // the shell meets the facade carve with no visible seam.
    for (let z = TUNNEL_Z0 - 1.5; z < TUNNEL_Z1 + 2.5; z += 4) {
      const cx = pathCenterX(z);
      const gy = terrainHeight(cx, z);
      const seg = new THREE.CylinderGeometry(SHELL_R, SHELL_R + 0.3, 4.4, 24, 1, true, Math.PI / 2, Math.PI);
      seg.rotateX(Math.PI / 2);
      seg.translate(cx, gy + 0.2, z + 2);
      // VIS-009: irregular rock variegation on inner shell so bore walls read
      // as carved stone, not smooth plastic (video: interior looked stretched
      // and featureless). Jitter vertices radially + heightwise per segment.
      const sPos = seg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sPos.count; i++) {
        const x = sPos.getX(i), y = sPos.getY(i), zz = sPos.getZ(i);
        const rnd = mulberry32(i * 131 + z * 17);
        sPos.setXYZ(i,
          x + (rnd() - 0.5) * 0.18,
          y + (rnd() - 0.5) * 0.14,
          zz + (rnd() - 0.5) * 0.18);
      }
      seg.computeVertexNormals();
      shellSegs.push(seg);
    }
    const shellMesh = new THREE.Mesh(
      mergeGeometries(shellSegs, false),
      new THREE.MeshStandardMaterial({
        color: '#8B6B4F',
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    shellMesh.receiveShadow = true;

    // STAGE 3 (forensic plan 2026-10-25): entrance occluder disc REMOVED.
    // The old flat/gradient MeshBasicMaterial disc was the single biggest
    // driver of the "blocked wall / can't walk in" read (RC-2): from outside
    // the bright valley it silhouetted as a slab because the FrontSide
    // facade/wall layers were culled and the disc rendered unlit. With a real
    // carved facade opening + solid mouth blocks, the bore reads deep via
    // the interior shell and the warm bore lights (unchanged). No backwall.

    // ---- 7b. Mouth frame walls (see-through fix, 2026-10-20) ----
    // Solid sandstone piers + a lintel fill the open lateral band at BOTH
    // mouths, while the carved arch silhouette (opening up to y≈7.3u) stays
    // untouched.
    //
    // DARK-TRIANGLE FIX (RECON 2026-10-21): the piers were 27u tall — TALLER
    // than the facade — so from the approach they silhouetted above the
    // face as dark near-vertical slabs framing the arch: the "dark
    // triangular structure around the tunnel". Now: pier height 14u (< the
    // 17u facade top, so the piers embed INTO the face and never rise above
    // it; also below the board top so they never touch the board band),
    // and the pier geometry tapers inward with height so each pier reads
    // as a natural rock abutment instead of a rectangular tent wall. The
    // lintel only spans the band above the arch opening (LINTEL_BOTTOM 7.0
    // → up to the same 14u cap).
    const frameGeos: THREE.BufferGeometry[] = [];
    const FRAME_MAT_H = 14;
    // STAGE 2 (forensic plan 2026-10-25): piers now sit ON the bore wall
    // (inner edge 5.2 = BORE_R, was 6.4 — a 1.2u daylight gap the old slab
    // hid) and the lintel bottom meets the carve crown (6.2, was 7.0) so
    // the opening is bounded by rock, not floating bands.
    const LATERAL_IN = BORE_R;
    const LATERAL_OUT = 26;
    const FRAME_D = 6;
    const LINTEL_BOTTOM = 6.2;
    for (const pz of [TUNNEL_Z0 - 1, TUNNEL_Z1 + 1]) {
      const cx = pathCenterX(pz);
      const gy = terrainHeight(cx, pz);
      // Tapered pier: extruded trapezoid (wide base, 60% top width) — side
      // faces lean inward like carved rock abutments, killing the box-tent
      // read. Built directly in the (lateral, height) plane, extruded along
      // world Z; left/right shapes are written out explicitly (no mirrored
      // scale — that flips winding).
      const pier = (side: 1 | -1): THREE.BufferGeometry => {
        const w = LATERAL_OUT - LATERAL_IN;
        const inset = w * 0.2; // 20% narrower at the top, each side
        const s = new THREE.Shape();
        if (side === -1) {
          s.moveTo(-LATERAL_OUT, 0);
          s.lineTo(-LATERAL_IN, 0);
          s.lineTo(-LATERAL_IN - inset, FRAME_MAT_H);
          s.lineTo(-LATERAL_OUT + inset, FRAME_MAT_H);
        } else {
          s.moveTo(LATERAL_IN, 0);
          s.lineTo(LATERAL_OUT, 0);
          s.lineTo(LATERAL_OUT - inset, FRAME_MAT_H);
          s.lineTo(LATERAL_IN + inset, FRAME_MAT_H);
        }
        s.closePath();
        const g = new THREE.ExtrudeGeometry(s, { depth: FRAME_D, bevelEnabled: false });
        g.translate(cx, gy, pz - FRAME_D / 2);
        return g.toNonIndexed();
      };
      frameGeos.push(pier(-1), pier(1));
      // Lintel band above the arch opening. FORENSIC STAGE 2 revision
      // (2026-10-25, vision on vis007/02): the old box spanned the full
      // LATERAL_OUT*2 = 52u at 7.8u tall — from the frontal approach its
      // flat front face filled the top of the frame as a slab over the
      // arch (most of |dx|>8 is buried inside the now-17u carved facade,
      // so the width was dead flat area). Narrowed to the opening band
      // (±8.2) and lowered (6.2→10.5) so it reads as a rock band hugging
      // the arch crown; the facade + piers carry everything beyond it.
      const LINTEL_W = 16.4;
      const LINTEL_TOP = 10.5;
      const lintel = new THREE.BoxGeometry(LINTEL_W, LINTEL_TOP - LINTEL_BOTTOM, FRAME_D, 3, 3, 2);
      lintel.translate(cx, gy + LINTEL_BOTTOM + (LINTEL_TOP - LINTEL_BOTTOM) / 2, pz);
      frameGeos.push(lintel.toNonIndexed());
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

    return { massMesh, faceMesh, stoneMesh, tubeMesh, archMesh, shellMesh, frameMesh, surroundMesh, mountFace, mouthBlocksMesh, underLedgeMesh };
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
  // arch (RECON 2026-10-21). Board center at ground+12 (spans 9.75..14.25u)
  // — fully inside the 17u facade with rock above. The board must sit PROUD
  // of the facade's FRONT edge: the facade surface spans z 91.5..98.5 with
  // its front row standing 10..17u tall, so a board at z=93 is BEHIND that
  // edge and the facade clips its top/right (vision read the final letters
  // crossed by a dark rock edge). z = 88.5 puts the board 3u in front of
  // the facade front — visually still mounted on the face (the facade
  // towers behind it), never intersected.
  const signPos = useMemo(() => {
    const face = parts.mountFace as any;
    return {
      x: face.x,
      y: face.mountGround + 12, // board spans 9.75..14.25u — inside the face
      z: 88.5, // proud of the facade front edge (91.5) — never clipped
      yaw: Math.PI + Math.atan2(pathCenterX(101.5) - pathCenterX(94.5), 7) * 0.35,
    };
  }, [parts.mountFace]);

  return (
    <group>
      <primitive object={parts.massMesh} />
      <primitive object={parts.faceMesh} />
      <primitive object={parts.stoneMesh} />
      <primitive object={parts.mouthBlocksMesh} />
      <primitive object={parts.tubeMesh} />
      <primitive object={parts.archMesh} />
      <primitive object={parts.shellMesh} />
      <primitive object={parts.frameMesh} />
      <primitive object={parts.surroundMesh} />
      <primitive object={parts.underLedgeMesh} />
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
        for (const z of [TUNNEL_Z0 - 1, TUNNEL_Z0 + 6, 118, 135, 152, TUNNEL_Z1 - 2, TUNNEL_Z1 - 6]) {
          const cx = pathCenterX(z);
          out.push({
            pos: [cx, terrainHeight(cx, z) + 3, z],
            // VIDEO PASS 2026-10-24: mid-bore read dim/flat between the two
            // bright mouths (user video: "flat lighting, no shadows" inside
            // the bore). 6 → 8 lifts the mid-section so the carved walls have
            // form while mouths stay brighter (20). VIS-004's "close, no
            // change" is superseded by the user's explicit fix mandate.
            // RECORDING 144628: the exit read as a DEAD END from mid-bore —
            // the approach-side of the exit mouth was unlit, so the far end
            // showed a small backlit ring with no lit path leading to it.
            // TUNNEL_Z1-6 at 12 paints a warm pool just inside the exit so
            // the far floor visibly leads out; z=152 raised 8→10 so the far
            // half is not the dimmest stretch.
            intensity:
              z <= TUNNEL_Z0 + 6 || z === TUNNEL_Z1 - 2
                ? 20
                : z === TUNNEL_Z1 - 6
                  ? 12
                  : z === 152
                    ? 10
                    : 8,
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
