/**
 * Phase 1 browser QA: the viewport matrix the brief requires.
 *
 * 1440, 1920, 1366, 1280, 390, 375, 412 — each runs the full round trip:
 *
 *   hero -> data world -> gameplay -> back -> hero -> data world again
 *
 * checking for console errors, horizontal overflow, duplicate canvas, a stuck
 * overlay, and routing/deep-link regressions.
 */
import { expect, test } from '@playwright/test';
import type { ConsoleMessage, Page } from '@playwright/test';

const READY = 15_000;

/** The scene's read-only diagnostics hook, used to confirm real input at size. */
declare global {
  interface Window {
    __worldProbe?: () => { x: number; y: number };
  }
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x720', width: 1280, height: 720 },
  { name: '390x844', width: 390, height: 844 },
  { name: '375x667', width: 375, height: 667 },
  { name: '412x915', width: 412, height: 915 },
];

const watch = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
};

/** Horizontal overflow: the document must never scroll sideways. */
const overflow = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

async function expectNoOverflow(page: Page, label: string) {
  const o = await overflow(page);
  // 1px of tolerance for sub-pixel rounding.
  expect(o.scrollWidth, `${label}: document overflows`).toBeLessThanOrEqual(
    o.clientWidth + 1
  );
  expect(o.bodyScrollWidth, `${label}: body overflows`).toBeLessThanOrEqual(
    o.clientWidth + 1
  );
}

for (const vp of VIEWPORTS) {
  test.describe(`Phase 1 QA — ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('hero -> world -> back -> world round trip is clean', async ({ page }) => {
      const errors = watch(page);

      // Hero first.
      await page.goto('/');
      await expect(page.locator('.cinematic-hero')).toBeAttached({ timeout: 8000 });
      await expectNoOverflow(page, 'hero');

      // Into the world by deep link.
      await page.goto('/#/data-world');
      await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
        'data-status',
        'ready',
        { timeout: READY }
      );
      await page.waitForTimeout(500);

      await expectNoOverflow(page, 'world');
      expect(await page.locator('canvas').count(), 'exactly one canvas').toBe(1);

      // The canvas must be inside the viewport, not wider than it.
      const canvasBox = await page.locator('[data-testid="world-canvas"] canvas').boundingBox();
      expect(canvasBox, 'canvas has a box').not.toBeNull();
      expect(canvasBox!.width).toBeLessThanOrEqual(vp.width + 1);
      expect(canvasBox!.height).toBeGreaterThan(0);

      // Actual gameplay input works at this size.
      const before = await page.evaluate(() => window.__worldProbe?.()?.x ?? 0);
      await page.keyboard.down('d');
      await page.waitForTimeout(700);
      await page.keyboard.up('d');
      const after = await page.evaluate(() => window.__worldProbe?.()?.x ?? 0);
      expect(after, 'player moved').toBeGreaterThan(before);

      // Back to the hero.
      await page.click('.placeholder-world button');
      await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 8000 });
      expect(await page.evaluate(() => location.hash)).toBe('');
      expect(await page.locator('canvas').count(), 'canvas removed').toBe(0);
      await expectNoOverflow(page, 'returned hero');

      // And in again — no duplicate canvas, no stale instance.
      await page.evaluate(() => {
        window.location.hash = '#/data-world';
      });
      await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
        'data-status',
        'ready',
        { timeout: READY }
      );
      await page.waitForTimeout(400);

      expect(await page.locator('canvas').count(), 'one canvas after re-entry').toBe(1);
      expect(await page.locator('[data-testid="world-canvas"] canvas').count()).toBe(1);
      await expectNoOverflow(page, 're-entered world');

      // No stuck overlay covering the canvas.
      const canvasTopmost = await page.evaluate(() => {
        const c = document.querySelector('[data-testid="world-canvas"] canvas');
        if (!c) return false;
        const r = c.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return Boolean(top && (c === top || c.contains(top)));
      });
      expect(canvasTopmost, 'canvas is not covered by a stuck overlay').toBe(true);

      expect(errors, errors.join('\n')).toEqual([]);
    });

    test('deep link survives a reload', async ({ page }) => {
      const errors = watch(page);
      await page.goto('/#/data-world');
      await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
        'data-status',
        'ready',
        { timeout: READY }
      );
      await page.reload();
      await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
        'data-status',
        'ready',
        { timeout: READY }
      );
      expect(await page.locator('canvas').count()).toBe(1);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
}
