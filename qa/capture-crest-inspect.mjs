/** Crest-cap inspection: high oblique view (looking down the ridge from
 * above-behind) to see the actual rendered top profile of the massif. */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v10-recon';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(2500);

const poses = [
  { name: '10-topdown-ridge', pos: [0, 120, 40], target: [0, 0, 140] },
  { name: '11-oblique-high', pos: [-60, 80, 60], target: [10, 10, 140] },
  { name: '12-close-crest', pos: [0, 60, 100], target: [0, 30, 150] },
];
for (const { name, pos, target } of poses) {
  await page.evaluate((p) => { window.__cwQaCam = { pos: p.pos, target: p.target }; }, { pos, target });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`captured ${name}`);
}
console.log('CONSOLE ERRORS:', JSON.stringify(errs));
await browser.close();
console.log('done');
