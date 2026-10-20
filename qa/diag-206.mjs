/** Diag: pin on the 206R sign, save one shot per sweep height. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage1-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

const x = pathCenterX(206) + 13, z = 206;
const yaw = Math.PI + 0.42;
const nx = Math.sin(yaw), nz = Math.cos(yaw);
for (const ty of [6, 8, 10.4, 12.5]) {
  const camPos = [x + nx * 12, ty + 1.2, z + nz * 12];
  await page.evaluate(({ pos, tx, ty, tz }) => {
    window.__cwQaCam = { pos, target: [tx, ty, tz] };
  }, { pos: camPos, tx: x, ty, tz: z });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/_diag206-${ty}.png` });
}
console.log('saved 4 sweep shots for 206R');
await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
