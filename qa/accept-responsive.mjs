
/** Final acceptance — responsive + reduced motion. */
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
for (const [w, h] of [[390, 844], [768, 1024], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`hero ${w}x${h}: no h-overflow`, overflow <= 2, `delta=${overflow}px`);
  await page.screenshot({ path: `${OUT}/resp-hero-${w}.png` });
  // data-world at this size
  await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const dw = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { canvas: !!c, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check(`data-world ${w}x${h}: canvas + no h-overflow`, dw.canvas && dw.overflow <= 2, `delta=${dw.overflow}px`);
  await page.screenshot({ path: `${OUT}/resp-data-${w}.png` });
  // cloud-world at this size
  await page.goto(BASE + '#/cloud-world', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(4000);
  const cw = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { canvas: !!c, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, errs: 0 };
  });
  check(`cloud-world ${w}x${h}: canvas + no h-overflow`, cw.canvas && cw.overflow <= 2, `delta=${cw.overflow}px`);
  await page.screenshot({ path: `${OUT}/resp-cloud-${w}.png` });
  check(`${w}x${h}: zero page errors`, errs.length === 0, errs.slice(0, 2).join('|'));
  await page.close();
}
// reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  const rm = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  check('reduced-motion context active', rm, '');
  await page.screenshot({ path: `${OUT}/hero-reduced-motion.png` });
  await page.close();
}
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== RESPONSIVE: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
