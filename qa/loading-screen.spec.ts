import { test, expect } from '@playwright/test';

const MIN_MS = 5000;

test('loading screen appears, fills, and reveals the hero', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  const screen = page.locator('[data-testid="loading-screen"]');
  const bar = page.locator('.loading-screen__bar-fill');
  const t0 = Date.now();
  await expect(screen).toBeVisible({ timeout: 5000 });
  await expect(bar).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('.loading-screen__bar-fill') as HTMLElement | null;
    if (!b) return false;
    const style = b.getAttribute('style') || '';
    if (style.includes('100%')) return true;
    const w = b.getBoundingClientRect().width;
    const bw = b.parentElement?.getBoundingClientRect().width || 0;
    return bw > 0 && w / bw >= 0.99;
  }, { timeout: 30000 });

  // Minimum 5s display: the screen must still be visible before 5s elapse
  // even though the work finished (ready flips fast on a local server).
  const atBarFull = Date.now() - t0;
  if (atBarFull < MIN_MS - 200) {
    await page.waitForTimeout(MIN_MS - atBarFull - 200);
    await expect(screen).toBeVisible();
  }

  await expect(screen).toBeHidden({ timeout: 15000 });
  const visibleMs = Date.now() - t0;
  // Must NOT have hidden before the 5s minimum (small tolerance for
  // measurement + the 150ms post-100% grace in App.tsx).
  expect(visibleMs).toBeGreaterThanOrEqual(MIN_MS - 200);
  await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 15000 });

  expect(errors).toEqual([]);
});

test('voxel animation cycles continuously while the screen is visible', async ({ page }) => {
  await page.goto('/');
  const screen = page.locator('[data-testid="loading-screen"]');
  await expect(screen).toBeVisible({ timeout: 5000 });

  // Sample the active frame index at intervals; it must CHANGE over the
  // waiting period (time-driven cycle, not progress-driven).
  const sample = () =>
    page.evaluate(() => {
      return parseInt(
        document.documentElement.style.getPropertyValue('--loading-voxel-frame') || '0',
        10
      );
    });

  const seen: number[] = [];
  for (let i = 0; i < 8; i++) {
    seen.push(await sample());
    await page.waitForTimeout(350);
  }
  const unique = new Set(seen);
  // At 150ms/frame, 350ms gaps must observe multiple distinct frames.
  expect(unique.size).toBeGreaterThanOrEqual(3);
});

test('loading screen does not loop or restart', async ({ page }) => {
  await page.goto('/');
  const screen = page.locator('[data-testid="loading-screen"]');
  await expect(screen).toBeVisible({ timeout: 5000 });
  await expect(screen).toBeHidden({ timeout: 30000 });
  await page.waitForTimeout(2000);
  await expect(page.locator('[data-testid="loading-screen"]')).toBeHidden();
});

test('loading screen does not replay when switching worlds', async ({ page }) => {
  await page.goto('/');
  const screen = page.locator('[data-testid="loading-screen"]');
  await expect(screen).toBeVisible({ timeout: 5000 });
  await expect(screen).toBeHidden({ timeout: 30000 });
  await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 10000 });

  // Enter data world via hash, return to hero, enter cloud world.
  await page.evaluate(() => { location.hash = '#/data-world'; });
  await page.waitForTimeout(3000);
  expect(await screen.count()).toBe(0);

  await page.evaluate(() => { location.hash = ''; });
  await page.waitForTimeout(1500);
  expect(await screen.count()).toBe(0);

  await page.evaluate(() => { location.hash = '#/cloud-world'; });
  await page.waitForTimeout(4000);
  expect(await screen.count()).toBe(0);
});

test('all voxel frames preload without network errors', async ({ page }) => {
  const failures: string[] = [];
  page.on('requestfailed', (r) => {
    if (r.url().includes('/voxel-loading/')) failures.push(r.url() + ' :: ' + (r.failure()?.errorText ?? ''));
  });
  page.on('response', (r) => {
    if (r.url().includes('/voxel-loading/') && r.status() >= 400) failures.push(r.url() + ' :: ' + r.status());
  });
  await page.goto('/');
  // Give frames time to decode and the animation to start
  await page.waitForTimeout(3000);
  expect(failures).toEqual([]);
});

test('avatar sprite loads and is visible throughout loading', async ({ page }) => {
  await page.goto('/');
  const screen = page.locator('[data-testid="loading-screen"]');
  await expect(screen).toBeVisible({ timeout: 5000 });
  // The sprite must be present and not blank/transparent-only
  const spriteOk = await page.evaluate(() => {
    const el = document.querySelector('.loading-screen__voxel-sprite');
    if (!el) return false;
    const bg = getComputedStyle(el).backgroundImage || '';
    return bg.includes('sprite.png') && el.offsetWidth > 0 && el.offsetHeight > 0;
  });
  expect(spriteOk).toBeTruthy();
});

