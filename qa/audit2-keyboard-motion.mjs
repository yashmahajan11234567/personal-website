// Audit 3 — scrolled hero: board visibility via pixel analysis + keyboard-only nav + reduced motion + mobile.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { readFileSync, mkdirSync } from 'fs';

const OUT = 'qa-screenshots-audit2';
mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:5195/';

// --- Pixel probe on the already-captured scrolled screenshot ---
function probeBoards(path) {
  const png = PNG.sync.read(readFileSync(path));
  const { width, height, data } = png;
  // Scan for distinct non-background clusters: background here is a light wash (~#f4f1ec-ish).
  // Count columns/rows where strongly saturated dark pixels appear (plate edges/labels).
  let darkCount = 0, coloredCount = 0;
  const darkByRegion = { left: 0, center: 0, right: 0 };
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (lum < 90) { darkCount++; darkByRegion[x < width / 3 ? 'left' : x < (2 * width) / 3 ? 'center' : 'right']++; }
      if (max - min > 60) coloredCount++;
    }
  }
  return { width, height, darkCount, coloredCount, darkByRegion };
}
const probe = probeBoards(`${OUT}/hero-scrolled.png`);

// --- Keyboard-only navigation journey ---
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const kb = {};
// Tab order walk — what is reachable by keyboard alone?
kb.tabStops = [];
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(120);
  kb.tabStops.push(await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return '(body)';
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName, tid: el.dataset?.testid || el.className?.toString().slice(0, 30),
      label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
      visible: r.width > 0 && r.height > 0,
      focusVisible: el.matches(':focus-visible'),
    };
  }));
}

// Skip link activation
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('Tab');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
kb.skipLinkActivated = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);

// Enter/Space scroll behavior on hero (from ARCHITECTURE.md: Enter scrolls to selection hold)
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
kb.scrollAfterEnter = await page.evaluate(() => Math.round(window.scrollY));

// focus visibility on a board
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
kb.focusedEl = await page.evaluate(() => {
  const el = document.activeElement;
  const r = el?.getBoundingClientRect();
  return { tag: el?.tagName, cls: el?.className?.toString().slice(0, 40), rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null };
});

// --- Reduced motion pass ---
const ctx2 = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
const errs2 = [];
p2.on('pageerror', (e) => errs2.push(String(e).slice(0, 150)));
p2.on('console', (m) => { if (m.type() === 'error') errs2.push(m.text().slice(0, 150)); });
await p2.goto(URL, { waitUntil: 'networkidle' });
await p2.waitForTimeout(3000);
const rm = await p2.evaluate(() => {
  // fitter result under reduced motion: check hero words exist and have sane font size
  const words = [...document.querySelectorAll('[class*="word"], [class*="typography"] span')];
  const sizes = words.map(w => ({ cls: w.className.slice(0, 30), fs: getComputedStyle(w).fontSize, w: Math.round(w.getBoundingClientRect().width) }));
  return { wordCount: words.length, sizes: sizes.filter(s => parseFloat(s.fs) > 40), scrollY: window.scrollY };
});
await p2.screenshot({ path: `${OUT}/hero-reduced-motion.png` });
await p2.setViewportSize({ width: 390, height: 844 });
await p2.waitForTimeout(2000);
await p2.screenshot({ path: `${OUT}/hero-390x844.png` });
const rmMobile = await p2.evaluate(() => {
  const doc = document.documentElement;
  return { hScroll: doc.scrollWidth > doc.clientWidth, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
});

console.log(JSON.stringify({ probe, kb, rm, rmMobile, errors, errs2 }, null, 2));
await browser.close();
