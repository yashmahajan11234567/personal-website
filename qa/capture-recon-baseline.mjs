// Reconstruction baseline capture: approach / frontal / oblique / close
// shots of the CURRENT mountain + billboard + tunnel, from the fresh build.
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v10-recon';

const POSES = [
  { name: '00-approach', pos: [0, 6.5, 44], target: [0, 6, 100] },
  { name: '01-approach-wide', pos: [0, 26, 52], target: [0, 8, 118] },
  { name: '02-frontal', pos: [0, 24, 30], target: [0, 20, 118] },
  { name: '03-oblique-left', pos: [-52, 28, 62], target: [6, 10, 124] },
  { name: '04-mouth-close', pos: [0, 8, 82], target: [0, 6, 101] },
  { name: '05-billboard-close', pos: [0, 30, 60], target: [0, 27, 97.5] },
];

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(2500);

for (const { name, pos, target } of POSES) {
  await page.evaluate((p) => { window.__cwQaCam = { pos: p.pos, target: p.target }; }, { pos, target });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`captured ${name}`);
}
console.log('CONSOLE ERRORS:', JSON.stringify(errs));
await browser.close();
console.log('done');
