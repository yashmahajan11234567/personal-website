import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes) && window.__cwMountFace, { timeout: 25000 });
await page.waitForTimeout(2500);
const shots = [['z70-approach', 70], ['z80-approach', 80], ['z86-approach', 86]];
for (const [name, z] of shots) {
  await page.evaluate((zz) => { window.__cwQaCam = { pos: [0, 12, zz], target: [0, 15, 95] }; }, z);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `qa-screenshots-redesign/seq-${name}.png` });
  console.log('shot:', name);
}
await browser.close();
