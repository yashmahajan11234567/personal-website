import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForTimeout(3500);
const state = await page.evaluate(() => ({
  reducedBranch: !!document.querySelector('.cloud-world-reduced'),
  canvasPresent: !!document.querySelector('canvas'),
}));
console.log(JSON.stringify(state));
await browser.close();
