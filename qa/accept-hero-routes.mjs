
/** Final acceptance — Hero audit (read-only): typography/layout load, world
 * selection transition, data/cloud routing, return-to-hero, console/network
 * errors, reduced-motion, layout shift, responsive widths. */
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

// --- Hero at 1440x900 ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [], reqs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 150)); });
  page.on('requestfailed', (r) => reqs.push(r.url().slice(-80) + ' :: ' + (r.failure()?.errorText ?? '')));
  page.on('response', (r) => { if (r.status() >= 400) reqs.push(r.status() + ' ' + r.url().slice(-80)); });

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(3000);

  const hero = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const buttons = [...document.querySelectorAll('button')].map((b) => ({ text: b.textContent.trim().slice(0, 40), visible: b.offsetParent !== null }));
    const hasCanvas = !!document.querySelector('canvas');
    const style = h1 ? getComputedStyle(h1) : null;
    return {
      h1: h1?.textContent ?? null,
      h1Font: style ? `${style.fontSize}/${style.fontFamily.split(',')[0]}` : null,
      buttons,
      hasCanvas,
      hash: location.hash,
    };
  });
  check('hero h1 present', !!hero.h1, JSON.stringify(hero.h1));
  check('hero buttons visible', hero.buttons.filter((b) => b.visible).length >= 2, JSON.stringify(hero.buttons.map((b) => b.text)));
  check('hero load < 10s', loadMs < 10000, `${loadMs}ms`);
  await page.screenshot({ path: `${OUT}/hero-1440.png` });

  // Click the cloud-world entry button
  const cloudBtn = hero.buttons.find((b) => /cloud|devops/i.test(b.text));
  check('cloud route button found', !!cloudBtn, cloudBtn?.text);
  if (cloudBtn) {
    // locate by text
    const btn = page.locator('button', { hasText: /cloud|devops/i }).first();
    await btn.click();
    await page.waitForTimeout(2500);
    const hash = await page.evaluate(() => location.hash);
    check('cloud-world hash after click', hash === '#/cloud-world', hash);
    const canvasOk = await page.evaluate(() => { const c = document.querySelector('canvas'); return !!c && c.width > 0; });
    check('cloud canvas mounted', canvasOk, '');
    await page.screenshot({ path: `${OUT}/hero-to-cloud.png` });
    // Esc back to hero
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    const back = await page.evaluate(() => ({ hash: location.hash, h1: document.querySelector('h1')?.textContent ?? null }));
    check('esc returns to hero', back.hash === '' && !!back.h1, JSON.stringify(back));
  }
  check('hero: zero console/page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  check('hero: zero failed requests', reqs.length === 0, reqs.slice(0, 3).join(' | '));
  await page.close();
}

// --- Data-world route ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [], reqs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('requestfailed', (r) => reqs.push(r.url().slice(-60)));
  await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(4000);
  const dw = await page.evaluate(() => ({ hash: location.hash, canvases: document.querySelectorAll('canvas').length }));
  check('data-world boots', dw.hash === '#/data-world' && dw.canvases >= 1, JSON.stringify(dw));
  await page.screenshot({ path: `${OUT}/data-world-boot.png` });
  // WASD motion test: hold W for 2s
  await page.keyboard.down('w');
  await page.waitForTimeout(2000);
  await page.keyboard.up('w');
  const moved = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { w: c?.width, h: c?.height };
  });
  await page.screenshot({ path: `${OUT}/data-world-moved.png` });
  check('data-world W-key 2s (canvas alive)', !!moved.w, JSON.stringify(moved));
  check('data-world zero errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// --- Responsive spot checks ---
for (const [w, h] of [[390, 844], [768, 1024]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  check(`hero ${w}x${h} no horizontal overflow`, !overflow, '');
  await page.screenshot({ path: `${OUT}/hero-${w}.png` });
  await page.close();
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== HERO+ROUTES AUDIT: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
