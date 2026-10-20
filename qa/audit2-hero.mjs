// Audit 1 — Hero route: console errors, failed requests, layer presence, skip link, runtime fitter.
import { chromium } from 'playwright';

const URL = 'http://localhost:5195/';
const OUT = 'qa-screenshots-audit2';
import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const responses40x = [];

page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('requestfailed', (r) => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) responses40x.push(`${r.status()} ${r.url()}`); });

await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(3500); // fitter + timeline settle

const audit = await page.evaluate(() => {
  const r = {};
  r.title = document.title;
  r.hash = location.hash || '(empty)';
  // skip link
  const skip = document.querySelector('.skip-link');
  r.skipLink = skip ? { text: skip.textContent?.trim(), visible: skip.getBoundingClientRect().width > 0 } : null;
  // main sections / layers present
  r.heroRoot = !!document.querySelector('[class*="hero"], [class*="cinematic"]');
  r.canvasCount = document.querySelectorAll('canvas').length;
  r.buttons = [...document.querySelectorAll('button')].map(b => ({
    text: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 60),
    visible: b.getBoundingClientRect().width > 0,
  }));
  r.headings = [...document.querySelectorAll('h1,h2,h3')].map(h => h.textContent?.trim().slice(0, 50));
  r.bodyScrollHeight = document.body.scrollHeight;
  r.viewport = { w: innerWidth, h: innerHeight, dpr: devicePixelRatio };
  // glyph fitter result if exposed
  const glyph = document.querySelector('[data-testid="hero-word"], .typography-layer span, [class*="word"]');
  r.glyphEl = glyph ? glyph.getBoundingClientRect().toJSON() : null;
  r.fontSizes = {};
  document.querySelectorAll('[class*="typography"] *').forEach(el => {
    const fs = getComputedStyle(el).fontSize;
    if (parseFloat(fs) > 50) r.fontSizes[el.className || el.tagName] = fs;
  });
  return r;
});

await page.screenshot({ path: `${OUT}/hero-1440x900.png` });

// scroll to bottom (selection hold) and screenshot
await page.mouse.wheel(0, 4000);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/hero-scrolled.png` });
const scrolled = await page.evaluate(() => ({
  scrollY: window.scrollY,
  boardsVisible: [...document.querySelectorAll('button')].filter(b => {
    const r = b.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight && r.width > 0;
  }).map(b => (b.textContent || '').trim().slice(0, 40)),
}));

console.log(JSON.stringify({ audit, scrolled, consoleErrors, pageErrors, failedRequests, responses40x }, null, 2));
await browser.close();
