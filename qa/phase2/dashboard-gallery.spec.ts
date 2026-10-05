/**
 * STAGE F — the dashboard gallery.
 *
 * The Data Analytics Dashboards project is ONE repository containing five real
 * dashboard screenshots. The panel presents them as a gallery: one preview, a
 * summary, and a selectable strip.
 *
 * These tests exist because the gallery shipped with correct MARKUP and no CSS
 * at all. Measured before this spec was written: `.info-panel__preview img`
 * computed `object-fit: fill`, the CSS initial value, because no rule targeted
 * the gallery classes. The COVID-19 dashboard (truly 1838x730, ratio 2.518) was
 * drawn into a 496x225 box (ratio 2.204) and the HR dashboard (1749x999,
 * ratio 1.751) into 496x303 (ratio 1.637) — up to 12.5% distortion of the
 * artefact being shown. A dashboard is evidence; distorting evidence is a
 * correctness defect, not a cosmetic one.
 *
 * So the assertions below are about proportion and honesty, not appearance:
 *   - every preview letterboxes rather than stretches
 *   - the letterbox preserves the image's true ratio
 *   - the five images are distinct files, not one repeated
 *   - the technology shown is the one the content model states
 *   - selecting a thumbnail swaps the preview and the summary together
 *   - the gallery is operable by keyboard, not mouse only
 *   - the panel still fits its viewport and does not overflow
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** The five dashboards, with the true pixel sizes committed to the repository. */
const DASHBOARDS = [
  { id: 'bike-sales', tech: 'Excel' },
  { id: 'covid-19', tech: 'Tableau' },
  { id: 'hr-analytics', tech: 'Tableau' },
  { id: 'netflix-tableau', tech: 'Tableau' },
  { id: 'netflix-powerbi', tech: 'Power BI' },
] as const;

/** Open the dashboards project panel through the accessible index. */
async function openDashboardsPanel(page: Page) {
  await page.goto('/#/data-world');
  await expect(page.locator('.placeholder-world')).toBeVisible({ timeout: 15_000 });

  const plate = page.locator('[data-testid="world-entry"]');
  if (await plate.count()) {
    await plate.getByRole('button').first().click();
  }

  const toggle = page.locator('[data-testid="world-index-toggle"]');
  if (await toggle.count()) await toggle.click();

  await page.locator('[data-testid="index-project-data-analytics-dashboards"]').click();
  await expect(page.locator('[data-testid="info-panel"]')).toBeVisible();
}

/**
 * Wait until the preview <img> has actually decoded.
 *
 * Selecting a thumbnail swaps the element's `src`, but `img.decode()` resolves
 * only once the new bitmap exists — `complete`/`naturalWidth` are still 0
 * immediately after the click. Measured: without this wait the ratio test read
 * `naturalWidth === 0` and failed, while the very same test passed in
 * isolation. Waiting on decode is what makes the assertion about the image
 * rather than about scheduling.
 */
async function waitForPreview(page: Page) {
  await page.locator('.info-panel__preview img').evaluate(
    (img) => (img as HTMLImageElement).decode().catch(() => undefined),
  );
}

test.describe('STAGE F — dashboard gallery', () => {
  test.beforeEach(async ({ page }) => {
    await openDashboardsPanel(page);
  });

  test('the gallery shows exactly the five committed dashboards', async ({ page }) => {
    await expect(page.locator('.info-panel__gallery-item')).toHaveCount(DASHBOARDS.length);

    for (const dash of DASHBOARDS) {
      await expect(page.locator(`[data-testid="dashboard-select-${dash.id}"]`)).toBeVisible();
    }
  });

  test('every preview letterboxes instead of stretching', async ({ page }) => {
    // The specific defect: with no CSS, object-fit computes to `fill`.
    await expect(page.locator('.info-panel__preview img')).toHaveCSS(
      'object-fit',
      'contain',
    );

    // And the same for the thumbnails, which would otherwise distort the same
    // images a second time at a second size.
    const thumbFit = await page
      .locator('.info-panel__gallery-item img')
      .first()
      .evaluate((el) => getComputedStyle(el).objectFit);
    expect(thumbFit).toBe('contain');
  });

  test('the preview frame is a constant ratio while the images are not', async ({ page }) => {
    /*
     * THIS REPLACED A CIRCULAR VERSION OF ITSELF, deliberately.
     *
     * The first attempt computed the contain-fit mathematically and asserted the
     * result equalled the natural ratio — which is true by construction, so it
     * passed even with the gallery CSS deleted. Verified: with the CSS removed,
     * this test still passed while the object-fit test beside it failed. A test
     * that cannot fail on the bug it names is worse than no test, because it
     * reports safety that does not exist.
     *
     * The property that actually distinguishes letterboxing from stretching is
     * observable in the geometry: under `fill` the frame TRACKS each image, so
     * the five frames carry five different ratios (measured without the CSS:
     * 2.204, 1.637, 1.622). Under `contain` every frame is the same 16:10 stage
     * while the images behind it keep five different natural ratios. So assert
     * the frame is invariant and the images are not — which fails when the
     * styling is gone, and cannot pass by arithmetic.
     */
    const ratios: number[] = [];
    const naturals: number[] = [];

    for (const dash of DASHBOARDS) {
      await page.locator(`[data-testid="dashboard-select-${dash.id}"]`).click();
      await waitForPreview(page);

      const m = await page.locator('.info-panel__preview img').evaluate((el) => {
        const img = el;
        const box = img.getBoundingClientRect();
        return {
          frameRatio: box.width / box.height,
          naturalRatio: img.naturalWidth / img.naturalHeight,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
        };
      });

      expect(m.naturalW, `${dash.id} must have real pixels`).toBeGreaterThan(0);
      expect(m.naturalH, `${dash.id} must have real pixels`).toBeGreaterThan(0);

      ratios.push(m.frameRatio);
      naturals.push(m.naturalRatio);
    }

    // The five images genuinely differ in proportion — otherwise the test below
    // would pass for the wrong reason, so prove the fixture is varied first.
    expect(
      new Set(naturals.map((r) => r.toFixed(2))).size,
      `fixture must contain differently-proportioned images, got ${naturals.join(', ')}`,
    ).toBeGreaterThan(2);

    // And every frame is the same 16:10 stage regardless of which image is in it.
    for (const [i, r] of ratios.entries()) {
      expect(
        r,
        `${DASHBOARDS[i].id} frame ratio ${r.toFixed(3)} should be the constant 16:10 stage`,
      ).toBeCloseTo(1.6, 2);
    }
  });

  test('the five previews are distinct files, not one image repeated', async ({ page }) => {
    // Thumbnail decode state is what the test asserts on, so wait for all five
    // before reading it rather than racing the image loader.
    await page
      .locator('.info-panel__gallery-item img')
      .evaluateAll((els) => Promise.all(els.map((e) => (e as HTMLImageElement).decode().catch(() => undefined))));

    const srcs = await page
      .locator('.info-panel__gallery-item img')
      .evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src')));

    expect(srcs).toHaveLength(5);
    expect(new Set(srcs).size, `duplicate previews: ${srcs.join(', ')}`).toBe(5);

    // Every one must actually load. A 404 would render a broken image that still
    // satisfies a src-only assertion.
    const broken = await page
      .locator('.info-panel__gallery-item img')
      .evaluateAll((els) =>
        els.filter((e) => !(e as HTMLImageElement).complete || (e as HTMLImageElement).naturalWidth === 0)
          .map((e) => (e as HTMLImageElement).getAttribute('src')),
      );
    expect(broken, 'previews that failed to load').toEqual([]);
  });

  test('the technology shown is the one the content model states', async ({ page }) => {
    // technology comes verbatim from each dashboard README. Assert it is shown,
    // and that Power BI and Tableau are distinguished rather than collapsed
    // into one generic "BI tool" label.
    for (const dash of DASHBOARDS) {
      await page.locator(`[data-testid="dashboard-select-${dash.id}"]`).click();
      await expect(page.locator('.info-panel__preview figcaption .info-panel__tag')).toHaveText(
        dash.tech,
      );
    }
  });

  test('selecting a thumbnail swaps the preview and the summary together', async ({ page }) => {
    const first = page.locator('.info-panel__preview img');
    const beforeSrc = await first.getAttribute('src');

    await page.locator('[data-testid="dashboard-select-netflix-powerbi"]').click();

    await expect(page.locator('.info-panel__preview img')).not.toHaveAttribute('src', beforeSrc!);
    await expect(first).toHaveAttribute('src', '/assets/dashboards/netflix-powerbi.png');

    // The caption and the summary must follow the selection, not lag behind it.
    await expect(page.locator('.info-panel__preview figcaption strong')).toHaveText(
      'Netflix Content Analysis',
    );
    await expect(page.locator('.info-panel__gallery-summary')).toContainText('Power BI');

    // Exactly one thumbnail reports itself selected at a time.
    await expect(page.locator('.info-panel__gallery-item[aria-pressed="true"]')).toHaveCount(1);
  });

  test('the gallery is operable by keyboard', async ({ page }) => {
    const target = page.locator('[data-testid="dashboard-select-hr-analytics"]');
    await target.focus();
    await expect(target).toBeFocused();

    // A real button, so Space and Enter both activate it without extra wiring.
    await page.keyboard.press('Enter');
    await expect(page.locator('.info-panel__preview img')).toHaveAttribute(
      'src',
      '/assets/dashboards/hr-analytics.png',
    );

    await page.keyboard.press('Space');
    await expect(page.locator('.info-panel__preview img')).toHaveAttribute(
      'src',
      '/assets/dashboards/hr-analytics.png',
    );
  });

  test('the preview carries alt text naming the dashboard and its tool', async ({ page }) => {
    const alt = await page.locator('.info-panel__preview img').getAttribute('alt');
    expect(alt).toContain('Bike Sales Dashboard');
    expect(alt).toContain('Excel');

    await page.locator('[data-testid="dashboard-select-covid-19"]').click();
    const alt2 = await page.locator('.info-panel__preview img').getAttribute('alt');
    expect(alt2).toContain('COVID-19 Dashboard');
    expect(alt2).toContain('Tableau');
  });

  test('the gallery does not overflow the panel horizontally', async ({ page }) => {
    const body = page.locator('.info-panel__body');
    const m = await body.evaluate((el) => ({
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    }));
    // Allow 1px for sub-pixel rounding; a stretched image or a wide thumbnail
    // would push scrollWidth well past clientWidth.
    expect(m.scrollW).toBeLessThanOrEqual(m.clientW + 1);
  });

  test('the panel stays inside the viewport with the gallery open', async ({ page }) => {
    const box = await page.locator('[data-testid="info-panel"]').boundingBox();
    const vw = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vw.height + 1);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw.width + 1);
  });

  test('the gallery scrolls into view rather than being clipped', async ({ page }) => {
    // The gallery sits below the panel header and facts, so it must be reachable
    // by scrolling the panel body — not cut off by overflow: hidden.
    const body = page.locator('.info-panel__body');
    await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(200);

    const gallery = await page.locator('.info-panel__section--gallery').boundingBox();
    expect(gallery).not.toBeNull();
    // The last thumbnail row must be inside the panel's visible body.
    const bodyBox = await body.boundingBox();
    expect(gallery!.y + gallery!.height).toBeLessThanOrEqual(bodyBox!.y + bodyBox!.height + 1);
  });
});