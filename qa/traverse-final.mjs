/** Full tunnel traversal on the final build: walk the avatar from spawn
 * through the bore to the sunset zone with camera facing asserted every few
 * bursts; verify path-lock, lantern pulse never dark, no console errors. */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v10-recon';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(2500);

// face +Z (rotate orbit via drag)
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(500);

const marks = [
  { z: 105, name: 'walk-entering' },
  { z: 135, name: 'walk-inside' },
  { z: 172, name: 'walk-exiting' },
  { z: 210, name: 'walk-sunset' },
];
let idx = 0;
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
let bursts = 0;
while (idx < marks.length && bursts < 60) {
  await page.keyboard.down('w');
  await page.waitForTimeout(750);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  bursts++;
  const z = await zNow();
  if (z >= marks[idx].z) {
    await page.screenshot({ path: `${OUT}/${marks[idx].name}.png` });
    console.log(`${marks[idx].name} @z ${z.toFixed(1)}`);
    idx++;
  }
  if (bursts % 8 === 0) {
    // re-assert facing +Z (orbit drifts on long walks)
    await page.mouse.move(720, 450);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
}
const endZ = await zNow();

// path-lock inside the canyon
const lock = await page.evaluate(() => {
  const hist = window.__cwAvatarHist ?? [];
  let maxOff = 0, n = 0;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const pcx = (z) => { const c = ss(92, 108, z) * (1 - ss(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * c); };
  for (const h of hist) {
    if (h.z < 97 || h.z > 178) continue;
    const off = Math.abs(h.x - pcx(h.z));
    if (off > maxOff) maxOff = off;
    n++;
  }
  return { n, maxOff: +maxOff.toFixed(2) };
});

// lantern pulse sample (live material)
const pulse = await page.evaluate(async () => {
  const m = window.__cwLanternMat;
  if (!m) return { error: 'no lantern material' };
  const out = [];
  for (let i = 0; i < 12; i++) {
    out.push(+m.emissiveIntensity.toFixed(3));
    await new Promise((r) => setTimeout(r, 260));
  }
  return { min: Math.min(...out), max: Math.max(...out), n: out.length, samples: out };
});

// bore clearance audit vs rendered domes/boxes mirror
const bore = await page.evaluate(() => {
  const domes = window.__cwMountainDomes ?? [];
  function ss(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  const pcx = (z) => { const c = ss(92, 108, z) * (1 - ss(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * c); };
  // corridor AABB test against every placed box
  let blockers = 0, worst = 1e9;
  for (const b of domes) {
    for (let z = 98; z <= 172; z += 2) {
      const cx = pcx(z);
      for (const dx of [0, -4.4, 4.4]) for (const h of [0.5, 2.5, 4.5]) {
        const insideX = Math.abs(cx + dx - b.x) < b.sx + 1.64;
        const insideZ = Math.abs(z - b.z) < b.sz + 1.64;
        const insideY = h > b.y - b.sy - 1.64 && h < b.y + b.sy + 1.64;
        if (insideX && insideZ && insideY) { blockers++; worst = Math.min(worst, Math.hypot(cx + dx - b.x, z - b.z)); }
      }
    }
  }
  return { domes: domes.length, blockers, worst: +worst.toFixed(2) };
});

console.log(`avatar end z: ${endZ?.toFixed(1)}`);
console.log('canyon path-lock:', JSON.stringify(lock));
console.log('lantern pulse:', JSON.stringify(pulse));
console.log('bore audit:', JSON.stringify(bore));
console.log('errors:', JSON.stringify(errors.slice(0, 4)), `total ${errors.length}`);
await browser.close();
console.log('DONE');
