// Audit 7 — mobile (390x844) and tablet (768x1024) passes on hero + both worlds.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-audit2/responsive';
mkdirSync(OUT, { recursive: true });

const URL = 'http://localhost:5195/';
const browser = await chromium.launch({ headless: false });
const out = {};

for (const [name, vp] of [['mobile-390x844', { width: 390, height: 844 }], ['tablet-768x1024', { width: 768, height: 1024 }]]) {
  const page = await browser.newPage({ viewport: vp, hasTouch: true, isMobile: name.startsWith('mobile') });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });

  // Hero
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const hero = await page.evaluate(() => {
    const doc = document.documentElement;
    const words = [...document.querySelectorAll('[class*="word"]')].map(w => {
      const r = w.getBoundingClientRect();
      return { text: w.textContent?.slice(0, 12), x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth };
    });
    return {
      hScroll: doc.scrollWidth > doc.clientWidth + 1,
      scrollW: doc.scrollWidth, clientW: doc.clientWidth,
      words,
    };
  });
  await page.screenshot({ path: `${OUT}/${name}-hero.png` });

  // Data world
  await page.goto(`${URL}#/data-world`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  const dw = await page.evaluate(() => {
    const doc = document.documentElement;
    const exit = document.querySelector('[data-testid="world-exit"]')?.getBoundingClientRect();
    const toggle = document.querySelector('[data-testid="world-index-toggle"]')?.getBoundingClientRect();
    return {
      hScroll: doc.scrollWidth > doc.clientWidth + 1,
      canvasPresent: !!document.querySelector('canvas'),
      exitRect: exit ? { x: Math.round(exit.x), y: Math.round(exit.y), w: Math.round(exit.width), h: Math.round(exit.height), inVp: exit.top >= 0 && exit.left >= 0 && exit.bottom <= innerHeight && exit.right <= innerWidth } : null,
      toggleRect: toggle ? { x: Math.round(toggle.x), y: Math.round(toggle.y), inVp: toggle.top >= 0 && toggle.right <= innerWidth } : null,
    };
  });
  await page.screenshot({ path: `${OUT}/${name}-dataworld.png` });

  // Cloud world
  await page.goto(`${URL}#/cloud-world`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(5000);
  const cw = await page.evaluate(() => {
    const doc = document.documentElement;
    return { hScroll: doc.scrollWidth > doc.clientWidth + 1, canvasW: document.querySelector('canvas')?.width };
  });
  await page.screenshot({ path: `${OUT}/${name}-cloudworld.png` });

  out[name] = { hero, dw, cw, errors: errs.slice(0, 4) };
  await page.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
