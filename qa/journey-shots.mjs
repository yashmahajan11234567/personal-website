/** Final journey screenshots with facing control: re-assert the +Z facing
 * every few bursts (the orbit drag over-rotates on long walks). Captures
 * the real gameplay approach to the mountain and the plaza arrival. */
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
const xNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.x ?? 0);

await faceForward();
let z = 0;
let startZ = 0;
const marks = [
  { z: 40, name: 'journey-valley-mid' },
  { z: 78, name: 'journey-approach' },
  { z: 108, name: 'journey-entering' },
  { z: 140, name: 'journey-inside' },
  { z: 180, name: 'journey-exit' },
  { z: 214, name: 'journey-sunset' },
  { z: 240, name: 'journey-plaza' },
];
let idx = 0;
let stuck = 0;
let bursts = 0;
// HARD BOUND: 110 bursts ≈ 90s of walking — the journey needs ~55 at 5u/s;
// backward-drift corrections can consume another ~15.
// Also detects BACKWARD drift (orbit over-rotation) and re-asserts facing.
while (idx < marks.length && bursts < 110) {
  bursts++;
  const prev = z;
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  z = await zNow();
  if (Math.abs(z - prev) < 0.2 || z < prev - 0.5) {
    // stalled or walking backward — heading drifted; re-assert facing
    stuck++;
    await faceForward();
    if (stuck > 4) {
      // try the opposite azimuth correction, then the forward rotate again
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
  if (z >= marks[idx].z) {
    await page.screenshot({ path: `${OUT}/${marks[idx].name}.png` });
    console.log(`${marks[idx].name} @z ${z.toFixed(1)} x ${(await xNow()).toFixed(1)}`);
    idx++;
  }
  if (bursts % 3 === 0) await faceForward();
}
console.log(`done: ${idx}/${marks.length} marks, z=${z.toFixed(1)}, bursts=${bursts} | errors:`, errors.length ? JSON.stringify(errors.slice(0, 2)) : 0);
if (idx < marks.length) console.log('INCOMPLETE JOURNEY — see marks above for where it stopped');
await browser.close();
console.log('DONE');
