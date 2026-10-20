import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
const shots = [
  ['r2-vista', [0, 9, 50], [0, 11, 98]],
  ['r2-approach-z70', [0, 10, 70], [0, 13, 96]],
  ['r2-entrance', [0, 7, 84], [0, 8, 102]],
];
for (const [name, cam, target] of shots) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `qa-screenshots-redesign/${name}.png` });
  console.log('shot:', name);
}
await browser.close();
