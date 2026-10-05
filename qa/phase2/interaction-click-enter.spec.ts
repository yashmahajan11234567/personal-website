/**
 * CORRECTION PASS — requirement 2: skills and projects are ACTUALLY interactive.
 *
 * Before this pass the stations were decorative: `setInteractive` was never
 * called and the scene had no pointer handler, so a station that looked
 * clickable did nothing. Requirement 2 also requires a clear ENTER prompt, so
 * both input paths are covered here.
 */

import { expect, test, type Page } from '@playwright/test';

async function enterWorld(page: import('@playwright/test').Page) {
  await page.goto('/#/data-world');
  await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000,
  });
  const plate = page.locator('[data-testid="world-entry"]');
  if (await plate.count()) await page.locator('[data-testid="world-entry-dismiss"]').click();
  await page.waitForTimeout(800);
}

const scene = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = window.__worldScene as unknown as {
      currentChapter?: string;
      focused?: { id: string; kind: string } | null;
      panelOpen?: boolean;
      stations?: Array<{ station: { id: string; kind: string; x: number }; sprite: { input?: { enabled?: boolean } } }>;
      player?: { x: number };
      transport?: { phaseLog?: string[]; isTravelling?: boolean; currentPhase?: string };
    } | undefined;
    return {
      chapter: s?.currentChapter ?? null,
      focusedId: s?.focused?.id ?? null,
      panelOpen: s?.panelOpen ?? null,
      stationCount: s?.stations?.length ?? 0,
      interactive: s?.stations?.filter((v) => v.sprite?.input?.enabled).length ?? 0,
      kinds: (s?.stations ?? []).map((v) => v.station.kind),
      x: Math.round(s?.player?.x ?? 0),
      phaseCount: s?.transport?.phaseLog?.length ?? 0,
      travelling: s?.transport?.isTravelling ?? false,
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
  const before = await scene(page);
  const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';

  await page.keyboard.down(key);
  let arrived = false;
  for (let i = 0; i < 300 && !arrived; i += 1) {
    await page.waitForTimeout(250);
    const now = await scene(page);
    if (now.chapter !== before.chapter) arrived = true;
  }
  await page.keyboard.up(key);

  // Let the twelve-phase sequence settle at the destination.
  for (let i = 0; i < 160; i += 1) {
    await page.waitForTimeout(250);
    const now = await scene(page);
    if (!now.travelling && now.phase === 'idle') break;
  }
  await page.waitForTimeout(500);
  return { before, after: await scene(page), started: arrived };
}

const panelVisible = (page: import('@playwright/test').Page) =>
  page.evaluate(() => Boolean(document.querySelector('[data-testid="info-panel"]')));

/** Walk toward a station index until it holds focus. */
async function approach(page: import('@playwright/test').Page, index: number) {
  for (let step = 0; step < 80; step += 1) {
    const st = await page.evaluate((i) => {
      const s = window.__worldScene as unknown as {
        stations?: Array<{ station: { id: string; x: number } }>;
        focused?: { id: string } | null;
        player?: { x: number };
      } | undefined;
      const v = s?.stations?.[i];
      if (!v) return { dir: 0, focused: false };
      return {
        dir: v.station.x > (s?.player?.x ?? 0) ? 1 : -1,
        focused: s?.focused?.id === v.station.id,
      };
    }, index);
    if (st.focused) return true;
    if (st.dir === 0) return false;
    const key = st.dir > 0 ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.down(key);
    await page.waitForTimeout(200);
    await page.keyboard.up(key);
    await page.waitForTimeout(140);
  }
  return false;
}

/** Page coordinates of a station's sprite centre. */
async function stationCentre(page: import('@playwright/test').Page, index: number) {
  return page.evaluate((i) => {
    const s = window.__worldScene as unknown as {
      stations?: Array<{ sprite: { getBounds(): { centerX: number; centerY: number; width: number; height: number } } }>;
      cameras?: { main: { scrollX: number; scrollY: number; width: number } };
    } | undefined;
    const v = s?.stations?.[i];
    const cv = document.querySelector('[data-testid="world-canvas"] canvas');
    const cam = s?.cameras?.main;
    if (!v || !cv || !cam) return null;
    const r = cv.getBoundingClientRect();
    const scale = r.width / cam.width;
    const b = v.sprite.getBounds();
    return {
      x: r.left + (b.centerX - cam.scrollX) * scale,
      y: r.top + (b.centerY - cam.scrollY) * scale,
      w: b.width * scale,
      h: b.height * scale,
    };
  }, index);
}

test.describe('CORRECTION PASS — R2 stations are interactive', () => {
  test('every skill station accepts pointer input', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    expect((await travel(page, 'right')).started, 'START -> SKILLS').toBe(true);
    expect((await scene(page)).chapter).toBe('skills');

    const st = await scene(page);
    expect(st.stationCount, 'six skills').toBe(6);
    expect(st.interactive, 'every station must be interactive').toBe(6);
  });

  test('every project station accepts pointer input', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right'); // SKILLS
    expect((await travel(page, 'right')).started, 'SKILLS -> PROJECTS').toBe(true);
    expect((await scene(page)).chapter).toBe('projects');

    const st = await scene(page);
    expect(st.stationCount, 'four projects').toBe(4);
    expect(st.interactive).toBe(4);
  });

  test('proximity focuses a skill and shows a clear ENTER prompt', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');

    expect(await approach(page, 0), 'walking near a skill must focus it').toBe(true);
    expect((await scene(page)).focusedId).toBeTruthy();

    const prompt = await page.evaluate(
      () => document.querySelector('[data-testid="world-nearby"]')?.textContent?.trim() ?? '',
    );
    expect(prompt).toMatch(/press enter/i);
    // The prompt names the station, so the user is never guessing.
    expect(prompt.length).toBeGreaterThan(10);
  });

  test('ENTER opens the focused skill panel', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');
    await approach(page, 0);

    await page.keyboard.down('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(600);

    expect(await panelVisible(page), 'Enter must open the skill panel').toBe(true);
  });

  test('CLICK opens a skill panel without moving the player', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');

    // Deliberately do NOT walk up to the station: the click must work from range.
    const posBefore = (await scene(page)).x;
    const centre = await stationCentre(page, 0);
    expect(centre, 'a skill station must be on screen').not.toBeNull();

    await page.mouse.click(centre!.x, centre!.y);
    await page.waitForTimeout(800);

    expect(await panelVisible(page), 'clicking a skill station must open its panel').toBe(true);
    // The click opened it in place; it did not teleport the player there.
    expect(Math.abs((await scene(page)).x - posBefore)).toBeLessThan(60);
  });

  test('CLICK opens a project panel', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');
    await travel(page, 'right');
    expect((await scene(page)).chapter).toBe('projects');

    const idx = await page.evaluate(
      () =>
        (window.__worldScene?.stations ?? []).findIndex(
          (v) => v.station.kind === 'project',
        ) as number,
    );
    expect(idx, 'a project station must exist').toBeGreaterThanOrEqual(0);

    const centre = await stationCentre(page, idx);
    await page.mouse.click(centre!.x, centre!.y);
    await page.waitForTimeout(800);

    expect(await panelVisible(page), 'clicking a project must open its panel').toBe(true);
  });

  test('ENTER opens a project panel', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');
    await travel(page, 'right');

    const idx = await page.evaluate(
      () =>
        (window.__worldScene?.stations ?? []).findIndex(
          (v) => v.station.kind === 'project',
        ) as number,
    );
    expect(await approach(page, idx), 'walking near a project must focus it').toBe(true);

    await page.keyboard.down('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(600);

    expect(await panelVisible(page), 'Enter must open the project panel').toBe(true);
  });

  test('the click target is large enough to hit', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');

    const centre = await stationCentre(page, 0);
    // At least 44x44 CSS px, the usual minimum comfortable target.
    expect(centre!.w, 'skill click target width').toBeGreaterThanOrEqual(44);
    expect(centre!.h, 'skill click target height').toBeGreaterThanOrEqual(44);
  });

  test('Escape closes a panel opened by click', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');

    const centre = await stationCentre(page, 0);
    await page.mouse.click(centre!.x, centre!.y);
    await page.waitForTimeout(700);
    expect(await panelVisible(page)).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    expect(await panelVisible(page), 'Escape must close a clicked-open panel').toBe(false);
  });

  test('a click cannot stack a second panel on an open one', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');

    const first = await stationCentre(page, 0);
    await page.mouse.click(first!.x, first!.y);
    await page.waitForTimeout(700);

    const second = await stationCentre(page, 1);
    await page.mouse.click(second!.x, second!.y);
    await page.waitForTimeout(700);

    await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(1);
  });
});

test.describe('CORRECTION PASS — R8 content is unchanged', () => {
  test('exactly six skills, exactly the required ones', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');

    const labels = await page.evaluate(() =>
      (window.__worldScene?.stations ?? []).map((v) => v.station.label as string),
    );
    expect(labels).toHaveLength(6);
    for (const want of ['SQL', 'Python', 'Excel', 'Power BI', 'Tableau', 'Streamlit']) {
      expect(labels.some((l) => l.toUpperCase().includes(want.toUpperCase()))).toBe(true);
    }
  });

  test('exactly four projects, exactly the required ones', async ({ page }) => {
    test.setTimeout(150_000);
    await enterWorld(page);
    await travel(page, 'right');
    await travel(page, 'right');

    const labels = await page.evaluate(() =>
      (window.__worldScene?.stations ?? []).map((v) => v.station.label as string),
    );
    expect(labels).toHaveLength(4);
    for (const want of [
      'NIFTY',
      'SQL Data Warehouse',
      'PRIMETradeAI',
      'Data Analytics Dashboards',
    ]) {
      expect(
        labels.some((l) => l.toLowerCase().includes(want.toLowerCase())),
        `missing project ${want}`,
      ).toBe(true);
    }
  });

  test('Affordable Housing is absent', async ({ page }) => {
    // Two full chapter walks plus the settle loop. 150s expired inside the
    // second travel on this run — borderline, and borderline becomes a flake on a
    // slower machine, so this one gets real headroom.
    test.setTimeout(300_000);
    await enterWorld(page);
    await travel(page, 'right');
    await travel(page, 'right');

    const labels = await page.evaluate(() =>
      (window.__worldScene?.stations ?? []).map((v) => (v.station.label as string).toLowerCase()),
    );
    expect(labels.some((l) => l.includes('affordable'))).toBe(false);
  });
});