
/** Final acceptance — mobile touch selection: two-tap commit on 390x844. */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-acceptance';
mkdirSync(OUT, { recursive: true });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);
// scroll to selection hold
let enabled = false;
for (let i = 0; i < 20 && !enabled; i++) {
  await page.touchscreen.tap(195, 400);
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(350);
  enabled = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="world-board-cloud"]');
    return !!b && !b.disabled;
  });
}
check('mobile: cloud board enabled after scroll', enabled, '');
await page.screenshot({ path: `${OUT}/mobile-hold.png` });
if (enabled) {
  const board = page.locator('[data-testid="world-board-cloud"]');
  const box = await board.boundingBox();
  // two taps for coarse pointers
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/mobile-tap1.png` });
  const tapped = await page.evaluate(() => document.querySelector('[data-testid="world-board-cloud"]')?.getAttribute('data-chosen'));
  check('mobile: first tap arms (no commit)', tapped !== 'true', `data-chosen=${tapped}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(9000);
  const st = await page.evaluate(() => ({ hash: location.hash, canvas: !!document.querySelector('canvas') }));
  check('mobile: second tap enters cloud-world', st.hash === '#/cloud-world' && st.canvas, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/mobile-entered.png` });
  // exit via the on-screen exit affordance (Esc key is absent on mobile)
  const exit = page.locator('[data-testid="world-exit"], .cloud-exit, [aria-label*="Exit" i], [aria-label*="Back" i], button:has-text("Exit"), button:has-text("Back")');
  const exitCount = await exit.count();
  check('mobile: exit affordance exists in world', exitCount > 0, `count=${exitCount}`);
  if (exitCount > 0) {
    await exit.first().click();
    await page.waitForTimeout(2000);
    const back = await page.evaluate(() => ({ hash: location.hash, h1: !!document.querySelector('h1') }));
    check('mobile: exit returns to hero', back.hash === '' && back.h1, JSON.stringify(back));
  }
}
check('mobile flow zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== MOBILE TOUCH FLOW: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
