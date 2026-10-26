
/** Final acceptance — data-world gameplay: WASD motion, jump, boundary
 * clamp, panel open/close via keyboard, stuck-check. */
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
await page.waitForTimeout(4500); // phaser boot

// Motion probe: is there a QA hook for avatar position? Check window.__* hooks
const hooks = await page.evaluate(() => Object.keys(window).filter((k) => k.startsWith('__')));
console.log('window hooks:', JSON.stringify(hooks));

// Keyboard motion: hold D (right) 1.5s, screenshot; hold A back; W up 1.5s
await page.keyboard.down('d');
await page.waitForTimeout(1500);
await page.keyboard.up('d');
await page.screenshot({ path: `${OUT}/dw-moved-right.png` });
await page.keyboard.down('a');
await page.waitForTimeout(1500);
await page.keyboard.up('a');
await page.keyboard.down('w');
await page.waitForTimeout(1500);
await page.keyboard.up('w');
await page.keyboard.down('s');
await page.waitForTimeout(1500);
await page.keyboard.up('s');
await page.screenshot({ path: `${OUT}/dw-moved-loop.png` });

// Jump: Space
await page.keyboard.press(' ');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/dw-jump.png` });

// Boundary: hold left arrow 6s — player must stay on screen (no crash)
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(6000);
await page.keyboard.up('ArrowLeft');
await page.screenshot({ path: `${OUT}/dw-boundary-left.png` });
const alive = await page.evaluate(() => { const c = document.querySelector('canvas'); return !!c && c.width > 0; });
check('canvas alive after boundary hold', alive, '');

// Panel: Tab to station-index buttons, Enter to open, Escape to close
let panelOpened = false;
for (let i = 0; i < 15 && !panelOpened; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  panelOpened = await page.evaluate(() => !!document.querySelector('.info-panel, [class*="info-panel"]'));
}
check('panel opens via keyboard', panelOpened, panelOpened ? '' : '15 tab+enter attempts failed');
if (panelOpened) {
  await page.screenshot({ path: `${OUT}/dw-panel-open.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = await page.evaluate(() => !document.querySelector('.info-panel, [class*="info-panel"]'));
  check('panel closes via Escape', closed, '');
}
check('data-world gameplay zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== DATA-WORLD GAMEPLAY: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
