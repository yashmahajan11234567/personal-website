// Audit 9 — production build sweep: deep links, Back, unknown hash, reload-in-world.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch({ headless: false });
const out = {};

for (const [name, route] of [['hero', '/'], ['data-world', '/#/data-world'], ['cloud-world', '/#/cloud-world'], ['unknown-hash', '/#/bogus-route']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  const failed = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(-50)}`); });

  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(name === 'cloud-world' ? 5000 : 3500);
  const state = await page.evaluate(() => ({
    hash: location.hash || '(empty)',
    hero: !!document.querySelector('.cinematic-hero'),
    dwCanvas: !!document.querySelector('[data-testid="world-canvas"] canvas'),
    cwCanvas: !!document.querySelector('canvas[data-engine]'),
  }));
  out[name] = { state, errors: errs.slice(0, 4), failed: failed.slice(0, 4) };
  await page.close();
}

// Back-button behavior: hero -> cloud world -> browser Back
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { location.hash = '#/cloud-world'; });
  await page.waitForSelector('canvas[data-engine]', { timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.goBack();
  await page.waitForTimeout(2500);
  out.backFromCloud = await page.evaluate(() => ({
    hash: location.hash || '(empty)',
    hero: !!document.querySelector('.cinematic-hero'),
    cwGone: !document.querySelector('canvas[data-engine]'),
  }));
  out.backErrors = errs.slice(0, 4);

  // Reload inside cloud world (deep-link restore)
  await page.evaluate(() => { location.hash = '#/cloud-world'; });
  await page.waitForSelector('canvas[data-engine]', { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(4000);
  out.reloadInCloud = await page.evaluate(() => ({
    hash: location.hash,
    cwCanvas: !!document.querySelector('canvas[data-engine]'),
  }));
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
