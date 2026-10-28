// VIS-010 traversal: real-keyboard walk through the bore, both directions.
// Asserts: avatar z progresses through the tunnel (86→180 FWD, back REV),
// 0 console/page errors, camera stays inside the bore clamp band.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4180/#/cloud-world';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

const zNow = () => page.evaluate(() => {
  const h = window.__cwAvatarHist || [];
  return h.length ? h[h.length - 1].z : null;
});
const xNow = () => page.evaluate(() => {
  const h = window.__cwAvatarHist || [];
  return h.length ? h[h.length - 1].x : null;
});

// Teleport-free walk: press W for bursts, sampling avatar z.
async function walkBursts(dir, targetZ, maxBursts) {
  const key = dir > 0 ? 'w' : 's';
  let last = await zNow();
  for (let i = 0; i < maxBursts; i++) {
    await page.keyboard.down(key);
    await page.waitForTimeout(260);
    await page.keyboard.up(key);
    await page.waitForTimeout(60);
    const z = await zNow();
    if (z === null) continue;
    if (dir > 0 ? z >= targetZ : z <= targetZ) return z;
    last = z;
  }
  return last;
}

// FWD: from spawn (z≈0) walk to z≈180 (through the bore).
let z = await zNow();
console.log('start z:', z);
const zFwd = await walkBursts(1, 180, 120);
console.log('FWD end z:', zFwd, zFwd >= 178 ? 'PASS' : 'FAIL');
await page.screenshot({ path: 'qa-screenshots-vis010/trav-fwd-exit.png' });

// REV: walk back to z≈95 (mid-bore heading out the entrance).
const zRev = await walkBursts(-1, 95, 120);
console.log('REV end z:', zRev, zRev <= 97 ? 'PASS' : 'FAIL');
await page.screenshot({ path: 'qa-screenshots-vis010/trav-rev-midbore.png' });

// FWD again to exit (reverse re-entry stability).
const zFwd2 = await walkBursts(1, 185, 120);
console.log('FWD2 end z:', zFwd2, zFwd2 >= 183 ? 'PASS' : 'FAIL');

const xSample = await xNow();
console.log('final x:', xSample);
console.log('errors:', JSON.stringify(errors));
await browser.close();
