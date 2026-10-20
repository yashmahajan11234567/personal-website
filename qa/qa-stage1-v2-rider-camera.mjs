// Stage 1 (v2 cycle): rider removed + camera follow distance.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-stage1-v2');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 10, { timeout: 60000 });
  await page.bringToFront();
  await page.waitForTimeout(2500);

  const getCamDist = () => page.evaluate(() => {
    const cam = window.__cwCamHist?.[window.__cwCamHist.length - 1];
    const h = window.__cwAvatarHist;
    const last = h?.[h.length - 1];
    if (!cam || !last) return null;
    const dx = cam.x - last.x;
    const dy = cam.y - (last.y + 1.8);
    const dz = cam.z - last.z;
    return { dist: +Math.hypot(dx, dy, dz).toFixed(2), vz: last.vz, z: +last.z.toFixed(2) };
  });

  const results = {};

  // 0. Idle 10s: no drift (camera must NOT be tugged while idle).
  const idle0 = await getCamDist();
  await page.waitForTimeout(10000);
  const idle1 = await getCamDist();
  const av0 = await page.evaluate(() => { const h = window.__cwAvatarHist; const a = h[h.length - 1], b = h[h.length - 601] || h[0]; return { dx: +(a.x - b.x).toFixed(4), dy: +(a.y - b.y).toFixed(4), dz: +(a.z - b.z).toFixed(4) }; });
  results.idle = { camDistBefore: idle0?.dist, camDistAfter: idle1?.dist, avatarDrift: av0 };

  // 1. Zoom out fully (wheel) then travel — distance must ease back to ~15.
  await page.mouse.move(720, 450);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(100); }
  await page.waitForTimeout(800);
  const zoomed = await getCamDist();
  await page.keyboard.down('w');
  // sample distance during travel
  const samples = [];
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(1000); const s = await getCamDist(); samples.push(s?.dist); }
  await page.keyboard.up('w');
  await page.waitForTimeout(1500);
  const settled = await getCamDist();
  results.camera = { zoomedOutDist: zoomed?.dist, duringTravel: samples, settledDist: settled?.dist };

  await page.screenshot({ path: path.join(OUT, 's1-travel.png') });

  // 2. Movement still works after changes
  const zBefore = (await getCamDist())?.z;
  await page.keyboard.down('w'); await page.waitForTimeout(3000); await page.keyboard.up('w');
  await page.waitForTimeout(800);
  const zAfter = (await getCamDist())?.z;
  results.movement = { zBefore, zAfter, moved: (zAfter - zBefore) > 2 };

  results.errors = errors;
  fs.writeFileSync(path.join(OUT, 'stage1-v2-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('QA FAILED:', e.message); process.exit(1); });
