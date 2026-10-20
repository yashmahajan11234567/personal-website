// Audit 10 — project card with repository link: visual + narrow viewport + contrast.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-audit2/cloudworld';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes), { timeout: 20000 });
await page.waitForTimeout(2000);

// Open the rxverify project card via its sign (196L): pin camera facing it, click its screen center.
await page.evaluate(() => {
  const pcx = (z) => Math.sin(z * 0.045) * 6;
  window.__cwQaCam = { pos: [pcx(196) - 13, 6, 178], target: [pcx(196), 4, 196] };
});
await page.waitForTimeout(800);
// click at projected sign center: sign at (pcx(196), ~4.5, 196); cam at z 178 → sign is 18u ahead.
// Simple approach: raycast through screen center after aiming — click (720, 450).
await page.mouse.click(720, 420);
await page.waitForTimeout(1200);

const card = await page.evaluate(() => {
  const link = document.querySelector('.cloud-card-github');
  const lr = link?.getBoundingClientRect();
  const cs = link ? getComputedStyle(link) : null;
  // contrast: link color vs card body background (sample the body bg via computed style chain)
  const body = document.querySelector('.cloud-card-body');
  const bcs = body ? getComputedStyle(body) : null;
  return {
    open: !!document.querySelector('.cloud-card-scrim'),
    title: document.querySelector('.cloud-card-title')?.textContent,
    linkText: link?.textContent?.trim(),
    linkHref: link?.href,
    linkColor: cs?.color,
    linkRect: lr ? { w: Math.round(lr.width), h: Math.round(lr.height) } : null,
    bodyBg: bcs?.backgroundImage?.slice(0, 60) || bcs?.backgroundColor,
    buttons: document.querySelectorAll('.cloud-card button').length,
    links: document.querySelectorAll('.cloud-card a').length,
  };
});
await page.screenshot({ path: `${OUT}/card-rxverify-with-link.png` });

// Escape closes
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const closed = await page.evaluate(() => !document.querySelector('.cloud-card-scrim'));

// Narrow viewport card (390x844)
const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await p2.goto(BASE, { waitUntil: 'load' });
await p2.waitForSelector('canvas', { timeout: 15000 });
await p2.waitForFunction(() => Array.isArray(window.__cwMountainDomes), { timeout: 20000 });
await p2.waitForTimeout(2000);
await p2.evaluate(() => {
  const pcx = (z) => Math.sin(z * 0.045) * 6;
  window.__cwQaCam = { pos: [pcx(196) - 13, 6, 178], target: [pcx(196), 4, 196] };
});
await p2.waitForTimeout(800);
await p2.mouse.click(195, 400);
await p2.waitForTimeout(1200);
const narrow = await p2.evaluate(() => {
  const scrim = document.querySelector('.cloud-card-scrim')?.getBoundingClientRect();
  const link = document.querySelector('.cloud-card-github')?.getBoundingClientRect();
  return {
    open: !!scrim,
    scrim: scrim ? { w: Math.round(scrim.width), h: Math.round(scrim.height) } : null,
    linkInVp: link ? link.top >= 0 && link.bottom <= 844 && link.left >= 0 && link.right <= 390 : null,
  };
});
await p2.screenshot({ path: `${OUT}/card-390x844.png` });

console.log(JSON.stringify({ card, closed, narrow, errors }, null, 2));
await browser.close();
