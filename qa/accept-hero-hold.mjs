
/** Final acceptance — hero: scroll to selection hold, click each enabled board. */
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

async function enterWorld(world, outfile) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);
  // scroll to selection hold: boards enabled when scrolled deep enough
  let enabled = false;
  for (let i = 0; i < 25 && !enabled; i++) {
    await page.mouse.move(720, 400);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
    enabled = await page.evaluate((w) => {
      const b = document.querySelector(`[data-testid="world-board-${w}"]`);
      return !!b && !b.disabled;
    }, world);
  }
  check(`${world}: board enabled after scroll`, enabled, '');
  await page.screenshot({ path: `${OUT}/hero-hold-${world}.png` });
  const btn = page.locator(`[data-testid="world-board-${world}"]`);
  await btn.click();
  await page.waitForTimeout(9000); // handoff plays, world mounts
  const st = await page.evaluate(() => ({ hash: location.hash, canvas: !!document.querySelector('canvas') }));
  check(`${world}: click enters world`, st.hash === `#/${world}-world`.replace('#/cloud-world','#/cloud-world').replace('#/data-world','#/data-world') && st.canvas, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/${outfile}` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => ({ hash: location.hash, h1: !!document.querySelector('h1') }));
  check(`${world}: esc returns to hero`, back.hash === '' && back.h1, JSON.stringify(back));
  check(`${world}: zero errors during entry`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

await enterWorld('cloud', 'hero-cloud-entered.png');
await enterWorld('data', 'hero-data-entered.png');
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== HERO SELECTION HOLD ENTRY: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
