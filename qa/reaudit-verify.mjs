import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
const out = {};
// 1. Containerization overlay: Kubernetes present, NO training chip
await page.evaluate(() => {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
  const pcx = (z) => { const c = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*c); };
  window.__cwQaCam = { pos: [pcx(37.4), 4.5, 37.4], target: [-8.5, 7.2, 49.4] };
});
await page.waitForTimeout(900);
for (const [dy, dx] of [[0,0],[-60,0],[60,0],[0,-60],[0,60]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(600);
  if (await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'))) break;
}
out.containerization = await page.evaluate(() => ({
  title: document.querySelector('.cloud-card-title')?.textContent,
  items: [...document.querySelectorAll('.cloud-card-skill-name')].map(n => n.textContent),
  chips: [...document.querySelectorAll('.cloud-card-skill-chip')].map(n => n.textContent),
  cover: [...document.querySelectorAll('.cloud-card-cover-note')].map(n => n.textContent?.slice(0, 60)),
}));
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
// 2. RxVerify card: walk the path to the sunset zone
await page.evaluate(() => {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
  const pcx = (z) => { const c = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*c); };
  window.__cwQaCam = { pos: [pcx(184), 4.5, 184], target: [-12.3, 7, 195.2] };
});
await page.waitForTimeout(900);
for (const [dy, dx] of [[0,0],[-60,0],[60,0],[0,-60],[0,60]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(600);
  if (await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'))) break;
}
out.rxverify = await page.evaluate(() => ({
  title: document.querySelector('.cloud-card-title')?.textContent,
  desc: document.querySelector('.cloud-card-desc')?.textContent?.slice(0, 120),
  chips: document.querySelector('.cloud-card-chips')?.textContent,
  link: document.querySelector('.cloud-card-github')?.href,
}));
await page.keyboard.press('Escape');
console.log(JSON.stringify(out, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
