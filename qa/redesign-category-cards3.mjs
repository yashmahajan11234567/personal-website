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
const cats = [
  { id: 'cicd-observability', x: 13.8, z: 33.4 },
  { id: 'containerization', x: -8.5, z: 49.4 },
  { id: 'dev-automation', x: 10, z: 63.4 },
];
const results = {};
for (const cat of cats) {
  // Ground the camera on the terrain: sample height along the sight line and
  // place the camera above it, aiming at the board center (~y 7.2).
  await page.evaluate(([c]) => {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t*t*(3-2*t); };
    const pcx = (z) => { const c = ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*c); };
    const th = (x, z) => {
      const d = Math.abs(x - pcx(z));
      const swell = 2.6*Math.sin(x*0.021+1.3)*Math.cos(z*0.017-0.7) + 1.9*Math.sin(x*0.043-2.1)*Math.sin(z*0.036+1.1);
      const medium = 0.55*Math.sin(x*0.11+1.7)*Math.sin(z*0.09+0.6) + 0.4*Math.cos(z*0.16+x*0.05+0.8);
      const fine = 0.18*Math.sin(x*0.37+z*0.31)*Math.sin(z*0.23-x*0.19);
      const flatten = ss(4.5, 16, d);
      const rimX = ss(55, 105, Math.abs(x))*14;
      const rimZ = ss(-38, -95, z)*10;
      const towardMountains = 1 - ss(-95, -72, z);
      return (swell + medium*0.55 + fine)*flatten + rimX + rimZ + towardMountains*2.2;
    };
    const camZ = c.z - 15;
    // Sample max terrain height along the sight line; keep the camera above it
    let maxG = 0;
    for (let t = 0; t <= 1; t += 0.1) maxG = Math.max(maxG, th(c.x * (1-t), c.z - 15*(1-t)));
    const camY = Math.max(7.4, maxG + 4);
    window.__cwQaCam = { pos: [c.x, camY, camZ], target: [c.x, 7.2, c.z] };
  }, [cat]);
  await page.waitForTimeout(900);
  await page.mouse.click(720, 450);
  await page.waitForTimeout(1200);
  let card = await page.evaluate(() => {
    const scrim = document.querySelector('.cloud-card-scrim');
    if (!scrim) return { open: false };
    const r = scrim.getBoundingClientRect();
    return {
      open: true, lock: window.__cwInputLocked,
      kicker: document.querySelector('.cloud-card-kicker')?.textContent,
      title: document.querySelector('.cloud-card-title')?.textContent,
      items: [...document.querySelectorAll('.cloud-card-skill-name')].map(n => n.textContent),
      chips: [...document.querySelectorAll('.cloud-card-skill-chip')].map(n => n.textContent),
      buttons: document.querySelectorAll('.cloud-card button').length,
      links: document.querySelectorAll('.cloud-card a').length,
      scrimW: Math.round(r.width), scrimH: Math.round(r.height),
    };
  });
  if (card.open) {
    const z1 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
    await page.keyboard.down('w'); await page.waitForTimeout(450); await page.keyboard.up('w');
    const z2 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
    card.dz = Math.round((z2 - z1) * 1000) / 1000;
    await page.screenshot({ path: `qa-screenshots-redesign/card-${cat.id}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    card.closedAndUnlocked = await page.evaluate(() =>
      !document.querySelector('.cloud-card-scrim') && !window.__cwInputLocked);
    await page.mouse.click(720, 450);
    await page.waitForTimeout(1000);
    if (await page.evaluate(() => !!document.querySelector('.cloud-card-return'))) {
      await page.evaluate(() => document.querySelector('.cloud-card-return').click());
      await page.waitForTimeout(700);
      card.returnCloses = await page.evaluate(() =>
        !document.querySelector('.cloud-card-scrim') && !window.__cwInputLocked);
    }
  }
  results[cat.id] = card;
}
console.log(JSON.stringify(results, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close();
