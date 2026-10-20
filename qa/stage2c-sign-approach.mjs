/** Stage 2c: PROJECTS sign approach shot — walk to z≈72 and capture the sign
 * (z=88, left of path) in frame, then verify lanterns at the entrance. */
import { chromium } from 'playwright';

const OUT = 'qa-screenshots-stage2-newreq';
const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push({ t: m.type(), x: m.text() }));
page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));

await page.goto('http://localhost:4173/#/cloud-world');
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0;
}, { timeout: 20000 });
await page.waitForTimeout(2500);

// Face +Z
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(500);

await page.keyboard.down('w');
let z = 0;
const t0 = Date.now();
while (z < 74 && Date.now() - t0 < 40000) {
  await page.waitForTimeout(700);
  z = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h?.length ? h[h.length - 1].z : 0;
  });
}
await page.keyboard.up('w');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/09-projects-sign-approach.png` });
console.log('approach shot @avatar z', z);

const errs = logs.filter((l) => l.t === 'error');
console.log(`console: ${logs.length} msgs, ${errs.length} errors`);
await browser.close();
console.log('DONE');
