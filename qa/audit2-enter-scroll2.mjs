// Audit 4b — precise container test + reduced-motion scroll latch.
import { chromium } from 'playwright';

const URL = 'http://localhost:5195/';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const out = {};

// Focus the REAL container (.cinematic-hero) and press Enter
out.focusResult = await page.evaluate(() => {
  const el = document.querySelector('.cinematic-hero');
  el?.focus();
  return { focused: document.activeElement === el, tabIndex: el?.getAttribute('tabindex') };
});
await page.keyboard.press('Enter');
await page.waitForTimeout(2200);
out.scrollAfterRealContainerEnter = await page.evaluate(() => Math.round(window.scrollY));
out.boardsAfterScroll = await page.evaluate(() => {
  const boards = [...document.querySelectorAll('[data-testid^="world-board-"]')];
  return boards.map(b => ({ tid: b.dataset.testid, disabled: b.disabled, tabbable: b.tabIndex >= 0, visible: b.getBoundingClientRect().width > 0 }));
});

// Can a keyboard user reach a board via Tab now?
if (out.boardsAfterScroll.length > 0) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  out.firstTabAfterLatch = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el?.tagName, tid: el?.dataset?.testid, label: el?.getAttribute('aria-label')?.slice(0, 50) };
  });
}

// Keyboard-only world selection: activate the first board with Enter
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
out.afterBoardActivate = await page.evaluate(() => ({
  hash: location.hash || '(empty)',
  world: !!document.querySelector('[class*="cloud-world-3d"], canvas[data-engine]'),
}));

// Reduced motion: scroll manually (ArrowDown) then check latch
const ctx2 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(URL, { waitUntil: 'networkidle' });
await p2.waitForTimeout(2500);
for (let i = 0; i < 12; i++) { await p2.keyboard.press('ArrowDown'); await p2.waitForTimeout(120); }
await p2.waitForTimeout(1500);
out.reducedMotion = await p2.evaluate(() => {
  const boards = [...document.querySelectorAll('[data-testid^="world-board-"]')];
  return {
    scrollY: Math.round(window.scrollY),
    boards: boards.map(b => ({ tid: b.dataset.testid, disabled: b.disabled, tabbable: b.tabIndex >= 0 })),
    words: [...document.querySelectorAll('h1, [class*="headline"]')].map(w => w.textContent?.slice(0, 30)),
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
