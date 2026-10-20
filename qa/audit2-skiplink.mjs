// Audit 5 — Skip-link activation inside worlds: does '#main' eject the user to the hero?
import { chromium } from 'playwright';

const URL = 'http://localhost:5195/';
const browser = await chromium.launch({ headless: false });
const out = {};

for (const world of ['data-world', 'cloud-world']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto(`${URL}#/${world}`, { waitUntil: 'load' });
  await page.waitForTimeout(world === 'cloud-world' ? 5000 : 4000);

  const isData = world === 'data-world';
  const before = await page.evaluate((w) => ({
    hash: location.hash,
    worldMounted: w === 'data-world'
      ? !!document.querySelector('[data-testid="world-canvas"]')
      : !!document.querySelector('canvas[data-engine]'),
  }), world);

  // Keyboard path: Tab to skip link, activate it
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);

  const after = await page.evaluate((w) => ({
    hash: location.hash || '(empty)',
    heroRendered: !!document.querySelector('.cinematic-hero'),
    worldGone: w === 'data-world'
      ? !document.querySelector('[data-testid="world-canvas"]')
      : !document.querySelector('canvas[data-engine]'),
  }), world);

  out[world] = { before, focused: String(focused).slice(0, 30), after, errors: errs.slice(0, 5) };
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
