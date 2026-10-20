import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
const cats = [
  ['sign1', -10.7, 17.4], ['sign2', 13.8, 33.4], ['sign3', -8.5, 49.4], ['sign4', 10, 63.4],
];
for (const [name, x, z] of cats) {
  await page.evaluate(([sx, sz]) => {
    const ss = (a, b, x2) => { const t = Math.min(1, Math.max(0, (x2 - a) / (b - a))); return t*t*(3-2*t); };
    const pcx = (z2) => { const c = ss(92,108,z2)*(1-ss(168,184,z2)); return (2.5*Math.sin(z2*0.05)+1.5*Math.sin(z2*0.13+2.0))*(1-0.75*c); };
    window.__cwQaCam = { pos: [pcx(sz - 12), 4.5, sz - 12], target: [sx, 7.2, sz] };
  }, [x, z]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `qa-screenshots-flatfix/final-sign${name[4]}.png` });
  console.log('shot:', name);
}
await browser.close();
