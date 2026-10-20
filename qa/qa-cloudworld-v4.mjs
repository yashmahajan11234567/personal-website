// Cloud World QA v4: trajectory-based measurement against production build.
// Usage: node qa/qa-cloudworld-v4.mjs [baseURL]
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5195/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-v2');

async function waitScene(page) {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () =>
      Array.isArray(window.__cwAvatarHist) &&
      window.__cwAvatarHist.length > 30 &&
      Array.isArray(window.__cwCloudHist) &&
      window.__cwCloudHist.length > 30,
    { timeout: 30000 },
  );
  await page.waitForTimeout(800);
}

async function clearHist(page) {
  await page.evaluate(() => {
    window.__cwAvatarHist.length = 0;
    window.__cwCloudHist.length = 0;
  });
}

async function readHist(page) {
  return page.evaluate(() => ({
    avatar: window.__cwAvatarHist.slice(),
    cloud: window.__cwCloudHist.slice(),
  }));
}

// Sum of |Δp| across samples within a wall-time window [t0, t1].
function pathLength(hist, t0, t1) {
  let dist = 0;
  let prev = null;
  for (const s of hist) {
    if (s.t < t0 || s.t > t1) continue;
    if (prev) dist += Math.hypot(s.x - prev.x, s.z - prev.z);
    prev = s;
  }
  return dist;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: process.env.HEADLESS === '0' ? false : true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${m.text().slice(0, 160)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 160)}`));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await waitScene(page);

  const results = { base: BASE, mode: process.env.HEADLESS === '0' ? 'headed' : 'headless' };

  // Real frame rate over the idle window (from trajectory sample spacing).
  const idle0 = await readHist(page);
  const idle0Last = idle0.avatar[idle0.avatar.length - 1];
  await clearHist(page);
  await page.waitForTimeout(10000);
  const idle1 = await readHist(page);
  const a0 = idle1.avatar[0];
  const a1 = idle1.avatar[idle1.avatar.length - 1];
  const idleSamples = idle1.avatar.length;
  const idleSpanS = (a1.t - a0.t) / 1000;
  results.fps = idleSamples > 1 && idleSpanS > 0 ? +(idleSamples / idleSpanS).toFixed(1) : null;

  // Idle drift over the whole 10s window.
  results.idle = {
    spanS: +idleSpanS.toFixed(2),
    samples: idleSamples,
    driftX: +(a1.x - a0.x).toFixed(4),
    driftY: +(a1.y - a0.y).toFixed(4),
    driftZ: +(a1.z - a0.z).toFixed(4),
  };

  // Cloud drift over the same window (no input).
  const c0 = idle1.cloud[0];
  const c1 = idle1.cloud[idle1.cloud.length - 1];
  const cloudSpanS = (c1.t - c0.t) / 1000;
  const cloudDx = c1.x - c0.x;
  results.cloudDrift = {
    spanS: +cloudSpanS.toFixed(2),
    dx: +cloudDx.toFixed(3),
    uPerS: +(cloudDx / cloudSpanS).toFixed(3),
    // note: wraps at x=140 → skip wrap frames when measuring: check monotonic.
    wrapped: cloudDx < 0,
  };

  // ---- Per-key movement (trajectory-based) ----
  results.movement = {};
  for (const key of ['w', 's', 'a', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    await clearHist(page);
    await page.keyboard.down(key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(key);
    const h = await readHist(page);
    const av = h.avatar;
    if (av.length < 2) { results.movement[key] = { error: 'no samples' }; continue; }
    const p0 = av[0];
    const p1 = av[av.length - 1];
    const span = (p1.t - p0.t) / 1000;
    // peak speed between consecutive samples
    let peak = 0;
    for (let i = 1; i < av.length; i++) {
      const dt = (av[i].t - av[i - 1].t) / 1000;
      if (dt <= 0) continue;
      peak = Math.max(peak, Math.hypot(av[i].x - av[i - 1].x, av[i].z - av[i - 1].z) / dt);
    }
    results.movement[key] = {
      spanS: +span.toFixed(2),
      dx: +(p1.x - p0.x).toFixed(3),
      dz: +(p1.z - p0.z).toFixed(3),
      avgSpeedUPerS: +(Math.hypot(p1.x - p0.x, p1.z - p0.z) / span).toFixed(2),
      peakSpeedUPerS: +peak.toFixed(2),
    };
  }

  // ---- Momentum decay (W 1s, release, then trajectory) ----
  await clearHist(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(1000);
  await page.keyboard.up('w');
  await page.waitForTimeout(1500);
  const dec = await readHist(page);
  const relT = dec.avatar.find((s) => s.t > 0)?.t; // find release approximately
  results.momentum = dec.avatar
    .filter((s) => s.t >= (dec.avatar[0].t + 1000))
    .slice(0, 12)
    .map((s) => ({ dt: +((s.t - dec.avatar[0].t) / 1000).toFixed(2), vx: +s.vx.toFixed(3), vz: +s.vz.toFixed(3) }));

  // ---- Mouse-look: avatar must NOT move; camera azimuth (from OrbitControls
  // internals) must change. Trajectory proves world doesn't move. ----
  await clearHist(page);
  await page.waitForTimeout(1500); // settle
  const preLook = (await readHist(page)).avatar;
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(970, 450, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const postLook = (await readHist(page)).avatar;
  const l0 = preLook[0] ?? { x: 0, z: 0 };
  const l1 = postLook[postLook.length - 1] ?? { x: 0, z: 0 };
  results.mouseLook = {
    avatarMoveDuringLook: +Math.hypot(l1.x - l0.x, l1.z - l0.z).toFixed(4),
    expectedZero: true,
  };

  // ---- Screenshots ----
  await clearHist(page);
  await page.screenshot({ path: path.join(OUT, '01-default.png') });
  await page.keyboard.down('w');
  await page.waitForTimeout(3500);
  await page.keyboard.up('w');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '02-mid-path.png') });
  await page.keyboard.down('w');
  await page.waitForTimeout(5000);
  await page.keyboard.up('w');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '03-passage-approach.png') });
  await page.keyboard.down('w');
  await page.waitForTimeout(9000);
  await page.keyboard.up('w');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '04-sunset-zone.png') });

  results.consoleIssues = logs;
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error('QA FAILED:', e.message);
  process.exit(1);
});
