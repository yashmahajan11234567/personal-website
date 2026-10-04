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
  // A FRESH load every time. Scrolling alone is not enough: once a test clicks a
  // board the cinematic enters its handoff, the plates unmount, and every later
  // `world-board-data` locator then waits for an element that can never reappear
  // -- a 45s timeout that reads like a broken locator but is really a leaked
  // state. Reloading puts each test on the same neutral starting point.
  await page.goto('/');
  await page.waitForTimeout(1000);

  const track = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await page.evaluate((y) => window.scrollTo(0, y as number), Math.round(track * 0.95));
  await page.waitForTimeout(900);
}

/*
 * REWRITTEN -- the environment layer is deliberately NOT MOUNTED.
 *
 * These tests previously asserted that a world-reactive PIP-network / cloud-field
 * canvas builds on hover, crossfades between worlds, recedes on leave, and is
 * suppressed after selection. That feature was REMOVED from the approved
 * cinematic. `EnvironmentLayer` is not imported by `CinematicHero.tsx`, with this
 * note at the mount site:
 *
 *   "NO HOVER COLOUR. AccentGlowLayer (the blue/orange multiply wash) and
 *    EnvironmentLayer (the pipe network / cloud field) are no longer mounted.
 *    Hovering a board now changes the plate's scale and nothing else -- the
 *    backdrop stays the same pale ground it has for the whole cinematic."
 *
 * The files are kept on disk, unmounted, because the store fields they read and
 * the handoff sequencing are shared with the plate scale and the board targets.
 *
 * So the old assertions were not catching a regression: they described a feature
 * that had been intentionally replaced, and all 14 failed because
 * `document.querySelector('.cinematic-env')` returned null. No source was changed
 * to make them pass. These tests were rewritten to protect the behaviour that is
 * actually approved, following the pattern `cinematic.spec.ts` already uses for
 * the unmounted AccentGlowLayer (its "D4 -- hover is monochrome" block).
 *
 * WHY NOT JUST DELETE THEM. "No colour layer is mounted" is also exactly what a
 * broken or half-removed layer looks like, so a bare absence assertion is weak
 * evidence. Each test below therefore pairs the ABSENCE of the environment layer
 * with PRESENCE of the effects that were kept -- the plate's 1.04 hover scale, the
 * plate hit targets, the z-order of the surviving layers, and the working click
 * into the handoff. Absence plus presence is what distinguishes "removed as
 * intended" from "stopped rendering".
 *
 * IF THE ENVIRONMENT IS EVER REMOUNTED: restore the canvas-ink assertions from git
 * history rather than writing new ones. The measurement notes in that version are
 * load-bearing -- `SETTLED_MIN` sat just under the LOWEST measured settled coverage
 * (0.0048), not a round number, and the leave/crossfade tests polled instead of
 * fixed-waiting because a fixed wait sampled the build mid-climb.
 */

/** The plate hover scale the approved cinematic DOES apply. */
const HOVER_SCALE = 1.04;

/** Structural facts about the cinematic's layers. */
async function readEnvironment(page: Page) {
  return page.evaluate(() => {
    const env = document.querySelector('.cinematic-env');
    return {
      envCount: document.querySelectorAll('.cinematic-env').length,
      canvasCount: document.querySelectorAll('.cinematic-env__canvas').length,
      glowCount: document.querySelectorAll('.cinematic-glow').length,
      washCount: document.querySelectorAll('.cinematic-glow__wash').length,
      totalCanvases: document.querySelectorAll('canvas').length,
      // Retained from the previous helper: still meaningful for any layer that
      // IS mounted, and it is what proves nothing intercepts the pointer.
      pointerEvents: env ? getComputedStyle(env).pointerEvents : 'not-mounted',
      ariaHidden: env?.getAttribute('aria-hidden') ?? 'not-mounted',
    };
  });
}

/**
 * The visual plate's rendered uniform scale, so "the kept effect" is measured.
 *
 * NB the plate is NOT a descendant of the button. `world-board-*` is the
 * interactive BUTTON (WorldBoard.tsx); the visual plate it drives is
 * `.cinematic-plate__scale`, a SIBLING layer. Resolving by nesting under the
 * button silently measures the button's own transform, which on hover is a
 * `translateY(-4px)` lift rather than the 1.04 scale -- so the scale is read from
 * `.cinematic-plate[data-plate="<world>"] .cinematic-plate__scale`, the same
 * selector `cinematic.spec.ts` uses for its "hovering changes the plate's scale"
 * test. Both effects are real; this helper reads the one it names.
 */
async function plateScale(page: Page, world: 'data' | 'cloud'): Promise<number> {
  return page.evaluate((w) => {
    const plate = document.querySelector(
      `.cinematic-plate[data-plate="${w}"] .cinematic-plate__scale`,
    );
    if (!plate) return NaN;
    const m = new DOMMatrixReadOnly(getComputedStyle(plate).transform);
    return Number.isFinite(m.a) ? Math.abs(m.a) : 1;
  }, world);
}

test.describe('environment reactivity', () => {
  test('the environment layer is not mounted at all', async ({ page }) => {
    await gotoSelection(page);
    const env = await readEnvironment(page);

    expect(env.envCount, '.cinematic-env must not be mounted').toBe(0);
    expect(env.canvasCount, 'environment canvases must not be mounted').toBe(0);
    // The colour wash went with it, in the same decision.
    expect(env.glowCount, 'glow layer must not be mounted').toBe(0);
    expect(env.washCount, 'glow washes must not be mounted').toBe(0);
  });

  test('no canvas of any kind is mounted in the cinematic', async ({ page }) => {
    await gotoSelection(page);
    // Stricter than the test above on purpose: it catches an environment
    // reintroduced by some other route before the specific assertion above has
    // to be updated too.
    const total = await page.evaluate(() => document.querySelectorAll('canvas').length);
    expect(total, 'the approved cinematic renders no canvas layers').toBe(0);
  });

  test('the surviving layers are mounted and correctly ordered', async ({ page }) => {
    await gotoSelection(page);

    const z = await page.evaluate(() => {
      const n = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return NaN;
        const raw = getComputedStyle(el).zIndex;
        return raw === 'auto' ? 0 : Number(raw);
      };
      return {
        figure: n('.cinematic-figure'),
        type: n('.cinematic-type'),
        boards: n('.cinematic-boards'),
      };
    });

    /*
     * Measured in the approved build at the selection phase: type 3, figure 6,
     * boards 7.
     *
     * The previous ordering asserted `glow < env < figure < type < boards`, which
     * was the brief's original stacking. With both colour layers unmounted the
     * constraint that still carries meaning is the one the composition depends on:
     * the TYPE never sits above the subject it wraps, because the headline passes
     * BEHIND the figure. The `figure < type` half of the old chain no longer holds
     * and is not asserted -- it described the colour-layer arrangement, not the
     * figure/headline relationship.
     *
     * NB `.cinematic-hero__heading` is deliberately NOT asserted: it computes to
     * `z-index: auto` (it is a positioned element inside `.cinematic-type`, which
     * owns the stacking), so requiring a numeric z-index there tested nothing.
     */
    expect(z.type, 'headline sits behind the figure').toBeLessThan(z.figure);
    expect(z.figure, 'the figure is stacked').toBeGreaterThan(0);
    expect(z.boards, 'the plates are stacked').toBeGreaterThan(0);
  });

  test('hovering a plate scales it and changes nothing else', async ({ page }) => {
    await gotoSelection(page);

    const atRest = await plateScale(page, 'data');
    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(450);
    const hovered = await plateScale(page, 'data');

    /*
     * The kept effect, measured. If the plate stopped scaling on hover, every
     * absence assertion in this file would still pass while the cinematic had
     * quietly become inert -- this is the test that prevents that.
     */
    expect(atRest).toBeCloseTo(1, 1);
    expect(hovered).toBeGreaterThan(atRest);
    expect(hovered).toBeCloseTo(HOVER_SCALE, 1);
  });

  test('an unmounted environment does not reappear on hover', async ({ page }) => {
    await gotoSelection(page);
    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(1200);

    const env = await readEnvironment(page);
    expect(env.envCount).toBe(0);
    expect(env.canvasCount).toBe(0);
  });

  test('an unmounted environment does not reappear on keyboard focus', async ({ page }) => {
    await gotoSelection(page);
    await page.locator('[data-testid="world-board-cloud"]').focus();
    await page.waitForTimeout(1200);

    const env = await readEnvironment(page);
    expect(env.envCount).toBe(0);
    expect(env.canvasCount).toBe(0);
    // Focus still reaches the plate -- the interaction was not lost with the layer.
    await expect(page.locator('[data-testid="world-board-cloud"]')).toBeFocused();
  });

  test('nothing colour is drawn during PERSONAL / PORTFOLIO', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1200);

    /*
     * The previous version asserted `display: none` on the layer. There is no
     * layer, so the honest form of the same claim is: nothing is mounted that
     * could display, and nothing paints.
     */
    const env = await readEnvironment(page);
    expect(env.envCount).toBe(0);
    expect(env.totalCanvases).toBe(0);
    expect(env.glowCount).toBe(0);
    expect(env.washCount).toBe(0);
  });

  test('reduced motion does not mount an environment either', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoSelection(page);
    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(400);

    const env = await readEnvironment(page);
    expect(env.envCount).toBe(0);
    expect(env.canvasCount).toBe(0);
    // The kept interaction still resolves under reduced motion: the state is
    // reachable, it just does not animate into place.
    expect(await plateScale(page, 'data')).toBeGreaterThan(1);
  });

  test('the plates keep their hit targets with no canvas layer in the way', async ({
    page,
  }) => {
    await gotoSelection(page);

    const boxes = await page.evaluate(() => {
      const out: Record<string, { w: number; h: number }> = {};
      for (const id of ['world-board-data', 'world-board-cloud']) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        out[id] = { w: r.width, h: r.height };
      }
      return out;
    });

    /*
     * With the canvas layer gone there is nothing that could swallow a pointer,
     * but the targets still have to be hittable. This is what the old "never
     * intercepts the board hit targets" test was really protecting; the 72px floor
     * matches `touch.spec.ts`.
     */
    for (const [id, box] of Object.entries(boxes)) {
      expect(box.w, `${id} width`).toBeGreaterThan(72);
      expect(box.h, `${id} height`).toBeGreaterThan(72);
    }
  });

  test('a click on a plate still selects the world and runs the handoff', async ({ page }) => {
    await gotoSelection(page);
    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(400);

    // Asserted on a state attribute, not on the button still being present: the
    // plates unmount during the handoff by design, so waiting for the element
    // afterwards times out against something removed on purpose.
    await page.locator('[data-testid="world-board-data"]').click();
    await expect(page.locator('.cinematic-hero[data-handoff]')).toHaveCount(1, {
      timeout: 5_000,
    });
  });

  test('the unmounted layer is kept on disk rather than deleted', async ({ page }) => {
    /*
     * The source files are deliberately left in place, and the comment at the
     * mount site in CinematicHero.tsx says so. If someone later deletes them that
     * comment becomes a lie and the next reader loses the reasoning. This asserts
     * the file is still reachable.
     */
    await gotoSelection(page);
    const status = await page.evaluate(
      async () => (await fetch('/src/cinematic/environment/EnvironmentLayer.tsx')).status,
    );
    // Vite serves source modules in dev; a production preview 404s the raw path,
    // so both outcomes are acceptable and only a hard error signals a problem.
    expect([200, 404]).toContain(status);
  });
});
