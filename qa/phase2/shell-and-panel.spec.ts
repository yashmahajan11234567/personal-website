/*
 * STAGE E — the game shell and the information panel.
 *
 * Everything here is measured from the running page rather than asserted from
 * source. The defects this stage fixed were measured first (952px of scrollable
 * dead space at 1440x900, a 239px-tall accessibility mirror sitting in normal
 * flow, 826px of duplicated index below the canvas, an unlocked page) and these
 * tests exist to keep those numbers from coming back.
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const WORLD = '#/data-world';

/** Desktop and a phone, because the brief requires both to be checked. */
const SIZES = [
  { w: 1440, h: 900, label: 'desktop' },
  { w: 390, h: 844, label: 'mobile' },
] as const;

/** Open the world, wait for Phaser, and dismiss the entry plate with Enter. */
async function openWorld(page: Page): Promise<void> {
  await page.goto(`/${WORLD}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean((window as unknown as { __worldScene?: { player?: unknown } }).__worldScene?.player),
    undefined,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2000);
  await page.keyboard.press('Enter'); // dismiss the entry plate
  await page.waitForTimeout(500);
}

/** Open the contents drawer and then a project panel from it. */
async function openProjectPanel(page: Page, id = 'primetradeai'): Promise<void> {
  const toggle = page.locator('[data-testid="world-index-toggle"]');
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  await page.locator(`[data-testid="index-project-${id}"]`).click();
  await page.waitForSelector('[data-testid="info-panel"]', { timeout: 10000 });
  await page.waitForTimeout(400);
}

test.describe('STAGE E — game shell', () => {
  for (const { w, h, label } of SIZES) {
    test(`[${label} ${w}x${h}] the world occupies the viewport, with no dead space below it`, async ({
      page,
    }) => {
      await openWorld(page);

      const m = await page.evaluate(() => {
        const doc = document.documentElement;
        const canvas = document.querySelector('canvas');
        const b = canvas?.getBoundingClientRect();
        return {
          viewportH: window.innerHeight,
          scrollable: doc.scrollHeight - window.innerHeight,
          canvasH: b ? Math.round(b.height) : 0,
          canvasTop: b ? Math.round(b.top) : 0,
        };
      });

      // The canvas is the point of the page: it must dominate the viewport.
      expect(m.canvasH, 'canvas height').toBeGreaterThan(m.viewportH * 0.7);
      // And there must be no large band of scrollable page beneath it. 120px of
      // slack for the header and any rounding; the defect was 952px.
      expect(m.scrollable, 'scrollable dead space below the canvas').toBeLessThan(120);
    });

    test(`[${label} ${w}x${h}] page scrolling is locked while the world is active`, async ({ page }) => {
      await openWorld(page);

      const result = await page.evaluate(() => {
        const before = window.scrollY;
        window.scrollTo(0, 500);
        const after = window.scrollY;
        window.scrollTo(0, before);
        return {
          moved: after !== before,
          body: getComputedStyle(document.body).overflow,
          html: getComputedStyle(document.documentElement).overflow,
        };
      });

      expect(result.moved, 'the document must not scroll while the game is open').toBe(false);
      // Locked on BOTH: in standards mode the scrolling element is <html>, so
      // locking only body would leave the page scrollable in every current browser.
      expect(result.html).toBe('hidden');
      expect(result.body).toBe('hidden');
    });

    test(`[${label} ${w}x${h}] the accessibility mirror is in the DOM but not the layout`, async ({
      page,
    }) => {
      await openWorld(page);

      const m = await page.evaluate(() => {
        const a = document.querySelector('.world-a11y');
        if (!a) return { present: false };
        const b = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return {
          present: true,
          h: Math.round(b.height),
          position: cs.position,
          clip: cs.clipPath,
          // Still readable by assistive tech: not display:none, not aria-hidden.
          display: cs.display,
          ariaHidden: a.getAttribute('aria-hidden'),
          kbdCount: a.querySelectorAll('kbd').length,
        };
      });

      expect(m.present, '.world-a11y must remain in the DOM').toBe(true);
      // Visually hidden: occupies no layout.
      expect(m.h, 'the mirror must not occupy page height').toBeLessThanOrEqual(2);
      expect(m.position).toBe('absolute');
      expect(m.clip).not.toBe('none');
      // Still in the accessibility tree.
      expect(m.display).not.toBe('none');
      expect(m.ariaHidden).toBeNull();
      expect(m.kbdCount, 'the documented controls remain').toBeGreaterThan(0);
    });

    test(`[${label} ${w}x${h}] Skills and Projects are not duplicated below the canvas`, async ({
      page,
    }) => {
      await openWorld(page);

      const m = await page.evaluate(() => {
        const idx = document.querySelector('.world-index');
        return {
          display: idx ? getComputedStyle(idx).display : null,
          open: idx?.getAttribute('data-open'),
          // How many buttons are actually reachable right now.
          reachable: document.querySelectorAll('.world-index button').length,
        };
      });

      // Closed by default, so it duplicates nothing on screen.
      expect(m.display, 'the index must not be visible under the game').toBe('none');
      expect(m.open).toBe('false');
    });
  }

  test('the contents drawer opens over the stage and is reachable without the canvas', async ({
    page,
  }) => {
    await openWorld(page);

    const toggle = page.locator('[data-testid="world-index-toggle"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await page.waitForTimeout(400);

    const drawer = page.evaluate(() => {
      const d = document.querySelector('.world-index');
      return {
        open: d?.getAttribute('data-open'),
        display: d ? getComputedStyle(d).display : null,
        buttons: d?.querySelectorAll('button').length ?? 0,
        scrollable: d ? d.scrollHeight > d.clientHeight + 1 : false,
        overflowY: d ? getComputedStyle(d).overflowY : null,
      };
    });

    expect((await drawer).open).toBe('true');
    expect((await drawer).display).toBe('block');
    // Six skills and four projects, reachable with no canvas and no game state.
    expect((await drawer).buttons).toBe(10);
    expect((await drawer).overflowY).toBe('auto');

    await toggle.click();
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('.world-index')!).display),
    ).toBe('none');
  });

  test('the entry plate is compact, not a splash, and Enter dismisses it', async ({ page }) => {
    await page.goto(`/${WORLD}`, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2500);

    const plate = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="world-entry"]');
      if (!el) return { present: false };
      const b = el.getBoundingClientRect();
      const card = el.querySelector('.world-entry__card')?.getBoundingClientRect();
      return {
        present: true,
        cardW: card ? Math.round(card.width) : 0,
        cardH: card ? Math.round(card.height) : 0,
        title: el.querySelector('.world-entry__title')?.textContent ?? '',
        role: el.getAttribute('role'),
        labelled: Boolean(el.getAttribute('aria-label')),
      };
    });

    expect(plate.present).toBe(true);
    expect(plate.role).toBe('dialog');
    expect(plate.labelled).toBe(true);
    expect(plate.title).toContain('Data World');
    // Compact: a card, not a full-viewport curtain.
    expect(plate.cardW).toBeLessThan(600);
    expect(plate.cardH).toBeLessThan(400);

    // Enter dismisses it.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    expect(await page.locator('[data-testid="world-entry"]').count()).toBe(0);

    // And it does not come back.
    await page.waitForTimeout(1200);
    expect(await page.locator('[data-testid="world-entry"]').count()).toBe(0);
  });

  test('the entry plate is not a gate: Escape and the button dismiss it too', async ({ page }) => {
    await page.goto(`/${WORLD}`, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    expect(await page.locator('[data-testid="world-entry"]').count()).toBe(0);

    // Reload and use the explicit button instead.
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-testid="world-entry"]')).toHaveCount(1);
    await page.locator('[data-testid="world-entry-dismiss"]').click();
    await page.waitForTimeout(400);
    expect(await page.locator('[data-testid="world-entry"]').count()).toBe(0);
  });
});

test.describe('STAGE E — the information panel', () => {
  for (const { w, h, label } of SIZES) {
    test(`[${label} ${w}x${h}] the panel is viewport-bounded and never clipped`, async ({ page }) => {
      await openWorld(page);
      await openProjectPanel(page);

      const m = await page.evaluate(() => {
        const p = document.querySelector('[data-testid="info-panel"]')!;
        const b = p.getBoundingClientRect();
        return {
          top: Math.round(b.top),
          bottom: Math.round(b.bottom),
          left: Math.round(b.left),
          right: Math.round(b.right),
          viewportW: window.innerWidth,
          viewportH: window.innerHeight,
        };
      });

      // Inside the viewport on every edge. `position: absolute` inside a
      // `overflow: hidden` stage could clip it; this is the assertion that the
      // panel is bounded by the VIEWPORT, not by the canvas.
      expect(m.top, 'panel top').toBeGreaterThanOrEqual(0);
      expect(m.bottom, 'panel bottom').toBeLessThanOrEqual(m.viewportH);
      expect(m.left, 'panel left').toBeGreaterThanOrEqual(0);
      expect(m.right, 'panel right').toBeLessThanOrEqual(m.viewportW);
    });

    test(`[${label} ${w}x${h}] the body scrolls independently and the header stays put`, async ({
      page,
    }) => {
      await openWorld(page);
      await openProjectPanel(page);

      const m = await page.evaluate(() => {
        const p = document.querySelector('[data-testid="info-panel"]')!;
        const body = p.querySelector('.info-panel__body')!;
        // The BACK button is pinned in the header while the body scrolls.
        const back = p.querySelector('[data-testid="panel-back"]')!;
        const header = p.querySelector('.info-panel__header')!;
        const before = {
          backTop: Math.round(back.getBoundingClientRect().top),
          headerTop: Math.round(header.getBoundingClientRect().top),
        };
        const overflow = getComputedStyle(body).overflowY;
        const canScroll = body.scrollHeight > body.clientHeight + 1;
        if (canScroll) body.scrollTop = 200;
        return {
          overflow,
          canScroll,
          before,
          after: {
            backTop: Math.round(back.getBoundingClientRect().top),
            headerTop: Math.round(header.getBoundingClientRect().top),
          },
          bodyScrolled: body.scrollTop,
          // The panel itself must not scroll; only its body does.
          panelOverflow: getComputedStyle(p).overflowY,
        };
      });

      expect(m.overflow).toBe('auto');
      expect(m.panelOverflow, 'only the body scrolls, not the panel').not.toBe('auto');
      if (m.canScroll) {
        expect(m.bodyScrolled, 'the body must scroll independently').toBeGreaterThan(0);
        // Pinned: scrolling the body must move the BACK button and the header.
        expect(m.after.backTop, 'the BACK button stays put').toBe(m.before.backTop);
        expect(m.after.headerTop, 'the header stays put').toBe(m.before.headerTop);
      }
    });

    test(`[${label} ${w}x${h}] Escape closes the panel and returns focus`, async ({ page }) => {
      await openWorld(page);
      await openProjectPanel(page);

      await expect(page.locator('[data-testid="info-panel"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      expect(await page.locator('[data-testid="info-panel"]').count()).toBe(0);
      // Focus returns to whatever opened the panel, so keyboard users are not
      // dropped back at the top of the document.
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focused).toBe('index-project-primetradeai');
    });

    test(`[${label} ${w}x${h}] the BACK button is prominent and keyboard reachable`, async ({ page }) => {
      await openWorld(page);
      await openProjectPanel(page);

      // One labelled route out: a ← Back button in the header.
      const back = page.locator('[data-testid="panel-back"]');
      await expect(back).toBeVisible();

      // Prominent: real target, not a 12px glyph in a corner.
      const backBox = await back.boundingBox();
      expect(backBox!.width, 'BACK is a real target').toBeGreaterThanOrEqual(28);
      expect(backBox!.height, 'BACK is a real target').toBeGreaterThanOrEqual(28);

      // Labelled for assistive tech, not an unlabelled glyph.
      await expect(back).toHaveAttribute('aria-label', /back to the projects chapter/i);

      // Reachable and operable from the keyboard.
      await back.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      expect(await page.locator('[data-testid="info-panel"]').count()).toBe(0);
    });
  }

  test('the project title is an absolute GitHub hyperlink', async ({ page }) => {
    await openWorld(page);
    await openProjectPanel(page);

    const link = page.locator('.info-panel__title-link').first();
    await expect(link).toBeVisible();

    const href = await link.getAttribute('href');
    // Absolute, and a real repository URL -- not a bare repository name.
    expect(href).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+/);
    // It is a link, not a click handler with no destination.
    expect(await link.evaluate((el) => el.tagName)).toBe('A');
    expect(await link.evaluate((el) => el.getAttribute('target'))).toBe('_blank');
  });

  test('skill panels carry no bare repository href', async ({ page }) => {
    await openWorld(page);

    const toggle = page.locator('[data-testid="world-index-toggle"]');
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();

    const bad: string[] = [];
    for (const id of ['sql', 'python', 'excel', 'power-bi', 'tableau', 'streamlit']) {
      await page.locator(`[data-testid="index-skill-${id}"]`).click();
      await page.waitForSelector('[data-testid="info-panel"]', { timeout: 10000 });
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-testid="info-panel"] a'))
          .map((a) => a.getAttribute('href') ?? '')
          .filter((h) => h.length > 0),
      );
      for (const href of hrefs) {
        // Every href is either a real absolute URL or nothing at all. A bare
        // repository name is the specific defect this guards against.
        if (!/^https?:\/\//.test(href)) bad.push(`${id}: ${href}`);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('opening and closing repeatedly leaves exactly one panel and one canvas', async ({ page }) => {
    await openWorld(page);

    for (let i = 0; i < 3; i++) {
      await openProjectPanel(page);
      expect(await page.locator('[data-testid="info-panel"]').count()).toBe(1);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      expect(await page.locator('[data-testid="info-panel"]').count()).toBe(0);
    }

    expect(await page.locator('canvas').count()).toBe(1);
  });
});