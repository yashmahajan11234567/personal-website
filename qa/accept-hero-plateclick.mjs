
/** Final acceptance — hero: click each world plate directly. */
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

// Cloud world via direct plate click
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  // The plates sit at y 749/752 — below the 900px fold? boards-slot rect y=181 (top halves visible)
  const plate = page.locator('.cinematic-boards__slot--cloud').first();
  const box = await plate.boundingBox();
  console.log('cloud plate box:', JSON.stringify(box));
  await plate.click({ position: { x: (box.width / 2), y: Math.min(box.height / 2, 300) } });
  // handoff plays (HANDOFF_MS) then world mounts
  await page.waitForTimeout(9000);
  const st = await page.evaluate(() => ({ hash: location.hash, canvas: !!document.querySelector('canvas') }));
  check('cloud plate click enters cloud-world', st.hash === '#/cloud-world' && st.canvas, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/hero-click-cloud-entered.png` });
  // Escape -> hero
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => ({ hash: location.hash, h1: !!document.querySelector('h1') }));
  check('cloud esc returns to hero', back.hash === '' && back.h1, JSON.stringify(back));
  check('cloud entry zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}
// Data world via direct plate click
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 150)); });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  const plate = page.locator('.cinematic-boards__slot--data').first();
  const box = await plate.boundingBox();
  await plate.click({ position: { x: box.width / 2, y: Math.min(box.height / 2, 300) } });
  await page.waitForTimeout(9000);
  const st = await page.evaluate(() => ({ hash: location.hash, canvas: !!document.querySelector('canvas') }));
  check('data plate click enters data-world', st.hash === '#/data-world' && st.canvas, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/hero-click-data-entered.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => ({ hash: location.hash, h1: !!document.querySelector('h1') }));
  check('data esc returns to hero', back.hash === '' && back.h1, JSON.stringify(back));
  check('data entry zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== HERO PLATE-CLICK ENTRY: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
