// Audit 6 — fresh pinned captures: PROJECTS billboard, tunnel entrance, bore interior, project sign, sunset arrival.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-audit2/cloudworld';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0 && Array.isArray(window.__cwMountainDomes);
}, { timeout: 20000 });
await page.waitForTimeout(2500);

async function pin(name, cam, target) {
  await page.evaluate(([c, t]) => {
    window.__cwQaCam = { pos: c, target: t };
  }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot: ${name}`);
}

// 1. PROJECTS billboard from approach (billboard at ~(6.99, 7, 72), faces -Z)
await pin('01-billboard-approach', [0, 12, 52], [6.99, 6, 72]);
// 2. Tunnel entrance from the last-skill stretch
await pin('02-tunnel-entrance', [0, 14, 84], [0, 3, 104]);
// 3. Bore interior (inside the tunnel looking through)
await pin('03-bore-interior', [0, 2.4, 112], [0, 2.2, 165]);
// 4. First project sign close-up (rxverify @ 196L -> x = pathCenterX(196) - 7.5)
const rx = await page.evaluate(() => ({ x: -7.5, z: 196 }));
await pin('04-rxverify-sign', [rx.x * 0.4, 5, 178], [rx.x, 4, 196]);
// 5. Sunset zone arrival
await pin('05-sunset-arrival', [0, 10, 215], [0, 3, 240]);
// 6. Skills valley approach (first signs)
await pin('06-skills-approach', [0, 8, 2], [0, 4, 22]);

// avatar position sanity + scene mirrors
const state = await page.evaluate(() => {
  const h = window.__cwAvatarHist || [];
  return {
    histLen: h.length,
    last: h[h.length - 1] || null,
    domes: (window.__cwMountainDomes || []).length,
  };
});
console.log(JSON.stringify({ state, errors }, null, 2));
await browser.close();
