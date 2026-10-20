/** PROJECTS sign shots v2 — correct coords: sign at (pathCenterX(88)-11.5,
 * 88) = (-12.73, 88), board center y ≈ 11.5 (gy 1.64 + (2.35+0.55)*3.4). */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-fix';

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

const sx = pathCenterX(88) - 11.5; // -12.73
const by = 11.5;
const shots = [
  [1, [0, 13, 66], 12],   // wide vista + sign
  [2, [-4, 12, 72], 12],  // closer
  [3, [-8, 11.5, 78], 12],// near approach
];
for (const [i, pos] of shots) {
  await page.evaluate(({ pos, sx, by }) => {
    window.__cwQaCam = { pos, target: [sx, by, 88] };
  }, { pos, sx, by });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/proj2-${i}.png` });
  console.log(`saved proj2-${i} from z=${pos[2]}`);
}
await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
