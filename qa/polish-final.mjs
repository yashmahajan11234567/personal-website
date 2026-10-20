import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-polish';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
// flicker floor check
const a = await page.evaluate(() => {
  const vals = [];
  window.__cwScene.traverse((o) => {
    if (o.type === 'Mesh' && o.material?.emissive?.getHexString?.() === 'ffc069') {
      vals.push(Math.round(o.material.emissiveIntensity * 1000) / 1000);
    }
  });
  return vals;
});
const flickerOk = a.length === 12 && Math.min(...a) >= 0.5;
console.log('flicker:', JSON.stringify({ min: Math.min(...a), max: Math.max(...a), ok: flickerOk }));
// captures
for (const [name, cam, target] of [
  ['final-frontal', [0, 10, 62], [0, 9, 102]],
  ['final-vista', [0, 9, 50], [0, 11, 98]],
  ['final-entrance', [0, 7, 84], [0, 8, 102]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
}
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
