// Audit 4c — reduced-motion full scroll latch + focus CSS check.
import { chromium } from 'playwright';

const URL = 'http://localhost:5195/';
const browser = await chromium.launch({ headless: false });
const out = {};

const ctx2 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
const errs = [];
p2.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
p2.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
await p2.goto(URL, { waitUntil: 'networkidle' });
await p2.waitForTimeout(2500);

// Scroll to the hold (70% of max scroll) like the Enter shortcut does
await p2.evaluate(() => {
  const target = (document.documentElement.scrollHeight - window.innerHeight) * 0.7;
  window.scrollTo({ top: target, behavior: 'auto' });
});
await p2.waitForTimeout(2000);
out.reducedMotionFullScroll = await p2.evaluate(() => {
  const boards = [...document.querySelectorAll('[data-testid^="world-board-"]')];
  return {
    scrollY: Math.round(window.scrollY),
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    boards: boards.map(b => ({ tid: b.dataset.testid, disabled: b.disabled, tabbable: b.tabIndex >= 0 })),
  };
});
await p2.screenshot({ path: 'qa-screenshots-audit2/hero-reduced-motion-hold.png' });

// Keyboard activate data board under reduced motion
if (out.reducedMotionFullScroll.boards.length > 0) {
  await p2.keyboard.press('Tab');
  await p2.waitForTimeout(150);
  await p2.keyboard.press('Enter');
  await p2.waitForTimeout(2000);
  out.reducedMotionSelection = await p2.evaluate(() => ({
    hash: location.hash || '(empty)',
    dataWorldMounted: !!document.querySelector('[data-testid="world-canvas"]'),
  }));
}

// Focus outline check on the hero container (tabIndex -1 currently)
const p3 = await ctx2.newPage();
await p3.goto(URL, { waitUntil: 'networkidle' });
await p3.waitForTimeout(1500);
out.heroFocusCss = await p3.evaluate(() => {
  const el = document.querySelector('.cinematic-hero');
  el?.focus();
  const cs = getComputedStyle(el);
  return { outline: cs.outline, outlineWidth: cs.outlineWidth, tabIndex: el?.getAttribute('tabindex') };
});

// Skip link behavior: where does focus/scroll go after activation?
const p4 = await ctx2.newPage();
await p4.goto(URL, { waitUntil: 'networkidle' });
await p4.waitForTimeout(1500);
await p4.keyboard.press('Tab');
await p4.keyboard.press('Enter');
await p4.waitForTimeout(400);
out.skipLinkResult = await p4.evaluate(() => ({
  hash: location.hash || '(empty)',
  scrollY: Math.round(window.scrollY),
  focus: document.activeElement?.tagName + '.' + (document.activeElement?.className || '').toString().slice(0, 25),
  mainHasTabindex: document.getElementById('main')?.getAttribute('tabindex'),
}));

console.log(JSON.stringify(out, null, 2));
console.log('errors:', JSON.stringify(errs));
await browser.close();
