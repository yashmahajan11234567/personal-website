import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-polish';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
for (const [name, cam, target] of [
  ['c0-approach', [0, 9, 50], [0, 11, 98]],
  ['c0-frontal', [0, 10, 62], [0, 9, 102]],
  ['c0-oblique', [-32, 14, 58], [0, 10, 105]],
  ['c0-entrance', [0, 7, 84], [0, 8, 102]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `qa-screenshots-polish/${name}.png` });
  console.log('baseline:', name);
}
await browser.close();
