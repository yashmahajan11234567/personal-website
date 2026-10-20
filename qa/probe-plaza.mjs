import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);

// Final validation set: plaza arrival + entrance + exit + perf
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 8, 228], target: [0, 5, 244] }; });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'qa-screenshots-v9-final/plaza-arrival.png', fullPage: true });
console.log('captured plaza-arrival');

// quick perf re-check with new geometry
const perf = await page.evaluate(async () => {
  const s = [];
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    s.push(document.documentElement.dataset.cwFps);
  }
  return s;
});
console.log('FPS:', JSON.stringify(perf));
console.log('CONSOLE ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('done');
