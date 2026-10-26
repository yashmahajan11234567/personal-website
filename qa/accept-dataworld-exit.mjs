
/** Final acceptance — data-world exit via its real affordance. */
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/data-world-boot.png` });
const exitBtn = await page.evaluate(() => {
  const b = document.querySelector('[data-testid="world-exit"]');
  return { exists: !!b, text: b?.textContent.trim().slice(0, 30), visible: b && b.offsetParent !== null };
});
check('data-world exit button present+visible', exitBtn.exists && exitBtn.visible, JSON.stringify(exitBtn));
await page.locator('[data-testid="world-exit"]').click();
await page.waitForTimeout(1800);
const back = await page.evaluate(() => ({ hash: location.hash, h1: !!document.querySelector('h1') }));
check('exit button returns to hero', back.hash === '' && back.h1, JSON.stringify(back));
await page.screenshot({ path: `${OUT}/data-world-returned-hero.png` });
check('data-world exit zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== DATA-WORLD EXIT: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
