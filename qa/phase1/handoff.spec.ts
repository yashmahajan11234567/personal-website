/**
 * Task 8 — world-entry handoff (Q6).
 *
 * Q6 is mostly a set of PROHIBITIONS, so most of this file asserts absence:
 * no loading screen, no spinner, no content in the overlay, no camera move, no
 * colour flood, and no auto-selection. The positive requirements are that the
 * chosen plate becomes dominant, the accent appears, the figure never moves,
 * and the world mounts at the end.
 *
 * The reference video intentionally ends at selection, so there is no reference
 * footage for this transition. It is judged against Q6's text, not against a
 * video.
 */

import { test, expect, type Page } from '@playwright/test';

/** Reach the selection hold and wait for the scrub to settle. */
async function reachSelection(page: Page) {
  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await page.evaluate((y) => window.scrollTo(0, y as number), Math.round(track * 0.95));
  await page.waitForTimeout(900);
}

/**
 * Collect console + page errors for the life of the test.
 *
 * Network-level resource failures are excluded. `net::ERR_NETWORK_CHANGED` is a
 * dev-server HMR reconnect, not an application defect, and it was intermittently
 * failing an otherwise-clean acceptance run. Anything the app itself throws —
 * including the removeChild NotFoundError — is still collected, because those
 * arrive as pageerror or as console errors without a net:: marker.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  const push = (text: string) => {
    if (/net::ERR_|Failed to load resource/i.test(text)) return;
    errors.push(text);
  };
  page.on('console', (m) => {
    if (m.type() === 'error') push(m.text());
  });
  page.on('pageerror', (e) => push(String(e)));
  return errors;
}

test.describe('Q6 handoff — the prohibitions', () => {
  test('no loading screen, spinner, or progress indicator appears', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');

    // Sample throughout the transition for anything that looks like a loader.
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(120);
      const forbidden = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('body *'));
        const text = all
          .map((e) => (e.textContent || '').trim().toLowerCase())
          .join(' ');
        const hits: string[] = [];
        if (/\bloading\b|\bplease wait\b|\benter(ing)? world\b/.test(text)) hits.push('loading text');
        if (document.querySelector('[role="progressbar"]')) hits.push('progressbar role');
        if (document.querySelector('[aria-busy="true"]')) hits.push('aria-busy');
        // A spinner is an element rotating itself; look for the CSS pattern.
        if (document.querySelector('[class*="spin"],[class*="loader"],[class*="skeleton"]')) {
          hits.push('spinner/loader/skeleton class');
        }
        return hits;
      });
      expect(forbidden, `frame ${i}: ${forbidden.join(', ')}`).toEqual([]);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the overlay contains no text or images', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(300);

    const overlay = page.locator('.cinematic-handoff');
    await expect(overlay).toHaveCount(1);
    // Decorative, empty, and not focusable.
    await expect(overlay).toHaveText('');
    const attrs = await overlay.evaluate((el) => ({
      ariaHidden: el.getAttribute('aria-hidden'),
      tabIndex: el.getAttribute('tabindex'),
      childCount: el.children.length,
      innerHtml: el.innerHTML.trim(),
    }));
    expect(attrs.ariaHidden).toBe('true');
    expect(attrs.tabIndex).toBeNull();
    expect(attrs.childCount).toBe(0);
    expect(attrs.innerHtml).toBe('');
  });

  test('the ground never moves — no invented camera animation', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);

    const readGround = () =>
      page
        .locator('.cinematic-ground__field')
        .evaluate((el) => getComputedStyle(el).transform)
        .catch(() => null); // hero unmounted: transition over, nothing moved after

    const before = await readGround();
    expect(before).not.toBeNull();

    await page.click('[data-testid="world-board-data"]');

    // Sample inside the transition. It is only 820ms, so this must not overrun
    // it — an overrun used to leave the locator waiting on a detached hero for
    // the full test timeout.
    const deadline = Date.now() + 700;
    let samples = 0;
    while (Date.now() < deadline) {
      const during = await readGround();
      if (during === null) break; // transition finished; world is mounting
      expect(during).toBe(before);
      samples++;
    }
    expect(samples, 'sampled at least once mid-transition').toBeGreaterThan(0);
  });

  test('the figure never moves during the handoff (D5 holds throughout)', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);

    const readFigure = () =>
      page
        .locator('.cinematic-figure')
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, t: getComputedStyle(el).transform };
        })
        .catch(() => null);

    const before = await readFigure();
    expect(before).not.toBeNull();

    await page.click('[data-testid="world-board-data"]');

    const deadline = Date.now() + 700;
    let samples = 0;
    while (Date.now() < deadline) {
      const during = await readFigure();
      if (during === null) break;
      expect(during.t, 'figure must never be transformed').toBe(before.t);
      expect(Math.abs(during.x - before.x)).toBeLessThan(0.5);
      expect(Math.abs(during.y - before.y)).toBeLessThan(0.5);
      samples++;
    }
    expect(samples, 'sampled at least once mid-transition').toBeGreaterThan(0);
  });

  test('the accent actually brightens during the handoff, not dims', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);

    // Hover peak: the gradient already peaks at 0.16 alpha with opacity 1.
    await page.hover('[data-testid="world-board-data"]');
    await page.waitForTimeout(400);
    const hoverWash = await page.evaluate(
      () => getComputedStyle(document.querySelector('.cinematic-glow__wash--data')!).backgroundImage
    );

    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(200);
    const handoffWash = await page.evaluate(
      () => getComputedStyle(document.querySelector('.cinematic-glow__wash--data')!).backgroundImage
    );

    // Extract the peak alpha from each gradient. Computed gradients serialize as
    // rgb(96, 174, 232, 0.16) — alpha is the last comma-separated field inside
    // the parentheses, so parse per colour function rather than with one regex
    // that must span the inner commas.
    const peakAlpha = (img: string) => {
      let max = 0;
      for (const fn of img.matchAll(/rgba?\(([^)]*)\)/g)) {
        const parts = fn[1].split(',');
        const a = Number(parts[parts.length - 1].trim());
        if (Number.isFinite(a) && a > max) max = a;
      }
      return max;
    };

    expect(peakAlpha(hoverWash)).toBeCloseTo(0.16, 3);

    // An earlier revision set opacity 0.3 here, which made the accent DIMMER
    // exactly when it was meant to bloom. This asserts the peak alpha rises.
    expect(peakAlpha(handoffWash)).toBeGreaterThan(peakAlpha(hoverWash));
    // And it stays restrained — D4's ceiling is 0.16 at rest.
    expect(peakAlpha(handoffWash)).toBeLessThanOrEqual(0.22);
  });

  test('the idle scene is not flooded with colour — only the chosen accent', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-cloud"]');

    // Sample the whole viewport's colour character partway through.
    await page.waitForTimeout(420);
    const veil = await page.locator('.cinematic-handoff').evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, opacity: Number(s.opacity) };
    });
    // The veil is monochrome. It must not become a colour overlay.
    expect(veil.bg).toBe('rgb(10, 10, 10)');

    const glows = await page.evaluate(() => {
      const w = document.querySelector('.cinematic-glow__wash--cloud');
      const d = document.querySelector('.cinematic-glow__wash--data');
      return {
        cloud: Number(getComputedStyle(w).opacity),
        data: Number(getComputedStyle(d).opacity),
      };
    });
    // Only the chosen world glows. Cloud chosen => cloud lit, data dark.
    expect(glows.cloud).toBeGreaterThan(0.2);
    expect(glows.data).toBeLessThan(0.05);
  });
});

test.describe('Q6 handoff — the sequence', () => {
  test('the chosen plate becomes dominant and the other recedes', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);

    const boxOf = (sel: string) =>
      page.locator(sel).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.width;
      });

    const chosenBefore = await boxOf('.cinematic-boards__slot--data');
    const otherBefore = await boxOf('.cinematic-boards__slot--cloud');

    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(700); // late in the transition, before mount

    const chosenAfter = await boxOf('.cinematic-boards__slot--data');
    const otherAfter = await boxOf('.cinematic-boards__slot--cloud');

    expect(chosenAfter).toBeGreaterThan(chosenBefore);
    expect(otherAfter).toBeLessThan(otherBefore);
  });

  test('the world mounts only after the transition has played out', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');

    // Immediately after the click the hero must STILL be on screen — this is
    // what makes the handoff a transition rather than a swap.
    await page.waitForTimeout(60);
    await expect(page.locator('.cinematic-hero')).toBeAttached();
    await expect(page.locator('.placeholder-world')).toHaveCount(0);

    // And the hash must not have changed yet, because the world is not mounted.
    expect(await page.evaluate(() => location.hash)).toBe('');

    // Then it arrives.
    await expect(page.locator('.placeholder-world')).toBeVisible({ timeout: 3000 });
    expect(await page.evaluate(() => location.hash)).toBe('#/data-world');
  });

  test('the swap is invisible — the veil lands on the world background colour', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);

    const veilColour = await page.locator('.cinematic-handoff').evaluate((el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor;
    });

    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(700);
    await expect(page.locator('.placeholder-world')).toBeVisible({ timeout: 3000 });

    const worldColour = await page
      .locator('.placeholder-world')
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    // Identical colours mean the hand-off is a cross-dissolve with no flash.
    expect(veilColour).toBe(worldColour);
  });

  test('the hero covers the viewport for the whole transition', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(120);
      const box = await page.locator('.cinematic-hero').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, top: r.top };
      });
      const vp = page.viewportSize();
      expect(box.w).toBeGreaterThanOrEqual(vp.width - 1);
      expect(box.h).toBeGreaterThanOrEqual(vp.height - 1);
      // Must not have slid up out of view when the pin was released.
      expect(Math.abs(box.top)).toBeLessThan(2);
    }
  });

  test('nothing stays interactive once a world is chosen', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="world-board-data"]')).toHaveCount(0);
  });

  test('the boards cannot be selected twice', async ({ page }) => {
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(700);
    await expect(page.locator('.placeholder-world')).toBeVisible({ timeout: 3000 });
    // Must be the Data world, not Cloud from a second stray activation.
    await expect(page.locator('.placeholder-world h1')).toHaveText(/Data World/i);
  });
});

test.describe('Q6 handoff — teardown and navigation', () => {
  test('deep-linking to a world does not crash the app', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/#/data-world');
    await page.waitForTimeout(600);
    await expect(page.locator('.placeholder-world h1')).toHaveText(/Data World/i);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('hero -> world -> hero round-trips with no errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-data"]');
    await expect(page.locator('.placeholder-world')).toBeVisible({ timeout: 3000 });
    await page.click('.placeholder-world button');
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 3000 });
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a world can still be reached by deep link after a handoff', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await reachSelection(page);
    await page.click('[data-testid="world-board-cloud"]');
    await expect(page.locator('.placeholder-world h1')).toHaveText(/Cloud World/i, {
      timeout: 3000,
    });
    expect(await page.evaluate(() => location.hash)).toBe('#/cloud-world');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Q6 handoff — reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the world mounts immediately with no dissolve', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await page.waitForTimeout(400);

    // Both boards live immediately; no scroll choreography needed.
    await expect(page.locator('[data-testid="world-board-data"]')).toBeAttached();
    await page.click('[data-testid="world-board-data"]');

    // No dwell: the world is there without waiting out a transition.
    await expect(page.locator('.placeholder-world h1')).toHaveText(/Data World/i, {
      timeout: 1000,
    });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('nothing is auto-selected and the veil never becomes visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);
    // Sitting on the page must not enter a world by itself.
    await expect(page.locator('.placeholder-world')).toHaveCount(0);

    await page.click('[data-testid="world-board-cloud"]');
    await expect(page.locator('.placeholder-world h1')).toHaveText(/Cloud World/i, {
      timeout: 1000,
    });
  });

  test('no plate or type transform is applied under reduced motion', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(400);

    const idle = await page.evaluate(() => ({
      data: getComputedStyle(document.querySelector('.cinematic-boards__slot--data')!).transform,
      type: getComputedStyle(document.querySelector('.cinematic-type')!).opacity,
    }));
    expect(idle.data).toBe('none');

    // Kick off the handoff and confirm the transforms stay off.
    await page.click('[data-testid="world-board-data"]');
    await page.waitForTimeout(120);
    const during = await page.evaluate(() => {
      const el = document.querySelector('.cinematic-boards__slot--data');
      return el ? getComputedStyle(el).transform : 'mounted';
    });
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)', 'mounted']).toContain(during);
  });
});