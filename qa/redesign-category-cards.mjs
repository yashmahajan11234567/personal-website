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

// Category sign world positions (from scene audit): (-10.7,17.4) (13.8,33.4) (-8.5,49.4) (10,63.4)
const cats = [
  { id: 'cloud-infrastructure', x: -10.7, z: 17.4 },
  { id: 'cicd-observability', x: 13.8, z: 33.4 },
  { id: 'containerization', x: -8.5, z: 49.4 },
  { id: 'dev-automation', x: 10, z: 63.4 },
];
const pcx = (z) => { const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}; const c=ss(92,108,z)*(1-ss(168,184,z)); return (2.5*Math.sin(z*0.05)+1.5*Math.sin(z*0.13+2.0))*(1-0.75*c); };
const results = {};
for (const cat of cats) {
  // Pin camera in front of the sign (sign faces -z), click its center
  await page.evaluate(([c]) => {
    window.__cwQaCam = { pos: [c.x * 0.45, 7, c.z - 16], target: [c.x, 6, c.z] };
  }, [cat]);
  await page.waitForTimeout(800);
  // Project: sign at (x, ~7.4 board center, z); camera 16u away → click screen center
  await page.mouse.click(720, 430);
  await page.waitForTimeout(1100);
  const card = await page.evaluate(() => {
    const scrim = document.querySelector('.cloud-card-scrim');
    if (!scrim) return { open: false };
    const lock = window.__cwInputLocked;
    const title = document.querySelector('.cloud-card-title')?.textContent;
    const kicker = document.querySelector('.cloud-card-kicker')?.textContent;
    const items = [...document.querySelectorAll('.cloud-card-skill-item')].map(li => ({
      name: li.querySelector('.cloud-card-skill-name')?.textContent,
      summary: li.querySelector('.cloud-card-skill-summary')?.textContent?.slice(0, 40),
      chip: li.querySelector('.cloud-card-skill-chip')?.textContent ?? null,
      repos: li.querySelector('.cloud-card-skill-repos')?.textContent?.slice(0, 50) ?? null,
    }));
    const coverNotes = [...document.querySelectorAll('.cloud-card-cover-note')].map(n => n.textContent?.slice(0, 60));
    const buttons = document.querySelectorAll('.cloud-card button').length;
    const links = document.querySelectorAll('.cloud-card a').length;
    const scrimRect = scrim.getBoundingClientRect();
    return { open: true, kicker, title, items, coverNotes, buttons, links, lock,
             scrim: { w: Math.round(scrimRect.width), h: Math.round(scrimRect.height) } };
  });
  // movement lock probe
  let dz = null;
  if (card.open) {
    const z1 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w');
    const z2 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
    dz = Math.round((z2 - z1) * 1000) / 1000;
    await page.screenshot({ path: `qa-screenshots-redesign/card-${cat.id}.png` });
    // Return to World
    await page.locator('.cloud-card-return').click();
    await page.waitForTimeout(700);
    const closed = await page.evaluate(() => !document.querySelector('.cloud-card-scrim') && !window.__cwInputLocked);
    results[cat.id] = { ...card, dz, closed };
  } else {
    results[cat.id] = { open: false };
  }
}
console.log(JSON.stringify(results, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close();
