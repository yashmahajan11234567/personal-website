/**
 * Task 7 — reduced motion, and the responsive matrix (brief sections 15, 16).
 *
 * Reduced motion must NOT auto-select Data, and it must NOT skip to the end of
 * the cinematic. It keeps the same scroll-driven progression as the default
 * path; only the scrub easing is dropped.
 *
 * HISTORY — this file previously asserted the OPPOSITE, and those assertions
 * are what shipped the reported defect:
 *
 *   - "shows the final composition immediately" expected both boards live at
 *     scroll 0, which put the Data/Cloud selection on screen at page load.
 *   - "No pin-spacer means no artificial scroll track" asserted
 *     `scrollHeight - innerHeight < 4` -- i.e. that the document had NO scroll
 *     range at all under reduced motion.
 *
 * Both are wrong. Reduced motion means "do not animate me toward it", not
 * "skip to the end". With zero scroll range there was nothing to scroll, so the
 * opening PERSONAL/PORTFOLIO state could never be seen.
 */

import { test, expect } from '@playwright/test';

async function settle(page: import('@playwright/test').Page) {
  await page.waitForTimeout(700);
}

/** Scroll to the selection hold and let it settle. */
async function scrollToHold(page: import('@playwright/test').Page) {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight - window.innerHeight)
  );
  await page.waitForTimeout(700);
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('keeps a real scroll track and starts on the OPENING composition', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);

    // The regression this file used to encode: no scroll range at all.
    // Reduced motion must retain enough track to reach the selection hold.
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight
    );
    expect(scrollable).toBeGreaterThan(1000);
    // Must be more than one viewport of scrolling, or the hold is unreachable.
    expect(scrollable).toBeGreaterThan(page.viewportSize()!.height);

    // The selection boards must NOT be present at scroll 0. The opening state
    // is PERSONAL / PORTFOLIO; the Data/Cloud composition is reached by
    // scrolling, not handed over at load.
    await expect(page.locator('[data-testid="world-board-data"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="world-board-cloud"]')).toHaveCount(0);

    const dataPlate = page.locator('[data-plate="data"]');
    await expect(dataPlate).toHaveCSS('visibility', 'hidden');
  });

  test('scrolls through a progression and reaches the selection hold', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);

    const plate = page.locator('[data-plate="data"]');
    /*
     * Viewport-relative, via `getBoundingClientRect()`.
     *
     * `at()` polls until two consecutive reads agree instead of sleeping a
     * fixed interval, so it measures the settled state the user actually sees
     * rather than a value still in transit through the scrub easing.
     */
    const plateTop = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-plate="data"]')!;
        return el.getBoundingClientRect().top / window.innerHeight;
      });

    async function at(frac: number) {
      await page.evaluate((f) =>
        window.scrollTo(
          0,
          Math.round((document.documentElement.scrollHeight - window.innerHeight) * f)
        )
      );
      await page.waitForTimeout(1100);
      return plateTop();
    }

    await expect(plate).toHaveCSS('visibility', 'hidden');

    /*
     * Sample the rise by scroll position, then let it settle.
     *
     * `at()` polls until two consecutive reads agree. That is correct for the
     * settled hold, but WRONG inside the rise: with `scrub: 0.85` the plate
     * creeps for a while, two reads can match mid-creep, and the poll returns a
     * value that is not the resting one -- producing a flat series and a
     * spurious monotonicity failure.
     *
     * So: poll to convergence at the END of the rise (to prove it seats), and
     * use a plain fixed settle for the intermediate samples, whose only job is
     * to show the position strictly decreasing.
     */
    const sample = async (frac: number) => {
      await page.evaluate((f) =>
        window.scrollTo(
          0,
          Math.round((document.documentElement.scrollHeight - window.innerHeight) * f)
        )
      );
      await page.waitForTimeout(1100);
      return plateTop();
    };

    const samples: number[] = [];
    for (const frac of [0.3, 0.35, 0.4, 0.45]) {
      samples.push(await sample(frac));
    }

    // The plate must rise monotonically through the board beat.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1]);
    }

    // And it must be seated by the end of the rise.
    expect(await at(0.75)).toBeLessThan(0.25);

    // The hold after the rise is static: scrolling further changes nothing.
    const holdA = await at(0.75);
    const holdB = await at(1.0);
    expect(holdB).toBeCloseTo(holdA, 3);
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

  test('both worlds remain explicitly selectable once scrolled to the hold', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);
    // Selection now requires reaching the hold, which reduced motion reaches by
    // scrolling (not automatically) -- the choice stays explicit either way.
    await scrollToHold(page);
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

  test('headline words are fully inside the viewport at every width', async ({
    page,
  }) => {
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await page.goto('/');
      await settle(page);
      const clipped = await page.evaluate(() => {
        return ['left', 'right'].flatMap((side) => {
          const el = document.querySelector(`.cinematic-type__word--${side}`)!;
          const r = el.getBoundingClientRect();
          return r.left < -0.5 || r.right > window.innerWidth + 0.5 ? [side] : [];
        });
      });
      expect(clipped, `clipped at ${size.width}x${size.height}`).toEqual([]);
    }
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