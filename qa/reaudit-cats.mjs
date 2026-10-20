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
const out = {};
const cats = [
  { id: 'cloud-infrastructure', x: -10.7, z: 17.4 },
  { id: 'dev-automation', x: 10, z: 63.4 },
];
for (const cat of cats) {
  await page.evaluate(([c]) => {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
    const pcx = (z) => { const cc = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*cc); };
    window.__cwQaCam = { pos: [pcx(c.z - 12), 4.5, c.z - 12], target: [c.x, 7.2, c.z] };
  }, [cat]);
  await page.waitForTimeout(900);
  let opened = false;
  for (const [dy, dx] of [[0,0],[-60,0],[60,0],[0,-60],[0,60]]) {
    await page.mouse.click(720 + dx, 450 + dy);
    await page.waitForTimeout(550);
    opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (opened) break;
  }
  out[cat.id] = opened ? await page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    items: [...document.querySelectorAll('.cloud-card-skill-name')].map(n => n.textContent),
    buttons: document.querySelectorAll('.cloud-card button').length,
    links: document.querySelectorAll('.cloud-card a').length,
  })) : { open: false };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}
console.log(JSON.stringify(out, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
