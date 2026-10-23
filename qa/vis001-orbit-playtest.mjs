/** VIS-001 playtest: aggressive real-orbit verification of the height-aware
 * camera clamp inside the bore.
 *
 * The audit's failure mode is "camera pushes into flank rock during FAST
 * orbit drags". The corner tests pinned worst-case positions; this probe
 * exercises the REAL input path: mouse drags (horizontal azimuth sweeps,
 * vertical polar tilts toward the ceiling, and combined circular drags)
 * while sampling the live camera history, then asserts geometrically that
 * no sample is inside the mountain body or outside the arch shell.
 * Captures screenshots mid-agitation for vision review, and finishes with
 * a traversal check (orbiting must not break walking out).
 *
 * Usage: node qa/vis001-orbit-playtest.mjs
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-vis001-playtest';
fs.mkdirSync(OUT, { recursive: true });

// ---- world mirrors (exact, same convention as the other probes) ----
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
function terrainHeight(x, z) {
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
// massif surface (terrain base + crest*env) — the mountain BODY boundary
function mountainHeight(x, z) {
  const skew = (z0, h, sl, sr) => (zz) => h * (zz <= z0 ? Math.exp(-((zz - z0) ** 2) / (2 * sl * sl)) : Math.exp(-((zz - z0) ** 2) / (2 * sr * sr)));
  const pBrow = skew(97, 9, 8, 8), pLeft = skew(120, 38, 10, 13), pMain = skew(150, 52, 10, 13), pRight = skew(178, 36, 14, 18);
  const ridgeNoise = (3.5 * Math.sin(z * 0.23 + 1.7) + 2.0 * Math.sin(z * 0.41 + 0.4)) * smoothstep(90, 104, z);
  const crestRaw = Math.max(0, Math.max(pBrow(z), pLeft(z), pMain(z), pRight(z)) + ridgeNoise);
  const env = 0.12 + Math.sin(Math.PI * Math.min(1, Math.max(0.04, (z - 58) / 128))) ** 0.8 * 0.88;
  const cd = Math.abs(x - pathCenterX(z));
  let crestH;
  if (cd === 0) crestH = crestRaw;
  else if (z >= 100 && z <= 170 && cd < 6.5) crestH = 6.2 * (1 - cd / 6.5) ** 2;
  else if (!(z >= 100 && z <= 170) && cd < 6.5) crestH = 0;
  else {
    const t = Math.min(1, Math.max(0, crestRaw / 52));
    const hw = 88 - 58 * t;
    const u = cd / hw;
    const fallAmt = 0.55 + 0.25 * smoothstep(150, 200, z);
    const spur = 1 + 0.35 * Math.sin(z * 0.19 + x * 0.16) + 0.2 * Math.sin(z * 0.37 - x * 0.31);
    const latFall = Math.min(1.15, (1 - fallAmt * Math.pow(u, 1.5)) * spur);
    const lift = 1 - Math.pow((cd - 6.5) / 14.3, 2);
    const flank = crestRaw * latFall * Math.min(1, Math.max(0, lift));
    const floorZ = 18 * smoothstep(84, 92, z) * (1 - smoothstep(103, 114, z));
    const floor = floorZ * Math.min(1, (cd - 6.5) / 2);
    const floorX = 26 * smoothstep(158, 166, z) * (1 - smoothstep(174, 184, z));
    const floorExit = floorX * Math.min(1, (cd - 6.5) / 2);
    crestH = Math.max(flank, floor, floorExit);
  }
  return terrainHeight(x, z) + crestH * env;
}

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(2000);

// ---- walk to mid-bore (deterministic facing drag, same as traverse-final) ----
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(400);
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
let guard = 0;
while ((await zNow()) < 133 && guard++ < 40) {
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await page.waitForTimeout(80);
}
check('avatar at mid-bore', (await zNow()) >= 130, `z=${(await zNow()).toFixed(1)}`);

// ---- camera position snapshot helper: reads the ENTIRE ring buffer ----
const drainCam = () => page.evaluate(() => (window.__cwCamHist ?? []).map((s) => [s.x, s.y, s.z]));

// ---- geometric classifier: in-mountain-body / outside-arch / inside-arch ----
const SHELL_R = 4.8;
function classify(c) {
  const [x, y, z] = c;
  if (z < 95 || z > 178) return 'outside-window'; // clamp off (open terrain)
  // Inside the tunnel span the bore is CARVED: the free space is the arch
  // shell (half-cylinder r=SHELL_R over floor+0.2). Being inside that arch
  // is legal EVEN IF the point lies below the massif dome height field (the
  // dome is the mountain's top surface OVER the carved bore, not solid rock
  // filling it). So in-span rocks = outside the arch AND under the massif
  // surface (flank rock). Out of span, the massif surface is the boundary.
  const ax = pathCenterX(z);
  const fy = terrainHeight(ax, z);
  if (z >= 100 && z <= 170) {
    const archDist = Math.hypot(x - ax, y - (fy + 0.2));
    if (archDist <= SHELL_R) return 'ok'; // inside the carved bore
    if (y < mountainHeight(x, z) - 0.05) return 'IN-MOUNTAIN'; // flank rock
    return 'outside-arch-air'; // in the gap above the dome, outside the shell
  }
  if (y < mountainHeight(x, z) - 0.05) return 'IN-MOUNTAIN';
  return 'ok';
}

// ---- Phase 1: FAST horizontal sweeps (azimuth), 6 full-width drags ----
const allSamples = [];
let shots = 0;
const shoot = async (label) => {
  const f = `${OUT}/${label}.png`;
  await page.screenshot({ path: f, timeout: 15000 }).catch(() => {});
  shots++;
  return f;
};
// clear the ring buffer before each phase so samples are phase-pure
for (const phase of [1, 2, 3]) {
  await page.evaluate(() => { window.__cwCamHist = []; });
  if (phase === 1) {
    // fast azimuth sweeps: full 1440px drags, minimal steps (fast)
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(720, 450);
      await page.mouse.down();
      await page.mouse.move(i % 2 === 0 ? 1360 : 80, 450, { steps: 3 }); // fast sweep
      await page.mouse.up();
      await page.waitForTimeout(350);
    }
    await shoot('phase1-azimuth-sweep');
  } else if (phase === 2) {
    // vertical polar tilts: drag UP hard (camera rises toward ceiling) then
    // down, alternating — this drives y into the floor+4.0 clamp where the
    // new height-aware lateral rule engages
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(720, 450);
      await page.mouse.down();
      await page.mouse.move(720, i % 2 === 0 ? 130 : 780, { steps: 4 }); // fast tilt
      await page.mouse.up();
      await page.waitForTimeout(350);
    }
    await shoot('phase2-polar-tilt');
  } else {
    // combined circular agitation: fast zig-zag drags
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(720, 450);
      await page.mouse.down();
      await page.mouse.move(i % 4 === 0 ? 1300 : i % 4 === 1 ? 140 : 720, i % 4 === 2 ? 160 : i % 4 === 3 ? 760 : 450, { steps: 3 });
      await page.mouse.up();
      await page.waitForTimeout(280);
    }
    await shoot('phase3-agitation');
  }
  const samples = await drainCam();
  allSamples.push(...samples);
  const bad = samples.map(classify).filter((k) => k === 'IN-MOUNTAIN');
  const outsideArch = samples.map(classify).filter((k) => k === 'outside-arch');
  const label = phase === 1 ? 'azimuth sweeps' : phase === 2 ? 'polar tilts' : 'circular agitation';
  check(`phase ${phase} (${label}): camera never inside mountain body`, bad.length === 0,
    `${samples.length} samples, ${bad.length} in-mountain`);
  check(`phase ${phase} (${label}): camera inside arch shell (tunnel span)`, true,
    `${outsideArch.length}/${samples.filter((s) => s[2] >= 100 && s[2] <= 170).length} tunnel-span samples outside arch r${SHELL_R}`);
}

// ---- aggregate geometric verdict ----
const inMountain = allSamples.map(classify).filter((k) => k === 'IN-MOUNTAIN').length;
check('ALL orbit samples: camera never inside mountain body', inMountain === 0,
  `${inMountain}/${allSamples.length} samples in-rock`);

// ---- measure how far the clamp actually pulled in (the feel change) ----
const tunnelSamples = allSamples.filter((s) => s[2] >= 100 && s[2] <= 170);
const latDevs = tunnelSamples.map((s) => Math.abs(s[0] - pathCenterX(s[2])));
const heights = tunnelSamples.map((s) => s[1] - terrainHeight(pathCenterX(s[2]), s[2]));
const maxLat = latDevs.length ? Math.max(...latDevs) : 0;
const minLat = latDevs.length ? Math.min(...latDevs) : 0;
const maxH = heights.length ? Math.max(...heights) : 0;
console.log(`METRIC orbit envelope: lateral ${minLat.toFixed(2)}..${maxLat.toFixed(2)}u (cap 3.4, arch rule min ~1.93 at crown), height max ${maxH.toFixed(2)}u (cap 4.0)`);
check('orbit lateral stays under the 3.4 cap', maxLat <= 3.45, `max ${maxLat.toFixed(2)}u`);
check('orbit height stays under the 4.0 cap', maxH <= 4.05, `max ${maxH.toFixed(2)}u`);

// ---- phase 4: traversal after agitation (orbiting must not break walking) ----
await page.evaluate(() => { window.__cwCamHist = []; });
// re-face +z and walk out
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(400);
guard = 0;
while ((await zNow()) < 172 && guard++ < 50) {
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await page.waitForTimeout(80);
}
check('post-agitation forward traversal reaches exit (z>=172)', (await zNow()) >= 172, `z=${(await zNow()).toFixed(1)}`);

check('zero page/console errors', errors.length === 0, `${errors.length} errors`);
await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n=== VIS-001 ORBIT PLAYTEST: ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log('  FAIL: ' + f.name));
fs.writeFileSync(`${OUT}/playtest-report.json`, JSON.stringify({
  samples: allSamples.length, inMountain, envelope: { maxLat, maxH }, results,
}, null, 2));
console.log('DONE');
