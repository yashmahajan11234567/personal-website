/**
 * Task 7 — reduced motion, and the responsive matrix (brief sections 15, 16).
 *
 * Reduced motion must NOT auto-select Data. It shows the final composition with
 * both worlds live and waits for an explicit choice.
 */

import { test, expect } from '@playwright/test';

async function settle(page: import('@playwright/test').Page) {
  await page.waitForTimeout(700);
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows the final composition immediately, with no pin or scrub', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    // Both boards live at once, without scrolling.
    await expect(page.locator('[data-testid="world-board-data"]')).toBeVisible();
    await expect(page.locator('[data-testid="world-board-cloud"]')).toBeVisible();

    // Plates are fully seated, not mid-entrance.
    const opacities = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.cinematic-plate')).map((el) =>
        Number(getComputedStyle(el).opacity)
      )
    );
    for (const o of opacities) expect(o).toBeGreaterThan(0.95);

    // No pin-spacer means no artificial scroll track.
    const track = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(Math.abs(track)).toBeLessThan(4);
  });

  test('does NOT auto-select either world', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    const selected = await page.evaluate(
      () => document.querySelector('.cinematic-hero')?.getAttribute('data-selected')
    );
    expect(selected).toBeNull();
    await expect(page.locator('.placeholder-world')).toHaveCount(0);
  });

  test('both worlds remain explicitly selectable', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    await page.locator('[data-testid="world-board-cloud"]').click();
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/#\/cloud-world/);
  });

  test('headline words are present and not mid-animation', async ({ page }) => {
    await page.goto('/');
    await settle(page);
    const state = await page.evaluate(() => {
      const el = document.querySelector('.cinematic-type__word--left')!;
      const cs = getComputedStyle(el);
      return { transform: cs.transform, opacity: Number(cs.opacity) };
    });
    expect(state.opacity).toBeGreaterThan(0.9);
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(state.transform);
  });
});

const VIEWPORTS = [
  { name: '1920-desktop', width: 1920, height: 1080 },
  { name: '1440-desktop', width: 1440, height: 900 },
  { name: '1280-laptop', width: 1280, height: 800 },
  { name: '1024-small', width: 1024, height: 768 },
  { name: '768-tablet', width: 768, height: 1024 },
  { name: '390-mobile', width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  test.describe(`responsive — ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('figure stays anchored and both boards remain operable', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(600);
      const track = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight
      );
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(track * 0.95));
      await page.waitForTimeout(1100);

      const fig = await page.evaluate(() => {
        const r = document
          .querySelector('[data-testid="cinematic-figure"]')!
          .getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
      });
      // The figure must be on screen and optically central-ish.
      expect(fig.x).toBeGreaterThan(-1);
      expect(fig.x + fig.w).toBeLessThan(fig.vw + 1);
      expect(fig.y + fig.h).toBeLessThanOrEqual(fig.vh + 1);

      for (const world of ['data', 'cloud']) {
        const btn = page.locator(`[data-testid="world-board-${world}"]`);
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box!.width, `${world} w`).toBeGreaterThanOrEqual(44);
        expect(box!.height, `${world} h`).toBeGreaterThanOrEqual(44);
        // Must be inside the viewport, or it is not reachable.
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
      }
    });

    test('boards do not overlap each other', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(600);
      const track = await page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight
      );
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(track * 0.95));
      await page.waitForTimeout(1100);

      const boxes = await page.evaluate(() => {
        const d = document.querySelector('[data-plate="data"]')!.getBoundingClientRect();
        const c = document.querySelector('[data-plate="cloud"]')!.getBoundingClientRect();
        return {
          d: { x: d.x, y: d.y, w: d.width, h: d.height },
          c: { x: c.x, y: c.y, w: c.width, h: c.height },
        };
      });
      const overlapX = Math.min(boxes.d.x + boxes.d.w, boxes.c.x + boxes.c.w) - Math.max(boxes.d.x, boxes.c.x);
      const overlapY = Math.min(boxes.d.y + boxes.d.h, boxes.c.y + boxes.c.h) - Math.max(boxes.d.y, boxes.c.y);
      const overlaps = overlapX > 0 && overlapY > 0;
      expect(overlaps, 'boards overlap at this width').toBe(false);
    });
  });
}

// Touch is covered in touch.spec.ts — Playwright requires device emulation at
// the top level of a file, which would otherwise apply to every test here.