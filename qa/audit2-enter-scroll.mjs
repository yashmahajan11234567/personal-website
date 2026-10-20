// Audit 4 — Verify the Enter-scroll keyboard route precisely.
import { chromium } from 'playwright';

const URL = 'http://localhost:5195/';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const out = {};

// 1. Container tabbable?
out.containerAttrs = await page.evaluate(() => {
  const el = document.querySelector('[class*="cinematic"], [class*="hero"]');
  const root = el?.closest('[tabindex]') || el;
  return {
    cls: root?.className?.toString().slice(0, 50),
    tabIndex: root?.getAttribute('tabindex'),
    hasTabindexAttr: root?.hasAttribute('tabindex'),
  };
});

// 2. Enter at body focus — sample scrollY over time
await page.keyboard.press('Enter');
for (const ms of [600, 1200, 2000, 3200]) {
  await page.waitForTimeout(ms === 600 ? 600 : ms - (ms === 1200 ? 600 : ms === 2000 ? 1200 : 2000));
  out[`scrollY@${ms}ms`] = await page.evaluate(() => Math.round(window.scrollY));
}

// 3. Event-listener reachability: dispatch a synthetic keydown ON the container and see if it scrolls
await page.evaluate(() => {
  const el = document.querySelector('[class*="cinematic"], [class*="hero"]');
  el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
});
await page.waitForTimeout(2500);
out.scrollAfterSyntheticContainerEvent = await page.evaluate(() => Math.round(window.scrollY));

// 4. Did boards latch after the synthetic scroll?
out.boardsState = await page.evaluate(() => {
  const boards = [...document.querySelectorAll('[data-testid^="world-board-"]')];
  return boards.map(b => ({
    tid: b.dataset.testid,
    disabled: b.disabled,
    tabIndex: b.tabIndex,
    rendered: b.getBoundingClientRect().width > 0,
  }));
});

// 5. Tab from #main anchor (post skip-link activation) — does anything inside hero become focusable?
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.keyboard.press('Tab'); // skip link
await page.keyboard.press('Enter'); // activate skip link -> jumps to #main
await page.waitForTimeout(300);
await page.keyboard.press('Tab');
out.afterSkipTabTarget = await page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el?.tagName, cls: el?.className?.toString().slice(0, 40), tid: el?.dataset?.testid };
});

// 6. Focus the container programmatically then Enter — the designed path
await page.evaluate(() => {
  const el = document.querySelector('[class*="cinematic"], [class*="hero"]');
  el?.focus();
});
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
out.scrollAfterFocusContainerEnter = await page.evaluate(() => Math.round(window.scrollY));

// 7. Reduced motion: boards latched immediately?
const ctx2 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(URL, { waitUntil: 'networkidle' });
await p2.waitForTimeout(3000);
out.reducedMotionBoards = await p2.evaluate(() => {
  const boards = [...document.querySelectorAll('[data-testid^="world-board-"]')];
  return {
    count: boards.length,
    states: boards.map(b => ({ tid: b.dataset.testid, disabled: b.disabled, tabbable: b.tabIndex >= 0, visible: b.getBoundingClientRect().width > 0 })),
    scrollY: Math.round(window.scrollY),
  };
});

console.log(JSON.stringify(out, null, 2));
console.log('errors:', JSON.stringify(errors));
await browser.close();
