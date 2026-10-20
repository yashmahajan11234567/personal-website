/** Right-half crops from path z 66/68/70 to see the ansible sign in its
 * readable window (billboard abeam). */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-fix';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

for (const camZ of [66, 68, 70, 72]) {
  await page.evaluate((camZ) => {
    function pathCX(z) {
      const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
      return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
    }
    window.__cwQaCam = { pos: [pathCX(camZ), 7.5, camZ], target: [pathCX(camZ + 10), 5, camZ + 10] };
  }, camZ);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/win-z${camZ}.png` });
  console.log(`z=${camZ}`);
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(300);
}
await browser.close();
console.log('DONE');
