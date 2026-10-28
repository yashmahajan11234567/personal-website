// VIS-010 baseline: full diagnostic capture of the mountain from all angles.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:4180/#/cloud-world';
const OUT = 'qa-screenshots-vis010';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0 && Array.isArray(window.__cwMountainDomes);
}, { timeout: 20000 });
await page.waitForTimeout(3000);

async function pin(name, cam, target) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot: ${name}`);
}

// ---- Viewpoints ----
// 1. Distant approach: the first-impression silhouette.
await pin('01-distant-approach', [0, 10, 30], [0, 18, 110]);
// 2. Player approach (in-game framing).
await pin('02-player-approach', [0, 9, 62], [0, 14, 110]);
// 3. Clean outside frontal (per skill lesson: pos [0,24,30] target [0,20,118]).
await pin('03-frontal-clean', [0, 24, 30], [0, 20, 118]);
// 4. Left oblique.
await pin('04-left-oblique', [-38, 18, 55], [0, 16, 115]);
// 5. Right oblique.
await pin('05-right-oblique', [38, 18, 55], [0, 16, 115]);
// 6. Mouth close-up: how rock meets arch.
await pin('06-mouth-closeup', [0, 7, 86], [0, 5, 100]);
// 7. Left end cap (thin-fin check).
await pin('07-left-endcap', [-30, 12, 66], [-45, 10, 105]);
// 8. Right end cap.
await pin('08-right-endcap', [30, 12, 66], [45, 10, 105]);
// 9. Inside mouth looking up-left: bore ceiling meets massif.
await pin('09-bore-inside', [0, 3, 106], [0, 6, 130]);
// 10. Mid-bore.
await pin('10-mid-bore', [0, 3, 125], [0, 3.2, 168]);
// 11. Exit zone outside, looking back at mountain from sunset side.
await pin('11-exit-lookback', [0, 8, 205], [0, 14, 130]);
// 12. Exit mouth close-up.
await pin('12-exit-mouth', [0, 6, 182], [0, 5, 168]);
// 13. Overhead silhouette profile (top-down of the crest line).
await pin('13-skyline-profile', [0, 55, 35], [0, 25, 120]);
// 14. Sunset-side oblique (the smooth blob read).
await pin('14-sunset-oblique', [26, 10, 200], [10, 16, 140]);

// ---- Numerical geometry probe ----
const probe = await page.evaluate(() => {
  const fp = window.__cwMountainFootprint || {};
  return { footprint: fp, domes: (window.__cwMountainDomes || []).length };
});
console.log('probe: ' + JSON.stringify(probe));
console.log('errors: ' + JSON.stringify(errors, null, 2));
await browser.close();
