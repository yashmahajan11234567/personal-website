/** PROJECTS sign shots from inside its verified FOV window (cam z 74-80). */
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

// Sign at (-7.73, 88), board center ≈ gy + 8.7 ≈ 6.9
for (const [i, camZ] of [[1, 74], [2, 68], [3, 62]].entries ? [[1, 74], [2, 68], [3, 62]] : []) {
  // noop
}
const shots = [[1, 76], [2, 70], [3, 64]];
for (const [i, camZ] of shots) {
  await page.evaluate((cz) => {
    window.__cwQaCam = { pos: [0, 10, cz], target: [-7.7, 6.9, 88] };
  }, camZ);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/proj-sign-${i}-from-z${camZ}.png` });
  console.log(`saved from z=${camZ}`);
}
await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
