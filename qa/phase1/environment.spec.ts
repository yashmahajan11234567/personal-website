import { test, expect, type Page } from '@playwright/test';

/*
 * There is no shared helpers module in qa/phase1 yet -- the existing specs each
 * define their own navigation locally. These two follow that convention rather
 * than introducing a new file mid-suite.
 */

/**
 * Scroll to the selection phase and let the scrub settle.
 *
 * The fraction is 0.95, matching `reachSelection` in handoff.spec.ts and
 * touch.spec.ts. An earlier revision used 0.6, which is inside the hero scrub
 * but BEFORE the selection phase -- `world-board-data` never renders there, so
 * every hover timed out waiting for a locator that could not exist. The
 * selection phase is the tail of the track, not the middle.
 */
async function gotoSelection(page: Page): Promise<void> {
  // A FRESH load every time. Scrolling alone is not enough: once a test clicks
  // a board the cinematic enters its handoff, the plates unmount, and every
  // later `world-board-data` locator then waits for an element that can never
  // reappear -- a 45s timeout that reads like a broken locator but is really a
  // leaked state. Reloading puts each test on the same neutral starting point.
  await page.goto('/');
  await page.waitForTimeout(1000);

  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await page.evaluate((y) => window.scrollTo(0, y as number), Math.round(track * 0.95));
  await page.waitForTimeout(900);
}

/** Structural facts about the environment layer. */
async function readEnvironment(page: Page) {
  return page.evaluate(() => {
    const env = document.querySelector('.cinematic-env');
    const canvases = [...document.querySelectorAll('.cinematic-env__canvas')];
    return {
      canvasCount: canvases.length,
      pointerEvents: env ? getComputedStyle(env).pointerEvents : 'missing',
      ariaHidden: env?.getAttribute('aria-hidden') ?? 'missing',
      canvasPointer: canvases.map((c) => getComputedStyle(c).pointerEvents),
    };
  });
}

/*
 * The world-reactive environment.
 *
 * These tests cover the behavioural contract the brief states and that a green
 * build cannot prove on its own. Two of them exist specifically because the
 * corresponding bug shipped once and passed every other check:
 *
 *  - "no blank frame" on Data <-> Cloud. The rAF state originally lived in the
 *    effect closure with `visible` in its dependency array, so a hover change
 *    rebuilt the loop with progress reset to zero and the PIP vanished in the
 *    same frame the pointer moved away. Measured: PIP 0.00% while the clouds
 *    were still at 0.00%.
 *
 *  - the leave must recede rather than cut. A `visibility: hidden` gate keyed on
 *    `data-active` hid the whole layer in the frame the pointer left a plate,
 *    which is what made leave look instant (5.14% -> 0.00% inside 30ms).
 */

/*
 * INK THRESHOLDS ARE VIEWPORT-SENSITIVE -- measured, not guessed.
 *
 * Coverage is low by design: these are hairline strokes and flat cloud puffs,
 * not filled areas. Settled coverage measured at the suite viewport
 * (1440x900) is 0.0048 for the PIP network and 0.0095 for the cloud field,
 * versus ~0.05 for the PIP at 1280x720. Line weight scales with
 * `min(w, h) / 1280` because the canvas backing store is the space being
 * stroked, so a shorter viewport means thinner strokes over fewer pixels.
 *
 * The bar below is therefore set just under the LOWEST measured settled value
 * (0.0048), not a round number picked for the 1280x720 screenshots. Raising it
 * to 0.02 made six of these tests fail against a correctly working build.
 */
const SETTLED_MIN = 0.003;

/** Fraction of a canvas that has any visible alpha. */
async function envInk(page: Page, side: 'data' | 'cloud'): Promise<number> {
  return page.evaluate((s) => {
    const src = document.querySelector(`.cinematic-env__canvas--${s}`);
    if (!src) return -1;
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 120;
    const ctx = c.getContext('2d');
    if (!ctx) return -1;
    ctx.drawImage(src, 0, 0, 200, 120);
    const d = ctx.getImageData(0, 0, 200, 120).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
    return n / (200 * 120);
  }, side);
}

/** Mean alpha, which survives the far band's low alphas where a threshold does not. */
async function envMeanAlpha(page: Page, side: 'data' | 'cloud'): Promise<number> {
  return page.evaluate((s) => {
    const src = document.querySelector(`.cinematic-env__canvas--${s}`);
    if (!src) return -1;
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 120;
    const ctx = c.getContext('2d');
    if (!ctx) return -1;
    ctx.drawImage(src, 0, 0, 200, 120);
    const d = ctx.getImageData(0, 0, 200, 120).data;
    let sum = 0;
    for (let i = 3; i < d.length; i += 4) sum += d[i];
    return sum / (200 * 120);
  }, side);
}

test.describe('environment reactivity', () => {
  test('renders two decorative canvases behind everything', async ({ page }) => {
    await gotoSelection(page);
    const env = await readEnvironment(page);

    expect(env.canvasCount).toBe(2);
    // Never intercepts the pointer, and hidden from assistive tech.
    expect(env.pointerEvents).toBe('none');
    expect(env.ariaHidden).toBe('true');
    expect(env.canvasPointer).toEqual(['none', 'none']);
  });

  test('sits behind the figure, the plates and the typography', async ({ page }) => {
    await gotoSelection(page);
    const z = await page.evaluate(() => {
      const n = (sel: string) => {
        const el = document.querySelector(sel);
        return el ? Number(getComputedStyle(el).zIndex) : NaN;
      };
      return {
        env: n('.cinematic-env'),
        glow: n('.cinematic-glow'),
        figure: n('.cinematic-figure'),
        type: n('.cinematic-type'),
        boards: n('.cinematic-boards'),
      };
    });

    /*
     * Environment ABOVE the colour wash, and both below the subject.
     *
     * The brief lists ENVIRONMENT then ATMOSPHERIC COLOUR, but applying that
     * literally put the `multiply` wash over the canvas, which multiplied every
     * white structure by the accent hue -- white clouds became orange clouds on
     * orange. Both references show light structures AGAINST a colour field, so
     * the wash is the field and the structures sit on it. See the note in
     * EnvironmentLayer.css.
     */
    expect(z.glow).toBeLessThan(z.env);
    // The brief's actual hard constraint: never obscure the figure or the plates.
    expect(z.env).toBeLessThan(z.figure);
    expect(z.env).toBeLessThan(z.type);
    expect(z.env).toBeLessThan(z.boards);
    expect(z.figure).toBeLessThan(z.type);
    expect(z.type).toBeLessThan(z.boards);
  });

  test('nothing is drawn during PERSONAL / PORTFOLIO', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1200);

    // The layer is not displayed at all outside the selection phase.
    const display = await page.evaluate(() => {
      const el = document.querySelector('.cinematic-env');
      return el ? getComputedStyle(el).display : 'missing';
    });
    expect(display).toBe('none');
    expect(await envInk(page, 'data')).toBe(0);
    expect(await envInk(page, 'cloud')).toBe(0);

    // And the opening stays monochrome: no blue, no orange.
    const sat = await page.evaluate(() => {
      const src = document.querySelector('.cinematic-env__canvas--data');
      if (!src) return 0;
      const c = document.createElement('canvas');
      c.width = 120;
      c.height = 68;
      const ctx = c.getContext('2d');
      if (!ctx) return 0;
      ctx.drawImage(src, 0, 0, 120, 68);
      const d = ctx.getImageData(0, 0, 120, 68).data;
      let sum = 0;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        sum += mx === 0 ? 0 : (mx - mn) / mx;
        n++;
      }
      return n ? sum / n : 0;
    });
    expect(sat).toBeLessThan(0.05);
  });

  test('Data hover progressively builds the PIP network', async ({ page }) => {
    await gotoSelection(page);
    const before = await envInk(page, 'data');
    expect(before).toBe(0);

    await page.locator('[data-testid="world-board-data"]').hover();

    // Progressive emergence, sampled through the build rather than asserted
    // from CSS: each sample must exceed the last.
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      samples.push(await envInk(page, 'data'));
      await page.waitForTimeout(220);
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[samples.length - 1]).toBeGreaterThan(SETTLED_MIN);
  });

  test('Cloud hover progressively builds the cloud field', async ({ page }) => {
    await gotoSelection(page);
    expect(await envInk(page, 'cloud')).toBe(0);

    await page.locator('[data-testid="world-board-cloud"]').hover();

    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      samples.push(await envInk(page, 'cloud'));
      await page.waitForTimeout(220);
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    expect(samples[samples.length - 1]).toBeGreaterThan(SETTLED_MIN);
  });

  test('only the hovered world is drawn', async ({ page }) => {
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(1300);
    expect(await envInk(page, 'data')).toBeGreaterThan(SETTLED_MIN);
    expect(await envInk(page, 'cloud')).toBe(0);

    await page.locator('[data-testid="world-board-cloud"]').hover();
    await page.waitForTimeout(1600);
    expect(await envInk(page, 'cloud')).toBeGreaterThan(SETTLED_MIN);
  });

  test('Data to Cloud crossfades with no blank frame', async ({ page }) => {
    test.slow();
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(1400);
    expect(await envInk(page, 'data')).toBeGreaterThan(SETTLED_MIN);

    await page.locator('[data-testid="world-board-cloud"]').hover();

    /*
     * The total ink across both canvases must never fall to zero. This is the
     * assertion that catches the closure-reset bug: it drove each canvas to 0
     * independently, so the sum hit 0 while the two builds were out of phase.
     */
    const totals: number[] = [];
    for (let i = 0; i < 10; i++) {
      const d = await envInk(page, 'data');
      const c = await envInk(page, 'cloud');
      totals.push(d + c);
      await page.waitForTimeout(70);
    }
    expect(Math.min(...totals)).toBeGreaterThan(0.005);
  });

  test('Cloud to Data crossfades with no blank frame', async ({ page }) => {
    test.slow();
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-cloud"]').hover();
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="world-board-data"]').hover();

    const totals: number[] = [];
    for (let i = 0; i < 10; i++) {
      totals.push((await envInk(page, 'data')) + (await envInk(page, 'cloud')));
      await page.waitForTimeout(70);
    }
    expect(Math.min(...totals)).toBeGreaterThan(0.005);
  });

  test('leave recedes gradually rather than cutting', async ({ page }) => {
    test.slow();
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(1400);
    const settled = await envMeanAlpha(page, 'data');
    expect(settled).toBeGreaterThan(0.2);

    await page.mouse.move(640, 715);

    /*
     * Sampled with mean alpha rather than a coverage threshold: the far band
     * draws at 0.30 * progress, so a threshold of 8/255 reports the whole field
     * as empty while the leave is barely started, which hides the very decay
     * this asserts.
     */
    const decay: number[] = [];
    for (let i = 0; i < 8; i++) {
      decay.push(await envMeanAlpha(page, 'data'));
      await page.waitForTimeout(60);
    }
    // Monotonically non-increasing, and it actually decays rather than holding.
    for (let i = 1; i < decay.length; i++) {
      expect(decay[i]).toBeLessThanOrEqual(decay[i - 1] + 0.05);
    }
    expect(decay[decay.length - 1]).toBeLessThan(settled);
  });

  test('the layer stays displayed through a leave so the recede is visible', async ({ page }) => {
    await gotoSelection(page);
    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(1200);

    await page.mouse.move(640, 715);
    // Must not be display:none the instant the pointer leaves: that was what
    // collapsed the leave into a single frame.
    const display = await page.evaluate(
      () => getComputedStyle(document.querySelector('.cinematic-env')!).display,
    );
    expect(display).toBe('block');
  });

  test('keyboard focus builds the environment as well as pointer hover', async ({ page }) => {
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-cloud"]').focus();

    /*
     * Polled rather than fixed-waited. Measured from a clean state, focus builds
     * 0 -> 0.0094 -> 0.062 -> 0.1375 across the first ~1.5s, but the first
     * frame after `focus()` can read exactly 0 -- the rAF loop has not run yet --
     * so a single 1300ms wait was racing the loop's start rather than testing it.
     */
    await expect
      .poll(() => envInk(page, 'cloud'), { timeout: 5_000, intervals: [150, 250, 400] })
      .toBeGreaterThan(SETTLED_MIN);
    expect(await envInk(page, 'data')).toBe(0);
  });

  test('the environment is suppressed once a world is chosen', async ({ page }) => {
    test.slow();
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-data"]').hover();

    /*
     * Wait for the build to actually SETTLE before recording the baseline.
     * A fixed 1500ms sampled it mid-climb on a loaded machine, producing a
     * "settled" figure of 0.0241 that the fully built 0.0407 then exceeded --
     * the decay assertions compared against a baseline that was never real.
     * Polling until the value stops climbing gives an honest ceiling.
     */
    let settledInk = 0;
    for (let i = 0; i < 12; i++) {
      const v = await envInk(page, 'data');
      settledInk = Math.max(settledInk, v);
      await page.waitForTimeout(200);
    }
    expect(settledInk).toBeGreaterThan(SETTLED_MIN);

    // Choose the world: the environment must not outlive the decision, which
    // would otherwise compound with the handoff's own dominance animation.
    await page.locator('[data-testid="world-board-data"]').click();
    await expect(page.locator('.cinematic-hero[data-handoff]')).toHaveCount(1, {
      timeout: 5_000,
    });
    /*
     * Sampled across the handoff, not at one point. The environment is
     * suppressed the moment `selectedPath` is set, but it RECEDES through the
     * same ~620ms curve rather than cutting -- measured 0.0447 -> 0.0413 ->
     * 0.0243 -> 0.0154 -> 0.0098 -> 0.0053 across the 820ms transition.
     *
     * A single late sample is too fragile: the recede's final frames are
     * sub-pixel, so run-to-run variance straddles any threshold picked there
     * (measured 0.003875 against a 0.003 bar -- a real recede, a bad bar).
     * What matters is the SHAPE: it decays, it stays monotonic, and it ends far
     * below where it started.
     */
    const decay: number[] = [];
    for (let i = 0; i < 6; i++) {
      decay.push(await envInk(page, 'data'));
      await page.waitForTimeout(110);
    }
    expect(decay[0]).toBeLessThan(settledInk);
    // Monotonically non-increasing throughout the recede.
    for (let i = 1; i < decay.length; i++) {
      expect(decay[i]).toBeLessThanOrEqual(decay[i - 1] + 0.002);
    }
    // And it is effectively gone by the end.
    expect(decay[decay.length - 1]).toBeLessThan(settledInk * 0.25);
  });

  test('reduced motion paints the settled state without animating', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-data"]').hover();
    // No build animation, but the state is immediately and fully present.
    await page.waitForTimeout(120);
    expect(await envInk(page, 'data')).toBeGreaterThan(SETTLED_MIN);
  });

  test('the environment never intercepts the board hit targets', async ({ page }) => {
    await gotoSelection(page);

    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(1200);
    expect(await envInk(page, 'data')).toBeGreaterThan(SETTLED_MIN);

    /*
     * A click on the hovered plate must still register as a selection, proving
     * the canvas layer is not swallowing the pointer. The plates unmount during
     * the 820ms handoff, so the assertion has to be made on a state attribute
     * rather than on the button still being present -- waiting for the element
     * after the click times out against an element that has been removed on
     * purpose.
     */
    await page.locator('[data-testid="world-board-data"]').click();
    await expect(page.locator('.cinematic-hero[data-handoff]')).toHaveCount(1, {
      timeout: 5_000,
    });
  });
});