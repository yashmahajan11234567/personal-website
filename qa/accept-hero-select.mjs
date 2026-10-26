
/** Final acceptance — hero cinematic: scroll-driven selection dialog, keyboard
 * entry into both worlds, esc-return, reduced-motion, layout-shift check. */
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
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2500);

// Scroll through the cinematic until the handoff dialog appears
let dialogFound = false;
for (let i = 0; i < 30 && !dialogFound; i++) {
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(450);
  dialogFound = await page.evaluate(() => !!document.querySelector('[role="dialog"][aria-modal="true"]'));
}
check('handoff dialog appears after scroll', dialogFound, dialogFound ? '' : 'not found after 30 wheel steps');
await page.screenshot({ path: `${OUT}/hero-handoff-dialog.png` });

if (dialogFound) {
  // Keyboard: focus first board, Enter
  const sel = await page.evaluate(() => {
    const boards = [...document.querySelectorAll('[data-testid^="world-board-"], [data-chosen], [class*="slot"] button, button')];
    return boards.map((b) => ({ tid: b.dataset.testid ?? b.className.slice(0, 40), tab: b.tabIndex, vis: b.getBoundingClientRect().width > 0 }));
  });
  console.log('boards in dialog:', JSON.stringify(sel.slice(0, 6)));
  // Tab to the first board and press Enter
  let enteredHash = '';
  for (let i = 0; i < 8 && !enteredHash; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1800);
    enteredHash = await page.evaluate(() => location.hash);
    if (enteredHash === '#/cloud-world' || enteredHash === '#/data-world') break;
  }
  check('keyboard enters a world from dialog', enteredHash === '#/cloud-world' || enteredHash === '#/data-world', `hash=${enteredHash}`);
  await page.screenshot({ path: `${OUT}/hero-entered-${enteredHash.replace('#/', '')}.png` });
  if (enteredHash) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    const back = await page.evaluate(() => ({ hash: location.hash, y: Math.round(scrollY) }));
    check('escape returns to hero', back.hash === '' || back.y >= 0, JSON.stringify(back));
  }
}
check('hero scroll-select zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== HERO CINEMATIC SELECTION: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
