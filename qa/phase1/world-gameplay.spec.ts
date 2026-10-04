/**
 * Phase 1 QA: the playable Phaser foundation.
 *
 * Covers the brief's required list — mounts, unmounts, no duplicate canvas,
 * re-entry, player exists / moves / jumps / collides, camera follow, world
 * bounds — plus the two properties that are easy to fake and hard to notice:
 * that the hero is untouched, and that Phaser is genuinely not loaded until a
 * world is opened.
 *
 * Gameplay is asserted through a real keyboard against the real canvas. Player
 * state is read from the Phaser scene rather than from pixels, so a test failure
 * points at behaviour instead of at a colour.
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Read live state out of the running Phaser scene. */
declare global {
  interface Window {
    __worldProbe?: () => {
      ok: boolean;
      x: number;
      y: number;
      grounded: boolean;
      camScrollX: number;
      camScrollY: number;
      canvasCount: number;
      worldWidth: number;
      worldHeight: number;
      velocityX: number;
      velocityY: number;
      facingRight: boolean | null;
    };
  }
}

const WORLD_READY = 15_000;

/** Open the Data world by deep link and wait for the engine to report ready. */
async function openDataWorld(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto('/#/data-world');
  await expect(page.locator('.placeholder-world')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
    'data-status',
    'ready',
    { timeout: WORLD_READY }
  );
  // Give the scene a few frames so physics has settled before sampling.
  await page.waitForTimeout(600);
  return errors;
}

const probe = (page: Page) => page.evaluate(() => window.__worldProbe?.() ?? null);

test.describe('Phase 1 — mount and unmount lifecycle', () => {
  test('Phaser mounts exactly one canvas inside the world container', async ({ page }) => {
    const errors = await openDataWorld(page);

    const container = page.locator('[data-testid="world-canvas"]');
    await expect(container.locator('canvas')).toHaveCount(1);
    expect(await page.locator('canvas').count()).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('unmounting the world removes the canvas entirely', async ({ page }) => {
    await openDataWorld(page);
    expect(await page.locator('canvas').count()).toBe(1);

    await page.click('.placeholder-world button');
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 5000 });

    // No canvas may survive the world, anywhere in the document.
    expect(await page.locator('canvas').count()).toBe(0);
    await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0);
  });

  test('the world can be entered twice with no duplicate canvas or crash', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    // Enter -> leave -> hero -> enter again, exactly the brief's failure case.
    await openDataWorld(page);
    await page.click('.placeholder-world button');
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      window.location.hash = '#/data-world';
    });
    await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: WORLD_READY }
    );
    await page.waitForTimeout(400);

    expect(await page.locator('canvas').count()).toBe(1);
    expect(await page.locator('[data-testid="world-canvas"] canvas').count()).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('repeated enter/leave cycles never accumulate canvases', async ({ page }) => {
    // The app must be loaded before a hash change can mean anything: setting
    // location.hash on a blank page navigates nowhere.
    await page.goto('/');

    for (let i = 0; i < 3; i += 1) {
      await page.evaluate(() => {
        window.location.hash = '#/data-world';
      });
      await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
        'data-status',
        'ready',
        { timeout: WORLD_READY }
      );
      expect(await page.locator('canvas').count()).toBe(1);

      await page.evaluate(() => {
        window.location.hash = '';
      });
      await expect(page.locator('.placeholder-world')).toHaveCount(0);
      expect(await page.locator('canvas').count()).toBe(0);
    }
  });
});

test.describe('Phase 1 — player and physics', () => {
  test('the player exists, is inside world bounds, and rests on the ground', async ({
    page,
  }) => {
    await openDataWorld(page);
    const state = await probe(page);

    expect(state, 'probe must be exposed by the scene').not.toBeNull();
    expect(state!.ok).toBe(true);
    expect(state!.canvasCount).toBe(1);
    // Spawned on screen, not at the origin or off-world.
    expect(state!.x).toBeGreaterThan(0);
    expect(state!.y).toBeGreaterThan(0);
    expect(state!.y).toBeLessThanOrEqual(state!.worldHeight);
    // Settled: gravity has pulled it down onto the ground.
    expect(state!.grounded).toBe(true);
    // At rest horizontally.
    expect(Math.abs(state!.velocityX)).toBeLessThan(5);
  });

  test('the player moves right and faces right', async ({ page }) => {
    await openDataWorld(page);
    const before = (await probe(page))!;

    await page.keyboard.down('d');
    await page.waitForTimeout(700);
    await page.keyboard.up('d');
    await page.waitForTimeout(250);

    const after = (await probe(page))!;
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.facingRight).toBe(true);
  });

  test('the player moves left and flips to face left', async ({ page }) => {
    await openDataWorld(page);
    // Walk right first so there is room to travel left.
    await page.keyboard.down('d');
    await page.waitForTimeout(700);
    await page.keyboard.up('d');
    await page.waitForTimeout(200);

    const before = (await probe(page))!;
    await page.keyboard.down('a');
    await page.waitForTimeout(700);
    await page.keyboard.up('a');
    await page.waitForTimeout(250);

    const after = (await probe(page))!;
    expect(after.x).toBeLessThan(before.x);
    expect(after.facingRight).toBe(false);
  });

  test('the player jumps and comes back down to the ground', async ({ page }) => {
    await openDataWorld(page);
    const before = (await probe(page))!;

    await page.keyboard.press('Space');
    // Sample mid-flight: the player must be measurably above its resting height.
    await page.waitForTimeout(220);
    const mid = (await probe(page))!;

    expect(mid.y).toBeLessThan(before.y - 10);

    // Let it land again.
    await page.waitForTimeout(1200);
    const landed = (await probe(page))!;
    expect(landed.grounded).toBe(true);
    // It landed back on the ground, not somewhere below it.
    expect(Math.abs(landed.y - before.y)).toBeLessThan(6);
  });

  test('the player collides with the ground rather than falling through', async ({
    page,
  }) => {
    await openDataWorld(page);
    await page.waitForTimeout(1500);

    const state = (await probe(page))!;
    // On a solid ground surface, not below it and not still in the air.
    expect(state.grounded).toBe(true);
    expect(state.y).toBeLessThanOrEqual(state.worldHeight);
    // Ground is a real collider: vertical velocity must be ~0 while resting.
    expect(Math.abs(state.velocityY)).toBeLessThan(30);
  });

  test('the player stays inside world bounds when pushed left off the edge', async ({
    page,
  }) => {
    await openDataWorld(page);

    // Drive hard left for longer than it takes to cross the world.
    await page.keyboard.down('a');
    await page.waitForTimeout(4000);
    await page.keyboard.up('a');
    await page.waitForTimeout(200);

    const state = (await probe(page))!;
    // Clamped at the left edge, never outside it.
    expect(state.x).toBeGreaterThanOrEqual(0);
    expect(state.x).toBeLessThan(60);
  });
});

test.describe('Phase 1 — camera', () => {
  test('the camera follows the player horizontally', async ({ page }) => {
    await openDataWorld(page);
    const before = (await probe(page))!;

    /*
     * The camera is CLAMPED to the world, so scrollX stays 0 until the player
     * passes the left half of the viewport. Measured at 1280px wide: the player
     * walks at 90px/s and scrolling begins past x=598, so it takes roughly 5s
     * of held input to observe any scroll at all.
     *
     * Asserting a scroll delta after 1.6s was wrong — the camera was behaving
     * correctly and the test was walking too briefly to leave the deadzone.
     */
    await page.keyboard.down('d');
    await page.waitForTimeout(6500);
    await page.keyboard.up('d');
    await page.waitForTimeout(400);

    const after = (await probe(page))!;
    // The player crossed the deadzone, so the camera must have moved too.
    expect(after.x).toBeGreaterThan(598);
    expect(after.camScrollX).toBeGreaterThan(before.camScrollX);
  });

  test('the camera scroll stays inside the world', async ({ page }) => {
    await openDataWorld(page);
    await page.keyboard.down('d');
    await page.waitForTimeout(3500);
    await page.keyboard.up('d');
    await page.waitForTimeout(300);

    const state = (await probe(page))!;
    expect(state.camScrollX).toBeGreaterThanOrEqual(0);
    // scrollX + viewport width must not exceed the world width.
    expect(state.camScrollX).toBeLessThanOrEqual(state.worldWidth);
  });
});

test.describe('Phase 1 — interaction foundation', () => {
  test('touching the interactive object reaches the React layer', async ({ page }) => {
    await openDataWorld(page);
    await expect(page.locator('[data-testid="world-interaction"]')).toHaveText(
      'No interactions yet.'
    );

    // The probe gem rests at x=480; the player spawns at 120 and walks at
    // 90px/s, so ~4s of held input is needed to reach it.
    await page.keyboard.down('d');
    await page.waitForTimeout(5200);
    await page.keyboard.up('d');

    await expect(page.locator('[data-testid="world-interaction"]')).toContainText(
      'foundation-probe',
      { timeout: 5000 }
    );
  });
});

test.describe('Phase 1 — accessibility and reduced motion', () => {
  test('portfolio information is reachable without playing', async ({ page }) => {
    await openDataWorld(page);

    const mirror = page.locator('.world-a11y');
    await expect(mirror).toBeVisible();
    await expect(mirror).toHaveAttribute('aria-label', /accessible controls/i);
    // Controls are documented as text, not only as canvas behaviour.
    await expect(mirror).toContainText('Move left');
    await expect(mirror).toContainText('Move right');
    await expect(mirror).toContainText('Jump');
    // Three rows of controls: left (2 keys), right (2 keys), jump (3 keys).
    await expect(mirror.locator('kbd')).toHaveCount(7);
  });

  test('the world is keyboard operable', async ({ page }) => {
    await openDataWorld(page);
    // Focus the exit control and activate it with the keyboard alone.
    await page.locator('.placeholder-world button').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 5000 });
  });

  test('reduced motion keeps the game playable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDataWorld(page);

    const before = (await probe(page))!;
    expect(before.grounded).toBe(true);

    // Gameplay must remain fully enabled under reduced motion.
    await page.keyboard.down('d');
    await page.waitForTimeout(700);
    await page.keyboard.up('d');
    await page.waitForTimeout(200);

    const after = (await probe(page))!;
    expect(after.x).toBeGreaterThan(before.x);

    await page.keyboard.press('Space');
    await page.waitForTimeout(220);
    const mid = (await probe(page))!;
    expect(mid.y).toBeLessThan(before.y - 10);
  });
});

test.describe('Phase 1 — hero unchanged and Phaser still lazy', () => {
  /**
   * Match a request for the game engine module in EITHER mode.
   *
   * A dev server serves `/src/game/engine.ts`; a production build serves
   * `/assets/engine-<hash>.js`. Filtering on `.js` alone matched nothing under
   * `npm run dev`, which made the "not loaded" assertion pass vacuously — the
   * exact opposite of what it was written to prove.
   */
  const isEngineRequest = (url: string): boolean =>
    /game\/engine/.test(url) || /\/engine-[^/]+\.js/.test(url);

  test('the hero renders identically with no world opened', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await page.goto('/');
    await expect(page.locator('.cinematic-hero')).toBeAttached({ timeout: 5000 });
    // The frozen hero landmarks are all still present.
    await expect(page.locator('.cinematic-hero__heading')).toBeAttached();
    await expect(page.locator('[data-testid="world-board-data"]')).toHaveCount(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Phaser is not loaded until a world is opened', async ({ page }) => {
    // Any request for the engine module or the Phaser runtime itself.
    const engineRequests: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (isEngineRequest(u) || /phaser/i.test(u)) engineRequests.push(u);
    });

    await page.goto('/');
    await expect(page.locator('.cinematic-hero')).toBeAttached({ timeout: 5000 });
    await page.waitForTimeout(2500);

    // The hero path must not have requested the engine at all.
    expect(engineRequests, `unexpected engine load: ${engineRequests.join(', ')}`).toEqual(
      []
    );
  });

  test('the engine chunk is requested once the world opens', async ({ page }) => {
    const engineRequests: string[] = [];
    page.on('request', (r) => {
      if (isEngineRequest(r.url())) engineRequests.push(r.url());
    });

    await page.goto('/#/data-world');
    await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
      'data-status',
      'ready',
      { timeout: WORLD_READY }
    );

    expect(engineRequests.length).toBeGreaterThan(0);
  });
});
