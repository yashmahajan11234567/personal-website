import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
  const pcx = (z) => { const cc = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*cc); };
  window.__cwQaCam = { pos: [pcx(51.4), 4.5, 51.4], target: [10, 7.2, 63.4] };
});
await page.waitForTimeout(900);
let opened = false;
for (const [dy, dx] of [[0,0],[-60,0],[60,0],[0,-60],[0,60],[-90,-90],[-90,90],[90,-90],[90,90]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(550);
  opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  if (opened) break;
}
const card = opened ? await page.evaluate(() => ({
  title: document.querySelector('.cloud-card-title')?.textContent,
  items: [...document.querySelectorAll('.cloud-card-skill-name')].map(n => n.textContent),
  buttons: document.querySelectorAll('.cloud-card button').length,
  links: document.querySelectorAll('.cloud-card a').length,
})) : { open: false };
console.log(JSON.stringify(card, null, 1));
await browser.close();
