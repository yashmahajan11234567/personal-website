import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa-screenshots/';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const errors = [];

for (const [world, label] of [['data', 'Data'], ['cloud', 'Cloud']]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', (e) => errors.push(`${world}: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(`${world}: ${m.text()}`); });

  await p.goto('http://localhost:5173/');
  await p.waitForTimeout(600);
  const track = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(track * 0.95));
  await p.waitForTimeout(900);

  await p.click(`[data-testid="world-board-${world}"]`);

  // Sample the transition at absolute times, not cumulative delays. Cumulative
  // waits drift later than the label suggests and miss the whole middle.
  const t0 = Date.now();
  for (const at of [0, 120, 300, 480, 660, 800]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await p.waitForTimeout(wait);
    await p.screenshot({ path: `${OUT}handoff-${world}-${at}.png` });
  }
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}handoff-${world}-final.png` });

  const h1 = await p.locator('.placeholder-world h1').textContent().catch(() => null);
  console.log(`${label}: world mounted = ${h1}`);
  await p.close();
}

console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();