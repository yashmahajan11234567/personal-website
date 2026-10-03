/**
 * Touch interaction (brief section 14).
 *
 * Separate file because Playwright requires device emulation at the top level.
 *
 * The rule being tested: on a device with no hover, the first tap previews a
 * board and only the second tap on the SAME board enters. Selecting on first
 * contact is how a hover-dependent design becomes unusable on touch — the user
 * cannot confirm they aimed at the right target.
 *
 * Emulation is Chromium with touch enabled rather than an iPhone device preset,
 * so the suite runs without requiring the WebKit download. The
 * `(hover: none) / (pointer: coarse)` branch under test is driven by those media
 * features, not by the engine.
 */

import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});

async function reachSelection(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForTimeout(800);
  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(track * 0.95));
  await page.waitForTimeout(1200);
}

test('first tap previews, second tap on the same board enters', async ({ page }) => {
  await reachSelection(page);

  await page.locator('[data-testid="world-board-data"]').tap();
  await page.waitForTimeout(500);
  // Still on the hero — the first tap must not commit a world.
  await expect(page.locator('.placeholder-world')).toHaveCount(0);
  await expect(page).not.toHaveURL(/#\/data-world/);

  await page.locator('[data-testid="world-board-data"]').tap();
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/#\/data-world/);
  await expect(page.locator('.placeholder-world')).toBeVisible();
});

test('tapping a different board previews that one instead of entering', async ({ page }) => {
  await reachSelection(page);

  await page.locator('[data-testid="world-board-data"]').tap();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="world-board-cloud"]').tap();
  await page.waitForTimeout(400);

  // Two different boards touched — still no commitment.
  await expect(page.locator('.placeholder-world')).toHaveCount(0);

  await page.locator('[data-testid="world-board-cloud"]').tap();
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/#\/cloud-world/);
});

test('touch targets are at least 72px', async ({ page }) => {
  await reachSelection(page);
  for (const world of ['data', 'cloud']) {
    const box = await page.locator(`[data-testid="world-board-${world}"]`).boundingBox();
    expect(box!.width, `${world} width`).toBeGreaterThanOrEqual(72);
    expect(box!.height, `${world} height`).toBeGreaterThanOrEqual(72);
  }
});