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
    if (o.type === 'Mesh' && o.material?.emissive?.getHexString?.() === 'ffc069') {
      vals.push(Math.round(o.material.emissiveIntensity * 1000) / 1000);
    }
  });
  return vals;
});
const a = await sample();
await page.waitForTimeout(900);
const b = await sample();
// staggered = values differ WITHIN a sample; animating = a differs from b
const staggered = new Set(a).size > 1;
const animating = JSON.stringify(a) !== JSON.stringify(b);
const minI = Math.min(...a, ...b);
console.log(JSON.stringify({ count: a.length, staggered, animating, minIntensity: minI, sample: a }));
await browser.close();
