import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
for (const [name, cam, target] of [
  ['c7-frontal', [0, 10, 62], [0, 9, 102]],
  ['c7-approach', [0, 9, 50], [0, 11, 98]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `qa-screenshots-polish/${name}.png` });
  console.log('shot:', name);
}
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
