import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const POSES = [
  // Walk out of the exit and see the first project boards ahead (z 216/226 in view)
  { name: 'sunset-markers', pos: [0, 8, 196], target: [6, 6, 226] },
  // Turn slightly toward the sun sprite (-70, 24, 265)
  { name: 'sunset-sun', pos: [0, 8, 200], target: [-40, 12, 260] },
  // The reveal moment: stepping out of the bore (z 174) into the light
  { name: 'exit-reveal', pos: [0, 5.5, 172], target: [-10, 8, 230] },
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
