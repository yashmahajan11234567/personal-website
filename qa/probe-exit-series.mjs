import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// Poses covering the full journey: entrance framing, mouth front, inside bore,
// exit mouth from inside, exit from outside, sunset zone past the mountain.
const POSES = [
  { name: 'exit-outside', pos: [0, 10, 200], target: [0, 8, 172] },      // facing back at exit mouth
  { name: 'exit-approach', pos: [0, 7, 185], target: [0, 6, 171] },      // player-height exit view
  { name: 'bore-inside-lookout', pos: [0, 5, 160], target: [0, 4, 171] },// inside bore looking out
  { name: 'entrance-front', pos: [0, 7, 88], target: [0, 6, 100] },      // entrance mouth frontal
  { name: 'sunset-zone', pos: [0, 9, 215], target: [0, 10, 260] },       // projects sunset zone
];
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);
for (const { name, pos, target } of POSES) {
  await page.evaluate((p) => { window.__cwQaCam = { pos: p.pos, target: p.target }; }, { pos, target });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `qa-screenshots-v9-final/${name}.png`, fullPage: true });
  console.log('captured', name);
}
console.log('CONSOLE ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('done');
