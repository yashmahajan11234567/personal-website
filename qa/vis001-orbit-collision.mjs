
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-vis001-orbit';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(2000);

// walk to mid-bore
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(400);
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
while ((await zNow()) < 133) {
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await page.waitForTimeout(80);
}
console.log('avatar z:', await zNow());

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
// massif mirror (env + terrain base) — same as the seethru probe
function mountainHeight(x, z) {
  const skew = (z0, h, sl, sr) => (zz) => h * (zz <= z0 ? Math.exp(-((zz - z0) ** 2) / (2 * sl * sl)) : Math.exp(-((zz - z0) ** 2) / (2 * sr * sr)));
  const pBrow = skew(97, 9, 8, 8), pLeft = skew(120, 38, 10, 13), pMain = skew(150, 52, 10, 13), pRight = skew(178, 36, 14, 18);
  const ridgeNoise = (3.5 * Math.sin(z * 0.23 + 1.7) + 2.0 * Math.sin(z * 0.41 + 0.4)) * smoothstep(90, 104, z);
  const crestRaw = Math.max(0, Math.max(pBrow(z), pLeft(z), pMain(z), pRight(z)) + ridgeNoise);
  const Z_START = 58, Z_END = 186;
  const tt = (z - Z_START) / (Z_END - Z_START);
  const env = 0.12 + Math.sin(Math.PI * Math.min(1, Math.max(0.04, tt))) ** 0.8 * 0.88;
  const cd = Math.abs(x - pathCenterX(z));
  let crestH;
  if (cd === 0) crestH = crestRaw;
  else if (z >= 100 && z <= 170 && cd < 6.5) crestH = 6.2 * (1 - cd / 6.5) ** 2;
  else if (!(z >= 100 && z <= 170) && cd < 6.5) crestH = 0;
  else {
    const PEAK_H = 52, HALF_W = 88;
    const t = Math.min(1, Math.max(0, crestRaw / PEAK_H));
    const hw = HALF_W - (HALF_W - 30) * t;
    const u = cd / hw;
    const fallAmt = 0.55 + 0.25 * smoothstep(150, 200, z);
    const spur = 1 + 0.35 * Math.sin(z * 0.19 + x * 0.16) + 0.2 * Math.sin(z * 0.37 - x * 0.31);
    const latFall = Math.min(1.15, (1 - fallAmt * Math.pow(u, 1.5)) * spur);
    const lift = 1 - Math.pow((cd - 6.5) / Math.max(1, 14.3), 2);
    const flank = crestRaw * latFall * Math.min(1, Math.max(0, lift));
    const floorZ = 18 * smoothstep(84, 92, z) * (1 - smoothstep(103, 114, z));
    const floor = floorZ * Math.min(1, (cd - 6.5) / 2);
    const floorX = 26 * smoothstep(158, 166, z) * (1 - smoothstep(174, 184, z));
    const floorExit = floorX * Math.min(1, (cd - 6.5) / 2);
    crestH = Math.max(flank, floor, floorExit);
  }
  return terrainHeight(x, z) + crestH * env;
}

// orbit: 8 drags of 45deg each (rotateSpeed 0.5, drag 360px ≈ 3.1rad?? tune:
// full circle = drag 720px at 0.5 speed). Do 16 drags of 90px + sample.
let inRockCount = 0, samples = 0, worst = null;
const shots = [];
for (let step = 0; step < 24; step++) {
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(810, 450, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(420);
  const cam = await page.evaluate(() => window.__cwCamHist?.slice(-1)[0] ?? null);
  if (!cam) continue;
  samples++;
  const mh = mountainHeight(cam.x, cam.z);
  const inRock = cam.y < mh - 0.05; // strictly inside the mountain body
  if (inRock) {
    inRockCount++;
    if (!worst || (mh - cam.y) > worst.depth) worst = { depth: +(mh - cam.y).toFixed(2), cam, step };
  }
  if (step % 6 === 0) {
    const f = `${OUT}/orbit-step${String(step).padStart(2, '0')}.png`;
    await page.screenshot({ path: f });
    shots.push({ step, file: f, inRock, cam });
  }
  console.log(`step ${step}: cam=(${cam.x.toFixed(2)},${cam.y.toFixed(2)},${cam.z.toFixed(2)}) mountainTop=${mh.toFixed(2)} ${inRock ? 'IN-ROCK' : 'ok'}`);
}
console.log(`\nLIVE ORBIT: ${inRockCount}/${samples} samples in-rock`);
console.log('worst:', JSON.stringify(worst));
fs.writeFileSync(`${OUT}/orbit-report.json`, JSON.stringify({ inRockCount, samples, worst, shots }, null, 2));
await browser.close();
console.log('ORBIT TEST DONE');
