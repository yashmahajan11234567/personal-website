/**
 * The three reported defects, pinned by test.
 *
 * 1. THE EXIT CONTROL WAS INVISIBLE — a CSS specificity collision, not clipping.
 * 2. THE SKILLS -> PROJECTS TUBE WAS INVISIBLE — `onArrive` hid every pipe
 *    except the destination's entry pipe, so the only way onward had no art.
 * 3. THE PANEL HAD NO LABELLED WAY OUT — a 16px `×` and a muted strip, and both
 *    were themselves colour-broken by the same specificity collision as (1).
 *
 * Every assertion below is GEOMETRIC or COMPUTED-STYLE based, never a ratio of
 * the implementation against itself. Each of these tests fails against the
 * pre-fix code — verified by mutation in the session log — because they assert
 * observed browser state, not the presence of a selector.
 */

import { expect, test, type Page } from '@playwright/test';

/** Open the world and dismiss the entry plate. */
async function openWorld(page: Page): Promise<void> {
  await page.goto('http://localhost:5173/#/data-world');
  await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30_000 });
  await page.locator('[data-testid="world-entry-dismiss"]').click();
  await page.waitForSelector('[data-testid="world-entry"]', { state: 'detached', timeout: 10_000 });
  await page.waitForTimeout(400);
}

/** Walk right until `chapter` is current and the transport has settled. */
async function walkToChapter(page: Page, chapter: string, timeout = 90_000): Promise<void> {
  await page.keyboard.down('ArrowRight');
  await page
    .waitForFunction((want) => window.__worldScene?.currentChapter === want, chapter, { timeout })
    .catch(() => undefined);
  await page.keyboard.up('ArrowRight');
  // The swap is asynchronous: `currentChapter` flips before the last transport
  // phases run, so asserting on chapter state without waiting for `idle` reads
  // the PREVIOUS chapter and produces phantom failures.
  await page
    .waitForFunction(
      () => {
        const s = window.__worldScene as
          | { currentChapter?: string; playerLocked?: boolean; transportPhases?: readonly string[] }
          | undefined;
        const phases = s?.transportPhases ?? [];
        return s?.playerLocked === false && phases.at(-1) === 'idle';
      },
      undefined,
      { timeout: 30_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

/** Relative luminance, so a colour pair can be turned into a WCAG ratio. */
const CONTRAST = `
  (fg, bg) => {
    const parse = (c) => { const m = c.match(/[\\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
    const pf = parse(fg); const pb = parse(bg);
    if (!pf || !pb) return null;
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (p) => 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]);
    const a = L(pf); const b = L(pb);
    return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
  }
`;

/** Nearest ancestor background that is not transparent. */
const EFFECTIVE_BG = `
  (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = getComputedStyle(node).backgroundColor;
      if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return c;
      node = node.parentElement;
    }
    return 'rgb(0, 0, 0)';
  }
`;

/* ================================================================== *
 * 1. The exit control
 * ================================================================== */

test.describe('CORRECTION PASS — the exit control is actually visible', () => {
  for (const vp of [
    { width: 1917, height: 933, label: 'wide desktop' },
    { width: 1440, height: 900, label: 'laptop' },
    { width: 390, height: 844, label: 'mobile' },
  ]) {
    test(`[${vp.label} ${vp.width}x${vp.height}] it is opaque, legible and unclipped`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openWorld(page);

      const m = await page.evaluate(
        ({ contrastSrc, bgSrc }) => {
          const contrast = eval(contrastSrc);
          const bgOf = eval(bgSrc);
          const el = document.querySelector<HTMLElement>('[data-testid="world-exit"]')!;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return {
            contrast: contrast(cs.color, bgOf(el)),
            ownBackground: cs.backgroundColor,
            padding: cs.padding,
            text: el.innerText.trim(),
            w: Math.round(r.width),
            h: Math.round(r.height),
            clipped: r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight,
            hitIsSelf: hit === el || el.contains(hit),
            inTopLeft: r.left < 40 && r.top < 40,
          };
        },
        { contrastSrc: CONTRAST, bgSrc: EFFECTIVE_BG },
      );

      /*
       * THE PRE-FIX FAILURE, precisely.
       * color rgb(26,26,26) on `rgba(0,0,0,0)` over a #0a0a0a world — a contrast
       * ratio of about 1.1 against the surface, with no background of its own.
       */
      expect(m.contrast ?? 0, 'text must contrast with what is behind it').toBeGreaterThan(4.5);

      // Opaque own background, or the control depends entirely on its parent.
      expect(m.ownBackground, 'the control needs its own background').not.toBe('rgba(0, 0, 0, 0)');

      // A real pointer target. Pre-fix padding was App.css's 12px 24px; the point
      // is that the size comes from the intended rule, not the leaked one.
      // 44px is the WCAG 2.5.8 target-size floor, which `routing-exit-tube.spec.ts`
      // already enforces for this control.
      expect(m.w).toBeGreaterThanOrEqual(120);
      expect(m.h).toBeGreaterThanOrEqual(44);
      expect(m.padding).toBe('11px 15px');

      // Fully on screen and in the corner the requirement asks for.
      expect(m.clipped, 'the exit control must not be cut off by any edge').toBe(false);
      expect(m.inTopLeft, 'the exit control stays top-left').toBe(true);

      // And it is genuinely clickable, not merely visible.
      expect(m.hitIsSelf, 'the exit control must be the top element at its own centre').toBe(true);

      // Named, so it reads as a destination rather than as "close".
      expect(m.text).toMatch(/back to portfolio/i);
    });
  }

  test('it still returns to the normal portfolio', async ({ page }) => {
    await openWorld(page);
    await page.click('[data-testid="world-exit"]');
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 8000 });
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(await page.locator('[data-testid="world-canvas"]').count()).toBe(0);
  });
});

/* ================================================================== *
 * 2. The exit tube must be visible in the chapter that owns it
 * ================================================================== */

test.describe('CORRECTION PASS — a chapter shows its own way out', () => {
  /*
   * ONLY SKILLS IS LOOPED OVER, and that is the topology, not an omission.
   *
   * The Data world is START -> SKILLS -> PROJECTS, with PROJECTS terminal. So
   * SKILLS is the one chapter that has BOTH an entry pipe and an exit pipe, and
   * therefore the one chapter where the pre-fix bug showed: `onArrive` left only
   * the entry pipe visible, so the chapter that must offer a way onward offered
   * no art at all.
   *
   * PROJECTS is checked separately below, and the assertion there is the
   * opposite one — it has NO exit tube, and having one would be a bug.
   */
  test('[skills] the skills -> projects tube is visible on arrival', async ({ page }) => {
    await openWorld(page);
    await walkToChapter(page, 'skills');

    // `from` is a Node-side value, so it must be passed into the browser context:
    // `page.evaluate` runs in the page, where closure variables do not exist.
    const m = await page.evaluate(() => {
      const s = window.__worldScene as unknown as {
        currentChapter?: string;
        playerLocked?: boolean;
        transportPhases?: readonly string[];
        world?: { exitPipe?: { id: string } | null };
        pipeSkins?: Map<string, { mouth: { visible: boolean } }>;
      };
      const exitId = s.world?.exitPipe?.id ?? null;
      const all = [...(s.pipeSkins ?? new Map()).entries()].map(([id, b]) => ({
        id,
        visible: b.mouth.visible,
      }));
      return {
        chapter: s.currentChapter,
        exitId,
        settled: s.playerLocked === false && (s.transportPhases ?? []).at(-1) === 'idle',
        exitVisible: exitId ? (s.pipeSkins?.get(exitId)?.mouth.visible ?? null) : 'no exit pipe',
        // Every CLIFF pipe must be gone: that chapter's scene was stopped.
        cliffHidden: all.filter((p) => p.id.startsWith('cliff')).every((p) => !p.visible),
        all,
      };
    });

    expect(m.chapter, 'arrived in skills').toBe('skills');

    /*
     * THE PRE-FIX FAILURE. `onArrive` ran
     *   for (const [id, built] of this.pipeSkins) built.mouth.setVisible(id === entryId)
     * so `skills-to-projects` read `visible === false` on arrival while `pipeNearX`
     * still armed it: the player walked into nothing and arrived in Projects. The
     * twelve-phase log completed normally, so no existing assertion noticed.
     */
    expect(m.settled, 'the transport must finish, not stall part-way').toBe(true);
    expect(m.exitId, 'skills must own an exit tube').toBe('skills-to-projects');
    expect(m.exitVisible, "the chapter's own exit tube must be drawn").toBe(true);
    expect(m.cliffHidden, 'the chapter left behind must leave nothing visible').toBe(true);
  });

  test('[skills] the tube is real reference-shaped art, and walks the player onward', async ({
    page,
  }) => {
    await openWorld(page);
    await walkToChapter(page, 'skills');

    const art = await page.evaluate(() => {
      const s = window.__worldScene as unknown as {
        world?: { exitPipe?: { id: string } | null };
        pipeSkins?: Map<
          string,
          {
            mouth: {
              visible: boolean;
              list: {
                type: string;
                width: number;
                height: number;
                visible: boolean;
                texture?: { key?: string };
              }[];
            };
          }
        >;
      };
      const exitId = s.world?.exitPipe?.id;
      if (!exitId) return { missing: true as const };
      const mouth = s.pipeSkins?.get(exitId)?.mouth;
      const mouthImage = mouth?.list.find((o) => o.texture?.key?.includes('mouth'));
      const plate = mouth?.list.find((o) => o.texture?.key?.includes('plate'));
      return {
        containerVisible: mouth?.visible ?? null,
        mouthW: mouthImage?.width ?? 0,
        mouthH: mouthImage?.height ?? 0,
        mouthTexture: mouthImage?.texture?.key ?? null,
        plateTexture: plate?.texture?.key ?? null,
      };
    });

    // `missing` only exists on the early-return branch of the evaluate above, so
    // on the success path it is `undefined`, never `false`. Asserting `toBe(false)`
    // was wrong about my own return shape.
    expect(art.missing ?? false, 'skills must have an exit tube').toBe(false);
    expect(art.containerVisible).toBe(true);
    // Tall and narrow, per the reference conduit: 60/44 = 1.36.
    expect(art.mouthW, 'tube width').toBe(44);
    expect(art.mouthH / art.mouthW, 'tube must be taller than it is wide').toBeGreaterThan(1.2);
    expect(art.mouthTexture).toMatch(/mouth/);
    expect(art.plateTexture, 'the tube carries a destination plate').toMatch(/plate/);

    // Walking into it still completes all twelve phases, in order.
        //
        // THE KEY MUST BE HELD for the whole wait. The pipe arms on PROXIMITY, so a
        // `page.evaluate` that only polls never causes the player to move and the
        // promise times out at 45s. `walkToChapter` above holds the key for the
        // first leg; this is the second leg and it needs the same treatment.
        await page.keyboard.down('ArrowRight');
        const travel = await page.evaluate(
          () =>
            new Promise<string[]>((resolve, reject) => {
              const s = window.__worldScene as unknown as {
                currentChapter?: string;
                transportPhases?: readonly string[];
              };
              const timer = setTimeout(() => reject(new Error('travel timed out')), 45_000);
              const poll = setInterval(() => {
                const p = s.transportPhases ?? [];
                if (s.currentChapter === 'projects' && p.at(-1) === 'idle') {
                  clearInterval(poll);
                  clearTimeout(timer);
                  resolve([...p]);
                }
              }, 120);
            }),
        );
        await page.keyboard.up('ArrowRight');

    expect(travel, 'all twelve phases, in order').toEqual([
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

  test('[projects] the terminal chapter shows its arrival tube and has no way on', async ({ page }) => {
    await openWorld(page);
    await walkToChapter(page, 'skills');

    // Travel on to the terminal chapter. Holding ArrowRight is what carries the
    // player into the tube; the pipe arms on proximity, so without a held key
    // this promise below waits forever.
    await page.keyboard.down('ArrowRight');
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const s = window.__worldScene as unknown as {
            currentChapter?: string;
            transportPhases?: readonly string[];
          };
          const timer = setTimeout(() => reject(new Error('travel timed out')), 45_000);
          const poll = setInterval(() => {
            const p = s.transportPhases ?? [];
            if (s.currentChapter === 'projects' && p.at(-1) === 'idle') {
              clearInterval(poll);
              clearTimeout(timer);
              resolve();
            }
          }, 120);
        }),
    );
    await page.keyboard.up('ArrowRight');

    const m = await page.evaluate(() => {
      const s = window.__worldScene as unknown as {
        currentChapter?: string;
        world?: { entryPipe?: { id: string }; exitPipe?: { id: string } | null };
        pipeSkins?: Map<string, { mouth: { visible: boolean } }>;
      };
      const entryId = s.world?.entryPipe?.id ?? null;
      return {
        chapter: s.currentChapter,
        entryId,
        entryVisible: entryId ? (s.pipeSkins?.get(entryId)?.mouth.visible ?? null) : null,
        // The terminal chapter is the end of the journey, so having an exit tube
        // would be the bug. Asserting this prevents a future "fix" that quietly
        // adds a direct PROJECTS -> START route.
        hasExit: (s.world?.exitPipe?.id ?? null) !== null,
        skillsHidden: [...(s.pipeSkins ?? new Map()).entries()]
          .filter(([id]) => id.startsWith('skills'))
          .every(([, b]) => !b.mouth.visible),
      };
    });

    expect(m.chapter).toBe('projects');
    expect(m.entryVisible, 'the tube the player climbed out of is drawn').toBe(true);
    expect(m.hasExit, 'PROJECTS is terminal: no direct way back to START').toBe(false);
    expect(m.skillsHidden, 'the chapter left behind leaves nothing visible').toBe(true);
  });

  test('the player is never frozen after a chapter swap', async ({ page }) => {
    await openWorld(page);
    await walkToChapter(page, 'skills');

    /*
     * A THIRD defect this pin exists for, and it was caused by a fix attempt
     * during this same pass, so it is worth stating plainly: calling
     * `built.setActive(false)` inside `onArrive` touches skins whose scene was
     * destroyed by `scene.stop()`, which throws inside Phaser's `Image.setTexture`.
     * `onArrive` runs immediately before `lockPlayer(false)`, so the throw skipped
     * the unlock and the player stayed frozen at spawn while every phase-log
     * assertion still passed.
     */
    const before = await page.evaluate(() => {
      const s = window.__worldScene as unknown as { player: { x: number }; playerLocked?: boolean };
      return { x: Math.round(s.player.x), locked: s.playerLocked };
    });
    expect(before.locked, 'the transport must release the player').toBe(false);

    // A fresh keypress after the swap must move the player.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1200);
    const during = await page.evaluate(() => {
      const s = window.__worldScene as unknown as { player: { x: number } };
      return Math.round(s.player.x);
    });
    await page.keyboard.up('ArrowRight');

    expect(during, 'movement must resume after the swap').toBeGreaterThan(before.x);

    // And no error was thrown out of the scene.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});

/* ================================================================== *
 * 3. The panel's way out
 * ================================================================== */

test.describe('CORRECTION PASS — a panel has a labelled way back', () => {
  for (const vp of [
    { width: 1917, height: 933, label: 'wide desktop' },
    { width: 390, height: 844, label: 'mobile' },
  ]) {
    test(`[${vp.label} ${vp.width}x${vp.height}] BACK is visible, legible and closes the panel`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openWorld(page);

      await page.click('[data-testid="world-index-toggle"]');
      const firstSkill = await page.evaluate(
        () => document.querySelector<HTMLElement>('[data-testid^="index-skill-"]')?.dataset.testid ?? '',
      );
      await page.click(`[data-testid="${firstSkill}"]`);
      await page.waitForSelector('[data-testid="panel-back"]', { timeout: 15_000 });
      await page.waitForTimeout(400);

      const m = await page.evaluate(({ contrastSrc }) => {
        const contrast = eval(contrastSrc);
        const probe = (sel: string) => {
          const el = document.querySelector<HTMLElement>(sel);
          if (!el) return { missing: true as const };
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const panel = document.querySelector<HTMLElement>('[data-testid="info-panel"]')!;
          return {
            w: Math.round(r.width),
            h: Math.round(r.height),
            color: cs.color,
            bg: cs.backgroundColor,
            fontSize: parseFloat(cs.fontSize),
            lineHeight: cs.lineHeight,
            text: el.innerText.trim(),
            aria: el.getAttribute('aria-label'),
            contrast: contrast(cs.color, getComputedStyle(panel).backgroundColor),
            hitIsSelf: hit === el || el.contains(hit),
          };
        };
        const header = document.querySelector<HTMLElement>('.info-panel__header');
        const headerCs = header ? getComputedStyle(header) : null;
        return {
          back: probe('[data-testid="panel-back"]'),
          headerDisplay: headerCs?.display ?? null,
          headerPadding: headerCs?.padding ?? null,
        };
      }, { contrastSrc: CONTRAST });

      // THE BACK BUTTON EXISTS AND SAYS SO.
      expect(m.back.missing, 'a labelled BACK control is required').toBeFalsy();
      expect(m.back.text).toMatch(/back/i);
      expect(m.back.aria, 'the accessible name states where it goes').toBeTruthy();

      /*
       * THE PRE-FIX FAILURE, both halves of it.
       *
       * (a) `.info-panel__close-icon` rendered color rgb(26,26,26) on
       *     `rgba(0,0,0,0)` because App.css's `.placeholder-world button`
       *     outranked every bare class rule in InfoPanel.css.
       * (b) The new BACK button initially measured 14px TALL with a computed
       *     `line-height: 0px`, because `.world-canvas` sets `line-height: 0` and
       *     `.info-panel` never reset it. 14px is not a usable target.
       */
      expect(m.back.contrast ?? 0, 'BACK text must contrast with the panel').toBeGreaterThan(4.5);
      expect(m.back.bg, 'BACK needs its own background').not.toBe('rgba(0, 0, 0, 0)');
      expect(m.back.lineHeight, 'the panel must reset the stage line-height: 0').not.toBe('0px');
      expect(m.back.h, 'BACK must be a real pointer target').toBeGreaterThanOrEqual(28);
      expect(m.back.hitIsSelf, 'BACK must be the top element at its own centre').toBe(true);

      // The BACK button exists, is legible, and is a real pointer target.
      expect(m.headerDisplay).toBe('flex');
      expect(m.headerPadding).not.toBe('0px');

      // Clicking BACK closes the panel, with no keyboard involved.
      await page.click('[data-testid="panel-back"]');
      await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(0);

      // And focus returns to the control that opened it.
      expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe(
        firstSkill,
      );
    });
  }

  test('BACK works from a project panel too, and after scrolling the body', async ({ page }) => {
    await openWorld(page);
    await page.click('[data-testid="world-index-toggle"]');
    const firstProject = await page.evaluate(
      () => document.querySelector<HTMLElement>('[data-testid^="index-project-"]')?.dataset.testid ?? '',
    );
    await page.click(`[data-testid="${firstProject}"]`);
    await page.waitForSelector('[data-testid="panel-back"]', { timeout: 15_000 });

    // Scroll the body to its end: the header must not move, so BACK stays usable.
    const moved = await page.evaluate(() => {
      const p = document.querySelector<HTMLElement>('[data-testid="info-panel"]')!;
      const body = p.querySelector<HTMLElement>('.info-panel__body')!;
      const back = p.querySelector<HTMLElement>('[data-testid="panel-back"]')!;
      const before = Math.round(back.getBoundingClientRect().top);
      const scrolled = body.scrollHeight > body.clientHeight + 1;
      if (scrolled) body.scrollTop = body.scrollHeight;
      return { before, scrolled, afterTop: Math.round(back.getBoundingClientRect().top) };
    });
    expect(moved.scrolled, 'this panel must have a scrollable body').toBe(true);
    expect(moved.afterTop, 'BACK is pinned in the header while the body scrolls').toBe(moved.before);

    await page.click('[data-testid="panel-back"]');
    await expect(page.locator('[data-testid="info-panel"]')).toHaveCount(0);
  });

  test('BACK is keyboard operable and named for assistive tech', async ({ page }) => {
    await openWorld(page);
    await page.click('[data-testid="world-index-toggle"]');
    const firstSkill = await page.evaluate(
      () => document.querySelector<HTMLElement>('[data-testid^="index-skill-"]')?.dataset.testid ?? '',
    );
    await page.click(`[data-testid="${firstSkill}"]`);
    await page.waitForSelector('[data-testid="panel-back"]', { timeout: 15_000 });

    const back = page.locator('[data-testid="panel-back"]');
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute('aria-label', /back to the (skills|projects) chapter/i);

    await back.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    expect(await page.locator('[data-testid="info-panel"]').count()).toBe(0);
  });
});