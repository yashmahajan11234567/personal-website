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

    /*
     * Read the plate position once the scrub easing has actually settled.
     *
     * Two gates are needed. The timeline is created in an effect after mount
     * and refreshed on font load, and `scrub: 0.85` keeps easing after that --
     * sampling inside either window reads the parked position. And immediately
     * after `scrollTo` the plate may not have started moving yet, so "the value
     * stopped changing" is also true while it is still parked.
     *
     * So: movement must have STARTED (value differs from the parked position)
     * and then STOPPED (several consecutive stable reads).
     */
    const PARKED = 0.8324; // measured resting position, below the frame

    const at = async (frac: number) => {
      await page.evaluate((f) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.round(max * f));
      }, frac);
      let last = Number.NaN;
      let stable = 0;
      let moved = false;
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(150);
        const cur = await plateTop();
        if (Math.abs(cur - PARKED) > 0.002) moved = true;
        stable = moved && Math.abs(cur - last) < 0.002 ? stable + 1 : 0;
        last = cur;
        if (stable >= 3) return cur;
      }
      return last;
    };

    await expect(plate).toHaveCSS('visibility', 'hidden');

    /*
     * Sample the rise, then prove it seats and holds.
     *
     * The scrub easing (`scrub: 0.85`) means progress eases toward the scroll
     * position instead of tracking it instantly, so each sample waits out the
     * easing before reading. Polling for "two consecutive reads agree" is
     * WRONG here: two reads can agree mid-creep while the plate is still
     * moving, which yields a flat series and a spurious monotonicity failure.
     *
     * Samples stay INSIDE the board beat (0.23-0.50 measured). Before the beat
     * the plates are parked below frame at a constant position, so sampling
     * there measures nothing.
     */
    const samples: number[] = [];
    for (const frac of [0.3, 0.35, 0.4, 0.45]) {
      samples.push(await at(frac));
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

  test('headline words keep their first letter on screen at every width', async ({
      page,
    }) => {
      /*
       * The headline is deliberately WIDER than the frame, so "fully inside the
       * viewport" is no longer the contract — it described a headline narrow enough
       * to sit within the frame, which this composition rejects in favour of
       * oversized editorial type passing behind the figure.
       *
       * What still has to hold, and is the real accessibility concern at small
       * widths, is that each word's OPENING glyph is fully painted. Losing the first
       * letter turns "PERSONAL" into "ERSONAL", which no reader recovers; losing
       * trailing letters degrades gracefully. So the crop is permitted only on the
       * trailing side, and only in bounded proportion.
       *
       * Measured on the glyph run (not the fit box, which is wider by construction),
       * the trailing crop holds at 2.1-2.3% of viewport width at every width below.
       */
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
        const bleed = await page.evaluate(() => {
          const out: Record<string, { firstGlyphLeft: number; runRight: number }> = {};
          for (const side of ['left', 'right'] as const) {
            const g = document.querySelector(
              `.cinematic-type__word--${side} .cinematic-type__glyphs`,
            )!;
            const node = g.firstChild!;
            const first = document.createRange();
            first.setStart(node, 0);
            first.setEnd(node, 1);
            const run = document.createRange();
            run.selectNodeContents(g);
            out[side] = {
              firstGlyphLeft: first.getBoundingClientRect().left,
              runRight: run.getBoundingClientRect().right,
            };
          }
          out.vw = window.innerWidth;
          return out as {
            left: { firstGlyphLeft: number; runRight: number };
            right: { firstGlyphLeft: number; runRight: number };
            vw: number;
          };
        });

        expect(
          bleed.left.firstGlyphLeft,
          `PERSONAL first letter cropped at ${size.width}`,
        ).toBeGreaterThan(0);
        expect(
          bleed.right.firstGlyphLeft,
          `PORTFOLIO first letter cropped at ${size.width}`,
        ).toBeGreaterThan(0);
        // The trailing crop stays a deliberate bleed at every width.
        expect(
          (bleed.right.runRight - bleed.vw) / bleed.vw,
          `PORTFOLIO trailing bleed unbounded at ${size.width}`,
        ).toBeLessThan(0.05);
        // The leading word is never pushed off its own side of the frame.
              expect(
                bleed.left.firstGlyphLeft,
                `PERSONAL pushed off the left edge at ${size.width}`,
              ).toBeGreaterThan(-0.02 * bleed.vw);
            }
          });

          /*
           * THE HEADLINE MUST SOLVE TO THE SAME SIZE IN BOTH MOTION MODES.
           *
           * This is the invariant that was actually broken, and it went undetected for the
           * whole Phase 1 suite. The fitter writes `font-size: REF_PX` to the live glyph
           * span and then measures that same span; the write is applied immediately under
           * normal motion but takes ~32ms to apply under `prefers-reduced-motion`, so the
           * read described the PREVIOUS pass's solved size instead. `perSizeW` and
           * `perSizeH` then described two different font sizes, the solve self-corrected
           * downwards, and reduced-motion users got a headline 2.5x too small at EVERY
           * viewport (measured 387px instead of 120px at 390x844, overflowing the frame by
           * 344%).
           *
           * It was invisible to a normal-motion screenshot because only that path ever
           * produced a correct reading, and invisible to the rest of the suite because
           * every other assertion here is geometric — they check that the type FITS, not
           * that it is the SIZE the design locked. A word rendered at a third of the
           * intended size still fits its box.
           *
           * So this asserts the pair directly: same face, same tracking, and above all the
           * same solved size under both modes, at every width. `parseFloat('normal')` is
           * NaN, which is why the tracking check normalises it to 0.
           */
          test('the headline solves to the same size with and without reduced motion', async ({
            browser,
          }) => {
            const readSize = async (reducedMotion: 'reduce' | 'no-preference', size: {
              width: number;
              height: number;
            }) => {
              const context = await browser.newContext({
                viewport: size,
                reducedMotion,
              });
              const page = await context.newPage();
              await page.goto('/');
              await settle(page);
              const out = await page.evaluate(() => {
                const words = ['left', 'right'].map((side) => {
                  const g = document.querySelector(
                    `.cinematic-type__word--${side} .cinematic-type__glyphs`,
                  )!;
                  const cs = getComputedStyle(g);
                  const track = parseFloat(cs.letterSpacing);
                  return {
                    size: parseFloat(cs.fontSize),
                    family: cs.fontFamily.split(',')[0],
                    tracking: Number.isFinite(track) ? track : 0,
                  };
                });
                return { left: words[0], right: words[1] };
              });
              await context.close();
              return out;
            };

            for (const size of [
              { width: 1920, height: 1080 },
              { width: 1440, height: 900 },
              { width: 1280, height: 720 },
              { width: 390, height: 844 },
            ]) {
              const normal = await readSize('no-preference', size);
              const reduced = await readSize('reduce', size);

              expect(
                reduced.right.size,
                `PORTFOLIO solves to a different size under reduced motion at ${size.width}`,
              ).toBeCloseTo(normal.right.size, 1);
              expect(
                reduced.left.size,
                `PERSONAL solves to a different size under reduced motion at ${size.width}`,
              ).toBeCloseTo(normal.left.size, 1);

              // The same face and the same spacing too — a fallback font or a different
              // tracking policy would also satisfy a size check if the boxes happened to
              // produce the same number.
              expect(reduced.right.family, `face at ${size.width}`).toBe(normal.right.family);
              expect(reduced.right.tracking, `tracking at ${size.width}`).toBeCloseTo(
                normal.right.tracking,
                1,
              );
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