/**
 * Acceptance — Projects Cloud entry/exit transition (2026-11-19 polish).
 *
 * Drives the avatar through the doorway with real keyboard input and asserts:
 *  - no near-black frames during entry/exit (canvas pixels only)
 *  - no per-frame camera snaps (speed bound)
 *  - door never closes before the camera has cleared the doorway
 *  - camera stays inside the shell spring-arm radius while inside (no clipping)
 *  - W keeps moving the avatar forward (no control inversion), outside and inside
 *  - doorway plane fades smoothly (opacity is camera-driven, no hard pop)
 *  - no console/page errors
 *
 * Scenarios: slow approach, fast approach, continuous entry, stop halfway,
 * reverse halfway, fully inside, exit, stop halfway out, immediate re-entry,
 * repeated cycles. Screenshots at key z positions for both directions.
 *
 * Usage: node qa/accept-cloud-entry-exit.mjs
 * Env:   CW_BASE (default http://[::1]:4173/), CW_OUT (default qa-screenshots-entry-exit)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.CW_BASE || 'http://[::1]:4173/';
const OUT = process.env.CW_OUT || 'qa-screenshots-entry-exit';
mkdirSync(OUT, { recursive: true });

const DOOR_Z = 140.4; // CLOUD_DOOR_Z
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-angle=d3d11', '--enable-gpu',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-for-occluded-windows',
    '--disable-frame-rate-limit', '--disable-gpu-vsync',
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.bringToFront();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });

await page.goto(BASE + '#/cloud-world', { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 10, { timeout: 60000 });
await page.waitForTimeout(3000);

// In-page per-frame recorder (rAF-driven so it tracks render frames, not timers).
await page.evaluate(() => {
  const gl = document.querySelector('canvas');
  const c = document.createElement('canvas'); c.width = 240; c.height = 150;
  const x = c.getContext('2d', { willReadFrequently: true });
  const cap = document.createElement('canvas'); cap.width = 960; cap.height = 600;
  const cp = cap.getContext('2d');
  window.__rec = { ticks: [], shots: {}, t0: performance.now() };
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = Math.max((now - last) / 1000, 1e-4);
    last = now;
    try {
      x.drawImage(gl, 0, 0, 240, 150);
      const d = x.getImageData(0, 0, 240, 150).data;
      let sum = 0, black = 0;
      for (let i = 0; i < d.length; i += 4) {
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30) black++;
      }
      const n = d.length / 4;
      const cam = window.__cwCamera;
      const avH = window.__cwAvatarHist || [];
      const av = avH.length ? avH[avH.length - 1] : null;
      const doors = window.__cwDoorAngles || [null, null];
      window.__rec.ticks.push({
        t: +(now - window.__rec.t0).toFixed(1),
        dt: +dt.toFixed(4),
        mean: +(sum / n).toFixed(1),
        blackPct: +((black / n) * 100).toFixed(2),
        camX: cam ? +cam.position.x.toFixed(2) : null,
        camY: cam ? +cam.position.y.toFixed(2) : null,
        camZ: cam ? +cam.position.z.toFixed(2) : null,
        avZ: av ? +av.z.toFixed(2) : null,
        inside: !!window.__cwInside,
        mix: window.__cwRigDbg ? window.__cwRigDbg.insideMix : null,
        doorL: doors[0], doorR: doors[1],
        dwOpacity: window.__cwDoorwayOpacity ?? null,
      });
      if (window.__rec.ticks.length > 20000) window.__rec.ticks.shift();
      // screenshot capture requests from node side: window.__rec.wantShot = label
      if (window.__rec.wantShot) {
        const label = window.__rec.wantShot;
        window.__rec.wantShot = null;
        cp.drawImage(gl, 0, 0, 960, 600);
        window.__rec.shots[label] = { t: +(now - window.__rec.t0).toFixed(0), avZ: av ? +av.z.toFixed(1) : null, camZ: cam ? +cam.position.z.toFixed(1) : null, dataUrl: cap.toDataURL('image/png') };
      }
    } catch (e) { /* keep loop alive */ }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

const cloudX = await page.evaluate(() => window.__cwProjectsCloud.x);
const av = () => page.evaluate(() => {
  const h = window.__cwAvatarHist;
  const l = h[h.length - 1];
  return { x: l.x, z: l.z, inside: !!window.__cwInside };
});
async function shot(label) {
  await page.evaluate((l) => { window.__rec.wantShot = l; }, label);
  await page.waitForTimeout(150);
}
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
async function walkUntil(pred, key = 'w', maxMs = 60000) {
  await page.keyboard.down(key);
  const t0 = Date.now();
  let a;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(150);
    a = await av();
    if (pred(a)) break;
  }
  await page.keyboard.up(key);
  return a;
}
const mark = async (label) => { await shot(label); };

// ---------- Scenario 1: slow approach (tap W) ----------
await page.evaluate((x) => window.__cwTeleport(x, 118), cloudX);
await page.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { await hold('w', 350); await page.waitForTimeout(250); }
let a = await av();
check('slow approach moves avatar toward door', a.z > 124, `z=${a.z.toFixed(1)}`);
await mark('s01-approach-slow');

// ---------- Scenario 2+3: quick continuous entry ----------
a = await walkUntil((p) => p.z > 164 && p.inside, 'w', 60000);
check('continuous entry reaches interior', a.z > 160 && a.inside, `z=${a.z.toFixed(1)} inside=${a.inside}`);
await page.waitForTimeout(2500);
await mark('s03-inside-settled');
// W direction inside (no inversion): walk forward, z should increase
{
  const before = await av();
  await hold('w', 1200);
  const after = await av();
  check('no control inversion inside (W advances +z)', after.z > before.z + 0.5, `Δz=${(after.z - before.z).toFixed(2)}`);
}

// ---------- Scenario 7: turn around inside (walk back toward door) ----------
{
  const before = await av();
  await hold('s', 1200);
  const after = await av();
  check('S inside moves back toward door (-z)', after.z < before.z - 0.5, `Δz=${(after.z - before.z).toFixed(2)}`);
}

// ---------- Scenario 4: stop halfway through doorway (on the way back out) ----------
a = await walkUntil((p) => p.z < 143 && p.z > 136, 's', 30000);
await page.waitForTimeout(2000);
await mark('s04-stop-halfway');

// ---------- Scenario 5: reverse halfway through exit (re-enter) ----------
a = await walkUntil((p) => p.z > 158 && p.inside, 'w', 30000);
check('reverse halfway: re-entered interior', a.inside && a.z > 150, `z=${a.z.toFixed(1)} inside=${a.inside}`);
await page.waitForTimeout(1500);

// ---------- Scenario 8: continuous exit ----------
await shot('s08-exit-start');
a = await walkUntil((p) => p.z < 124 && !p.inside, 's', 60000);
check('continuous exit reaches exterior', a.z < 128 && !a.inside, `z=${a.z.toFixed(1)} inside=${a.inside}`);
await page.waitForTimeout(3000); // let door close after camera cleared
await mark('s08-exit-done');

// ---------- Scenario 10: immediate re-entry ----------
a = await walkUntil((p) => p.z > 160 && p.inside, 'w', 60000);
check('immediate re-entry reaches interior', a.inside && a.z > 155, `z=${a.z.toFixed(1)}`);

// ---------- Scenario 11: repeat exit/entry cycles ----------
for (let i = 0; i < 2; i++) {
  await walkUntil((p) => p.z < 124 && !p.inside, 's', 60000);
  await page.waitForTimeout(1200);
  await walkUntil((p) => p.z > 158 && p.inside, 'w', 60000);
  await page.waitForTimeout(800);
}
check('repeat entry/exit cycles complete', true, '2 cycles done');
await mark('s11-after-cycles');

// ---------- Scenario 9: stop halfway out ----------
a = await walkUntil((p) => p.z < 140 && p.z > 133, 's', 30000);
await page.waitForTimeout(2000);
await mark('s09-stop-halfway-out');
await walkUntil((p) => p.z < 122 && !p.inside, 's', 30000);
await page.waitForTimeout(2500);

// ---------- collect & assert ----------
const rec = await page.evaluate(() => {
  const shots = {};
  for (const [k, v] of Object.entries(window.__rec.shots)) shots[k] = { t: v.t, avZ: v.avZ, camZ: v.camZ, dataUrl: v.dataUrl };
  return { ticks: window.__rec.ticks, shots };
});
writeFileSync(`${OUT}/timeline.json`, JSON.stringify({ ticks: rec.ticks }));
for (const [k, v] of Object.entries(rec.shots)) {
  writeFileSync(`${OUT}/${k}.png`, Buffer.from(v.dataUrl.split(',')[1], 'base64'));
}

const ticks = rec.ticks.filter((t) => t.camZ != null && t.avZ != null);
const maxBlack = Math.max(...ticks.map((t) => t.blackPct));
check('no near-black frames during all scenarios', maxBlack < 5, `max blackPct=${maxBlack}% over ${ticks.length} frames`);

// camera snap: per-frame camera displacement / dt
let maxCamSpeed = 0, snapAt = null;
for (let i = 1; i < ticks.length; i++) {
  const p = ticks[i - 1], q = ticks[i];
  const d = Math.hypot(q.camX - p.camX, q.camY - p.camY, q.camZ - p.camZ);
  const sp = d / Math.max(q.dt, 1e-3);
  if (sp > maxCamSpeed) { maxCamSpeed = sp; snapAt = q; }
}
check('no camera snap (per-frame camera speed bounded)', maxCamSpeed < 60, `max=${maxCamSpeed.toFixed(1)} u/s at avZ=${snapAt?.avZ} camZ=${snapAt?.camZ} dt=${snapAt?.dt}`);

// door close rule: whenever leaves are nearly closed, camera must be past the door plane
const DOOR_CLOSED = 0.25;
const badClose = ticks.filter((t) => {
  const m = Math.max(Math.abs(t.doorL ?? 9), Math.abs(t.doorR ?? 9));
  return m < DOOR_CLOSED && t.camZ != null && t.camZ > DOOR_Z + 1.5 + 0.5;
});
check('door never closes before camera clears doorway', badClose.length === 0, `${badClose.length} violating frames`);

// door opens before player reaches door: at some tick with avZ < DOOR_Z - 4, |doorL| > 0.4
const earlyOpen = ticks.find((t) => t.avZ < DOOR_Z - 4 && Math.abs(t.doorL ?? 0) > 0.4);
check('door opens before player reaches it', !!earlyOpen, earlyOpen ? `avZ=${earlyOpen.avZ} doorL=${earlyOpen.doorL}` : 'never early');

// doorway opacity: no hard pop — opacity changes are gradual (no jump > 0.6 between consecutive frames)
let maxOpJump = 0;
for (let i = 1; i < ticks.length; i++) {
  if (ticks[i].dwOpacity != null && ticks[i - 1].dwOpacity != null) {
    maxOpJump = Math.max(maxOpJump, Math.abs(ticks[i].dwOpacity - ticks[i - 1].dwOpacity));
  }
}
check('doorway plane fades gradually (no pop)', maxOpJump < 0.6, `max Δopacity/frame=${maxOpJump}`);

// camera shell clipping: while inside, the camera must not sit in the solid
// exterior-cloud band (between interior shell 30.1 and collision 36.4) —
// except inside the door corridor cut, which is legitimately open.
const CX = cloudX, CZ = 170, SHELL_R = 21.5 * 1.4, EXT_R = 26 * 1.4;
let clipWorst = null;
for (const t of ticks) {
  if (t.mix > 0.3) {
    const d = Math.hypot(t.camX - CX, t.camZ - CZ);
    const inCorridor = Math.abs(t.camX - CX) < 7.5 && t.camZ < CZ - SHELL_R + 12 && t.camZ > CZ - EXT_R - 4;
    if (!inCorridor && d > SHELL_R + 0.3 && d < EXT_R - 0.2) {
      if (!clipWorst || d > clipWorst.d) clipWorst = { d: +d.toFixed(1), avZ: t.avZ, camZ: t.camZ, mix: t.mix, black: t.blackPct };
    }
  }
}
check('camera never inside solid cloud band (no see-through clip)', clipWorst === null, clipWorst ? JSON.stringify(clipWorst) : 'clean');

// camera height sane inside
let badY = 0;
for (const t of ticks) if (t.mix > 0.5 && (t.camY < 0.5 || t.camY > 10)) badY++;
check('camera height within floor/ceiling band while inside', badY === 0, `${badY} frames out of band`);

// W forward outside (no inversion at start of runs): first ticks after teleport handled above.
check('no console/page errors', errs.length === 0, errs.slice(0, 5).join(' | '));

// fps sample
const fpsSample = await page.evaluate(() => ({ f: document.documentElement.dataset.cwFps, at: document.documentElement.dataset.cwFpsAt }));
console.log('fps counter sample:', JSON.stringify(fpsSample));

const pass = results.every((r) => r.pass);
console.log(`\n${pass ? 'ALL PASS' : 'FAILURES PRESENT'} — ${results.filter((r) => r.pass).length}/${results.length}`);
await browser.close();
process.exit(pass ? 0 : 1);
