/**
 * Visual QA capture (brief section 20 — human visual QA is mandatory).
 *
 * Captures the cinematic at the 11 required scroll positions plus the
 * interaction states, for side-by-side comparison against
 * reference/authoritative-reference.mp4.
 *
 * Run:  node qa/capture-visual.mjs
 * Out:  qa-screenshots/
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa-screenshots';
mkdirSync(OUT, { recursive: true });

const BEATS = [
  ['00-open', 0.0],
  ['01', 0.1],
  ['02', 0.2],
  ['03', 0.3],
  ['04', 0.4],
  ['05', 0.5],
  ['06', 0.6],
  ['07', 0.7],
  ['08', 0.8],
  ['09', 0.9],
  ['10-selection-hold', 1.0],
];

const browser = await chromium.launch();

async function capture(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('  captured', name);
}

async function shot(name, { width = 1440, height = 900, reducedMotion } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(900);
  await capture(page, name);
  await ctx.close();
}

// ---- 1. the scroll sweep at 1440x900 -------------------------------
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);
  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  for (const [name, f] of BEATS) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(track * f));
    await page.waitForTimeout(1000); // let scrub 0.6 settle
    await capture(page, `beat-${name}`);
  }
  await ctx.close();
}

// ---- 2. interaction states at the hold ------------------------------
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(900);
  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(track));
  await page.waitForTimeout(1200);

  await page.locator('[data-testid="world-board-data"]').hover();
  await page.waitForTimeout(600);
  await capture(page, 'interaction-hover-data');

  await page.mouse.move(4, 4);
  await page.locator('[data-testid="world-board-cloud"]').hover();
  await page.waitForTimeout(600);
  await capture(page, 'interaction-hover-cloud');

  await page.mouse.move(4, 4);
  await page.waitForTimeout(500);

  await page.locator('[data-testid="world-board-data"]').focus();
  await page.waitForTimeout(400);
  await capture(page, 'interaction-focus-ring');

  await ctx.close();
}

// ---- 3. selection committed ----------------------------------------
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(900);
  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(track));
  await page.waitForTimeout(1200);

  await page.locator('[data-testid="world-board-data"]').hover();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="world-board-data"]').click();
  await page.waitForTimeout(900);
  await capture(page, 'interaction-selected-data-world');
  await ctx.close();
}

// ---- 4. reduced motion ---------------------------------------------
await shot('reduced-motion-1440', { reducedMotion: 'reduce' });

// ---- 5. responsive --------------------------------------------------
for (const [name, width, height] of [
  ['responsive-1920', 1920, 1080],
  ['responsive-1280', 1280, 800],
  ['responsive-1024', 1024, 768],
  ['responsive-tablet-768', 768, 1024],
  ['responsive-mobile-390', 390, 844],
]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(900);
  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(track));
  await page.waitForTimeout(1200);
  await capture(page, name);
  await ctx.close();
}

await browser.close();
console.log('\nDone ->', OUT);