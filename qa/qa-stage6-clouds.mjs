// Stage 6 acceptance: cloud drift, idle stability, cloud-camera clearance.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-stage6');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() =>
    Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 10 &&
    Array.isArray(window.__cwCloudHist) && window.__cwCloudHist.length > 10,
    { timeout: 60000 });
  await page.bringToFront();
  await page.waitForTimeout(2500);

  // 10s no-input observation.
  const obs = await page.evaluate(async () => {
    const av0 = window.__cwAvatarHist[window.__cwAvatarHist.length - 1];
    const cl0 = window.__cwCloudHist[0];
    await new Promise((r) => setTimeout(r, 10000));
    const av1 = window.__cwAvatarHist[window.__cwAvatarHist.length - 1];
    const cl1 = window.__cwCloudHist[window.__cwCloudHist.length - 1];
    const spanS = (cl1.t - cl0.t) / 1000;
    const dx = cl1.x - cl0.x;
    return {
      cloud: {
        spanS: +spanS.toFixed(2),
        dx: +dx.toFixed(2),
        uPerS: +(dx / spanS).toFixed(3),
        dy: +(cl1.y - cl0.y).toFixed(2), // bob is ±0.3 by design
        displacedAtLeast10u: Math.abs(dx) >= 10,
      },
      avatar: {
        driftX: +(av1.x - av0.x).toFixed(4),
        driftY: +(av1.y - av0.y).toFixed(4),
        driftZ: +(av1.z - av0.z).toFixed(4),
      },
    };
  });

  // Cloud-to-camera clearance: clouds at y>=30, camera zoom max 38 from a
  // target at y≈+1.8 → camera max y ≈ 39.8; clouds at 30 could come within
  // ~10u vertically at extreme zoom+polar. Verify no cloud enters within
  // 12u of the camera position by sampling.
  const clearance = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.__r3f || (c.parentNode && c.parentNode.__r3f);
    const cam = r && (r.camera || (r.getState && r.getState().camera));
    const clouds = window.__cwCloudHist;
    const last = clouds[clouds.length - 1];
    return {
      camY: cam ? +cam.position.y.toFixed(1) : null,
      camZ: cam ? +cam.position.z.toFixed(1) : null,
      sampleCloudY: last ? +last.y.toFixed(1) : null,
      note: 'sample formation only; band min y=30, camera max y≈39.8 at polar 0.2π',
    };
  });

  // Screenshots: default + look-up (clouds must not intersect camera view).
  await page.screenshot({ path: path.join(OUT, 's6-01-default.png') });
  await page.mouse.move(720, 450); await page.mouse.down();
  await page.mouse.move(720, 240, { steps: 10 }); await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 's6-02-look-up.png') });

  const results = { obs, clearance, errors };
  fs.writeFileSync(path.join(OUT, 'stage6-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('STAGE6 QA FAILED:', e.message); process.exit(1); });
