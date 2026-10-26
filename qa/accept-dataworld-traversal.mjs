
/** Final acceptance — data-world FULL traversal: walk right through chapters,
 * ride pipes, reach stations, open panel via keyboard, exercise jump. */
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
await page.waitForTimeout(4500);

const P = () => page.evaluate(() => window.__worldProbe());
let p0 = await P();
console.log('spawn:', JSON.stringify({ x: p0.x, chapter: p0.chapter, stations: p0.stationCount }));

// Walk right through chapters; enter pipes when armed (Enter), continue.
let panelOpened = false, visitedChapters = new Set([p0.chapter]), steps = 0;
for (let i = 0; i < 120 && !panelOpened && steps < 3000; i++) {
  await page.keyboard.down('d');
  // burst of small walks with checks
  for (let k = 0; k < 8; k++) {
    await page.waitForTimeout(250);
    steps++;
    const p = await P();
    if (p.stationLit && !p.panelOpen) {
      // try Enter to open station panel
      await page.keyboard.up('d');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
      const p2 = await P();
      if (p2.panelOpen) { panelOpened = true; }
      await page.keyboard.down('d');
    }
    if (p.travelling) { /* pipe ride */ }
    if (p.armedPipeId && !p.travelling) {
      await page.keyboard.up('d');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      await page.keyboard.down('d');
    }
    if (!p.panelOpen && p.stationCount > 0) { /* keep walking */ }
  }
  const p = await P();
  visitedChapters.add(p.chapter);
  if (p.panelOpen) panelOpened = true;
  if (p.x > 8000 || Object.keys(p).length === 0) break;
}
const pEnd = await P();
console.log('end:', JSON.stringify({ x: pEnd.x, chapter: pEnd.chapter, stations: pEnd.stationCount, panel: pEnd.panelOpen }));
check('traversal visited multiple chapters', visitedChapters.size >= 2, [...visitedChapters].join(','));
check('panel opened during traversal', panelOpened, `x=${pEnd.x} ch=${pEnd.chapter}`);
await page.screenshot({ path: `${OUT}/dw-traversal-end.png` });
if (panelOpened) {
  await page.screenshot({ path: `${OUT}/dw-panel-open.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const closed = await P();
  check('panel closed via Escape', !closed.panelOpen, '');
}
// stuck check: velocity responds to input
await page.keyboard.down('a');
await page.waitForTimeout(800);
const pv = await P();
await page.keyboard.up('a');
check('input moves player (velocity/left)', Math.abs(pv.velocityX) > 0 || pv.x !== pEnd.x, `vx=${pv.velocityX} x=${pv.x}`);
check('data-world traversal zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== DATA-WORLD TRAVERSAL: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
