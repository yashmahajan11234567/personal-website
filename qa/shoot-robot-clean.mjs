/** Clean screenshots of the robot in all chapters + mid-transition, entry plate dismissed. */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-robot-clean';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(5000);
// dismiss entry plate if present
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find((x) => /enter the world/i.test(x.textContent || ''));
  b?.click();
});
await page.waitForTimeout(800);
const P = () => page.evaluate(() => window.__worldProbe());
const S = () => page.evaluate(() => {
  const s = window.__worldScene; const p = s?.player;
  return { tex: p?.texture.key, phase: s?.transport?.phase };
});

await page.screenshot({ path: `${OUT}/c1-cliff-idle.png` });

// walk right a bit
await page.keyboard.down('d');
await page.waitForTimeout(650);
await page.screenshot({ path: `${OUT}/c2-cliff-walk.png` });
// sample walk frames
const wt = new Set();
for (let i = 0; i < 6; i++) { const s = await S(); wt.add(s.tex); await page.waitForTimeout(100); }
console.log('walk frames seen:', [...wt].join(','));
// jump shot
await page.keyboard.press(' ');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/c3-jump.png` });
await page.keyboard.up('d');
await page.waitForTimeout(1200);

// travel to skills, capturing entering/emerging
async function travel(chapterWanted, prefix) {
  const key = 'd';
  await page.keyboard.down(key);
  let shotIn = 0, shotOut = 0;
  const t0 = Date.now();
  try {
    while (Date.now() - t0 < 25000) {
      await page.waitForTimeout(80);
      const pr = await P(); const s = await S();
      if (s.phase === 'entering' && shotIn < 3) { shotIn++; await page.screenshot({ path: `${OUT}/${prefix}-enter${shotIn}.png` }); }
      if (s.phase === 'emerging' && shotOut < 3) { shotOut++; await page.screenshot({ path: `${OUT}/${prefix}-exit${shotOut}.png` }); }
      if (pr.travelling) continue;
      if (pr.armedPipeId) { await page.keyboard.up(key); await page.keyboard.press('Enter'); await page.waitForTimeout(250); await page.keyboard.down(key); continue; }
      if (pr.chapter === chapterWanted) return true;
    }
    return (await P()).chapter === chapterWanted;
  } finally { await page.keyboard.up(key); }
}
console.log('to skills:', await travel('skills', 'c4'));
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/c5-skills.png` });
await page.keyboard.down('d'); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/c6-skills-walk.png` }); await page.keyboard.up('d');
console.log('to projects:', await travel('projects', 'c7'));
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/c8-projects.png` });
// back to skills
await page.keyboard.down('a');
{ const t0 = Date.now(); while (Date.now() - t0 < 25000) { await page.waitForTimeout(90); const pr = await P(); if (pr.travelling) continue; if (pr.armedPipeId) { await page.keyboard.up('a'); await page.keyboard.press('Enter'); await page.waitForTimeout(250); await page.keyboard.down('a'); continue; } if (pr.chapter === 'skills') break; } await page.keyboard.up('a'); }
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/c9-skills-return.png` });
// mobile viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/c10-mobile-390x844.png` });
await page.setViewportSize({ width: 1440, height: 900 });
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
