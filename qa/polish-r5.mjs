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
  ['r5-frontal', [0, 10, 62], [0, 9, 102]],
  ['r5-vista', [0, 9, 50], [0, 11, 98]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
}
await browser.close();
