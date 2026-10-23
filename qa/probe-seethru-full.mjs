/** VIS-005 repaired see-through probe (2026-10-22).
 *
 * PURPOSE: detect see-through HOLES in the mountain rock — sky visible at
 * pixels where rock should be — from two pinned approach angles.
 *
 * ROOT CAUSE OF THE OLD FAIL (documented in CLOUD_WORLD_ITERATION_LOG.md,
 * "Post-Recovery Verification 2026-10-21"): the old predicate required
 * b > 130, but the RECON sky sphere (Sky.tsx zenith #FFB74D / horizon
 * #FFCC80, fog=false) measures b = 99-115 at the scanned heights, so real
 * sky could never pass; what passed was billboard marquee cream
 * rgb(255,228,135) -> 38 false clusters. The old scan also had no
 * connectivity test (skyline notches flagged), no billboard exclusion, and
 * no bore-mouth exclusion (the tunnel legitimately shows warm light/sky
 * through the entrance opening).
 *
 * REPAIRED DETECTOR (all thresholds principled, none scene-tuned to pass):
 *  1. isSky = the measured RECON gradient predicate (same as the committed
 *     qa/skyline-floodfill-holecheck.mjs: r>205 g>160 b>80 b<0.55r
 *     g<0.85r g>0.7r).
 *  2. Flood-fill connectivity from the top sky band: only sky pixels NOT
 *     connected to the top band are hole candidates (skyline notches and
 *     gaps BETWEEN peaks are legitimate).
 *  3. Row-gradient match: a real hole shows the sky sphere at that ray's
 *     elevation, so the cluster's mean color must match the ANALYTIC sky
 *     gradient for its screen row (computed from Sky.tsx's three stops and
 *     the pinned camera pitch) within TOL=20/channel. Warm lantern glow
 *     and billboard cream fail this match (measured deltas 2026-10-22:
 *     glow g-r gap ~75 vs sky ~50 -> g off by +23, b off by +33; cream
 *     g off by +28).
 *  4. Derived exclusions (from scene constants projected to screen, not
 *     hand-picked pixels): the PROJECTS billboard rect (__cwMountFace +
 *     board spans 9.75..14.25u, half-width 8.95 incl. frame + cloud lights,
 *     +2u margin), the entrance bore-mouth rect (pathCenterX(100),
 *     ground+3.2, r=10u +margin) and the two entrance lantern heads
 *     (cx(92)±4.6, ground+3.35, r≈1u — emissive spheres that fog-wash into
 *     the sky band; vision-confirmed 2026-10-22) — a through-the-tunnel
 *     view is the tunnel working, not a hole, and the lanterns are lamps.
 *  5. SILHOUETTE TEST (the decisive one): a remaining candidate counts as a
 *     hole only if the ray through its center hits the ANALYTIC mountain
 *     surface (exact crestHeight mirror from MountainPassage.tsx — same
 *     "honest engineering" duplication as qa/silhouette-probe.mjs). Sky
 *     pockets BETWEEN peaks, distant-range gaps and anything outside the
 *     massif's projected body are legitimate scene composition, not holes.
 *  6. Cluster minimum 20px (committed holecheck convention), frame-edge
 *     margin 60px, band y 15%..70%.
 *
 * PASS = zero UNEXPLAINED clusters on both angles.
 * Self-test: qa/seethru-selftest.mjs injects a real hole (live vertex
 * collapse + synthetic sky patch) and asserts this scan FAILS.
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const URL_ = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v9-final/seethru-full.png';

// ---- world.ts mirrors (pure functions, same as other probes) ----
export function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
export function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
export function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const tm = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
}

// ---- detector (exported for the self-test) ----

// Measured RECON sky predicate (iteration log + committed holecheck).
export const isSky = (r, g, b) => r > 205 && g > 160 && b > 80 && b < 0.55 * r && g < 0.85 * r && g > 0.7 * r;

// Analytic expected sky color for a screen row, from Sky.tsx's gradient
// (zenith #FFB74D at v=1, horizon #FFCC80 at v=0.5, nadir #FFB74D) and the
// pinned camera pitch. fovDeg = vertical FOV (50), pitchRad = camera pitch.
export function expectedSkyAtRow(yNorm, pitchRad, fovDeg = 50) {
  const el = pitchRad + (0.5 - yNorm) * (fovDeg * Math.PI) / 180; // ray elevation
  const v = 0.5 + el / Math.PI; // sphere uv (v=1 zenith, 0.5 horizon)
  const t = 1 - v; // canvas gradient position (t=0 top row = zenith stop)
  const zen = [255, 183, 77], hor = [255, 204, 128];
  const lerp = (a, b, k) => a + (b - a) * k;
  const c = t <= 0.5
    ? [0, 1, 2].map((i) => lerp(zen[i], hor[i], t / 0.5))
    : [0, 1, 2].map((i) => lerp(hor[i], zen[i], (t - 0.5) / 0.5));
  return c;
}

const TOL = 12; // /channel — covers Noise(0.015)+AA+wobble. Measured 2026-10-22: billboard cream is g +28 off the analytic row color; fog-washed lantern glow lands within ~15 (TOL 20 let a washed lantern through in the first run — tightened to 12, verified below).

/**
 * Scan one screenshot. meta = { billboard, mouth, lanterns: [[x,y,x,y]...],
 * pitchRad, pose: {pos,target}, W, H } — rect exclusions are screen-space
 * [x0,y0,x1,y1] or null to skip; the silhouette test uses pose+pitch.
 * Returns { pass, unexplained, clusters }.
 */
export function scanSeethru(png, meta, pitchRad) {
  const W = png.width, H = png.height, D = png.data;
  const inRect = (x, y, rc) => rc && x >= rc[0] && x <= rc[2] && y >= rc[1] && y <= rc[3];
  // label: 0 = sky connected to top band, -1 unchecked
  const label = new Int32Array(W * H).fill(-1);
  const q = [];
  for (let x = 0; x < W; x++) {
    const i = x * 4;
    if (isSky(D[i], D[i + 1], D[i + 2])) { label[x] = 0; q.push(x); }
  }
  let head = 0;
  while (head < q.length) {
    const idx = q[head++]; const x = idx % W, y = (idx - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const ni = ny * W + nx;
      if (label[ni] === -1 && isSky(D[ni * 4], D[ni * 4 + 1], D[ni * 4 + 2])) { label[ni] = 0; q.push(ni); }
    }
  }
  const y0 = Math.round(H * 0.15), y1 = Math.round(H * 0.70);
  const seen = new Uint8Array(W * H);
  const clusters = [];
  for (let y = y0; y < y1; y++) {
    for (let x = 60; x < W - 60; x++) {
      const idx = y * W + x;
      if (seen[idx] || label[idx] !== -1) continue;
      if (!isSky(D[idx * 4], D[idx * 4 + 1], D[idx * 4 + 2])) continue;
      const bq = [idx]; seen[idx] = 1;
      let n = 0, sx = 0, sy = 0, sxx = 0, minX = x, maxX = x, minY = y, maxY = y;
      while (bq.length) {
        const i2 = bq.pop(); n++;
        const x2 = i2 % W, y2 = (i2 - x2) / W;
        sx += D[i2 * 4]; sy += D[i2 * 4 + 1]; sxx += D[i2 * 4 + 2];
        if (x2 < minX) minX = x2; if (x2 > maxX) maxX = x2;
        if (y2 < minY) minY = y2; if (y2 > maxY) maxY = y2;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx2 = x2 + dx, ny2 = y2 + dy;
          if (nx2 < 0 || nx2 >= W || ny2 < 0 || ny2 >= H) continue;
          const ni2 = ny2 * W + nx2;
          if (!seen[ni2] && label[ni2] === -1 && isSky(D[ni2 * 4], D[ni2 * 4 + 1], D[ni2 * 4 + 2])) { seen[ni2] = 1; bq.push(ni2); }
        }
      }
      if (n < 20) continue; // AA specks (holecheck convention)
      const mean = [sx / n, sy / n, sxx / n];
      const exp = expectedSkyAtRow((minY + maxY) / 2 / H, pitchRad);
      const colorMatch = [0, 1, 2].every((i) => Math.abs(mean[i] - exp[i]) <= TOL);
      const cxm = (minX + maxX) / 2, cym = (minY + maxY) / 2;
      const inLantern = (meta.lanterns ?? []).some((rc) => inRect(cxm, cym, rc));
      // SILHOUETTE TEST: ray through the cluster center must hit the analytic
      // mountain surface for this to be a hole in the mountain BODY.
      const rayHitsMountain = (() => {
        if (!meta.pose) return true; // no pose -> cannot test; keep candidate
        const { pos, target } = meta.pose;
        const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
        const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
        const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        const fwd = norm(sub(target, pos));
        const right = norm(cross(fwd, [0, 1, 0]));
        const up = cross(right, fwd);
        const tanV = Math.tan((50 * Math.PI) / 360), tanH = tanV * (W / H);
        const ndcX = ((cxm / W) * 2 - 1) * tanH, ndcY = (1 - (cym / H) * 2) * tanV;
        const dir = norm([fwd[0] + right[0] * ndcX + up[0] * ndcY, fwd[1] + right[1] * ndcX + up[1] * ndcY, fwd[2] + right[2] * ndcX + up[2] * ndcY]);
        const flatLen = Math.hypot(dir[0], dir[2]);
        // Penetration test: the ray must pass DEEP under the analytic surface —
        // max depth over the whole march >= DEPTH_MIN. Rationale (measured
        // 2026-10-22): a real void exposes the bore (r 5.2u) or an interior
        // gap (>= several u of rock missing), while the massif's jagged
        // SILHOUETTE edge produces shallow grazing rays (measured max depth
        // 0.2-0.8u at the (1254,315) skyline sliver — within the ±0.9u
        // vertex-jitter scale of the rendered flank). 3.0u = half the bore
        // radius: far above jitter, far below any real void.
        const DEPTH_MIN = 3.0;
        let maxDepth = 0;
        for (let t = 6; t <= 300; t += 1.2) {
          const x = pos[0] + (dir[0] / flatLen) * t;
          const z = pos[2] + (dir[2] / flatLen) * t;
          const y = pos[1] + dir[1] * t;
          const depth = mountainHeight(x, z) - y;
          if (depth > maxDepth) maxDepth = depth;
        }
        return maxDepth >= DEPTH_MIN;
      })();
      const kind = !colorMatch ? 'non-sky-color (glow/cream)'
        : inRect(cxm, cym, meta.billboard) ? 'billboard'
        : inRect(cxm, cym, meta.mouth) ? 'bore-mouth view'
        : inLantern ? 'entrance lantern'
        : !rayHitsMountain ? 'sky outside massif silhouette'
        : 'UNEXPLAINED';
      clusters.push({ x: minX, y: minY, w: maxX - minX, h: maxY - minY, n, mean: mean.map((v) => Math.round(v)), kind });
    }
  }
  const unexplained = clusters.filter((c) => c.kind === 'UNEXPLAINED');
  return { pass: unexplained.length === 0, unexplained, clusters };
}

// ---- analytic mountain surface (EXACT mirror of MountainPassage.tsx
// crestHeight + buildMountainSurface's envelope/terrain base, as of commit
// 42454b9 — same "honest engineering" duplication convention as
// qa/silhouette-probe.mjs). Rendered vertex y = terrainHeight(x,z) +
// crestHeight(z,x) * h * env * jitter (mountainSurface.ts row builder),
// where env = edgeFloor + sin(π·t)^0.8 · (1−edgeFloor) with t the row's
// normalized z, edgeFloor 0.12 for the massif. The env + terrain base are
// NOT optional: without them the mirror overstates the flank by 3-4u at
// z≈90 (measured 2026-10-22: notch at (1254,315) misjudged as inside-rock).
export function mountainHeight(x, z) {
  const skew = (z0, h, sl, sr) => (zz) => h * (zz <= z0
    ? Math.exp(-((zz - z0) ** 2) / (2 * sl * sl))
    : Math.exp(-((zz - z0) ** 2) / (2 * sr * sr)));
  const pBrow = skew(97, 9, 8, 8);
  const pLeft = skew(120, 38, 10, 13);
  const pMain = skew(150, 52, 10, 13);
  const pRight = skew(178, 36, 14, 18);
  const ridgeNoise = (3.5 * Math.sin(z * 0.23 + 1.7) + 2.0 * Math.sin(z * 0.41 + 0.4)) * smoothstep(90, 104, z);
  const crestRaw = Math.max(0, Math.max(pBrow(z), pLeft(z), pMain(z), pRight(z)) + ridgeNoise);
  const PEAK_H = 52, HALF_W = 88, CORRIDOR_EDGE = 6.5, TUNNEL_Z0 = 100, TUNNEL_Z1 = 170, ROOF_CROWN = 6.2;
  // buildMountainSurface row envelope: zStart 58, zEnd 186, edgeFloor 0.12
  const Z_START = TUNNEL_Z0 - 42, Z_END = TUNNEL_Z1 + 16;
  const tt = (z - Z_START) / (Z_END - Z_START);
  const rawEnv = Math.sin(Math.PI * Math.min(1, Math.max(0.04, tt))) ** 0.8;
  const env = 0.12 + rawEnv * (1 - 0.12);
  const t = Math.min(1, Math.max(0, crestRaw / PEAK_H));
  const hw = HALF_W - (HALF_W - 30) * t;
  const cd = Math.abs(x - pathCenterX(z));
  const u = cd / hw;
  if (u >= 1) return terrainHeight(x, z);
  // corridor carve + flank (MountainPassage.tsx crestHeight, exact)
  let crestH;
  if (cd === 0) crestH = crestRaw;
  else {
    const fallAmt = 0.55 + 0.25 * smoothstep(150, 200, z);
    const spur = 1 + 0.35 * Math.sin(z * 0.19 + x * 0.16) + 0.2 * Math.sin(z * 0.37 - x * 0.31);
    const latFall = Math.min(1.15, (1 - fallAmt * Math.pow(u, 1.5)) * spur);
    const inTunnel = z >= TUNNEL_Z0 && z <= TUNNEL_Z1;
    if (inTunnel && cd < CORRIDOR_EDGE) crestH = ROOF_CROWN * (1 - cd / CORRIDOR_EDGE) ** 2;
    else if (!inTunnel && cd < CORRIDOR_EDGE) crestH = 0;
    else {
      const lift = 1 - Math.pow((cd - CORRIDOR_EDGE) / Math.max(1, CORRIDOR_EDGE * 2.2), 2);
      const flank = crestRaw * latFall * Math.min(1, Math.max(0, lift));
      const MOUTH_FLOOR = 18, EXIT_FLOOR = 26;
      const floorZ = MOUTH_FLOOR * smoothstep(84, 92, z) * (1 - smoothstep(103, 114, z));
      const floor = floorZ * Math.min(1, (cd - CORRIDOR_EDGE) / 2);
      const floorX = EXIT_FLOOR * smoothstep(158, 166, z) * (1 - smoothstep(174, 184, z));
      const floorExit = floorX * Math.min(1, (cd - CORRIDOR_EDGE) / 2);
      crestH = Math.max(flank, floor, floorExit);
    }
  }
  // RENDERED height = terrain base + crest * env (mountainSurface row y).
  // jitter (0.92..1.08) stays out: it is per-vertex noise, and the silhouette
  // test only needs the envelope bound.
  return terrainHeight(x, z) + crestH * env;
}

// ---- screen-space projection of scene-constant exclusion rects ----
function projectRect(pos, target, fovDeg, W, H, corners) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const fwd = norm(sub(target, pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * (W / H);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of corners) {
    const d = sub(p, pos);
    const zc = dot(d, fwd);
    if (zc <= 0.5) continue;
    const ndcX = dot(d, right) / (tanH * zc), ndcY = dot(d, up) / (tanV * zc);
    const px = (ndcX * 0.5 + 0.5) * W, py = (1 - (ndcY * 0.5 + 0.5)) * H;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  return [Math.max(0, x0), Math.max(0, y0), Math.min(W, x1), Math.min(H, y1)];
}

const POSES = [
  { label: 'frontal', out: OUT, pos: [0, 8, 60], target: [0, 12, 100] },
  { label: 'oblique', out: OUT.replace('.png', '-oblique.png'), pos: [-6, 8, 62], target: [0, 12, 99] },
];

export async function captureAndScan(page, pose, W, H) {
  await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [pose.pos, pose.target]);
  await page.waitForTimeout(1600);
  // VIEWPORT screenshot, NOT fullPage: the page extends below the canvas
  // (cloud-world-overlay DOM), and fullPage captured that — its cream UI text
  // at y>900 produced phantom "sky" clusters and broke the FOV↔pixel mapping
  // (the canvas is exactly the 1440x900 viewport).
  await page.screenshot({ path: pose.out });
  // Scene-derived exclusion rects (documented constants from MountainPassage.tsx):
  const mf = await page.evaluate(() => window.__cwMountFace ?? null);
  const margin = 24;
  let billboard = null, mouth = null;
  if (mf) {
    // Board (ProjectsBillboard.tsx): board 17u wide + frame beams to ±8.95u,
    // 12 cloud puffs at ±9.4u (top/bottom rows at ±3.1u, sides at 0) with
    // puff radius ~0.6 -> glowing extent ±10u x ±3.7u around board center.
    // Board center (signPos): (mf.x, mf.mountGround + 12, 88.5). +2u margin.
    const cx = mf.x, cy = mf.mountGround + 12, cz = 88.5, mx = 12, my = 5.7;
    billboard = projectRect(pose.pos, pose.target, 50, W, H, [
      [cx - mx, cy - my, cz], [cx + mx, cy - my, cz], [cx - mx, cy + my, cz], [cx + mx, cy + my, cz],
    ]);
    billboard = [billboard[0] - margin, billboard[1] - margin, billboard[2] + margin, billboard[3] + margin];
  }
  {
    // Entrance bore-mouth: opening center at z=100, r=10u (tube rim 7.3 + glow margin)
    const cx = pathCenterX(100), gy = terrainHeight(cx, 100), cz = 100, r = 10;
    mouth = projectRect(pose.pos, pose.target, 50, W, H, [
      [cx - r, gy + 3.2 - r, cz], [cx + r, gy + 3.2 - r, cz], [cx - r, gy + 3.2 + r, cz], [cx + r, gy + 3.2 + r, cz],
    ]);
    mouth = [mouth[0] - margin, mouth[1] - margin, mouth[2] + margin, mouth[3] + margin];
  }
  // Entrance lantern heads (MountainPassage.tsx section 9): z=92, cx(92)±4.6,
  // y = ground+3.35, sphere r=0.28 + post-top glow halo ≈ 1u. Fog wash can
  // smear them wider, so use r=2 rect around each head.
  const lanterns = [];
  {
    const lz = 92, lcx = pathCenterX(lz), lgy = terrainHeight(lcx, lz);
    for (const side of [-1, 1]) {
      const lx = lcx + side * 4.6, ly = lgy + 3.35, r = 2;
      const rc = projectRect(pose.pos, pose.target, 50, W, H, [
        [lx - r, ly - r, lz], [lx + r, ly - r, lz], [lx - r, ly + r, lz], [lx + r, ly + r, lz],
      ]);
      lanterns.push([rc[0] - margin, rc[1] - margin, rc[2] + margin, rc[3] + margin]);
    }
  }
  const png = PNG.sync.read(fs.readFileSync(pose.out));
  const pitch = Math.atan2(pose.target[1] - pose.pos[1], Math.hypot(pose.target[0] - pose.pos[0], pose.target[2] - pose.pos[2]));
  const res = scanSeethru(png, { billboard, mouth, lanterns, pose: { pos: pose.pos, target: pose.target } }, pitch);
  return { pose, billboard, mouth, lanterns, ...res };
}

// ---- main (skipped when imported by the self-test) ----
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(9000);
  let totalBad = 0;
  for (const pose of POSES) {
    const r = await captureAndScan(page, pose, 1440, 900);
    console.log(`${pose.label}: ${r.clusters.length} candidate cluster(s); billboard rect ${JSON.stringify(r.billboard?.map(Math.round))}, mouth rect ${JSON.stringify(r.mouth?.map(Math.round))}`);
    for (const c of r.clusters) console.log(`  [${c.kind}] at (${c.x},${c.y}) ${c.w}x${c.h} ~${c.n}px mean rgb(${c.mean.join(',')})`);
    totalBad += r.unexplained.length;
  }
  await browser.close();
  console.log(totalBad === 0 ? 'SEETHROUGH FULL SCAN (repaired): PASS — mountain opaque from both angles' : `SEETHROUGH FULL SCAN (repaired): FAIL — ${totalBad} unexplained cluster(s)`);
  console.log('CONSOLE ERRORS:', JSON.stringify(errors));
  console.log('done');
}
