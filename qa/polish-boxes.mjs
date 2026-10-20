import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
// Dump the ridge boxes to see placement
const boxes = await page.evaluate(() => window.__cwMountainDomes.map(b => ({
  x: Math.round(b.x), y: Math.round(b.y*10)/10, z: Math.round(b.z),
  sx: Math.round(b.sx), sy: Math.round(b.sy*10)/10, sz: Math.round(b.sz),
})));
console.log(JSON.stringify(boxes, null, 0));
await browser.close();
