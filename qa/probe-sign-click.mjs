import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);
// Pin camera square onto the first category sign and click its projected center.
await page.evaluate(() => { window.__cwQaCam = { pos: [-11, 5, 4], target: [-11, 4.5, 18] }; });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'qa-screenshots-v9-final/sign-click-before.png' });
await page.mouse.click(720, 450);
await page.waitForTimeout(1500);
const state = await page.evaluate(() => ({
  card: !!document.querySelector('.cloud-card, [class*="CloudCard"], [class*="cloud-card"]'),
  bodyChildren: document.body.querySelectorAll('div').length,
  overlayHtml: (document.querySelector('.cloud-world-overlay')?.textContent || '').slice(0, 120),
}));
console.log(JSON.stringify(state));
await page.screenshot({ path: 'qa-screenshots-v9-final/sign-click-after.png' });
await browser.close();
console.log('done');
