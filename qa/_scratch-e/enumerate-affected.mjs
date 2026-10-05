/**
 * Enumerate EVERY button affected by the App.css specificity leak.
 *
 * App.css has `.placeholder-world button` (specificity 0,1,1) which beats every
 * single-class rule in WorldShell.css / InfoPanel.css (0,1,0). Measured
 * consequences: `.world-exit` colour rgb(26,26,26) on a transparent background,
 * and the same for `.info-panel__close-icon` and `.info-panel__close`.
 *
 * The panel lives inside `.world-canvas`, which lives inside `.placeholder-world`,
 * so every button in the panel is affected too - including the dashboard gallery
 * items, which have their own styling.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1917, height: 933 } });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(500);

// Open a PROJECT panel so the dashboard gallery is present too.
await page.click('[data-testid="world-index-toggle"]');
await sleep(300);
await page.click('[data-testid="index-project-data-analytics-dashboards"]').catch(async () => {
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="index-project-"]')].map((e) => e.dataset.testid));
  console.log('available project ids:', ids);
  await page.click(`[data-testid="index-project-${ids[0].replace('index-project-', '')}"]`);
});
await page.waitForSelector('[data-testid="info-panel"]', { timeout: 15000 });
await sleep(900);

const report = await page.evaluate(() => {
  const dark = document.querySelector('.placeholder-world')?.getAttribute('data-theme') === 'dark';
  const root = getComputedStyle(document.documentElement);
  const token = (n) => root.getPropertyValue(n).trim();

  const rows = [];
  for (const el of document.querySelectorAll('.placeholder-world button, .placeholder-world a[href]')) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    rows.push({
      cls: el.className || el.tagName,
      testid: el.dataset?.testid ?? null,
      color: cs.color,
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      padding: cs.padding,
      fontSize: cs.fontSize,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    });
  }
  return {
    theme: dark ? 'dark' : 'light',
    tokens: {
      '--color-text': token('--color-text'),
      '--color-text-light': token('--color-text-light'),
      '--color-border': token('--color-border'),
    },
    buttons: rows,
  };
});
console.log(JSON.stringify(report, null, 2));
await browser.close();
console.log('done');