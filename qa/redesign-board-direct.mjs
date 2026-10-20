import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes) && window.__cwMountFace, { timeout: 25000 });
await page.waitForTimeout(2500);
// Board center: anchorY 14.5 + boardLift 4.93 = 19.43; anchorZ 92.49 + 0.95 = 93.45
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 23, 60], target: [0, 19.4, 93.4] };
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa-screenshots-redesign/10-board-direct.png' });
console.log('shot: 10-board-direct (cam z=60 y=23 aiming at board center)');
// And from further back to see it in context with the whole mountain
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 12, 40], target: [0, 14, 95] };
});
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa-screenshots-redesign/11-board-context.png' });
console.log('shot: 11-board-context');
await browser.close();
