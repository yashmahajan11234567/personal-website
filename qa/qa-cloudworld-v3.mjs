// Cloud World QA v3: uses the DOM data-attribute instrumentation.
// Measures: idle stability, per-key movement deltas, momentum decay,
// camera azimuth on mouse-look, cloud drift over 10s, console errors.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5195/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-v2');

async function waitScene(page) {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(
    () => document.documentElement.dataset.cwAvatar !== undefined,
    { timeout: 25000 },
  );
  await page.waitForTimeout(1500);
}

async function avatar(page) {
  return page.evaluate(() => {
    const raw = document.documentElement.dataset.cwAvatar;
    const [pos, vel] = raw.split('|');
    const [x, y, z] = pos.split(',').map(Number);
    const [vx, vz] = vel.split(',').map(Number);
    return { x, y, z, vx, vz };
  });
}

async function cloudPos(page) {
  return page.evaluate(() => document.documentElement.dataset.cwCloud0 || null);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' ? true : false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 200)}`));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await waitScene(page);

  const results = {};

  // ---- Idle stability: 10s no input ----
  const idleStart = await avatar(page);
  await page.waitForTimeout(10000);
  const idleEnd = await avatar(page);
  results.idle = {
    start: idleStart,
    end: idleEnd,
    drift: {
      dx: +(idleEnd.x - idleStart.x).toFixed(3),
      dy: +(idleEnd.y - idleStart.y).toFixed(3),
      dz: +(idleEnd.z - idleStart.z).toFixed(3),
    },
  };

  // ---- Per-key movement: hold 1s, measure delta ----
  results.movement = {};
  for (const key of ['w', 's', 'a', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    const p0 = await avatar(page);
    await page.keyboard.down(key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(key);
    const p1 = await avatar(page);
    results.movement[key] = {
      dx: +(p1.x - p0.x).toFixed(3),
      dz: +(p1.z - p0.z).toFixed(3),
      dy: +(p1.y - p0.y).toFixed(3),
      speedUPerS: +Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2),
    };
  }

  // ---- Momentum decay: hold W 1s, release, sample every 200ms for 1.6s ----
  await page.keyboard.down('w');
  await page.waitForTimeout(1000);
  await page.keyboard.up('w');
  const decaySamples = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(200);
    const p = await avatar(page);
    decaySamples.push({ t: (i + 1) * 0.2, vx: p.vx, vz: p.vz });
  }
  results.momentumDecay = decaySamples;

  // ---- Mouse-look: camera azimuth must change, world must not ----
  // (wait for momentum to settle first so the measurement is clean)
  await page.waitForTimeout(2500);
  const beforeLook = await avatar(page);
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(970, 450, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const afterLook = await avatar(page);
  results.mouseLook = {
    avatarUnchanged: Math.hypot(afterLook.x - beforeLook.x, afterLook.z - beforeLook.z) < 0.01,
    avatarBefore: beforeLook,
    avatarAfter: afterLook,
  };

  // ---- Cloud drift: 10s, no input ----
  await page.waitForTimeout(500);
  const c0 = await cloudPos(page);
  await page.waitForTimeout(10000);
  const c1 = await cloudPos(page);
  results.cloudDrift = { at0: c0, at10: c1 };

  // ---- Screenshots ----
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
