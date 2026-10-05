/**
 * Phase 2 QA: the Data World interaction foundation.
 *
 * Covers the properties that are easy to fake and hard to notice:
 *
 *   - the world is BUILT from the content model, not hardcoded
 *   - proximity lights a station; Enter opens it; Escape closes it
 *   - the pipe actually transports, and only once
 *   - repeated interaction leaves no duplicate canvas or stale panel
 *   - every interaction exists as real DOM, not only in the canvas
 *   - reduced motion removes motion but keeps the flow
 *
 * Gameplay is asserted through a real keyboard against the real canvas, and
 * state is read from the Phaser scene rather than scraped from pixels, so a
 * failure names the behaviour that broke instead of a colour that shifted.
 */

import { expect, test } from '@playwright/test';
import { SKILLS_WIDTH } from '../../src/game/config/worldConfig';
import type { Page } from '@playwright/test';

/**
 * Read live state out of the running Phaser scene.
 *
 * The Phase 1 fields are declared here unchanged; Phase 2's additions are
 * declared alongside them. This file deliberately does NOT redeclare the global
 * — Phase 1's spec already declares it, and a duplicate `declare global` for the
 * same interface would be a conflicting-merge error.
 */
const WORLD_READY = 15_000;

interface Probe {
  ok: boolean;
  x: number;
  y: number;
  grounded: boolean;
  camScrollX: number;
  canvasCount: number;
  worldWidth: number;
  worldHeight: number;
  velocityX: number;
  velocityY: number;
  facingRight: boolean | null;
  playerSpriteHeight: number;
  chapter: string | null;
  focusedStationId: string | null;
  focusedStationKind: string | null;
  stationLit: boolean;
  travelling: boolean;
  armedPipeId: string | null;
  stationCount: number;
  pipeCount: number;
  panelOpen: boolean;
}

declare global {
  interface Window {
    __worldProbe?: () => Probe;
  }
}

/** Open the Data world by deep link and wait for the engine to report ready. */
async function openDataWorld(page: Page, errors: string[] = [], keepEntry = false) {
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

  /*
   * Dismiss the DATA WORLD entry plate before anything else.
   *
   * STAGE E added the plate, and it sits over the stage at z-index 40, so while it
   * is up it intercepts every pointer event aimed at the contents toggle or a
   * station. Nine tests failed on `locator.click` timeouts before this was added
   * here. Dismissing it in the single shared open helper is the right place: it is
   * a property of "a test is now playing", not something each test should repeat.
   *
   * One conditional dismiss so a test that deliberately exercises the plate can
   * skip it via the `keepEntry` flag.
   */
  if (!keepEntry) {
    const plate = page.locator('[data-testid="world-entry"]');
    if ((await plate.count()) > 0) {
      await page.keyboard.press('Enter');
      await expect(plate).toHaveCount(0, { timeout: 5000 });
    }
  }

  // A few frames so physics settles and the first proximity event has fired.
  await page.waitForTimeout(600);
  return errors;
}

const probe = (page: Page) => page.evaluate(() => window.__worldProbe?.() ?? null);

/**
 * Walk the player right until `predicate` is satisfied, or give up.
 *
 * Walking to an exact pixel would make every test depend on the walk speed and
 * the frame timing. Polling for a PREDICATE is what the tests actually mean, and
 * it stays stable if the tuning changes.
 */
async function walkUntil(
  page: Page,
  predicate: (state: Probe) => boolean,
  { direction = 'd', timeout = 20_000 }: { direction?: 'a' | 'd'; timeout?: number } = {},
) {
  const start = Date.now();
  await page.keyboard.down(direction);
  try {
    while (Date.now() - start < timeout) {
      const state = await probe(page);
      if (state && predicate(state)) return state;
      await page.waitForTimeout(120);
    }
    return await probe(page);
  } finally {
    await page.keyboard.up(direction);
    await page.waitForTimeout(200);
  }
}

/**
 * Wait until the player is actually resting on the ground.
 *
 * Polling rather than sleeping a fixed interval. The player now spawns grounded,
 * so this normally returns on the first check — but `emulateMedia` delays the first
 * render frame, and asserting a state that has not been produced yet is a race.
 * This makes the wait describe the CONDITION instead of assuming a duration.
 */
async function waitForGrounded(page: Page, timeout = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const state = await probe(page);
    if (state?.grounded) return state;
    await page.waitForTimeout(80);
  }
  return await probe(page);
}

/**
 * Travel from the START chapter to SKILLS and wait for arrival.
 *
 * STAGE C made each chapter an isolated world, and the START chapter deliberately
 * has NO stations -- that is the whole point of it. So "walk to a station and press
 * Enter" is now a SKILLS-chapter act, and a test that expects a station to be lit
 * while standing on the cliff will wait forever. These tests travel first.
 */
const travelToSkills = async (page: Page): Promise<void> => {
  await page.keyboard.down('ArrowRight');
  const arrived = await page
    .waitForFunction(
      () => {
        const s = (window as unknown as { __worldScene?: { transportPhases: readonly string[] } }).__worldScene;
        const log = s?.transportPhases ?? [];
        return log.length >= 12 && log[log.length - 1] === 'idle';
      },
      undefined,
      { timeout: 40000 },
    )
    .then(() => true)
    .catch(() => false);
  await page.keyboard.up('ArrowRight');
  if (!arrived) throw new Error('did not arrive in Skills');
  await page.waitForTimeout(600);
};

/**
 * Open the contents drawer.
 *
 * STAGE E turned the station index from a visible block beneath the canvas into a
 * drawer that is closed by default -- it duplicated everything the game already
 * showed, and it was 826px of scrollable page under a 521px canvas. Tests that
 * reach for an `index-*` button therefore have to open the drawer first, which
 * this does in one place rather than repeating the toggle dance.
 */
const openDrawer = async (page: Page): Promise<void> => {
  const toggle = page.locator('[data-testid="world-index-toggle"]');
  if ((await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click();
    await page.waitForTimeout(250);
  }
};

test.describe('Phase 2 — the world is built from the content model', () => {
  test('stations and pipes exist, and the chapter map covers the world', async ({ page }) => {
    const errors = await openDataWorld(page);
    const state = (await probe(page))!;
    expect(state.ok).toBe(true);

    /*
     * The START chapter has NO stations, and that is the point.
     *
     * STAGE C made each chapter an isolated world built only when it is entered, so
     * the world the visitor starts in carries no station geometry at all. The
     * former assertion here was `stationCount === 10` (seven skills + three
     * projects), which could only hold while all three chapters shared one world.
     */
    expect(state.stationCount).toBe(0);
    // Two pipes in the START chapter: the one the player arrived by and the one
    // they leave through. Both exist so the chapter is never a one-way trap.
    expect(state.pipeCount).toBe(2);
    /*
     * The chapter is 900px wide, and the camera still has to follow.
     *
     * The former assertion was `worldWidth > 1920`, which only held while all three
     * chapters shared one 3840px world. Each chapter is now its own world, and the
     * START chapter is 900px — still wider than the ~261 world px the camera shows
     * at 2x zoom on a 1440px viewport, so scrolling is still required and the
     * exit pipe is still off-screen on arrival.
     */
    expect(state.worldWidth).toBe(900);
    expect(state.worldWidth).toBeGreaterThan(400);
    /*
     * World height is now 900, not 640, because the camera zooms to 2x and the
     * extra 260px of ceiling structure is what it reveals. This assertion is kept
     * rather than deleted: it is the guard that the taller world actually shipped.
     */
    expect(state.worldHeight).toBe(900);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the character is a recognisable sprite, not the 16px placeholder', async ({
    page,
  }) => {
    await openDataWorld(page);
    const state = (await probe(page))!;

    /*
     * Phase 1's character was 16px tall. The Phase 2 hoodie character is 48px,
     * so this asserts a real increase rather than a specific pixel count — the
     * test states the requirement ("significantly larger") and the sprite module
     * states the measurement.
     */
    expect(state.playerSpriteHeight).toBeGreaterThanOrEqual(40);
    expect(state.playerSpriteHeight).toBeGreaterThan(16);
  });

  test('every station in the content model has a DOM control', async ({ page }) => {
    await openDataWorld(page);

    // The index must expose one control per skill and per project, resolved
    // from the model rather than a hand-written list.
    // Six visible skills: SQL, Python, Excel, Power BI, Tableau, Streamlit.
    const skills = page.locator('.world-index__group').first().locator('button');
    await expect(skills).toHaveCount(6);

    const projects = page.locator('.world-index__group').last().locator('button');
    await expect(projects).toHaveCount(4);

    // Spot-check that the labels are the real content-model strings.
    await openDrawer(page);

    await expect(page.locator('[data-testid="index-skill-sql"]')).toHaveText('SQL / T-SQL');
    await expect(page.locator('[data-testid="index-project-primetradeai"]')).toHaveText(
      'PRIMETradeAI'
    );
  });
});

test.describe('Phase 2 — proximity and the information panel', () => {
  test('walking near a station lights it and reports it to the mirror', async ({ page }) => {
    const errors = await openDataWorld(page);

    const start = (await probe(page))!;
    // Nothing should be focused this far from the first station.
    expect(start.stationLit).toBe(false);

    /*
     * Walk until a station lights up.
     *
     * The Phase 1 gem at x=480 also emits `foundation-probe` on the way past, but
     * `world-interaction` shows only the MOST RECENT event, and the scene
     * announces the starting chapter immediately on create — so asserting the
     * probe string here would race the chapter announcement. The probe event is
     * covered by the Phase 1 suite instead; what this test owns is proximity.
     */
    const lit = await walkUntil(page, (s) => s.stationLit);
    expect(lit.stationLit, 'a station came into range').toBe(true);
    expect(lit.focusedStationKind).toBe('skill');
    expect(lit.focusedStationId).not.toBeNull();

    // The DOM mirror states the same thing the canvas is showing.
    await expect(page.locator('[data-testid="world-nearby"]')).toContainText('Press Enter to open');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('Enter opens the focused skill and Escape closes it', async ({ page }) => {
    const errors = await openDataWorld(page);

    /*
     * The START chapter has no stations -- that is what STAGE C made it -- so a
     * test that wants a lit station must travel to Skills first. Arrival alone is
     * not enough: the player lands at x=144 and the first station is further
     * right, so the walk is still required.
     */
    await travelToSkills(page);
    const lit = await walkUntil(page, (s) => s.stationLit);
    expect(lit?.stationLit, `no station lit after walking; x=${lit?.x}`).toBe(true);
    await page.keyboard.press('Enter');

    const panel = page.locator('[data-testid="info-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });
    await expect(panel).toHaveAttribute('data-panel-kind', 'skill');

    /*
     * The panel must name the SAME station the canvas lit up, not a generic one.
     * The scene's focused id is read first, then the panel's own attributes are
     * compared against it — that is the actual requirement, and it needs no
     * knowledge of which station a walk happens to reach first.
     */
    const focused = (await probe(page))!.focusedStationId;
    expect(focused, 'the scene reported a focused station').not.toBeNull();
    await expect(panel).toHaveAttribute('data-panel-id', focused!);

    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    expect((await probe(page))!.panelOpen).toBe(false);

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a skill panel shows the summary, experience type and evidence', async ({ page }) => {
    await openDataWorld(page);
    await openDrawer(page);

    // Open a specific skill straight from the DOM index: this is the route a
    // keyboard-only visitor takes, so it must produce the same panel.
    await page.locator('[data-testid="index-skill-sql"]').click();

    const panel = page.locator('[data-testid="info-panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-panel-id', 'sql');
    await expect(panel.locator('.info-panel__title')).toHaveText('SQL / T-SQL');

    // A recruiter must get the gist in a few seconds: the summary is present and
    // short, and it is the content model's own sentence.
    await expect(panel.locator('.info-panel__summary')).not.toBeEmpty();

    // Experience type is always stated, because coursework must never read as
    // production experience.
    await expect(panel.locator('.info-panel__facts')).toContainText('Experience');

    await page.locator('[data-testid="panel-back"]').click();
    await expect(panel).toHaveCount(0);
  });

  test('a project panel always shows authorship, contribution and limitations', async ({
    page,
  }) => {
    await openDataWorld(page);
    await openDrawer(page);

    await page.locator('[data-testid="index-project-primetradeai"]').click();
    const panel = page.locator('[data-testid="info-panel"]');
    await expect(panel).toBeVisible();

    /*
     * Authorship is stated ABOVE the pitch, always, for every project.
     *
     * All three Data-world projects are `solo`, so this asserts the label and
     * the classification rather than a collaborator — `go-microservices`, the one
     * collaborative project in the content model, belongs to the Cloud world and
     * is deliberately not reachable from the Data world's index. A test that
     * expected "Joint work" here would be asserting a claim the content model
     * does not make.
     */
    await expect(panel.locator('.info-panel__facts')).toContainText('Authorship');
    await expect(panel.locator('.info-panel__facts')).toContainText('Built alone');
    await expect(panel.locator('.info-panel__facts')).toContainText('My contribution');

    // Limitations are REQUIRED by the content model and always rendered, even
    // when the honest answer is "none identified".
    const limits = panel.locator('.info-panel__section--limits');
    await expect(limits).toBeVisible();
    await expect(limits.locator('h4')).toHaveText('Limitations');
    await expect(limits.locator('li').first()).not.toBeEmpty();

    /*
     * The project TITLE is the repository hyperlink, and it is absolute.
     *
     * The selector moved: the link is `.info-panel__title-link` on the `h3`, not a
     * member of the `.info-panel__links` list (that list carries the other outbound
     * references). The requirement is unchanged — the title carries a real absolute
     * GitHub URL rather than a bare repository name.
     */
    const link = panel.locator('.info-panel__title-link').first();
    await expect(link).toHaveAttribute('href', /^https:\/\/github\.com\//);
    // And it is a real destination, not the site itself.
    const href = await link.getAttribute('href');
    expect(href, 'the title link must be an absolute GitHub URL').toMatch(
      /^https:\/\/github\.com\/[^/]+\/[^/]+/,
    );
  });

  test('opening and closing repeatedly leaves exactly one panel and one canvas', async ({
    page,
  }) => {
    const errors = await openDataWorld(page);
    await openDrawer(page);

    for (let i = 0; i < 4; i += 1) {
      await page.locator('[data-testid="index-skill-python"]').click();
      await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(0);
    }

    expect(await page.locator('canvas').count()).toBe(1);
    expect(await page.locator('[data-testid="world-canvas"] canvas').count()).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the Close button closes the panel', async ({ page }) => {
    await openDataWorld(page);
    await openDrawer(page);
    // ETL is no longer a visible skill of its own -- it is evidence inside the SQL
    // station, per the content decision that retired the standalone technique.
    await page.locator('[data-testid="index-skill-sql"]').click();
    await expect(page.locator('[data-testid="info-panel"]')).toBeVisible();

    await page.locator('[data-testid="panel-back"]').click();
    await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(0);
    // Movement resumes once the panel is gone.
    expect((await probe(page))!.panelOpen).toBe(false);
  });
});

test.describe('Phase 2 — the pipe transport', () => {
  test('the starting pipe is marked as the next chapter', async ({ page }) => {
    const errors = await openDataWorld(page);

    // The first pipe sits just past the cliff ledges. Walking to it arms it, and
    // the mirror reports the destination chapter.
    await walkUntil(page, (s) => s.armedPipeId !== null);

    const state = (await probe(page))!;
    expect(state.armedPipeId).toBe('cliff-to-skills');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('entering the pipe transports the player to the Skills chapter', async ({ page }) => {
    const errors = await openDataWorld(page);

    /*
     * Wait for ARRIVAL, not for the announcement.
     *
     * The scene announces the destination chapter as the travel starts, not when
     * it lands, so the React mirror updates immediately instead of lagging the
     * canvas by the transition. That is deliberate — but it means `chapter ===
     * 'skills'` alone is true while the player is still being carried. Arrival is
     * the state where the chapter matches AND nothing is in transit.
     */
    const arrived = await walkUntil(
      page,
      (s) => s.chapter === 'skills' && !s.travelling,
      { timeout: 30_000 }
    );

    expect(arrived.chapter, 'the pipe delivered the player to Skills').toBe('skills');
    /*
     * The player is inside the SKILLS world, whose own coordinate space starts at
     * x=0 -- not still out on the cliff.
     *
     * The former assertion was `x > 900`, which only made sense while Skills began
     * at world x=900 inside one continuous 3840px world. Chapters are separate
     * worlds now, so arrival in Skills means x≈144 (just clear of the entry pipe at
     * x=60) in a world of the configured SKILLS width. `> 900` would have been
     * unreachable there.
     *
     * Read from the config rather than repeating the number: this was hardcoded
     * at 1100 and broke when SKILLS was widened to 1200 to keep the exit pipe
     * clear of the last station. A test that duplicates a config constant fails
     * the next time anyone tunes that config, and reports a deliberate layout
     * decision as a product defect.
     */
    expect(arrived.worldWidth).toBe(SKILLS_WIDTH);
    expect(arrived.x).toBeGreaterThan(60);
    expect(arrived.x).toBeLessThan(arrived.worldWidth);
    expect(arrived.travelling).toBe(false);
    expect(arrived.locked).toBe(false);

    // The mirror agrees with the canvas about the current chapter.
    await expect(page.locator('[data-testid="world-chapter"]')).toContainText('skills');

    // The Skills chapter's OWN six stations are built — and only those.
    expect(arrived.stationCount).toBe(6);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the pipe fires once, not on every frame inside its trigger zone', async ({ page }) => {
    await openDataWorld(page);

    // Stand inside the trigger zone and confirm the transition completes and the
    // player settles rather than oscillating between chapters. Same rule as the
    // arrival test: the chapter changes when travel STARTS, so arrival also
    // requires that nothing is in transit.
    await walkUntil(page, (s) => s.chapter === 'skills' && !s.travelling, {
      timeout: 30_000,
    });
    await page.waitForTimeout(1500);

    const settled = (await probe(page))!;
    expect(settled.chapter).toBe('skills');
    expect(settled.travelling).toBe(false);
    // Grounded again after emerging, not falling through the world.
    expect(settled.grounded).toBe(true);
    expect(settled.y).toBeLessThanOrEqual(settled.worldHeight);
  });
});

test.describe('Phase 2 — accessibility and reduced motion', () => {
  test('the contents index is keyboard operable', async ({ page }) => {
    await openDataWorld(page);
    await openDrawer(page);

    // Tab to the first skill control and open it with the keyboard alone. This is
    // the route that requires no canvas and no movement keys.
    const first = page.locator('[data-testid="index-skill-sql"]');
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="info-panel"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(0);
  });

  test('every station is reachable without entering the world at all', async ({ page }) => {
    await openDataWorld(page);
    await openDrawer(page);

    // Ten controls: six skills and four projects. A visitor who never touches the
    // canvas can still open all of them.
    await expect(page.locator('.world-index button')).toHaveCount(10);

    // Open one of each kind to prove both routes work without game state.
    await page.locator('[data-testid="index-skill-tableau"]').click();
    await expect(page.locator('[data-testid="info-panel"]')).toHaveAttribute(
      'data-panel-kind',
      'skill'
    );
    await page.keyboard.press('Escape');

    await page.locator('[data-testid="index-project-sql-data-warehouse"]').click();
    await expect(page.locator('[data-testid="info-panel"]')).toHaveAttribute(
      'data-panel-kind',
      'project'
    );
  });

  test('the canvas remains the only canvas, and the mirror keeps its Phase 1 shape', async ({
    page,
  }) => {
    const errors = await openDataWorld(page);

    /*
     * Seven <kbd> in `.world-a11y`, exactly as Phase 1 asserted.
     *
     * An earlier pass of this file changed this to six on the assumption that the
     * seven SKILLS became six. That conflated two different things: the number of
     * visible skill STATIONS (now six) and the number of documented keyboard
     * CONTROLS in the accessibility mirror (unchanged at seven). Phase 1's number
     * is what this assertion is protecting, so it stays at seven.
     */
    const mirror = page.locator('.world-a11y');
    await expect(mirror).toHaveAttribute('aria-label', /accessible controls/i);
    await expect(mirror.locator('kbd')).toHaveCount(7);

    await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute(
      'data-status',
      'ready'
    );
    expect(await page.locator('canvas').count()).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('reduced motion keeps the interaction flow intact', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await openDataWorld(page);

    // Gameplay stays enabled under reduced motion. Poll for the settle rather
    // than assuming a fixed delay — see `waitForGrounded`.
    const before = (await waitForGrounded(page))!;
    expect(before.grounded).toBe(true);

    // Stations live in Skills, not on the starting cliff, so the panel half of
    // this test has to travel first. Under reduced motion the transport still
    // runs — only the decorative movement is removed — so arrival still happens.
    await travelToSkills(page);

    await page.keyboard.down('d');
    await page.waitForTimeout(700);
    await page.keyboard.up('d');
    await page.waitForTimeout(200);

    const after = (await probe(page))!;
    expect(after.x).toBeGreaterThan(before.x);

    // The panel still opens, and still closes. Reduced motion removes movement,
    // never the interaction.
    await walkUntil(page, (s) => s.stationLit);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="info-panel"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(0);

    expect(errors, errors.join('\n')).toEqual([]);
  });
});