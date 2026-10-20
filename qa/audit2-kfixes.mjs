// Audit 11 — verify K1 (skip link), K2 (keyboard selection), K3 (lazy load) + full routing regression.
import { chromium } from 'playwright';

const DEV = 'http://localhost:5195';
const PROD = 'http://localhost:4173';
const browser = await chromium.launch({ headless: false });
const out = {};

// ---------- PROD: K3 lazy-load behavior ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  const failed = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(-60)}`); });

  // 1. Hero first load: the lazy chunk must NOT be requested
  const requested = [];
  page.on('request', (r) => requested.push(r.url()));
  await page.goto(`${PROD}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  out.k3_heroLoad = {
    heroRendered: await page.evaluate(() => !!document.querySelector('.cinematic-hero')),
    lazyChunkRequested: requested.some((u) => u.includes('cloud-world-3d')),
    consoleErrors: errs.slice(0, 3),
  };

  // 2. Navigate to cloud world: chunk loads, world initializes, no fallback flash stuck
  await page.evaluate(() => { location.hash = '#/cloud-world'; });
  await page.waitForSelector('canvas[data-engine]', { timeout: 25000 });
  await page.waitForTimeout(4000);
  out.k3_cloudAfterLazy = {
    lazyChunkLoaded: true,
    canvas: await page.evaluate(() => !!document.querySelector('canvas[data-engine]')),
    fallbackGone: await page.evaluate(() => !document.querySelector('.cloud-world-loading')),
    histRunning: await page.evaluate(() => (window.__cwAvatarHist || []).length > 30),
    errors: errs.slice(0, 3),
    failedReqs: failed.slice(0, 3),
  };

  // 3. Reload INSIDE cloud world (deep link cold-start through the lazy path)
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('canvas[data-engine]', { timeout: 25000 });
  await page.waitForTimeout(4000);
  out.k3_reloadInCloud = {
    hash: await page.evaluate(() => location.hash),
    canvas: await page.evaluate(() => !!document.querySelector('canvas[data-engine]')),
    errors: errs.slice(0, 3),
  };

  // 4. Exit and re-enter twice (repeat lazy resolution + state)
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(2200);
    const hero = await page.evaluate(() => !!document.querySelector('.cinematic-hero'));
    await page.evaluate(() => { location.hash = '#/cloud-world'; });
    await page.waitForSelector('canvas[data-engine]', { timeout: 25000 });
    await page.waitForTimeout(2500);
    out[`k3_reenter${i}`] = { heroAfterExit: hero, canvas: await page.evaluate(() => !!document.querySelector('canvas[data-engine]')) };
  }
  out.k3_errorsTotal = errs.length;
  await page.close();
}

// ---------- PROD: K1 skip link inside worlds ----------
for (const world of ['data-world', 'cloud-world']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto(`${PROD}/#/${world}`, { waitUntil: 'load' });
  await page.waitForTimeout(world === 'cloud-world' ? 6000 : 4500);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  out[`k1_${world}`] = await page.evaluate((w) => ({
    hash: location.hash,
    heroRendered: !!document.querySelector('.cinematic-hero'),
    worldStillMounted: w === 'data-world'
      ? !!document.querySelector('[data-testid="world-canvas"] canvas')
      : !!document.querySelector('canvas[data-engine]'),
  }), world);
  out[`k1_${world}_errors`] = errs.slice(0, 3);
  await page.close();
}

// ---------- DEV: K2 keyboard-only selection journey ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto(`${DEV}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // Keyboard-only: Tab to skip link, then Enter at body focus (before: nothing happened)
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // back to body
  await page.keyboard.press('Enter'); // should scroll to the hold now
  await page.waitForTimeout(2600);
  const scrolled = await page.evaluate(() => Math.round(window.scrollY));
  const boards = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="world-board-"]')].map((b) => ({
      tid: b.dataset.testid, tabbable: b.tabIndex >= 0, disabled: b.disabled,
    })));
  // Tab into the first board and activate
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.dataset?.testid);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2800);
  out.k2_journey = { scrolled, boards, focusedBoard: focused,
    afterActivate: await page.evaluate(() => ({ hash: location.hash, dataWorld: !!document.querySelector('[data-testid="world-canvas"]') })),
    errors: errs.slice(0, 3) };

  // Guard check: Enter inside the data world must NOT scroll-jack or eject
  await page.keyboard.press('Escape'); // close nothing; ensure no panel
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  out.k2_guardInWorld = await page.evaluate(() => ({
    hash: location.hash,
    worldStill: !!document.querySelector('[data-testid="world-canvas"]'),
  }));
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
