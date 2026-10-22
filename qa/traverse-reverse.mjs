/** VIS-006 reverse-traversal probe: walks the bore FORWARD (spawn → exit) and
 * REVERSE (exit → entrance), captures pinned A/B screenshots facing EACH mouth
 * from mid-bore (the exact t=43.5s "jagged barrier" scenario), exterior
 * approach + mouth-close shots, and asserts:
 *   - avatar reaches z>=172 forward and z<=104 reverse (traversable both ways)
 *   - path-lock holds inside the canyon (|x - pathCenterX| small)
 *   - 0 page/console errors
 * Emits a rock-palette pixel metric over the mouth-opening window for each
 * mid-bore shot, so before/after removal of the surround band is objective.
 * Usage: node qa/traverse-reverse.mjs [label]   (label prefixes the OUT dir)
 */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const LABEL = process.argv[2] || 'run';
const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = path.join(process.cwd(), `qa-screenshots-vis006-${LABEL}`);

// --- world.ts mirrors (pure functions, same as other probes) ---
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [], consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 120)); });

fs.mkdirSync(OUT, { recursive: true });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(2500);

// face +Z before walking (same drag as traverse-final)
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(500);

const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
const xNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.x ?? 0);
const pin = (p, t) => page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [p, t]);
const unpin = () => page.evaluate(() => { window.__cwQaCam = undefined; });

// ---------- FORWARD: spawn → exit ----------
// Deterministic facing from the start: pin the QA camera behind the avatar
// looking +Z (controls.update() re-derives azimuth from the pinned pose).
await pin([await xNow(), 6, (await zNow()) + 12], [await xNow(), 2, (await zNow()) + 20]);
await page.waitForTimeout(400);
let pathLockMax = 0;
const lockSamples = [];
let bursts = 0;
while ((await zNow()) < 172 && bursts < 70) {
  await page.keyboard.down('w');
  await page.waitForTimeout(750);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  bursts++;
  const z = await zNow();
  const x = await xNow();
  // BORE PROPER only (z 105..175): the avatar legitimately enters the canyon
  // ~3u off-centerline (spawn offset) and the path-lock lerp pulls it in over
  // the entry funnel — traverse-final measures 0.29u on this same span.
  if (z > 105 && z < 175) lockSamples.push(Math.abs(x - pathCenterX(z)));
  await pin([x, 6, z + 12], [x, 2, z + 20]);
}
check('forward traversal reaches exit (z>=172)', (await zNow()) >= 172, `z=${(await zNow()).toFixed(1)}`);
if (lockSamples.length) {
  pathLockMax = Math.max(...lockSamples);
  // 1.5u: burst-walk harness samples right after key release, where damping
  // + canyon lerp easing add ~0.4u over the 0.29u continuous-hold measurement
  // (traverse-final). Same rationale as the 1.0u suite tolerance.
  check('path-lock forward (canyon)', pathLockMax < 1.5, `max dev ${pathLockMax.toFixed(2)}u over ${lockSamples.length} samples`);
}

// mid-bore facing EXIT (pinned) — reverse of the t=43.5s view
const cx135 = pathCenterX(135);
await pin([cx135, 3.2, 132.5], [pathCenterX(171), 2.0, 171]);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/mid-facing-exit.png` });

// mid-bore facing ENTRANCE (pinned) — the exact barrier scenario
await pin([cx135, 3.2, 137.5], [pathCenterX(99), 2.0, 99]);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/mid-facing-entrance.png` });

// natural (unpinned) mid-bore shot while standing still
await unpin();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/mid-natural.png` });

// exterior regression shots: approach + mouth close
await pin([0, 6.5, 44], [0, 6, 100]);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/exterior-approach.png` });
await pin([pathCenterX(88), 4.5, 88], [pathCenterX(99), 3.5, 99]);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/exterior-mouth-close.png` });
await unpin();

// ---------- REVERSE: exit → entrance ----------
// Deterministic facing: pin the QA camera BEHIND the avatar looking -Z.
// controls.update() re-derives azimuth from the pinned pose (CameraTargetRig
// comment documents this), so W walks -Z without relying on drag physics.
await pin([await xNow(), 6, (await zNow()) - 12], [await xNow(), 2, (await zNow()) - 20]);
await page.waitForTimeout(400);
const revLock = [];
bursts = 0;
while ((await zNow()) > 104 && bursts < 70) {
  await page.keyboard.down('w');
  await page.waitForTimeout(750);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  bursts++;
  const z = await zNow();
  const x = await xNow();
  if (z > 95 && z < 178) revLock.push(Math.abs(x - pathCenterX(z)));
  // re-pin the camera behind the avatar so the pin keeps tracking the walk
  await pin([x, 6, z - 12], [x, 2, z - 20]);
}
await unpin();
check('reverse traversal reaches entrance (z<=104)', (await zNow()) <= 104, `z=${(await zNow()).toFixed(1)}`);
if (revLock.length) {
  const revMax = Math.max(...revLock);
  check('path-lock reverse (canyon)', revMax < 1.5, `max dev ${revMax.toFixed(2)}u over ${revLock.length} samples`);
}

// ---------- pixel metric: rock-palette fraction in the mouth-opening window ----------
function mouthWindowMetric(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const W = png.width, H = png.height, D = png.data;
  // window: central 50% width, lower-middle band where the collar crossed
  const x0 = Math.floor(W * 0.25), x1 = Math.floor(W * 0.75);
  const y0 = Math.floor(H * 0.50), y1 = Math.floor(H * 0.85);
  let rock = 0, tot = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * W + x) * 4;
      const r = D[i], g = D[i + 1], b = D[i + 2];
      tot++;
      // warm rock family (bakeSandstone lo/mid/hi + lit variants)
      if (r > 110 && r < 240 && r > g + 16 && g > b + 6 && g < r * 0.82) rock++;
    }
  }
  return { rock: (100 * rock) / tot, tot };
}
for (const f of ['mid-facing-entrance.png', 'mid-facing-exit.png']) {
  const m = mouthWindowMetric(`${OUT}/${f}`);
  console.log(`METRIC ${LABEL} ${f}: rockPalette=${m.rock.toFixed(2)}% of window (${m.tot} samples)`);
}

const errs = pageErrors.length + consoleErrors.length;
check('zero page/console errors', errs === 0, `${pageErrors.length} page, ${consoleErrors.length} console`);
const fails = results.filter((r) => !r.pass);
console.log(`\n=== REVERSE TRAVERSAL (${LABEL}): ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
await browser.close();
console.log('DONE');
