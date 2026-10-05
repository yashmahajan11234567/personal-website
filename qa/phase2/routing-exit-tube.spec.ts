/**
 * CORRECTION PASS — requirements 3, 4 and 7: routing, exit, tube placement.
 *
 * R3  START -> SKILLS, SKILLS -> START, SKILLS -> PROJECTS, PROJECTS -> SKILLS,
 *     each through the full physical tube sequence, never a coordinate teleport.
 * R4  a visible, clickable, keyboard-reachable EXIT returns to the normal
 *     website: Phaser torn down, scroll restored, no orphaned canvas.
 * R7  tubes exist in exactly the required places, and PROJECTS has NO direct
 *     route back to START — projects must return through Skills.
 */

import { expect, test, type Page } from '@playwright/test';

import {
  DATA_WORLD,
  PIPE_HALF_WIDTH,
  PIPE_HEIGHT,
} from '../../src/game/config/worldConfig';
import { drawPipeMouth } from '../../src/game/art/worldObjects';

const CHAPTERS = DATA_WORLD.chapters;

/**
 * What `destination` actually means.
 *
 * I wrote these assertions wrong at first and they failed against correct code.
 * `WorldPipe.destination` is the chapter the pipe SITS IN, not the chapter it
 * leads to — `exitPipe.destination` names where the exit goes, while
 * `entryPipe.destination` is self-referential (the arrival pipe in SKILLS has
 * `destination: 'skills'`, because you arrive there FROM skills). The forward
 * direction is carried by the pipe's id and its plate text ("NEXT: PROJECTS"),
 * not by `entryPipe.destination`.
 */

const chapter = (id: string) => {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) throw new Error(`no chapter ${id}`);
  return c;
};

/** Dismiss the entry plate and wait until the scene is live. */
async function enterWorld(page: import('@playwright/test').Page) {
  await page.goto('/#/data-world');
  await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  const plate = page.locator('[data-testid="world-entry"]');
  if (await plate.count()) await page.locator('[data-testid="world-entry-dismiss"]').click();
  await page.waitForTimeout(800);
}

const sceneState = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = window.__worldScene as unknown as {
      currentChapter?: string;
      transport?: { currentPhase?: string; phaseLog?: string[]; isTravelling?: boolean };
      player?: { x: number };
    } | undefined;
    return {
      chapter: s?.currentChapter ?? null,
      phase: s?.transport?.currentPhase ?? null,
      phaseCount: s?.transport?.phaseLog?.length ?? 0,
      travelling: s?.transport?.isTravelling ?? false,
      x: Math.round(s?.player?.x ?? 0),
    };
  });

/**
 * Travel one tube and confirm the chapter actually changed.
 *
 * TWO MEASUREMENT TRAPS, both of which produced false failures here:
 *
 * 1. `phaseLog` does NOT accumulate. `pipeTransport` line 303 does
 *    `this.log = ['approach', 'activate']`, replacing the array on every travel,
 *    so it holds only the CURRENT trip. Waiting for it to grow past a pre-walk
 *    count works on the first leg (0 -> 12) and can never work on a later leg
 *    (12 -> 12), which is why legs 2-4 all reported "never travelled" while the
 *    game demonstrably moved chapters.
 *
 * 2. Polling every 50ms spent most of the test budget inside `waitForTimeout`,
 *    so a 20s walk exhausted a 45s timeout. Long blocks, longer timeout.
 *
 * So: detect the transition by watching the CHAPTER change, which is the actual
 * requirement, and read the phase log only once the arrival has happened.
 */
async function travel(page: Page, direction: 'left' | 'right') {
  const before = await sceneState(page);
  const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';

  await page.keyboard.down(key);
  let arrived = false;
  for (let i = 0; i < 300 && !arrived; i += 1) {
    await page.waitForTimeout(250);
    const now = await sceneState(page);
    if (now.chapter !== before.chapter) arrived = true;
  }
  await page.keyboard.up(key);

  // Let the twelve-phase sequence settle at the destination.
  for (let i = 0; i < 160; i += 1) {
    await page.waitForTimeout(250);
    const now = await sceneState(page);
    if (!now.travelling && now.phase === 'idle') break;
  }
  await page.waitForTimeout(500);
  return { before, after: await sceneState(page), started: arrived };
}

test.describe('CORRECTION PASS — R7 tube placement', () => {
  test('START holds exactly the tube to SKILLS', () => {
    const c = chapter('cliff');
    expect(c.exitPipe, 'START must have a way out').not.toBeNull();
    expect(c.exitPipe!.destination).toBe('skills');
  });

  test('SKILLS holds a tube back to START and a tube forward to PROJECTS', () => {
    const c = chapter('skills');
    // The arrival tube sits in SKILLS and carries the START plate, so START is
    // reachable from here by entering it.
    expect(c.entryPipe.plate).toBe('START');
    expect(c.entryPipe.destination, 'entryPipe names its own chapter').toBe('skills');

    expect(c.exitPipe, 'SKILLS must have a tube forward').not.toBeNull();
    expect(c.exitPipe!.destination, 'the forward tube goes to PROJECTS').toBe('projects');
  });

  test('PROJECTS holds a tube back to SKILLS and NO direct tube to START', () => {
    const c = chapter('projects');
    expect(c.entryPipe.destination, 'the arrival tube sits in PROJECTS').toBe('projects');
    // The requirement is explicit: projects return to Skills first. PROJECTS has
    // no exit tube at all, so there is no direct route to START.
    expect(c.exitPipe, 'PROJECTS must not have a direct exit tube').toBeNull();
  });

  test('the graph is START -> SKILLS <-> PROJECTS, and no chapter is unreachable', () => {
    // Forward edges, from exit tubes only.
    const forward = CHAPTERS.filter((c) => c.exitPipe).map((c) => [c.id, c.exitPipe!.destination]);
    expect(forward).toEqual([
      ['cliff', 'skills'],
      ['skills', 'projects'],
    ]);

    // PROJECTS is a dead end: no forward edge leaves it, so projects must return
    // through Skills rather than jumping to START.
    const projectsExit = CHAPTERS.find((c) => c.id === 'projects')!.exitPipe;
    expect(projectsExit).toBeNull();
  });
});

test.describe('CORRECTION PASS — R3 all four routes use the physical tube', () => {
  test('START -> SKILLS runs all twelve phases', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    expect((await sceneState(page)).chapter).toBe('cliff');

    const leg = await travel(page, 'right');
    expect(leg.started, 'the START -> SKILLS tube must fire when walked into').toBe(true);
    expect(leg.after.chapter).toBe('skills');

    // Read after arrival: the log holds only the CURRENT trip (pipeTransport
    // reassigns it on each travel), so this is the full sequence just performed.
    const phases = await page.evaluate(
      () => window.__worldScene?.transport?.phaseLog ?? [],
    );
    expect(phases, 'the trip must record exactly the twelve phases').toHaveLength(12);
    expect(phases).toEqual([
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

  test('SKILLS -> START returns through the tube, not a teleport', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right'); // -> SKILLS
    expect((await sceneState(page)).chapter).toBe('skills');

    const leg = await travel(page, 'left');
    expect(leg.started).toBe(true);
    expect(leg.after.chapter).toBe('cliff');
  });

  test('SKILLS -> PROJECTS runs the tube', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right'); // -> SKILLS

    const leg = await travel(page, 'right');
    expect(leg.started).toBe(true);
    expect(leg.after.chapter).toBe('projects');
  });

  test('PROJECTS -> SKILLS returns through the tube', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right'); // -> SKILLS
    await travel(page, 'right'); // -> PROJECTS
    expect((await sceneState(page)).chapter).toBe('projects');

    const leg = await travel(page, 'left');
    expect(leg.started).toBe(true);
    expect(leg.after.chapter).toBe('skills');
  });

  test('the player emerges at the destination tube, not at a bare coordinate', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right'); // -> SKILLS

    // On arrival the player should be standing at the arrival tube's mouth,
    // which the config places at a fixed offset from the left edge.
    const arrival = await page.evaluate(() => {
      const s = window.__worldScene as unknown as {
        player?: { x: number };
        world?: { entryPipe?: { x: number } };
      } | undefined;
      return { playerX: s?.player?.x ?? 0, pipeX: s?.world?.entryPipe?.x ?? 0 };
    });
    // Emergence offset is 120; allow for the sprite origin and physics nudge.
    expect(Math.abs(arrival.playerX - arrival.pipeX)).toBeLessThan(200);
  });
});

test.describe('CORRECTION PASS — R4 exit to the normal website', () => {
  test('the exit control is visible, clickable and in a corner', async ({ page }) => {
    await enterWorld(page);
    const exit = page.locator('[data-testid="world-exit"]');
    await expect(exit).toBeVisible();

    const box = (await exit.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    // Top corner, not buried in the flow below the canvas.
    expect(box.y).toBeLessThan(120);
  });

  test('the exit is reachable by keyboard alone', async ({ page }) => {
    await enterWorld(page);
    // Walk focus into the document and tab until the exit has it.
    let reached = false;
    for (let i = 0; i < 25 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        return a?.dataset?.testid === 'world-exit';
      });
    }
    expect(reached, 'the exit control must be tab-reachable').toBe(true);

    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0, { timeout: 10_000 });
  });

  test('clicking exit tears down Phaser and restores normal page scrolling', async ({ page }) => {
    await enterWorld(page);
    await expect(page.locator('[data-testid="world-canvas"] canvas')).toHaveCount(1);

    await page.locator('[data-testid="world-exit"]').click();

    // No orphaned canvas.
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 10_000 });

    const after = await page.evaluate(() => ({
      hash: location.hash,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      scrollable:
        document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    }));

    expect(after.hash, 'exit must leave the data world route').not.toContain('data-world');
    expect(['visible', 'auto', 'scroll']).toContain(after.htmlOverflow);
    expect(['visible', 'auto', 'scroll']).toContain(after.bodyOverflow);
    expect(after.scrollable, 'the normal portfolio page must scroll again').toBe(true);
  });

  test('the exit does not require finishing the game', async ({ page }) => {
    await enterWorld(page);
    // Still on START, having done nothing at all.
    expect((await sceneState(page)).chapter).toBe('cliff');
    await page.locator('[data-testid="world-exit"]').click();
    await expect(page.locator('canvas')).toHaveCount(0, { timeout: 10_000 });
  });

  test('no console errors during a full enter/travel/exit cycle', async ({ page }) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await enterWorld(page);
    await travel(page, 'right');
    await page.locator('[data-testid="world-exit"]').click();
    await page.waitForTimeout(1200);

    expect(errors, `console errors: ${JSON.stringify(errors)}`).toEqual([]);
  });
});

test.describe('CORRECTION PASS — R6 tube geometry matches the reference', () => {
  test('the tube is an upright column, not wider than it is tall', () => {
    /*
     * Read from the config module directly.
     *
     * This used to do `page.evaluate(() => import('/src/game/config/worldConfig.ts'))`,
     * which failed with "Failed to resolve module specifier" — Playwright
     * evaluates in a plain browser context with no bundler, so a path specifier
     * does not resolve to the module Vite serves. A value that exists at test time
     * does not need to be fetched through the page at all.
     */
    const w = PIPE_HALF_WIDTH * 2;
    const h = PIPE_HEIGHT;

    // The supplied reference is a tall rectangular column (ratio ~1.33). The
    // previous tube was 60x52 — ratio 0.87, wider than tall — which is why it
    // read as a squat housing rather than a conduit.
    const ratio = h / w;
    expect(ratio, `tube h/w = ${ratio.toFixed(2)} (${w}x${h}), reference is ~1.33`)
      .toBeGreaterThan(1.2);
    expect(ratio, 'must not overshoot into a narrow chimney').toBeLessThan(1.6);
  });

  /*
   * The tube art tests render INSIDE the page.
   *
   * A Playwright test file executes in Node, where `document` does not exist —
   * the first version of these tests called `document.createElement('canvas')`
   * at the top level of the test and failed with "ReferenceError: document is
   * not defined". Drawing has to happen inside `page.evaluate`, which does have
   * a DOM; the pixels come back as plain arrays.
   */

  test('the tube art uses the reference palette and a black outline', async ({ page }) => {
    await page.goto('/');
    const px = await page.evaluate(async (w) => {
      const mod = await import('/src/game/art/worldObjects.ts');
      const c = document.createElement('canvas');
      c.width = w;
      c.height = 60;
      const ctx = c.getContext('2d')!;
      mod.drawPipeMouth(ctx, { width: w, height: 60 }, 1);
      const at = (x: number, y: number) => {
        const d = ctx.getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2]];
      };
      return {
        corner: at(0, 0),
        leftEdge: at(1, 30),
        rightEdge: at(w - 1, 30),
        cap: at(Math.floor(w / 2), 2),
        interior: at(Math.floor(w / 2), 30),
        highlight: at(3, 24),
      };
    }, PIPE_HALF_WIDTH * 2);

    const hex = ([r, g, b]: number[]) =>
      `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

    // A 2px BLACK outline wraps the whole form, per the reference.
    expect(hex(px.corner), 'top-left corner').toBe('#000000');
    expect(hex(px.leftEdge), 'left edge').toBe('#000000');
    expect(hex(px.rightEdge), 'right edge').toBe('#000000');

    /*
     * The cap band: the reference's light blue #66CCFF, brightened by energy=1.
     *
     * #66CCFF is R102 G204 B255 — a LIGHT CYAN-BLUE whose blue channel is the
     * HIGHEST of the three. I first asserted green > blue, which is backwards,
     * and it failed with "Expected: > 255, Received: 227": green is 227 after the
     * 45% blend toward white, and blue is 255, already saturated. So the ordering
     * that actually describes the reference is blue > green > red.
     */
    const [cr, cg, cb] = px.cap;
    expect(cg, 'cap green is high — it is a light colour, not a saturated blue')
      .toBeGreaterThan(170);
    expect(cb, 'cap blue is the leading channel, per #66CCFF').toBeGreaterThan(cg);
    expect(cg, 'cap green leads red').toBeGreaterThan(cr);

    /*
     * The interior: the reference's saturated #0066CC, blue-dominant. The art
     * darkens the lower interior with a gradient, so sample above the shaded
     * band rather than dead centre.
     */
    expect(px.interior[2], 'interior must be blue-dominant').toBeGreaterThan(110);
    expect(px.interior[2]).toBeGreaterThan(px.interior[0] * 2);

    // The cyan vertical highlight runs down the LEFT interior wall.
    expect(px.highlight[2], 'highlight is cyan').toBeGreaterThan(180);
    expect(px.highlight[2]).toBeGreaterThan(px.highlight[0]);
    expect(px.highlight[2]).toBeGreaterThan(px.highlight[1]);
  });

  test('the tube has both a dormant and a lit state', async ({ page }) => {
    await page.goto('/');
    const sums = await page.evaluate(async (w) => {
      const mod = await import('/src/game/art/worldObjects.ts');
      const render = (energy: number) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = 60;
        const ctx = c.getContext('2d')!;
        mod.drawPipeMouth(ctx, { width: w, height: 60 }, energy);
        const d = ctx.getImageData(0, 0, w, 60).data;
        let total = 0;
        for (let i = 0; i < d.length; i += 4) total += d[i] + d[i + 1] + d[i + 2];
        return total;
      };
      return { dormant: render(0), lit: render(1) };
    }, PIPE_HALF_WIDTH * 2);

    // The activation tell must be a real brightening, not merely a different image.
    expect(sums.lit, 'the powered tube must be brighter than the dormant one')
      .toBeGreaterThan(sums.dormant);
  });
});

test.describe('CORRECTION PASS — held keys survive a chapter swap', () => {
  test('a direction held across the tube keeps working after arrival', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);

    const keyState = () =>
      page.evaluate(() => {
        const s = window.__worldScene as unknown as {
          keyD?: { isDown?: boolean };
          keyA?: { isDown?: boolean };
          intentVelocityX?: number;
          player?: { x: number };
          currentChapter?: string;
          transport?: { isTravelling?: boolean };
        } | undefined;
        return {
          keyD: s?.keyD?.isDown ?? null,
          keyA: s?.keyA?.isDown ?? null,
          intent: Math.round(s?.intentVelocityX ?? 0),
          x: Math.round(s?.player?.x ?? 0),
          chapter: s?.currentChapter ?? null,
          travelling: s?.transport?.isTravelling ?? false,
        };
      });

    /*
     * THE BUG THIS GUARDS.
     *
     * Phaser's keyboard plugin DELETES every Key it created when a scene shuts
     * down, and the chapter swap is `scene.stop()` + `scene.start()`. A key held
     * ACROSS that boundary emits no new `keydown`, so the freshly created Keys all
     * read `isDown === false` and the player arrives unable to move.
     *
     * Measured before the fix: `keyD` true at t=4.0s, false from t=12.3s, player
     * pinned at x=144 through t=27.0s with `intentVelocityX` stuck at 0 while the
     * physical key was still held.
     *
     * This is invisible to any test that releases the key before travelling, which
     * is why it survived a suite that had already proved all four routes work.
     */
    await page.keyboard.down('d');

    // Hold the key straight through arrival — never release it.
    let arrived: Awaited<ReturnType<typeof keyState>> | null = null;
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(250);
      const now = await keyState();
      if (now.chapter === 'skills' && !now.travelling) {
        arrived = now;
        break;
      }
    }
    await page.keyboard.up('d');

    expect(arrived, 'must have arrived in SKILLS').not.toBeNull();
    expect(arrived!.chapter).toBe('skills');
    expect(arrived!.travelling).toBe(false);

    /*
     * The assertions that matter. On arrival the held key must still read as down
     * and the player must still be moving. Before the fix these were `false` and
     * `0`, and the player never moved again.
     */
    expect(arrived!.keyD, 'keyD must still be down on arrival').toBe(true);
    expect(arrived!.intent, 'the player must still be walking on arrival').toBeGreaterThan(0);

    // And the walk must actually continue: x increases after arrival.
    const startX = arrived!.x;
    await page.keyboard.down('d');
    await page.waitForTimeout(900);
    await page.keyboard.up('d');
    const later = await keyState();
    expect(later.x, 'the player must keep walking after arrival').toBeGreaterThan(startX);
  });

  test('holding a key across the swap does not leave it stuck down', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);

    const intent = () =>
      page.evaluate(() => Math.round(window.__worldScene?.intentVelocityX ?? 0));

    // Hold right through the swap, then release it.
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => {
        const s = window.__worldScene as unknown as {
          currentChapter?: string;
          transport?: { isTravelling?: boolean };
        } | undefined;
        return { c: s?.currentChapter, t: s?.transport?.isTravelling };
      });
      if (st.c === 'skills' && !st.t) break;
    }
    await page.keyboard.up('ArrowRight');

    // After release the player must coast to a stop, not walk forever.
    await page.waitForTimeout(1500);
    expect(Math.abs(await intent()), 'a released key must not stay held').toBeLessThan(30);
  });
});

test.describe('CORRECTION PASS — the world creates no AudioContext', () => {
  test('no audio context is created, and repeated mount/unmount stays clean', async ({ page }) => {
    /*
     * Phaser builds an HTML5AudioSoundManager by default, and that manager
     * creates a real AudioContext — even though nothing in `src/` makes a sound.
     * The cost was an unhandled promise rejection in the browser console on the
     * destroy path:
     *
     *   [Unhandled rejection] InvalidStateError: Cannot resume a closed
     *   AudioContext.
     *
     * `audio: { noAudio: true }` skips the manager entirely, so there is no
     * context to close and nothing to reject.
     *
     * Mutation-checked: with `noAudio` removed this test's probe reports
     * `hasContext: true` and `contextState: "running"`.
     *
     * Note what this does NOT claim. The rejection is swallowed inside Phaser's
     * own unlock retry path and did not reproduce in the page console on demand,
     * so this asserts the CAUSE (a context exists at all) rather than the
     * symptom. Removing the cause is the fix; reproducing the symptom reliably
     * would need a browser-level AudioContext race that is not worth engineering.
     */
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

    await enterWorld(page);

    const audio = await page.evaluate(() => {
      const g = window.__worldScene as unknown as {
        game?: { sound?: { manager?: { context?: { state: string } } } };
      } | undefined;
      const mgr = g?.game?.sound?.manager;
      return {
        hasContext: Boolean(mgr?.context),
        contextState: mgr?.context?.state ?? null,
      };
    });

    expect(audio.hasContext, 'the Data World must not create an AudioContext').toBe(false);
    expect(audio.contextState).toBeNull();

    // Enter and exit twice: the rejections fired on destroy.
    for (let i = 0; i < 2; i += 1) {
      await page.locator('[data-testid="world-exit"]').click();
      await expect(page.locator('canvas')).toHaveCount(0, { timeout: 10_000 });
      await enterWorld(page);
    }

    expect(
      errors.filter((e) => /AudioContext/i.test(e)),
      `AudioContext errors: ${JSON.stringify(errors)}`,
    ).toEqual([]);
    expect(errors, `console errors across two mount/unmount cycles: ${JSON.stringify(errors)}`)
      .toEqual([]);
  });
});
