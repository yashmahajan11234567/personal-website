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

// Un-pin any QA camera so the real follow-cam drives the view, then walk forward.
// 8.5 u/s top speed with accel: ~35s covers the 290u journey (z 0 -> 235) with margin.
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(500);
await page.keyboard.down('w');
const checkpoints = [
  { at: 5000, name: 'walk-1-valley' },
  { at: 12000, name: 'walk-2-entrance' },
  { at: 18000, name: 'walk-3-inside-bore' },
  { at: 24000, name: 'walk-4-exit-side' },
  { at: 30000, name: 'walk-5-sunset-arrival' },
];
let elapsed = 0;
for (const cp of checkpoints) {
  await page.waitForTimeout(cp.at - elapsed);
  elapsed = cp.at;
  await page.screenshot({ path: `qa-screenshots-v9-final/${cp.name}.png`, fullPage: true });
  console.log('captured', cp.name);
}
await page.keyboard.up('w');
await page.waitForTimeout(1000);
const final = await page.evaluate(() => {
  const h = window.__cwAvatarHist || [];
  const last = h[h.length - 1];
  return { z: last ? last.z : null, x: last ? last.x : null, n: h.length };
});
console.log('FINAL POSITION:', JSON.stringify(final));
console.log('CONSOLE ERRORS:', JSON.stringify(errors));
await browser.close();
console.log('done');
