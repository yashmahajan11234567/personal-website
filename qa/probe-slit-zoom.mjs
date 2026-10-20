import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(9000);
// Camera exactly where the user's screenshot was framed: low, close, aimed at the arch
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 8, 60], target: [0, 12, 100] };
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'qa-screenshots-v9-final/slit-zoom.png', fullPage: true });
await browser.close();
console.log('done');
