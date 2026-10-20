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
const cat = { id: 'dev-automation', x: 10, z: 63.4 };
await page.evaluate(([c]) => {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
  const pcx = (z) => { const cc = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*cc); };
  const px = pcx(c.z - 12);
  window.__cwQaCam = { pos: [px, 4.5, c.z - 12], target: [c.x, 7.2, c.z] };
}, [cat]);
await page.waitForTimeout(900);
let opened = false;
for (const [dy, dx] of [[0,0],[-60,0],[60,0],[0,-60],[0,60],[-90,-90],[-90,90],[90,-90],[90,90],[-120,0],[120,0]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(600);
  opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  if (opened) break;
}
let card = { open: opened };
if (opened) {
  card = await page.evaluate(() => ({
    lock: window.__cwInputLocked,
    kicker: document.querySelector('.cloud-card-kicker')?.textContent,
    title: document.querySelector('.cloud-card-title')?.textContent,
    items: [...document.querySelectorAll('.cloud-card-skill-name')].map(n => n.textContent),
    buttons: document.querySelectorAll('.cloud-card button').length,
    links: document.querySelectorAll('.cloud-card a').length,
  }));
  const z1 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
  await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w');
  const z2 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
  card.dz = Math.round((z2 - z1) * 1000) / 1000;
  await page.screenshot({ path: 'qa-screenshots-redesign/card-dev-automation.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  card.closedAndUnlocked = await page.evaluate(() =>
    !document.querySelector('.cloud-card-scrim') && !window.__cwInputLocked);
}
console.log(JSON.stringify(card, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close();
