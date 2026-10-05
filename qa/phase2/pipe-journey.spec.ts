/*
 * STAGE D, in the running game.
 *
 * `transport-phases.spec.ts` proves the state machine's ordering with a fake clock.
 * This file proves the same gates hold in a real browser: the player's actual
 * visibility, the actual blackout overlay, and the actual destination chapter that
 * gets built. It reads the live scene through the existing `__worldScene`
 * diagnostic handle rather than re-implementing anything.
 */
import { expect, test } from '@playwright/test';
import { SKILLS_WIDTH } from '../../src/game/config/worldConfig';
import type { Page } from '@playwright/test';

const WORLD = '#/data-world';

/** Open the Data World and wait for Phaser to finish building the first chapter. */
async function openWorld(page: Page): Promise<void> {
  await page.goto(`/${WORLD}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const s = (window as unknown as { __worldScene?: { player?: unknown } }).__worldScene;
      return Boolean(s?.player);
    },
    undefined,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2500);
}

/** Live scene state the transport tests need. */
interface LiveState {
  chapter: string;
  worldWidth: number;
  stationCount: number;
  playerVisible: boolean;
  playerX: number;
  playerScale: number;
  playerDepth: number;
  blackedOut: boolean;
  phases: string[];
  chapterBeingBuilt: string | null;
  overlayAlpha: number;
}

const readState = (page: Page): Promise<LiveState> =>
  page.evaluate(() => {
    const s = (
      window as unknown as {
        __worldScene?: {
          world: { chapter: string; width: number; stations: unknown[] };
          player: { visible: boolean; x: number; scaleX: number; depth: number };
          isBlackedOut: boolean;
          transportPhases: readonly string[];
          chapterBeingBuilt: string | null;
          travelOverlay: { alpha: number; visible: boolean } | null;
        };
      }
    ).__worldScene;
    if (!s) throw new Error('no __worldScene');
    return {
      chapter: s.world.chapter,
      worldWidth: s.world.width,
      stationCount: s.world.stations.length,
      playerVisible: s.player.visible,
      playerX: Math.round(s.player.x),
      playerScale: Number(s.player.scaleX.toFixed(2)),
      playerDepth: s.player.depth,
      blackedOut: s.isBlackedOut,
      phases: [...s.transportPhases],
      chapterBeingBuilt: s.chapterBeingBuilt,
      overlayAlpha: s.travelOverlay?.alpha ?? -1,
    };
  });

/**
 * Walk the player right until a transport starts, then sample continuously.
 *
 * Sampling on an interval rather than waiting for a known duration is what makes
 * this able to catch a phase that never happens: if the blackout never appears in
 * any sample, the test fails.
 */
async function travelAndSample(page: Page, samples: number, direction: 'ArrowRight' | 'ArrowLeft' = 'ArrowRight') {
  const seen: LiveState[] = [];

  /*
   * Hold the direction until travel actually begins.
   *
   * Walking is not instant: the player moves at 90 px/s and the pipe can be
   * hundreds of pixels away, so the wait is real rather than a fixed sleep. The
   * phase log growing past one entry is the signal that the journey has begun.
   */
  /*
   * Wait for a journey that has NOT already happened.
   *
   * `transportPhases` accumulates across journeys, so after a forward trip it holds
   * 12 entries. Testing `length > 1` would therefore be true immediately on the
   * second leg, and the test would sample a journey that had not started — which is
   * why the reverse route first reported "still in skills". The wait is therefore on
   * the log being at rest AND then growing past that resting length.
   */
  const restingLength = await page.evaluate(() => {
    const s = (window as unknown as { __worldScene?: { transportPhases: readonly string[] } }).__worldScene;
    return (s?.transportPhases?.length ?? 0);
  });

  await page.keyboard.down(direction);
  const began = await page
    .waitForFunction(
      (resting: number) => {
        const s = (window as unknown as { __worldScene?: { transportPhases: readonly string[] } }).__worldScene;
        const now = (s?.transportPhases?.length ?? 0);
        // A NEW journey has begun: the log restarted short and is growing again.
        return now > resting || (now > 1 && now < resting);
      },
      restingLength,
      { timeout: 25000 },
    )
    .then(() => true)
    .catch(() => false);
  await page.keyboard.up(direction);
  if (!began) throw new Error(`travel never began walking ${direction} (resting log length ${restingLength})`);

  for (let i = 0; i < samples; i++) {
    seen.push(await readState(page));
    await page.waitForTimeout(30);
  }
  return seen;
}

test.describe('STAGE D — transport in the running game', () => {
  test('START -> SKILLS: the player is occluded before the screen goes black', async ({ page }) => {
    await openWorld(page);
    const before = await readState(page);
    expect(before.chapter).toBe('cliff');
    expect(before.playerVisible).toBe(true);

    const seen = await travelAndSample(page, 90);

    // The destination did not exist at any point before the build phase.
    expect(seen.some((s) => s.chapter === 'skills')).toBe(true);

    // HARD GATE 1: the player was fully invisible at some point.
    const occluded = seen.filter((s) => !s.playerVisible);
    expect(occluded.length, 'player must be fully hidden during travel').toBeGreaterThan(0);

    // HARD GATE 2: the screen was fully black at some point, at full alpha.
    const black = seen.filter((s) => s.blackedOut);
    expect(black.length, 'screen must go fully opaque').toBeGreaterThan(0);
    expect(Math.max(...black.map((s) => s.overlayAlpha))).toBe(1);

    // Occlusion happened while NOT blacked out, i.e. before the blackout phase:
    // the player is hidden inside the tube first, and only then does the screen
    // black out.
    const firstOccluded = seen.findIndex((s) => !s.playerVisible);
    const firstBlack = seen.findIndex((s) => s.blackedOut);
    expect(firstOccluded).toBeGreaterThanOrEqual(0);
    expect(firstBlack).toBeGreaterThanOrEqual(0);
    expect(firstOccluded, 'occlusion must precede blackout').toBeLessThan(firstBlack);
  });

  test('the destination chapter is built only after the player is occluded', async ({ page }) => {
    await openWorld(page);
    const seen = await travelAndSample(page, 90);

    const firstSkills = seen.findIndex((s) => s.chapter === 'skills');
    expect(firstSkills, 'must arrive in skills').toBeGreaterThanOrEqual(0);

    const firstOccluded = seen.findIndex((s) => !s.playerVisible);
    const firstBlack = seen.findIndex((s) => s.blackedOut);

    // Every sample before the destination exists must show the source chapter, and
    // the destination must never appear on screen while the player is still visible
    // at the source.
    for (const [i, s] of seen.entries()) {
      if (i < firstOccluded) {
        expect(s.chapter, `sample ${i} precedes occlusion`).toBe('cliff');
      }
    }

    // The destination appears only after blackout.
    expect(firstSkills, 'destination must not be seen before the blackout').toBeGreaterThan(firstBlack);
  });

  test('the player emerges from the destination pipe and gameplay resumes', async ({ page }) => {
    await openWorld(page);
    const seen = await travelAndSample(page, 110);

    const last = seen[seen.length - 1]!;
    expect(last.chapter, 'settles in the destination chapter').toBe('skills');
    expect(last.playerVisible, 'player is visible again').toBe(true);
    expect(last.blackedOut, 'blackout lifted').toBe(false);
    expect(last.playerScale, 'player restored to full scale').toBe(1);

    /*
     * The world that now exists is the destination's own world, with its stations.
     *
     * The width is read from the config, not hardcoded. It WAS hardcoded at 1100
     * and broke the moment SKILLS_WIDTH became 1200 to keep the exit pipe clear
     * of the last station — the assertion was guarding a number nobody had asked
     * it to guard, and it reported a chapter-geometry decision as a test failure.
     * Importing the constant keeps the test honest about what it means: that the
     * destination is SKILLS, at whatever width SKILLS is configured to be.
     */
    expect(last.worldWidth).toBe(SKILLS_WIDTH);
    expect(last.stationCount).toBe(6);

    // And the player is near the destination's spawn, not at the source's.
    expect(Math.abs(last.playerX - 144)).toBeLessThan(80);

    // Input is live again: the player can move.
    const xBefore = last.playerX;
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowRight');
    const after = await readState(page);
    expect(after.playerX, 'player is controllable after arrival').toBeGreaterThan(xBefore);
  });

  test('the full twelve-phase sequence occurs in the live game', async ({ page }) => {
    await openWorld(page);
    await travelAndSample(page, 110);
    const final = await readState(page);

    expect(final.phases).toEqual([
      'approach',
      'activate',
      'entering',
      'occluded',
      'conduit',
      'blackout',
      'build',
      'position',
      'reveal',
      'emerging',
      'settle',
      'idle',
    ]);
  });

  test('SKILLS -> START: the reverse route works', async ({ page }) => {
    await openWorld(page);
    // Travel forward first.
    await travelAndSample(page, 110);
    expect((await readState(page)).chapter).toBe('skills');

    /*
     * Now travel back to the cliff.
     *
     * The player arrives in Skills at x=144 and the chapter's entry pipe is at x=60,
     * so this is a short walk LEFT with no ledges in the way. `travelAndSample`
     * already waits for travel to begin and releases the key, so there is no need
     * to hold the key across a long wait -- an earlier version held ArrowLeft for up
     * to 40s inside a waitForFunction, which exhausted the test timeout.
     */
    const seen = await travelAndSample(page, 110, 'ArrowLeft');
    const last = seen[seen.length - 1]!;

    expect(last.chapter, 'returned to the cliff').toBe('cliff');
    expect(last.playerVisible).toBe(true);
    expect(last.blackedOut).toBe(false);
    // The cliff is the source world: its own width and no stations.
    expect(last.worldWidth).toBe(900);
    expect(last.stationCount).toBe(0);
    // Same twelve phases in reverse.
    expect(last.phases).toHaveLength(12);
    expect(last.phases[3]).toBe('occluded');
    expect(last.phases[5]).toBe('blackout');
  });

  test('no page errors during travel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text().slice(0, 300));
    });

    await openWorld(page);
    await travelAndSample(page, 110);
    const last = await readState(page);

    expect(last.chapter).toBe('skills');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});