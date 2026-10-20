// Audit 8 — repeated world enter/exit leak check + prod-build console sweep on all routes.
import { chromium } from 'playwright';

const URL = 'http://localhost:5195/';
const browser = await chromium.launch({ headless: false });
const out = {};

// --- Leak check: data world enter/exit x3 ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const samples = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { location.hash = '#/data-world'; });
    await page.waitForTimeout(3500);
    await page.evaluate(() => { location.hash = ''; });
    await page.waitForTimeout(2500);
    samples.push(await page.evaluate(() => ({
      cycle: 'x',
      canvases: document.querySelectorAll('canvas').length,
      worlds: document.querySelectorAll('[data-testid="world-canvas"]').length,
      heroes: document.querySelectorAll('.cinematic-hero').length,
      pinSpacers: document.querySelectorAll('.pin-spacer').length,
      jsHeap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    })));
  }
  out.dataWorldCycles = samples;
  out.dataWorldErrors = errs.slice(0, 6);
  await page.close();
}

// --- Leak check: cloud world enter/exit x3 ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const samples = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { location.hash = '#/cloud-world'; });
    await page.waitForSelector('canvas[data-engine]', { timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.keyboard.press('Escape'); // exit via Escape
    await page.waitForTimeout(2500);
    samples.push(await page.evaluate(() => ({
      canvases: document.querySelectorAll('canvas').length,
      heroes: document.querySelectorAll('.cinematic-hero').length,
      pinSpacers: document.querySelectorAll('.pin-spacer').length,
      jsHeap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      hash: location.hash || '(empty)',
    })));
  }
  out.cloudWorldCycles = samples;
  out.cloudWorldErrors = errs.slice(0, 6);
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
