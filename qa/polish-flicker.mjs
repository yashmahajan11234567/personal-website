import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2000);
const sample = () => page.evaluate(() => {
  const vals = [];
  window.__cwScene.traverse((o) => {
    if (o.geometry?.__puff || (o.material?.emissive?.getHexString?.() === 'ffc069' && o.type === 'Mesh')) {
      vals.push(Math.round(o.material.emissiveIntensity * 1000) / 1000);
    }
  });
  return vals;
});
// Tag the puffs: they share geometry built by buildPuffGeometry — identify by material color
const a = await sample();
await page.waitForTimeout(700);
const b = await sample();
const changing = a.length > 0 && JSON.stringify(a) !== JSON.stringify(b);
console.log(JSON.stringify({ lightsFound: a.length, sampleA: a.slice(0, 6), sampleB: b.slice(0, 6), animating: changing }));
await browser.close();
