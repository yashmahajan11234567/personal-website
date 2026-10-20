// Audit 2 — Data World journey: boot, movement, panel open/close (Back + Escape + index), exit to hero.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = 'http://localhost:5195/#/data-world';
const OUT = 'qa-screenshots-audit2';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
page.on('requestfailed', (r) => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });

const results = { steps: {} };

// 1. Load
await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000); // phaser boot
results.steps.boot = await page.evaluate(() => ({
  hash: location.hash,
  canvases: [...document.querySelectorAll('canvas')].map(c => ({ w: c.width, h: c.height, cls: c.className })),
  entryPlateVisible: !!document.querySelector('[class*="entry"], .entry-plate'),
  buttons: [...document.querySelectorAll('button')].map(b => ({
    tid: b.dataset.testid || b.className.slice(0, 40),
    text: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 50),
  })),
}));
await page.screenshot({ path: `${OUT}/dw-01-boot.png` });

// 2. Dismiss entry plate with Enter (tests the fixed key path)
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
results.steps.afterEnter = await page.evaluate(() => ({
  entryPlateGone: !document.querySelector('[data-testid="entry-plate"]:not([hidden])') &&
                  !document.querySelector('.entry-plate:not([hidden])'),
  plateNodes: [...document.querySelectorAll('[class*="entry-plate"]')].map(n => ({
    cls: n.className.slice(0, 60), display: getComputedStyle(n).display, hidden: n.hidden,
  })),
}));
await page.screenshot({ path: `${OUT}/dw-02-after-enter.png` });

// 3. Movement: arrow right + A/D
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(400);
results.steps.moved = true;
await page.screenshot({ path: `${OUT}/dw-03-moved.png` });

// 4. Interaction: walk into a station and look for panel opening (use index buttons instead — deterministic)
const indexButtons = await page.evaluate(() =>
  [...document.querySelectorAll('.world-index button, [class*="index"] button')].map(b => ({
    text: (b.textContent || '').trim().slice(0, 40),
    tid: b.dataset.testid || '',
  })),
);
results.steps.indexButtons = indexButtons;

// open panel via index button if present — drawer must be opened first via toggle
const toggle = page.locator('[data-testid="world-index-toggle"]');
if (await toggle.count() > 0) {
  await toggle.click();
  await page.waitForTimeout(500);
  results.steps.drawerOpened = await page.evaluate(() =>
    document.querySelector('.world-index')?.getAttribute('data-open'));
}
const idx = page.locator('.world-index button:visible').first();
if (await idx.count() > 0) {
  await idx.click();
  await page.waitForTimeout(800);
  results.steps.panelOpen = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="info-panel"]');
    if (!p) return { open: false };
    const r = p.getBoundingClientRect();
    const back = p.querySelector('[data-testid="panel-back"]');
    const closeIcon = p.querySelector('[data-testid="panel-close-icon"]');
    const closeFooter = p.querySelector('[data-testid="panel-close"]');
    const links = [...p.querySelectorAll('a[href]')].map(a => a.href);
    const bk = back?.getBoundingClientRect();
    return {
      open: true,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      inViewport: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
      backPresent: !!back,
      backHit: bk ? (bk.width > 0 && bk.height >= 24) : false,
      closeIconPresent: !!closeIcon,
      closeFooterPresent: !!closeFooter,
      links,
      title: p.querySelector('.info-panel__title')?.textContent?.slice(0, 60),
      focused: document.activeElement === p || p.contains(document.activeElement),
    };
  });
  await page.screenshot({ path: `${OUT}/dw-04-panel.png` });

  // 5. Close via Back button
  const back = page.locator('[data-testid="panel-back"]');
  if (await back.count() > 0) {
    await back.click();
    await page.waitForTimeout(600);
    results.steps.panelClosedByBack = await page.evaluate(() => !document.querySelector('[data-testid="info-panel"]'));
    await page.screenshot({ path: `${OUT}/dw-05-after-back.png` });
  }

  // 6. Re-open and close via Escape
  if (await idx.count() > 0) {
    await idx.click();
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    results.steps.panelClosedByEscape = await page.evaluate(() => !document.querySelector('[data-testid="info-panel"]'));
  }

  // 7. Re-open, close via backdrop/second route (footer close if present)
  if (await idx.count() > 0) {
    await idx.click();
    await page.waitForTimeout(700);
    // Try clicking the canvas backdrop area (left edge) — WorldShell dismisses on outside click?
    await page.mouse.click(60, 60);
    await page.waitForTimeout(600);
    results.steps.panelAfterOutsideClick = await page.evaluate(() => !!document.querySelector('[data-testid="info-panel"]'));
    // Escape as the guaranteed closer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

// 8. Exit to hero
const exitBtn = page.locator('.placeholder-world button, [data-testid*="exit"], [class*="exit"]').first();
if (await exitBtn.count() > 0) {
  await exitBtn.click();
  await page.waitForTimeout(2000);
  results.steps.afterExit = await page.evaluate(() => ({
    hash: location.hash || '(empty)',
    heroVisible: !!document.querySelector('[class*="hero"], [class*="cinematic"]'),
    phaserCanvasGone: !document.querySelector('canvas.world-canvas, .world-canvas'),
    canvasCount: document.querySelectorAll('canvas').length,
  }));
  await page.screenshot({ path: `${OUT}/dw-06-back-to-hero.png` });
}

results.consoleErrors = consoleErrors;
results.pageErrors = pageErrors;
results.failedRequests = failedRequests;
console.log(JSON.stringify(results, null, 2));
await browser.close();
