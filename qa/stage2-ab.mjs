// Stage 2 A/B capture: pinned identical camera poses across two builds.
// Usage: node qa/stage2-ab.mjs <phase:before|after> [baseURL]
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PHASE = process.argv[2] || 'before';
const BASE = process.argv[3] || 'http://[::1]:4173/#/cloud-world';
const OUT = path.join(process.cwd(), `qa-screenshots-stage2-${PHASE}`);

// Pinned poses (identical for both phases). Flower clusters from
// qa/stage2-placements.json (computed offline from the deterministic rnd stream).
const POSES = [
  { name: '01-spawn-default', pos: [0, 7.5, -17], target: [0, 1.8, 0] },
  { name: '02-flowers-close-A', pos: [-2.4, 1.1, 28.9], target: [-2.4, 0.3, 31.4] },
  { name: '03-flowers-close-B', pos: [-1.0, 1.1, 44.3], target: [-1.0, 0.3, 46.8] },
  { name: '04-flowers-gameplay', pos: [-2.4, 6.0, 26.0], target: [-2.4, 0.5, 31.4] },
  { name: '05-pine-framing', pos: [-2.0, 4.5, -3.0], target: [-9.0, 3.5, -12.0] },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 120)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 10, { timeout: 60000 });
  await page.bringToFront();
  await page.waitForTimeout(2500);

  // Pin camera per pose; capture.
  for (const pose of POSES) {
    await page.evaluate((p) => { window.__cwQaCam = { pos: p.pos, target: p.target }; }, pose);
    await page.waitForTimeout(900); // let pose + AO converge
    await page.screenshot({ path: path.join(OUT, pose.name + '.png') });
  }
  // Unpin for gameplay measurements.
  await page.evaluate(() => { delete window.__cwQaCam; });
  await page.waitForTimeout(800);

  // Regression: draw calls / tris / fps.
  const perf = await page.evaluate(() => ({
    calls: document.documentElement.dataset.cwDrawCalls ? parseInt(document.documentElement.dataset.cwDrawCalls, 10) : null,
    tris: document.documentElement.dataset.cwTriangles ? parseInt(document.documentElement.dataset.cwTriangles, 10) : null,
  }));
  const fps = await page.evaluate(async () => {
    const h0 = window.__cwAvatarHist.length;
    await new Promise((r) => setTimeout(r, 4000));
    const h1 = window.__cwAvatarHist.length;
    return +((h1 - h0) / 4).toFixed(1);
  });

  // Movement smoke: W 3s → z advance (camera unpinned, follows normally).
  const z0 = await page.evaluate(() => { const h = window.__cwAvatarHist; return h[h.length - 1].z; });
  await page.keyboard.down('w');
  await page.waitForTimeout(3000);
  await page.keyboard.up('w');
  await page.waitForTimeout(600);
  const z1 = await page.evaluate(() => { const h = window.__cwAvatarHist; return h[h.length - 1].z; });

  // Idle drift 5s.
  const idle = await page.evaluate(async () => {
    const h = window.__cwAvatarHist; const a = h[h.length - 1];
    await new Promise((r) => setTimeout(r, 5000));
    const b = h[h.length - 1];
    return { dx: +(a.x - b.x).toFixed(4), dy: +(a.y - b.y).toFixed(4), dz: +(a.z - b.z).toFixed(4) };
  });

  const results = { phase: PHASE, perf, fps, movement: { z0: +z0.toFixed(2), z1: +z1.toFixed(2), advanced: +(z1 - z0).toFixed(2) }, idleDrift: idle, errors };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('STAGE2 A/B FAILED:', e.message); process.exit(1); });
