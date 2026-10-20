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
  { id: 'cloud-infrastructure', x: -10.7, z: 17.4 },
  { id: 'cicd-observability', x: 13.8, z: 33.4 },
  { id: 'containerization', x: -8.5, z: 49.4 },
  { id: 'dev-automation', x: 10, z: 63.4 },
];
const results = {};
for (const cat of cats) {
  // Aim the camera so the board's center is at screen center: board center is
  // ground + boardLift (2.9*2.4=6.96) ≈ 7.4 at scale 2.4; sign faces -z.
  await page.evaluate(([c]) => {
    window.__cwQaCam = { pos: [c.x, 7.4, c.z - 14], target: [c.x, 7.4, c.z] };
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
    // close via Escape (deterministic) and verify scrim + lock cleared
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    card.closedAndUnlocked = await page.evaluate(() =>
      !document.querySelector('.cloud-card-scrim') && !window.__cwInputLocked);
    // ALSO verify the Return button closes: reopen + click it with a short timeout
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
