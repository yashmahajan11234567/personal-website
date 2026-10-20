// Cloud World mountain screenshot capture — pinned-camera A/B shots.
// Usage: npx playwright run ./qa/capture-mountain-shots.mjs  (or via node directly)
// Navigates to the running dev server, pins the camera at approach/frontal/oblique
// positions, and saves screenshots for comparison against the reference.

import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v9-final';

// Pinned camera poses: { pos, target } fed to __cwQaCam in CameraTargetRig.
const POSES = [
  { name: 'spawn', pos: [0, 9, -17], target: [0, 2, 0] },          // default camera at spawn
  { name: 'approach', pos: [0, 26, 52], target: [0, 8, 118] },      // wide approach
  { name: 'player-approach', pos: [0, 6.5, 44], target: [0, 6, 100] }, // player-height walk-up view
  { name: 'frontal', pos: [0, 24, 30], target: [0, 20, 118] },
  { name: 'oblique', pos: [-52, 28, 62], target: [6, 10, 124] },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(6000);
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(3000);

for (const { name, pos, target } of POSES) {
  await page.evaluate((p) => { window.__cwQaCam = { pos: p.pos, target: p.target }; }, { pos, target });
  await page.waitForTimeout(1500); // let the clamped camera settle
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`captured ${name}`);
}

await page.evaluate(() => { window.__cwQaCam = undefined; });
console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors));
await browser.close();
console.log('done');
