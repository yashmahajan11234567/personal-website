/** Stage 2 diagnostic: measure camera+avatar positions inside the bore at the
 * moment of the solid-rock frame, then pin a camera straight down the bore. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-newreq';

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(
  () => {
    const c = document.querySelector('canvas');
    const gl = c?.getContext('webgl2') || c?.getContext('webgl');
    return gl && c.width > 0 && c.height > 0;
  },
  { timeout: 20000 },
);
await page.waitForTimeout(2500);

// Rotate to face +Z, walk to z ~130
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(500);
await page.keyboard.down('w');
let z = 0;
const t0 = Date.now();
while (z < 130 && Date.now() - t0 < 60000) {
  await page.waitForTimeout(1000);
  z = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h?.length ? h[h.length - 1].z : 0;
  });
}
await page.keyboard.up('w');
await page.waitForTimeout(800);

// What the player actually sees + the camera state at this moment
await page.screenshot({ path: `${OUT}/d1-what-player-sees.png` });
const state = await page.evaluate(() => {
  const cam = (window.__cwCamHist ?? []).slice(-4);
  const av = (window.__cwAvatarHist ?? []).slice(-4);
  return { cam, av };
});
console.log('camera hist (last 4):', JSON.stringify(state.cam, null, 1));
console.log('avatar hist (last 4):', JSON.stringify(state.av, null, 1));

// Pinned: straight down the bore from just inside the entrance
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 3.0, 103], target: [0, 2.5, 170] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/d2-pinned-down-bore.png` });

// Pinned: mid-bore looking at exit
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 3.0, 135], target: [0, 2.5, 172] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/d3-pinned-mid-to-exit.png` });
await page.evaluate(() => { window.__cwQaCam = undefined; });

await browser.close();
console.log('DONE');
