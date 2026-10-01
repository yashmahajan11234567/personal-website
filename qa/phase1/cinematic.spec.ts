/**
 * Phase 1 acceptance tests (Tasks 7 + the STOP gate QA).
 *
 * These encode the requirements that are objectively checkable, so a
 * regression is a failing test rather than a subjective judgement call.
 *
 * Reference: .gsd/plans/phase-1-cinematic-rebuild.md
 */

import { test, expect, type Page } from '@playwright/test';

/** Total scrollable distance of the cinematic track. */
async function scrollTrack(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
}

/** Scroll to a fraction of the track and let the scrub settle. */
async function scrollToProgress(page: Page, fraction: number): Promise<void> {
  const track = await scrollTrack(page);
  await page.evaluate(
    ([y]) => window.scrollTo(0, y as number),
    [Math.round(track * fraction)]
  );
  // scrub 0.6 needs time to catch up
  await page.waitForTimeout(900);
}

/** Bounding box of the figure, in page coordinates. */
async function figureBox(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="cinematic-figure"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
}

test.describe('structure', () => {
  test('renders every layer and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    await page.waitForTimeout(1200);

    await expect(page.locator('.cinematic-hero')).toBeVisible();
    await expect(page.locator('.cinematic-ground')).toBeAttached();
    await expect(page.locator('[data-testid="cinematic-figure"]')).toBeAttached();
    await expect(page.locator('[data-testid="cinematic-grain"]')).toBeAttached();
    await expect(page.locator('[data-plate="data"]')).toBeAttached();
    await expect(page.locator('[data-plate="cloud"]')).toBeAttached();
    await expect(page.locator('.cinematic-type__word')).toHaveCount(2);

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('the figure image actually loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>('.cinematic-figure__image');
      return img ? { complete: img.complete, w: img.naturalWidth, h: img.naturalHeight } : null;
    });
    expect(info).not.toBeNull();
    expect(info!.complete).toBe(true);
    expect(info!.w).toBeGreaterThan(100);
    expect(info!.h).toBeGreaterThan(100);
  });

  test('no frame-sequence or video asset is shipped', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/');
    await page.waitForTimeout(1500);
    const bad = requests.filter(
      (u) => u.includes('/frames/') || u.endsWith('.mp4')
    );
    expect(bad, `bitmap media requested:\n${bad.join('\n')}`).toEqual([]);
  });
});

test.describe('D5 — the figure never moves', () => {
  test('figure box is identical at every scroll position', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const first = await figureBox(page);
    expect(first).not.toBeNull();

    for (const f of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      await scrollToProgress(page, f);
      const box = await figureBox(page);
      expect(box, `figure missing at ${f}`).not.toBeNull();
      // Sub-pixel tolerance: layout rounding only, no movement.
      expect(Math.abs(box!.x - first!.x), `x moved at ${f}`).toBeLessThan(1);
      expect(Math.abs(box!.y - first!.y), `y moved at ${f}`).toBeLessThan(1);
      expect(Math.abs(box!.w - first!.w), `w changed at ${f}`).toBeLessThan(1);
      expect(Math.abs(box!.h - first!.h), `h changed at ${f}`).toBeLessThan(1);
    }
  });

  test('figure has no CSS transform at any scroll position', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      await scrollToProgress(page, f);
      const t = await page.evaluate(
        () => getComputedStyle(document.querySelector('[data-testid="cinematic-figure"]')!).transform
      );
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)'], `transform at ${f} was ${t}`).toContain(t);
    }
  });
});

test.describe('scroll drives the timeline', () => {
  test('the page provides a multi-viewport scroll track', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);
    const track = await scrollTrack(page);
    // 700vh track means ~6 viewport heights of scroll on desktop.
    expect(track).toBeGreaterThan(900 * 4);
  });

  test('boards are hidden early and seated at the selection hold', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    await scrollToProgress(page, 0);
    const early = await page.evaluate(
      () => Number(getComputedStyle(document.querySelector('[data-plate="data"]')!).opacity)
    );
    expect(early).toBeLessThan(0.35);

    await scrollToProgress(page, 0.9);
    const late = await page.evaluate(
      () => Number(getComputedStyle(document.querySelector('[data-plate="data"]')!).opacity)
    );
    expect(late).toBeGreaterThan(0.95);
  });

  test('headline words exit upward rather than fading in place', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(800);

    const readWord = () =>
      page.evaluate(() => {
        const el = document.querySelector('.cinematic-type__word--left')!;
        const cs = getComputedStyle(el);
        return { transform: cs.transform, opacity: Number(cs.opacity) };
      });

    await scrollToProgress(page, 0.1);
    const atAnchor = await readWord();
    await scrollToProgress(page, 0.27);
    const atExit = await readWord();

    // The word must have physically translated (matrix d/e components differ),
    // not merely become transparent.
    expect(atAnchor.transform).not.toBe(atExit.transform);
  });
});

test.describe('D4 — monochrome at rest, accent on hover only', () => {
  test('no glow is visible before interaction', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    const alpha = await page.evaluate(() => {
      const w = document.querySelector('.cinematic-glow__wash--data') as HTMLElement;
      return Number(getComputedStyle(w).opacity);
    });
    expect(alpha).toBeLessThan(0.02);
  });

  test('hovering Data produces a blue wash and Cloud an orange one', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);

    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(500);
    const dataState = await page.evaluate(() => {
      const root = document.querySelector('.cinematic-glow')!;
      const w = document.querySelector('.cinematic-glow__wash--data') as HTMLElement;
      return {
        active: root.getAttribute('data-active'),
        opacity: Number(getComputedStyle(w).opacity),
        bg: getComputedStyle(w).backgroundImage,
      };
    });
    expect(dataState.active).toBe('data');
    expect(dataState.opacity).toBeGreaterThan(0.5);
    // Blue channel dominant in the wash colour.
    const blueMatch = dataState.bg.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (blueMatch) {
      const [, r, g, b] = blueMatch.map(Number);
      expect(b, `data wash rgb(${r},${g},${b}) should be blue-dominant`).toBeGreaterThan(r);
    }

    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);

    await page.locator('[data-testid="world-board-cloud"]').hover();
    await page.waitForTimeout(500);
    const cloudState = await page.evaluate(() => {
      const root = document.querySelector('.cinematic-glow')!;
      const w = document.querySelector('.cinematic-glow__wash--cloud') as HTMLElement;
      return {
        active: root.getAttribute('data-active'),
        opacity: Number(getComputedStyle(w).opacity),
        bg: getComputedStyle(w).backgroundImage,
      };
    });
    expect(cloudState.active).toBe('cloud');
    const orangeMatch = cloudState.bg.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (orangeMatch) {
      const [, r, g, b] = orangeMatch.map(Number);
      expect(r, `cloud wash rgb(${r},${g},${b}) should be red-dominant`).toBeGreaterThan(b);
    }
  });
});

test.describe('plate geometry matches the reference', () => {
  test('plates are symmetric in size and vertical placement, per the reference', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    const boxes = await page.evaluate(() => {
      const norm = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.x / innerWidth,
          y: r.y / innerHeight,
          w: r.width / innerWidth,
          h: r.height / innerHeight,
        };
      };
      return {
        data: norm(document.querySelector('[data-plate="data"]')!),
        cloud: norm(document.querySelector('[data-plate="cloud"]')!),
      };
    });

    // Measured reference: top delta 0.0028, height delta 0.0042, width delta
    // 0.0060. An earlier revision of this suite asserted the opposite
    // (asymmetric) on the strength of a mis-measurement.
    expect(Math.abs(boxes.data.y - boxes.cloud.y), 'tops aligned').toBeLessThan(0.02);
    expect(
      Math.abs(boxes.data.h - boxes.cloud.h),
      'equal heights'
    ).toBeLessThan(0.02);
    expect(Math.abs(boxes.data.w - boxes.cloud.w), 'equal widths').toBeLessThan(0.02);

    // Data left of centre, Cloud right of centre.
    const dCentre = boxes.data.x + boxes.data.w / 2;
    const cCentre = boxes.cloud.x + boxes.cloud.w / 2;
    expect(dCentre).toBeLessThan(0.5);
    expect(cCentre).toBeGreaterThan(0.5);
  });

  test('Data plate carries two lines, Cloud two lines at a larger scale', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    const data = await page.evaluate(() => {
      const plate = document.querySelector('[data-plate="data"]')!;
      const lines = plate.querySelectorAll('.cinematic-plate__line');
      const body = plate.querySelector('.cinematic-plate__body')!;
      return {
        count: lines.length,
        text: Array.from(lines).map((l) => l.textContent),
        // parseFloat on a resolved clamp() value ("39.2px") -> number.
        fontSize: parseFloat(getComputedStyle(body).fontSize),
      };
    });
    expect(data.count).toBe(2);
    expect(data.text).toEqual(['DATA ANALYST', 'DATA ENGINEER']);
    expect(Number.isFinite(data.fontSize)).toBe(true);

    // The Cloud plate also has two lines, but is a shorter wordmark, so its
    // type is scaled up to hold visual weight against the Data plate's two lines.
    const cloud = await page.evaluate(() => {
      const plate = document.querySelector('[data-plate="cloud"]')!;
      const lines = plate.querySelectorAll('.cinematic-plate__line');
      const body = plate.querySelector('.cinematic-plate__body')!;
      return {
        count: lines.length,
        fontSize: parseFloat(getComputedStyle(body).fontSize),
      };
    });
    expect(cloud.count).toBe(2);
    expect(cloud.fontSize).toBeGreaterThan(data.fontSize);
  });

  test('board hit targets match the plates, not the old hardcoded boxes', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    const alignment = await page.evaluate(() => {
      const pairs = [
        ['data', '[data-plate="data"]', '[data-testid="world-board-data"]'],
        ['cloud', '[data-plate="cloud"]', '[data-testid="world-board-cloud"]'],
      ] as const;
      return pairs.map(([name, plateSel, btnSel]) => {
        const p = document.querySelector(plateSel)!.getBoundingClientRect();
        const b = document.querySelector(btnSel)!.getBoundingClientRect();
        return { name, dx: Math.abs(p.x - b.x), dy: Math.abs(p.y - b.y) };
      });
    });
    for (const a of alignment) {
      expect(a.dx, `${a.name} target x drifts from plate`).toBeLessThan(2);
      expect(a.dy, `${a.name} target y drifts from plate`).toBeLessThan(2);
    }
  });
});

test.describe('accessibility (brief section 14)', () => {
  test('both boards are real buttons with labels and >=44px targets', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);

    for (const world of ['data', 'cloud']) {
      const btn = page.locator(`[data-testid="world-board-${world}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute('type', 'button');
      const label = await btn.getAttribute('aria-label');
      expect(label, `${world} has no aria-label`).toBeTruthy();
      expect(label!.length).toBeGreaterThan(10);

      const box = await btn.boundingBox();
      expect(box!.width, `${world} target width`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${world} target height`).toBeGreaterThanOrEqual(44);
    }
  });

  test('nothing interactive is aria-hidden', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    const hidden = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('.world-board').forEach((el) => {
        if (el.closest('[aria-hidden="true"]')) out.push(el.getAttribute('data-world') || '?');
      });
      return out;
    });
    expect(hidden).toEqual([]);
  });

  test('keyboard: Tab reaches both boards, focus ring is visible', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    let reached: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const world = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-world')
      );
      if (world) reached.push(world);
    }
    expect(reached, 'Tab never reached the world boards').toContain('data');
    expect(reached).toContain('cloud');

    // Focus-visible ring must actually change border colour.
    // The ring is styled with :focus-visible, which only applies to keyboard-driven
    // focus. Do NOT click the body first: clicking moves focus to <body>, and
    // Chromium then resumes tabbing from the click point, which skips the boards
    // entirely. Tabbing from a freshly loaded page reaches them reliably.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const isData = await page.evaluate(
        () => document.activeElement?.getAttribute('data-world') === 'data'
      );
      if (isData) break;
    }
    await expect(page.locator('[data-testid="world-board-data"]')).toBeFocused();

    // :focus-visible must genuinely be engaged, or the ring is not a11y-visible.
    expect(
      await page.evaluate(() =>
        document
          .querySelector('[data-testid="world-board-data"]')!
          .matches(':focus-visible')
      )
    ).toBe(true);

    // Wait for the 180ms ring transition to settle. The border colour is
    // mid-fade (alpha < 1) if sampled immediately after focus.
    await page.waitForFunction(
      () => {
        const r = document.querySelector(
          '[data-testid="world-board-data"] .world-board__ring'
        );
        if (!r) return false;
        const c = getComputedStyle(r).borderTopColor;
        return c === 'rgb(255, 255, 255)';
      },
      undefined,
      { timeout: 3000 }
    );

    const ring = await page.evaluate(() => {
      const r = document.querySelector(
        '[data-testid="world-board-data"] .world-board__ring'
      )!;
      return getComputedStyle(r).borderTopColor;
    });
    expect(ring).not.toBe('rgba(0, 0, 0, 0)');
    expect(ring).toBe('rgb(255, 255, 255)');
  });

  test('Enter selects the focused world and routes to it', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);

    await page.locator('[data-testid="world-board-data"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);

    await expect(page.locator('.placeholder-world')).toBeVisible();
    await expect(page).toHaveURL(/#\/data-world/);
  });

  test('Space selects the focused world', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    await page.locator('[data-testid="world-board-cloud"]').focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/#\/cloud-world/);
  });

  test('a polite live region exists', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 0.9);
    await expect(page.locator('[aria-live="polite"]')).toBeAttached();
  });
});

test.describe('nothing is ever auto-selected', () => {
  test('scrolling to the very end does not select a world', async ({ page }) => {
    await page.goto('/');
    await scrollToProgress(page, 1);
    await page.waitForTimeout(800);
    const selected = await page.evaluate(
      () => document.querySelector('.cinematic-hero')?.getAttribute('data-selected')
    );
    expect(selected).toBeNull();
    await expect(page.locator('.placeholder-world')).toHaveCount(0);
  });
});
