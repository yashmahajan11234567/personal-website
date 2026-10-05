/**
 * Capture the three fixed items as real screenshots at the user's viewport
 * (1917x933-ish wide desktop), and measure each control's own computed style.
 *
 * The earlier vision pass misidentified the top-left button as "showing only the
 * letter L" — that is canvas content, not the DOM control. These screenshots crop
 * the DOM control itself so the two can never be confused.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa/_scratch-e';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();

for (const vp of [{ width: 1917, height: 933 }, { width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto('http://localhost:5174/#/data-world');
  await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
  await page.keyboard.press('Enter');
  await sleep(800);

  const tag = `${vp.width}x${vp.height}`;

  // --- the exit control, cropped exactly ---
  const exit = page.locator('[data-testid="world-exit"]');
  const box = await exit.boundingBox();
  const m1 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="world-exit"]');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      color: cs.color, bg: cs.backgroundColor, border: cs.borderTopColor,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, padding: cs.padding,
      w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y),
      clipped: r.left < 0 || r.top < 0 || r.right > innerWidth,
      hitIsSelf: (() => { const h = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return h === el || el.contains(h); })(),
      visibleText: el.innerText.replace(/\s+/g, ' ').trim(),
    };
  });
  console.log(`\n=== exit control @ ${tag} ===`);
  console.log(JSON.stringify(m1, null, 2));
  await page.screenshot({
    path: `${OUT}/fix1-exit-${tag}.png`,
    clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 },
  });

  // --- panel with the BACK button ---
  await page.click('[data-testid="world-index-toggle"]');
  await sleep(300);
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="index-skill-"]')].map((e) => e.dataset.testid));
  await page.click(`[data-testid="${ids[0]}"]`);
  await page.waitForSelector('[data-testid="panel-back"]', { timeout: 15000 });
  await sleep(700);

  const m2 = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="info-panel"]');
    const panelBox = p.getBoundingClientRect();
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { missing: true };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y),
        color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize,
        text: el.innerText.replace(/\s+/g, ' ').trim(),
        aria: el.getAttribute('aria-label'),
        hitIsSelf: (() => { const h = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return h === el || el.contains(h); })(),
      };
    };
    return {
      panel: { x: Math.round(panelBox.x), y: Math.round(panelBox.y), w: Math.round(panelBox.width), h: Math.round(panelBox.height) },
      back: probe('[data-testid="panel-back"]'),
      closeIcon: probe('[data-testid="panel-close-icon"]'),
      closeStrip: probe('[data-testid="panel-close"]'),
      header: probe('.info-panel__header'),
      clippedByViewport: panelBox.left < 0 || panelBox.top < 0 || panelBox.right > innerWidth || panelBox.bottom > innerHeight,
    };
  });
  console.log(`\n=== panel controls @ ${tag} ===`);
  console.log(JSON.stringify(m2, null, 2));
  await page.screenshot({
    path: `${OUT}/fix3-panel-${tag}.png`,
    clip: { x: Math.max(0, m2.panel.x), y: Math.max(0, m2.panel.y), width: Math.min(vp.width, m2.panel.w), height: Math.min(240, m2.panel.h) },
  });

  // --- verify BACK works here ---
  await page.click('[data-testid="panel-back"]');
  await sleep(500);
  const closed = await page.evaluate(() => ({
    panels: document.querySelectorAll('[data-testid="info-panel"]').length,
    focus: document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName,
  }));
  console.log(`BACK click @ ${tag}:`, JSON.stringify(closed));
  console.log('errors:', errors.length ? errors : 'none');

  await page.close();
}

await browser.close();
console.log('\ndone');