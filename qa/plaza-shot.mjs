/** Plaza arrival closeup: fresh run, single goal — walk to z≥241 and
 * capture the plaza (cobble ring + twin lanterns + heart rock). Mid-journey
 * screenshots already exist from journey-shots.mjs; this run skips them to
 * keep the burst budget for the final stretch. */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v10-recon';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
page.on('pageerror', (e) => errors.push(String(e).slice(0, 100)));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__cwAvatarHist?.length > 0, { timeout: 25000 });
await page.waitForTimeout(2500);

const faceForward = async () => {
  await page.mouse.move(720, 450);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);

await faceForward();
let z = 0;
let best = 0;
let bursts = 0;
let stuck = 0;
// 240u at ~4u/burst ≈ 60 bursts; give 100 for corrections.
while (best < 241 && bursts < 100) {
  bursts++;
  const prev = z;
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  z = await zNow();
  if (z > best) best = z;
  if (Math.abs(z - prev) < 0.2 || z < prev - 0.5) {
    stuck++;
    await faceForward();
    if (stuck > 3) {
      await page.mouse.move(720, 450);
      await page.mouse.down();
      for (let i = 1; i <= 4; i++) await page.mouse.move(720 - i * 25, 450, { steps: 2 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      await faceForward();
      stuck = 0;
    }
    continue;
  }
  stuck = 0;
  if (bursts % 3 === 0) await faceForward();
}
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/journey-plaza.png` });
console.log(`plaza run: best z=${best.toFixed(1)}, final z=${z.toFixed(1)}, bursts=${bursts} | errors ${errors.length}`);
if (best < 241) console.log('NOTE: plaza mark not reached — plaza shot is whatever z shows');
await browser.close();
console.log('DONE');
