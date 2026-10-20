/** Diagnose the Git-pin click: pin on Git sign, screenshot, then click
 * center and report which card opened + whether the ray hits Git first. */
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
await page.waitForTimeout(1200);

const gx = pathCenterX(16) - 11.5;
// Pin DEAD ON the Git sign from 10u (inside minDistance 12? use 13u)
await page.evaluate((s) => {
  window.__cwQaCam = { pos: [s.x + 0.3, s.by + 1.2, s.z - 13], target: [s.x, s.by, s.z] };
}, { x: gx, z: 16, by: 5.0 + (2.35 + 0.55) * 3.0 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/diag-git-pin.png` });

// Click center
await page.mouse.click(720, 450);
await page.waitForTimeout(250);
let c = await page.evaluate(() => document.querySelector('.cloud-card-title')?.textContent);
console.log('center click opened:', c);
if (c) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }

// Click slightly left/right to find Git's own screen area
for (const [dx, dy] of [[-120, 0], [120, 0], [-200, 60], [200, 60], [-80, -60], [80, -60], [-160, 120], [160, 120]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(150);
  const t = await page.evaluate(() => document.querySelector('.cloud-card-title')?.textContent);
  if (t) {
    console.log(`click(${dx},${dy}) opened:`, t);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
}

await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
