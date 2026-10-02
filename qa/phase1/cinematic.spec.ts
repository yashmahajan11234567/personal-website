/**
 * Phase 1 acceptance tests (Tasks 7 + the STOP gate QA).
 *
 * These encode the requirements that are objectively checkable, so a
 * regression is a failing test rather than a subjective judgement call.
 *
 * Reference: .gsd/plans/phase-1-cinematic-rebuild.md
 */

import { test, expect, type Page } from "@playwright/test";
import { beat } from "../../src/cinematic/timeline/beats";

/** Total scrollable distance of the cinematic track. */
async function scrollTrack(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
}

/** Scroll to a fraction of the track and let the scrub settle. */
async function scrollToProgress(page: Page, fraction: number): Promise<void> {
  const track = await scrollTrack(page);
  await page.evaluate(
    ([y]) => window.scrollTo(0, y as number),
    [Math.round(track * fraction)],
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

test.describe("structure", () => {
  test("renders every layer and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/");
    await page.waitForTimeout(1200);

    await expect(page.locator(".cinematic-hero")).toBeVisible();
    await expect(page.locator(".cinematic-ground")).toBeAttached();
    await expect(
      page.locator('[data-testid="cinematic-figure"]'),
    ).toBeAttached();
    await expect(
      page.locator('[data-testid="cinematic-grain"]'),
    ).toBeAttached();
    await expect(page.locator('[data-plate="data"]')).toBeAttached();
    await expect(page.locator('[data-plate="cloud"]')).toBeAttached();
    await expect(page.locator(".cinematic-type__word")).toHaveCount(2);

    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("the figure image actually loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const img = document.querySelector<HTMLImageElement>(
        ".cinematic-figure__image",
      );
      return img
        ? { complete: img.complete, w: img.naturalWidth, h: img.naturalHeight }
        : null;
    });
    expect(info).not.toBeNull();
    expect(info!.complete).toBe(true);
    expect(info!.w).toBeGreaterThan(100);
    expect(info!.h).toBeGreaterThan(100);
  });

  test("no frame-sequence or video asset is shipped", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto("/");
    await page.waitForTimeout(1500);
    const bad = requests.filter(
      (u) => u.includes("/frames/") || u.endsWith(".mp4"),
    );
    expect(bad, `bitmap media requested:\n${bad.join("\n")}`).toEqual([]);
  });
});

test.describe("D5 — the figure never moves", () => {
  test("figure box is identical at every scroll position", async ({ page }) => {
    await page.goto("/");
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

  test("figure has no CSS transform at any scroll position", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      await scrollToProgress(page, f);
      const t = await page.evaluate(
        () =>
          getComputedStyle(
            document.querySelector('[data-testid="cinematic-figure"]')!,
          ).transform,
      );
      expect(
        ["none", "matrix(1, 0, 0, 1, 0, 0)"],
        `transform at ${f} was ${t}`,
      ).toContain(t);
    }
  });
});

test.describe("scroll drives the timeline", () => {
  test("the page provides a multi-viewport scroll track", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    const track = await scrollTrack(page);
    // 700vh track means ~6 viewport heights of scroll on desktop.
    expect(track).toBeGreaterThan(900 * 4);
  });

  test("boards are hidden early and seated at the selection hold", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    // Measured against the reference (VIDEO-TRANSITION-ANALYSIS.md S5): there is
    // no plate on screen at all before t 1.83s. The plates therefore start
    // fully off-position below the frame and are GATED by visibility, rather
    // than faded in -- the reference's arrival is abrupt, not a fade. These
    // assertions track visibility, which is the mechanism that now implements
    // "absent from the opening".
    await scrollToProgress(page, 0);
    const early = await page.evaluate(() => {
      const el = document.querySelector('[data-plate="data"]')!;
      const cs = getComputedStyle(el);
      return { visibility: cs.visibility, opacity: Number(cs.opacity) };
    });
    expect(early.visibility).toBe("hidden");

    await scrollToProgress(page, 0.9);
    const late = await page.evaluate(() => {
      const el = document.querySelector('[data-plate="data"]')!;
      const cs = getComputedStyle(el);
      return { visibility: cs.visibility, opacity: Number(cs.opacity) };
    });
    expect(late.visibility).toBe("visible");
    expect(late.opacity).toBeGreaterThan(0.95);
    // Seated: the rise has completed, so the plate is at its resting transform.
    // Read it off the computed style rather than the inline attribute -- the
    // browser normalises `translate3d(0, 0.000vh, 0)` to `translate3d(0px, 0vh, 0px)`.
    const seated = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('[data-plate="data"]')!)
          .transform,
    );
    expect(seated).toMatch(/matrix\(1, 0, 0, 1, 0, 0\)|^none$/);
  });

  test("headline words exit upward rather than fading in place", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    const readWord = () =>
      page.evaluate(() => {
        const el = document.querySelector(".cinematic-type__word--left")!;
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

test.describe("D4 — monochrome at rest, accent on hover only", () => {
  test("no glow is visible before interaction", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    const alpha = await page.evaluate(() => {
      const w = document.querySelector(
        ".cinematic-glow__wash--data",
      ) as HTMLElement;
      return Number(getComputedStyle(w).opacity);
    });
    expect(alpha).toBeLessThan(0.02);
  });

  test("hovering Data produces a blue wash and Cloud an orange one", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);

    await page.locator('[data-testid="world-board-data"]').hover();
    await page.waitForTimeout(500);
    const dataState = await page.evaluate(() => {
      const root = document.querySelector(".cinematic-glow")!;
      const w = document.querySelector(
        ".cinematic-glow__wash--data",
      ) as HTMLElement;
      return {
        active: root.getAttribute("data-active"),
        opacity: Number(getComputedStyle(w).opacity),
        bg: getComputedStyle(w).backgroundImage,
      };
    });
    expect(dataState.active).toBe("data");
    expect(dataState.opacity).toBeGreaterThan(0.5);
    // Blue channel dominant in the wash colour.
    const blueMatch = dataState.bg.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (blueMatch) {
      const [, r, g, b] = blueMatch.map(Number);
      expect(
        b,
        `data wash rgb(${r},${g},${b}) should be blue-dominant`,
      ).toBeGreaterThan(r);
    }

    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);

    await page.locator('[data-testid="world-board-cloud"]').hover();
    await page.waitForTimeout(500);
    const cloudState = await page.evaluate(() => {
      const root = document.querySelector(".cinematic-glow")!;
      const w = document.querySelector(
        ".cinematic-glow__wash--cloud",
      ) as HTMLElement;
      return {
        active: root.getAttribute("data-active"),
        opacity: Number(getComputedStyle(w).opacity),
        bg: getComputedStyle(w).backgroundImage,
      };
    });
    expect(cloudState.active).toBe("cloud");
    const orangeMatch = cloudState.bg.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (orangeMatch) {
      const [, r, g, b] = orangeMatch.map(Number);
      expect(
        r,
        `cloud wash rgb(${r},${g},${b}) should be red-dominant`,
      ).toBeGreaterThan(b);
    }
  });
});

test.describe("plate geometry matches the reference", () => {
  test("plates are symmetric in size and vertical placement, per the reference", async ({
    page,
  }) => {
    await page.goto("/");
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
    expect(Math.abs(boxes.data.y - boxes.cloud.y), "tops aligned").toBeLessThan(
      0.02,
    );
    expect(
      Math.abs(boxes.data.h - boxes.cloud.h),
      "equal heights",
    ).toBeLessThan(0.02);
    expect(Math.abs(boxes.data.w - boxes.cloud.w), "equal widths").toBeLessThan(
      0.02,
    );

    // Data left of centre, Cloud right of centre.
    const dCentre = boxes.data.x + boxes.data.w / 2;
    const cCentre = boxes.cloud.x + boxes.cloud.w / 2;
    expect(dCentre).toBeLessThan(0.5);
    expect(cCentre).toBeGreaterThan(0.5);
  });

  test("Data plate carries two lines, Cloud two lines at a larger scale", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    const data = await page.evaluate(() => {
      const plate = document.querySelector('[data-plate="data"]')!;
      const lines = plate.querySelectorAll(".cinematic-plate__line");
      const body = plate.querySelector(".cinematic-plate__body")!;
      return {
        count: lines.length,
        text: Array.from(lines).map((l) => l.textContent),
        // parseFloat on a resolved clamp() value ("39.2px") -> number.
        fontSize: parseFloat(getComputedStyle(body).fontSize),
      };
    });
    expect(data.count).toBe(2);
    expect(data.text).toEqual(["DATA ANALYST", "DATA ENGINEER"]);
    expect(Number.isFinite(data.fontSize)).toBe(true);

    // The Cloud plate also has two lines, but is a shorter wordmark, so its
    // type is scaled up to hold visual weight against the Data plate's two lines.
    const cloud = await page.evaluate(() => {
      const plate = document.querySelector('[data-plate="cloud"]')!;
      const lines = plate.querySelectorAll(".cinematic-plate__line");
      const body = plate.querySelector(".cinematic-plate__body")!;
      return {
        count: lines.length,
        fontSize: parseFloat(getComputedStyle(body).fontSize),
      };
    });
    expect(cloud.count).toBe(2);
    expect(cloud.fontSize).toBeGreaterThan(data.fontSize);
  });

  test("plate copy matches the reference wording and line order", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    const cloudText = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '[data-plate="cloud"] .cinematic-plate__line',
        ),
      ).map((l) => l.textContent),
    );
    // ref-5.0.png reads DEVOPS on the upper line, CLOUD on the lower. The copy
    // briefly had these reversed; this asserts the reference order.
    expect(cloudText).toEqual(["DEVOPS", "CLOUD"]);
  });

  test("board hit targets match the plates, not the old hardcoded boxes", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    const alignment = await page.evaluate(() => {
      const pairs = [
        ["data", '[data-plate="data"]', '[data-testid="world-board-data"]'],
        ["cloud", '[data-plate="cloud"]', '[data-testid="world-board-cloud"]'],
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

test.describe("accessibility (brief section 14)", () => {
  test("both boards are real buttons with labels and >=44px targets", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);

    for (const world of ["data", "cloud"]) {
      const btn = page.locator(`[data-testid="world-board-${world}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute("type", "button");
      const label = await btn.getAttribute("aria-label");
      expect(label, `${world} has no aria-label`).toBeTruthy();
      expect(label!.length).toBeGreaterThan(10);

      const box = await btn.boundingBox();
      expect(box!.width, `${world} target width`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${world} target height`).toBeGreaterThanOrEqual(44);
    }
  });

  test("nothing interactive is aria-hidden", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    const hidden = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll(".world-board").forEach((el) => {
        if (el.closest('[aria-hidden="true"]'))
          out.push(el.getAttribute("data-world") || "?");
      });
      return out;
    });
    expect(hidden).toEqual([]);
  });

  test("keyboard: Tab reaches both boards, focus ring is visible", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    let reached: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const world = await page.evaluate(() =>
        document.activeElement?.getAttribute("data-world"),
      );
      if (world) reached.push(world);
    }
    expect(reached, "Tab never reached the world boards").toContain("data");
    expect(reached).toContain("cloud");

    // Focus-visible ring must actually change border colour.
    // The ring is styled with :focus-visible, which only applies to keyboard-driven
    // focus. Do NOT click the body first: clicking moves focus to <body>, and
    // Chromium then resumes tabbing from the click point, which skips the boards
    // entirely. Tabbing from a freshly loaded page reaches them reliably.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const isData = await page.evaluate(
        () => document.activeElement?.getAttribute("data-world") === "data",
      );
      if (isData) break;
    }
    await expect(
      page.locator('[data-testid="world-board-data"]'),
    ).toBeFocused();

    // :focus-visible must genuinely be engaged, or the ring is not a11y-visible.
    expect(
      await page.evaluate(() =>
        document
          .querySelector('[data-testid="world-board-data"]')!
          .matches(":focus-visible"),
      ),
    ).toBe(true);

    // Wait for the 180ms ring transition to settle. The border colour is
    // mid-fade (alpha < 1) if sampled immediately after focus.
    await page.waitForFunction(
      () => {
        const r = document.querySelector(
          '[data-testid="world-board-data"] .world-board__ring',
        );
        if (!r) return false;
        const c = getComputedStyle(r).borderTopColor;
        return c === "rgb(255, 255, 255)";
      },
      undefined,
      { timeout: 3000 },
    );

    const ring = await page.evaluate(() => {
      const r = document.querySelector(
        '[data-testid="world-board-data"] .world-board__ring',
      )!;
      return getComputedStyle(r).borderTopColor;
    });
    expect(ring).not.toBe("rgba(0, 0, 0, 0)");
    expect(ring).toBe("rgb(255, 255, 255)");
  });

  test("Enter selects the focused world and routes to it", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);

    await page.locator('[data-testid="world-board-data"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);

    await expect(page.locator(".placeholder-world")).toBeVisible();
    await expect(page).toHaveURL(/#\/data-world/);
  });

  test("Space selects the focused world", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    await page.locator('[data-testid="world-board-cloud"]').focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/#\/cloud-world/);
  });

  test("a polite live region exists", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.9);
    await expect(page.locator('[aria-live="polite"]')).toBeAttached();
  });
});

test.describe("nothing is ever auto-selected", () => {
  test("scrolling to the very end does not select a world", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToProgress(page, 1);
    await page.waitForTimeout(800);
    const selected = await page.evaluate(() =>
      document.querySelector(".cinematic-hero")?.getAttribute("data-selected"),
    );
    expect(selected).toBeNull();
    await expect(page.locator(".placeholder-world")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Reference-fidelity regression tests.
//
// Each assertion below is derived from a measured frame in the reference video
// (see .gsd/VIDEO-TRANSITION-ANALYSIS.md). They exist because the board
// choreography previously diverged from the video by ~40% of the scroll track
// while every functional test still passed -- the composition at the END
// matched, so nothing caught the TRANSIT being wrong.
//
// They assert the beat boundaries, the rise geometry, lockstep, and the
// absence of overshoot, because those are the four things the video fixes.
// ---------------------------------------------------------------------------

test.describe("reference fidelity: measured video choreography", () => {
  /** Rendered top edge of a plate as a fraction of viewport height. */
  async function plateTop(
    page: Page,
    which: "data" | "cloud",
  ): Promise<number | null> {
    return page.evaluate((w) => {
      const el = document.querySelector(`[data-plate="${w}"]`);
      if (!el) return null;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden") return null;
      const r = el.getBoundingClientRect();
      return r.top / window.innerHeight;
    }, which);
  }

  test("beat boundaries match the video measurement", async () => {
    // 8s reference: boards rise over t 1.83-3.96s = 23%-50% of the video, and
    // nothing moves after that. These are measurements, not preferences.
    const beats = await import("../../src/cinematic/timeline/beats");
    const boards = beats.BEATS.find((b: { id: string }) => b.id === "boards");
    expect(boards).toBeDefined();
    expect(boards!.start).toBeCloseTo(0.23, 5);
    expect(boards!.end).toBeCloseTo(0.5, 5);
    expect(beats.SELECTION_START).toBeCloseTo(0.5, 5);
    // The video has no separate settle beat after the rise.
    expect(
      beats.BEATS.find((b: { id: string }) => b.id === "lock"),
    ).toBeUndefined();
    expect(beats.BEATS.length).toBe(5);
  });

  test("plates rise from below the frame bottom", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    // Absent before the beat.
    await scrollToProgress(page, 0.1);
    expect(await plateTop(page, "data")).toBeNull();

    // Low in the frame early in the rise (video t 2.0s: y 0.778), high at the
    // seat (video t 3.96s: y 0.225).
    await scrollToProgress(page, 0.27);
    const early = await plateTop(page, "data");
    expect(early).not.toBeNull();
    expect(early!).toBeGreaterThan(0.6);

    await scrollToProgress(page, 0.9);
    const seated = await plateTop(page, "data");
    expect(seated).not.toBeNull();
    expect(seated!).toBeLessThan(0.3);
  });

  test("plates rise in lockstep", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    // Measured: the reference's two plates are at identical y to four decimals
    // at every sample of the rise. A stagger would show up here immediately.
    for (const f of [0.28, 0.33, 0.38, 0.43, 0.48]) {
      await scrollToProgress(page, f);
      const d = await plateTop(page, "data");
      const c = await plateTop(page, "cloud");
      expect(d).not.toBeNull();
      expect(c).not.toBeNull();
      expect(Math.abs(d! - c!)).toBeLessThan(0.02);
    }
  });

  test("the rise never overshoots its seat", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    // The reference does not rebound after arriving. easeOutBack did, so this
    // tracks the plate's y monotonically upward across the whole beat.
    let prev = Number.POSITIVE_INFINITY;
    let moved = 0;
    for (const f of [0.23, 0.27, 0.31, 0.35, 0.39, 0.43, 0.47, 0.5]) {
      await scrollToProgress(page, f);
      const top = await plateTop(page, "data");
      if (top === null) continue;
      expect(top).toBeLessThanOrEqual(prev + 0.005);
      if (prev - top > 0.005) moved++;
      prev = top;
    }
    // Sanity: it really was moving, so the assertion above is meaningful.
    expect(moved).toBeGreaterThan(3);
  });

  test("the selection hold is static, like the reference after t 4.0s", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    await scrollToProgress(page, 0.6);
    const a = await plateTop(page, "data");
    await scrollToProgress(page, 1.0);
    const b = await plateTop(page, "data");
    expect(a).toBeCloseTo(b!, 3);

    // And the figure never moves at any point in the cinematic.
    for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
      await scrollToProgress(page, f);
      const tf = await page.evaluate(
        () =>
          document.querySelector(".figure-layer img")?.getAttribute("style") ??
          "",
      );
      // No transform of any kind is applied to the figure.
      expect(tf).not.toMatch(/translate3d/);
    }
  });
});

// ---------------------------------------------------------------------------
// Plate interior treatment.
//
// The reference plates are NOT flat black fields. Measured from the reference
// video's selection hold, each plate interior is ~56% mid-tone (luma 60-150),
// ~20% light and ~23% dark. These tests lock that in, because a flat fill is
// exactly what the previous revision shipped and it was the largest remaining
// visual mismatch.
// ---------------------------------------------------------------------------

test.describe("plate interior treatment", () => {
  test("plates are printed interiors, not flat fills", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);

    for (const side of ["data", "cloud"] as const) {
      const interior = page.locator(`[data-interior="${side}"]`);
      await expect(interior).toHaveCount(1);

      const tone = await page.evaluate((s) => {
        const el = document.querySelector(`[data-interior="${s}"]`)!;
        const cs = getComputedStyle(el);
        // Luma of the plate's base fill, which is the dominant tone.
        const m = cs.backgroundColor.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        if (!m) return null;
        return 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3];
      }, side);

      expect(tone, `${side} base fill luma`).not.toBeNull();
      // Reference mid-tone band is 60-150. A flat black fill lands near 11 and
      // fails this immediately.
      expect(tone!).toBeGreaterThan(55);
      expect(tone!).toBeLessThan(160);
    }
  });

  test("each plate carries its own technical marks", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);

    // Data: bars, ring, network map. Cloud: flow, orbit, clouds. The worlds
    // must not share identical artwork.
    const expectMarks = async (side: string, kinds: string[]) => {
      const found = await page.evaluate((s) => {
        const root = document.querySelector(`[data-interior="${s}"]`)!;
        return Array.from(root.querySelectorAll("svg g")).map((g) =>
          Array.from(g.classList).join(" "),
        );
      }, side);
      for (const k of kinds) {
        expect(
          found.some((c) => c.includes(k)),
          `${side} missing ${k}`,
        ).toBe(true);
      }
    };

    await expectMarks("data", ["mark--bars", "mark--ring", "mark--net"]);
    await expectMarks("cloud", ["mark--flow", "mark--orbit", "mark--clouds"]);
  });

  test("interior artwork is hidden from assistive technology", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);

    // Decoration must not be announced; the plate's live text and button label
    // already carry the meaning (D2), so exposing the artwork would double it.
    const ariaHidden = await page.evaluate(() => {
      const el = document.querySelector('[data-interior="data"]')!;
      return el.getAttribute("aria-hidden");
    });
    expect(ariaHidden).toBe("true");

    // The button still names the world for assistive tech. The label lives on
    // aria-label (the plate's visible text is the wordmark, which alone would
    // not say what activating the board does), so assert the attribute rather
    // than text content.
    await expect(
      page.locator('[data-testid="world-board-data"]'),
    ).toHaveAttribute("aria-label", /enter the data world/i);
  });

  test("interiors rise with their plates and never separate", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    // The interior has no transform of its own -- it is a child of the plate,
    // so attachment is structural. This asserts it holds across the rise.
    for (const f of [0.26, 0.33, 0.4, 0.47]) {
      await scrollToProgress(page, f);
      const same = await page.evaluate(() => {
        const plate = document.querySelector('[data-plate="data"]')!;
        const interior = plate.querySelector(".plate-interior")!;
        const pr = plate.getBoundingClientRect();
        const ir = interior.getBoundingClientRect();
        return {
          dx: Math.abs(ir.left - pr.left) + Math.abs(ir.right - pr.right),
          dy: Math.abs(ir.top - pr.top) + Math.abs(ir.bottom - pr.bottom),
          transform: getComputedStyle(interior).transform,
        };
      });
      expect(same.dx).toBeLessThan(1.5);
      expect(same.dy).toBeLessThan(1.5);
      // No independent transform: it can only move with the plate.
      expect(
        same.transform === "none" ||
          same.transform === "matrix(1, 0, 0, 1, 0, 0)",
      ).toBe(true);
    }
  });

  test("interior opacity is tied to the plate reveal", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);

    // Before the boards beat the plate is gated off, so the interior must be
    // gated with it -- it must never appear before the plate does.
    await scrollToProgress(page, 0.1);
    const early = await page.evaluate(() => {
      const plate = document.querySelector('[data-plate="data"]')!;
      const interior = plate.querySelector(".plate-interior")!;
      return {
        plateVisibility: getComputedStyle(plate).visibility,
        interiorOpacity: Number(getComputedStyle(interior).opacity),
      };
    });
    expect(early.plateVisibility).toBe("hidden");

    await scrollToProgress(page, 0.9);
    const late = await page.evaluate(() =>
      Number(
        getComputedStyle(document.querySelector(".plate-interior")!).opacity,
      ),
    );
    expect(late).toBeGreaterThan(0.95);
  });

  test("interior treatment stays monochrome", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);

    // D4: world identity comes from the hover glow as environmental light, never
    // from the plate itself. Any saturated colour inside the interior is a bug.
    //
    // Threshold is anchored to the reference, not chosen by eye: the reference
    // plate interior measures mean chroma 1.0 with a maximum of 8-10 (a slight
    // tint in the source artwork). A limit of 12 therefore permits everything
    // the original contains while still failing loudly on any real hue -- the
    // Data hover blue (96,174,232) has chroma 136 and the Cloud orange far
    // higher, so neither can slip through.
    const coloured = await page.evaluate(() => {
      const out: string[] = [];
      for (const side of ["data", "cloud"]) {
        const root = document.querySelector(`[data-interior="${side}"]`)!;
        const walk = (el: Element) => {
          const cs = getComputedStyle(el);
          for (const prop of [
            "color",
            "backgroundColor",
            "fill",
            "stroke",
            "borderTopColor",
          ]) {
            const v = cs[prop as keyof CSSStyleDeclaration] as string;
            const m = v?.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
            if (!m) continue;
            const [r, g, b] = [+m[1], +m[2], +m[3]];
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            if (chroma > 12) out.push(`${side} ${el.className} ${prop}=${v}`);
          }
          for (const c of Array.from(el.children)) walk(c);
        };
        walk(root);
      }
      return out;
    });
    expect(coloured).toEqual([]);

    // And the base fill must be a true neutral, not a tinted grey. An earlier
    // rgb(74,78,82) measured mean chroma 5.4 against the reference's 1.0.
    const baseChroma = await page.evaluate(() => {
      const el = document.querySelector('[data-interior="data"]')!;
      const m = getComputedStyle(el).backgroundColor.match(
        /(\d+)[,\s]+(\d+)[,\s]+(\d+)/,
      )!;
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      return Math.max(r, g, b) - Math.min(r, g, b);
    });
    expect(baseChroma).toBeLessThanOrEqual(2);
  });
});

/*
 * Regression: the reported defect.
 *
 * "The page opens directly into the final Data/Cloud board composition. There
 * is effectively NO visible scroll-driven cinematic transition. PERSONAL is
 * visibly clipped. PORTFOLIO is visibly clipped."
 *
 * Three distinct causes, all covered below:
 *   1. Reduced motion collapsed the scroll track to zero AND forced the layers
 *      to their settled frame, so the final composition rendered at load.
 *   2. The headline had an invented lateral entrance (-14vw / +14vw) that put
 *      it off-frame at scroll 0, rendering "SONA" and "PORT".
 *   3. The headline boxes were narrower and higher than the reference's
 *      measured ink extents, so even in place it overflowed the frame.
 */
test.describe("opening state regression (default motion)", () => {
  test("loads on the OPENING composition, not the final selection", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(900);

    // No selection controls mounted at scroll 0.
    await expect(page.locator('[data-testid="world-board-data"]')).toHaveCount(
      0,
    );
    await expect(page.locator('[data-testid="world-board-cloud"]')).toHaveCount(
      0,
    );

    // Both plates are off-stage.
    await expect(page.locator('[data-plate="data"]')).toHaveCSS(
      "visibility",
      "hidden",
    );
    await expect(page.locator('[data-plate="cloud"]')).toHaveCSS(
      "visibility",
      "hidden",
    );

    // There IS a real scroll track.
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(scrollable).toBeGreaterThan(1000);
  });

  test("headline is fully visible and un-clipped at load", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(900);

    const words = await page.evaluate(() =>
      ["left", "right"].map((side) => {
        const el = document.querySelector(`.cinematic-type__word--${side}`)!;
        const r = el.getBoundingClientRect();
        return {
          side,
          left: r.left / window.innerWidth,
          right: r.right / window.innerWidth,
          opacity: Number(getComputedStyle(el).opacity),
        };
      }),
    );

    for (const w of words) {
      expect(w.opacity, `${w.side} opacity`).toBeGreaterThan(0.95);
      expect(w.left, `${w.side} left edge`).toBeGreaterThan(0);
      expect(w.right, `${w.side} right edge`).toBeLessThan(1);
    }

    /*
     * And it stays within the reference's measured opening ink extents
     * (PERSONAL x 0.0367..0.3789, PORTFOLIO x 0.6117..0.9719, from reference
     * frame f0003).
     *
     * These are BOX extents, not ink, and the boxes have since been widened twice
     * on purpose: +4% by the size restore, then again for the tracking-parity work.
     * PERSONAL's box now runs x 0.036..0.430 and PORTFOLIO's x 0.5495..0.9545, so
     * both right edges sit outside the reference's own ink extent by more than the
     * old 0.035 tolerance allowed.
     *
     * The purpose of this test is to catch the off-frame opening state that once
     * rendered "SONA" and "PORT" (-0.09..1.10), so what it must still enforce is:
     * the box starts inside the frame, ends inside the frame, and stays near the
     * reference's composition rather than drifting. Pixel-level INK margins,
     * tracking and figure clearance are asserted in typography-refine.spec.ts
     * against measured baselines -- those are the real guards, and the ink is what
     * matters here because the box is only the fit's budget.
     */
    expect(words[0].left).toBeGreaterThan(0.0367 - 0.02);
    expect(words[0].right).toBeLessThan(0.3789 + 0.06);
    expect(words[1].left).toBeGreaterThan(0.6117 - 0.07);
    expect(words[1].right).toBeLessThan(0.9719 + 0.02);
  });

  test("scroll produces continuous, reversible change", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(900);

    const plate = page.locator('[data-plate="data"]');
    /*
     * Viewport-relative top, read via `getBoundingClientRect()`.
     *
     * Sample INSIDE the board beat (0.23-0.50 by measurement). Before 0.23 the
     * plates are parked below the frame at a constant position, so sampling
     * there returns the same value and asserts nothing about the rise.
     */
    const top = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-plate="data"]')!;
        return el.getBoundingClientRect().top / window.innerHeight;
      });

    /*
     * Read the plate position once the scrub easing has actually settled.
     *
     * Two things make a naive single wait unreliable here:
     *
     * 1. The timeline is created in an effect after mount and refreshed again on
     *    font load, and `scrub: 0.85` keeps easing after that. Sampling inside
     *    either window reads the parked position.
     * 2. Immediately after `scrollTo`, the plate may not have started moving
     *    yet -- so "the value stopped changing" is also true while it is still
     *    parked, and a poll that stops on that reads the parked value.
     *
     * So the wait has two gates: movement must have STARTED (the value must
     * differ from the parked position) and then STOPPED (several consecutive
     * stable reads).
     */
    const PARKED = 0.8324; // measured resting position, below the frame

    const at = async (frac: number) => {
      await page.evaluate((f) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.round(max * f));
      }, frac);

      let last = Number.NaN;
      let stable = 0;
      let moved = false;
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(150);
        const cur = await top();
        if (Math.abs(cur - PARKED) > 0.002) moved = true;
        stable = moved && Math.abs(cur - last) < 0.002 ? stable + 1 : 0;
        last = cur;
        if (stable >= 3) return cur;
      }
      return last;
    };

    /*
     * Sample INSIDE the board beat (0.23-0.50 measured), not at 0/0.2. Before
     * the beat starts the plates are parked below frame at a constant position,
     * so those samples are identical and assert nothing about the rise.
     */
    const s25 = await at(0.25);
    const s32 = await at(0.32);
    const s40 = await at(0.4);
    const s50 = await at(0.5);

    // Strictly rising through the board beat: each step differs from the last.
    // Identical screenshots across the rise are the failure this guards.
    expect(s32).toBeLessThan(s25!);
    expect(s40).toBeLessThan(s32!);
    expect(s50).toBeLessThan(s40!);

    // The hold is static.
    const s75 = await at(0.75);
    const s100 = await at(1.0);
    expect(s100).toBeCloseTo(s75!, 3);

    // Scrolling back reverses all the way to the opening state.
    const back = await at(0);
    expect(back).toBeGreaterThan(s50!);
    await expect(plate).toHaveCSS("visibility", "hidden");
  });

  test("the figure stays stationary across the whole track", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(900);

    const figTop = async () =>
      page.evaluate(() => {
        const el =
          document.querySelector(".cinematic-figure img") ||
          document.querySelector('[class*="figure"]');
        return el ? el.getBoundingClientRect().top / window.innerHeight : null;
      });

    const samples: (number | null)[] = [];
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((frac) =>
        window.scrollTo(
          0,
          Math.round(
            (document.documentElement.scrollHeight - window.innerHeight) * frac,
          ),
        ),
      );
      await page.waitForTimeout(600);
      samples.push(await figTop());
    }

    const spread =
      Math.max(...samples.map((s) => s!)) - Math.min(...samples.map((s) => s!));
    expect(spread).toBeLessThan(0.01);
  });
});

/*
 * Typography polish: bold + cinematic + readable, not oversized + cramped.
 *
 * The defect these lock down was measured, not eyeballed. The fit used to force
 * each word to fill its box with `scaleX`, and the measured value was 1.20-1.29
 * at every viewport -- the type was pulled 20-29% wider than its own
 * proportions. The cause was the font stack: Archivo Black and Anton are not
 * installed, so it fell through to Impact (measured 0.406 advance-per-capheight
 * against the reference's 0.489), and stretching compensated. Letter-spacing was
 * ALSO negative (-0.02em), actively cramping the letters.
 *
 * So the fit now distributes tracking instead of stretching, and these tests
 * assert the properties that fix was supposed to buy.
 */
test.describe("typography polish", () => {
  const VIEWPORTS = [
    { width: 1920, height: 1080, name: "1920x1080" },
    { width: 1440, height: 900, name: "1440x900" },
    { width: 1280, height: 720, name: "1280x720" },
    { width: 1024, height: 768, name: "1024x768" },
    { width: 390, height: 844, name: "390-mobile" },
  ];

  /**
   * Read the headline words' rendered geometry.
   *
   * `scaleX` is read from the computed transform matrix, so a `none` transform
   * reports 1.0 rather than being missed by a string match on `scaleX(...)`.
   */
  const readHeadline = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const out: Array<Record<string, number | string>> = [];
      for (const side of ["left", "right"]) {
        const word = document.querySelector(`.cinematic-type__word--${side}`)!;
        const glyphs = word.querySelector(".cinematic-type__glyphs")!;
        const cs = getComputedStyle(glyphs);
        const fontSize = parseFloat(cs.fontSize);
        const track = parseFloat(cs.letterSpacing);
        const range = document.createRange();
        range.selectNodeContents(glyphs);
        const ink = range.getBoundingClientRect();
        const box = word.getBoundingClientRect();
        const m = new DOMMatrixReadOnly(cs.transform);

        /*
         * The LAST glyph's own ink edge, from pixels.
         *
         * The Range above spans the whole run, which includes the trailing
         * letter-space CSS adds after the final glyph (~one tracking step) and the
         * `-webkit-text-stroke` that paints ~0.6px past the outline. Neither is ink.
         * Collapsing the range onto the final character gives the real right edge,
         * so the fit can be checked against what is actually drawn rather than
         * against the layout box.
         */
        const last = document.createRange();
        const node = glyphs.firstChild!;
        last.setStart(node, Math.max(0, node.textContent!.length - 1));
        last.setEnd(node, node.textContent!.length);
        const lastInk = last.getBoundingClientRect();

        out.push({
          side,
          text: glyphs.textContent ?? "",
          scaleX: m.a,
          trackPx: Number.isFinite(track) ? track : 0,
          trackEm: Number.isFinite(track) ? track / fontSize : 0,
          inkLeft: ink.left,
          inkRight: ink.right,
          glyphRight: lastInk.right,
          boxLeft: box.left,
          boxRight: box.right,
        });
      }
      return out;
    });

  for (const vp of VIEWPORTS) {
    test(`headline is undistorted and positively tracked at ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForTimeout(900);

      for (const w of await readHeadline(page)) {
        const where = `${vp.name} ${w.side} (${w.text})`;

        // Not stretched. The old fit ran 1.20-1.29 here.
        expect(Math.abs(w.scaleX - 1), `${where} scaleX`).toBeLessThan(0.02);

        // Tracking is positive, so letters are opened rather than cramped.
        // The old value was -0.02em.
        expect(w.trackEm, `${where} tracking`).toBeGreaterThan(0.01);

        // Ink sits inside the frame on both sides.
        expect(w.inkLeft, `${where} left edge`).toBeGreaterThan(-0.5);
        expect(w.inkRight, `${where} right edge`).toBeLessThan(vp.width + 0.5);

        /*
         * The word FITS its measured box rather than overflowing it.
         *
         * `inkRight` here is the glyph span's own rect, which is NOT the visible ink:
         * it still carries the trailing letter-space CSS adds after the final glyph
         * (one tracking step, ~10.3px at 1280) and the `-webkit-text-stroke` that
         * paints ~0.6px past each outline. Subtracting one step gives the last
         * glyph's right edge, which is the real ink, and that must sit inside the
         * box. The earlier `inkW > boxW * 0.96` lower bound was also wrong: the run
         * legitimately ends short of the box's right edge because both words share
         * one tracking value and sit at the box's left edge, so a lower bound near
         * full-box is not what this layout produces.
         *
         * `inkW` (span) is retained for the upper bound: it must not exceed the box by
         * more than one tracking step plus the stroke, otherwise the run has run away.
         */
        const boxW = w.boxRight - w.boxLeft;
        const step = Math.abs(w.trackPx);
        const spanW = w.inkRight - w.inkLeft;
        const visibleW = spanW - step;
        expect(visibleW, `${where} visible ink vs box`).toBeGreaterThan(
          boxW * 0.7,
        );
        expect(visibleW, `${where} visible ink vs box`).toBeLessThanOrEqual(
          boxW + 1,
        );
      }
    });
  }

  test("every headline letter renders as a separate ink island", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(900);

    /*
     * Measured from PIXELS, not DOM rects.
     *
     * Per-character `Range` rects are ~0.02px conservative in Chromium, so they
     * report a "-0.02 gap" between every pair regardless of size -- including
     * pairs like DE and CL that kern normally. That reads as a collision when
     * nothing is touching. Column-profiling the rendered ink is the ground
     * truth: it counts actual separated glyph islands.
     */
    for (const side of ["left", "right"]) {
      /*
       * Clip to the WORD'S OWN INK, not to its layout box.
       *
       * The box is the fit's budget and is wider than the rendered run, so at 1280
       * the right box spans 703-1222px while the figure silhouette reaches 690px --
       * close enough that clipping to the box catches figure ink as a leading island.
       * That is what produced a phantom 10th island for PORTFOLIO's 9 letters. The
       * ink bounds come from the first and last glyphs instead, so only the word is
       * profiled.
       */
      const inkBox = await page.evaluate((s) => {
        const word = document.querySelector(`.cinematic-type__word--${s}`)!;
        const glyphs = word.querySelector(".cinematic-type__glyphs")!;
        const span = glyphs.getBoundingClientRect();
        const cs = getComputedStyle(glyphs);
        // Inset by one tracking step so the trailing letter-space is excluded.
        const step = Math.abs(parseFloat(cs.letterSpacing) || 0);
        return {
          x: span.left,
          // The GLYPH band, not the box band. The box is 144.7px tall while the
          // glyphs occupy 103px of it, and the extra 41px reaches down into the
          // figure's silhouette -- vision confirms a dark shape at the bottom-left of
          // the crop that is not part of the word. Profiling the box band therefore
          // counted the figure as a tenth "letter island" for PORTFOLIO's 9 letters.
          y: span.top,
          width: Math.max(1, span.right - step - span.left),
          height: span.height,
        };
      }, side);
      expect(inkBox.width, `${side} ink box`).toBeGreaterThan(1);
      const shot = await page.screenshot({ clip: inkBox });

      const runs = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext("2d")!;
        g.drawImage(img, 0, 0);
        // Headline ink is DARK on a light ground.
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const dark = new Uint8Array(c.width);
        for (let x = 0; x < c.width; x++) {
          let n = 0;
          for (let y = 0; y < c.height; y++) {
            const i = (y * c.width + x) * 4;
            // Rec. 601 luma; anything clearly dark counts as ink.
            if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 128) n++;
          }
          dark[x] = n;
        }
        // Column runs, merged across 1px of antialiasing.
        const merged: Array<[number, number]> = [];
        let start = -1;
        for (let x = 0; x <= c.width; x++) {
          const on = x < c.width && dark[x] > 0;
          if (on && start < 0) start = x;
          else if (!on && start >= 0) {
            const last = merged[merged.length - 1];
            if (last && start - last[1] <= 1) last[1] = x - 1;
            else merged.push([start, x - 1]);
            start = -1;
          }
        }
        const gaps: number[] = [];
        for (let i = 0; i < merged.length - 1; i++) {
          gaps.push(merged[i + 1][0] - merged[i][1] - 1);
        }
        return { islands: merged.length, gaps, width: c.width };
      }, shot.toString("base64"));

      const letters = side === "left" ? 8 : 9;
      expect(runs.islands, `${side} letter islands`).toBe(letters);
      // Every gap strictly positive => no two letters touch.
      expect(Math.min(...runs.gaps), `${side} min letter gap`).toBeGreaterThan(
        0,
      );
    }
  });

  test("plate role words are positively tracked and fit their plate", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);

    const lines = await page.evaluate(() => {
      const out: Array<Record<string, number | string>> = [];
      for (const side of ["data", "cloud"]) {
        const plate = document.querySelector(`[data-plate="${side}"]`)!;
        const body = plate.querySelector(".cinematic-plate__body")!;
        const contentW = body.clientWidth;
        for (const line of plate.querySelectorAll(".cinematic-plate__line")) {
          const cs = getComputedStyle(line);
          const fontSize = parseFloat(cs.fontSize);
          const track = parseFloat(cs.letterSpacing);
          const range = document.createRange();
          range.selectNodeContents(line);
          const ink = range.getBoundingClientRect();
          out.push({
            side,
            text: (line.textContent ?? "").trim(),
            trackEm: Number.isFinite(track) ? track / fontSize : 0,
            inkW: ink.width,
            contentW,
            // `nowrap` means a line that overflows is clipped or spills, not wrapped.
            wrapped: line.getClientRects().length > 1,
          });
        }
      }
      return out;
    });

    // DATA ANALYST, DATA ENGINEER, DEVOPS, CLOUD -- all four present.
    const texts = lines.map((l) => l.text);
    expect(texts).toEqual(
      expect.arrayContaining([
        "DATA ANALYST",
        "DATA ENGINEER",
        "DEVOPS",
        "CLOUD",
      ]),
    );

    for (const l of lines) {
      const where = `${l.side} ${l.text}`;
      expect(l.trackEm, `${where} tracking`).toBeGreaterThan(0.02);
      expect(l.inkW, `${where} ink vs plate`).toBeLessThan(
        l.contentW as number,
      );
      expect(l.wrapped, `${where} wrapped`).toBe(false);
    }
  });

  test("typography polish does not disturb the scroll choreography", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(800);

    /*
     * The brief requires the type to "follow the existing animation exactly" --
     * only visual scale and spacing may change. So the beat map itself must be
     * untouched. Asserted against the real module, not a copy, so a future
     * retiming has to change this test deliberately.
     */
    expect(beat("boards").start).toBeCloseTo(0.23, 5);
    expect(beat("boards").end).toBeCloseTo(0.5, 5);
    expect(beat("selection").start).toBeCloseTo(0.5, 5);

    // And the figure still does not move across the scroll.
    const figTop = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-testid="cinematic-figure"]');
        return el ? el.getBoundingClientRect().top / window.innerHeight : null;
      });
    const samples: number[] = [];
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate(
        (frac) =>
          window.scrollTo(
            0,
            Math.round(
              (document.documentElement.scrollHeight - window.innerHeight) *
                frac,
            ),
          ),
        f,
      );
      await page.waitForTimeout(600);
      samples.push((await figTop())!);
    }
    expect(
      samples.every((s) => Number.isFinite(s)),
      "figure present throughout",
    ).toBe(true);
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread, "figure drift across the timeline").toBeLessThan(0.01);
  });

  /*
   * The inward nudge.
   *
   * The headline used to sit hard against the viewport edges: PERSONAL started
   * at 0.0367 and PORTFOLIO ended at 0.9719, so the outer margins were 3.7% and
   * 2.8% while the composition read as edge-anchored rather than arranged around
   * the stationary figure.
   *
   * Both boxes moved inward by HEADLINE_INWARD (0.012), which leaves the box
   * WIDTH and HEIGHT untouched -- so the font size and tracking the fit solves
   * are identical, and this is purely a positional change.
   */
  test("headline sits inward of the frame edges, clear of the figure", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(900);

    /*
     * Measured from PIXELS, and the figure's silhouette is MEASURED too.
     *
     * Two traps this test used to fall into:
     *
     *   1. The figure ELEMENT box is far wider than its silhouette -- the anchor
     *      art carries a transparent margin -- so comparing headline ink against
     *      getBoundingClientRect() reports an overlap where none exists.
     *   2. Hardcoded split fractions (0.42 / 0.58) went stale as the headline
     *      grew. The real silhouette spans 0.357-0.602 of the viewport, so the
     *      "centre" window held no figure ink at all and this failed on an EMPTY
     *      window rather than on a collision.
     *
     * So the band is profiled twice -- once normally, once with the headline
     * hidden -- and runs are classified against that measured silhouette.
     */
    const profile = async () => {
      const band = await page.evaluate(() => {
        const el = document.querySelector(".cinematic-type__word--left")!;
        const r = el.getBoundingClientRect();
        const pad = Math.round(r.height * 0.35);
        return {
          y0: r.top - pad,
          y1: r.bottom + pad,
          vw: window.innerWidth,
          vh: window.innerHeight,
        };
      });
      const shot = await page.screenshot();
      const runs = await page.evaluate(
        async ({ b64, y0, y1, vw, vh }) => {
          const img = new Image();
          img.src = "data:image/png;base64," + b64;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const g = c.getContext("2d")!;
          g.drawImage(img, 0, 0);
          const sx = img.width / vw;
          const sy = img.height / vh;
          const yA = Math.round(y0 * sy);
          const yB = Math.round(y1 * sy);
          const d = g.getImageData(0, yA, img.width, yB - yA).data;
          const dark = new Uint8Array(img.width);
          for (let x = 0; x < img.width; x++) {
            let n = 0;
            for (let y = 0; y < yB - yA; y++) {
              const i = (y * img.width + x) * 4;
              // Rec. 601 luma; headline ink is DARK on a light ground.
              if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 128) n++;
            }
            dark[x] = n;
          }
          const merged: Array<[number, number]> = [];
          let start = -1;
          for (let x = 0; x <= img.width; x++) {
            const on = x < img.width && dark[x] > 0;
            if (on && start < 0) start = x;
            else if (!on && start >= 0) {
              const last = merged[merged.length - 1];
              if (last && start - last[1] <= 1) last[1] = x - 1;
              else merged.push([start, x - 1]);
              start = -1;
            }
          }
          return merged.map(([a, z]) => [(a + 1) / sx, (z + 1) / sx]);
        },
        {
          b64: shot.toString("base64"),
          y0: band.y0,
          y1: band.y1,
          vw: band.vw,
          vh: band.vh,
        },
      );
      return { runs, vw: band.vw };
    };

    const { runs, vw } = await profile();

    await page.addStyleTag({
      content: ".cinematic-type{visibility:hidden !important}",
    });
    await page.waitForTimeout(150);
    const { runs: figRuns } = await profile();
    await page
      .evaluate(() => {
        document.querySelectorAll("style").forEach((s) => {
          if (s.textContent?.includes("visibility:hidden !important"))
            s.remove();
        });
      })
      .catch(() => {});

    expect(figRuns.length, "figure silhouette found").toBeGreaterThan(0);
    const figStart = figRuns[0][0];
    const figEnd = figRuns[figRuns.length - 1][1];

    const left = runs.filter((r) => r[1] <= figStart);
    const right = runs.filter((r) => r[0] >= figEnd);
    expect(left.length, "PERSONAL ink found").toBeGreaterThan(0);
    expect(right.length, "PORTFOLIO ink found").toBeGreaterThan(0);

    const inkL = left[0][0];
    const inkEndL = left[left.length - 1][1];
    const inkStartR = right[0][0];
    const inkR = right[right.length - 1][1];

    /*
     * Outer margins. Measured 3.98% / 4.00% with the enlarged headline. The floor
     * is 3.5%, not the round 4% this test used to assert: the reference frame
     * itself measures 3.67%, and narrowing the rects to reach a round 4% was
     * measured to cost 2px of cap height, since the headline is width-bound.
     */
    const marginL = inkL / vw;
    const marginR = (vw - inkR) / vw;
    expect(marginL, "PERSONAL outer margin").toBeGreaterThan(0.035);
    expect(marginR, "PORTFOLIO outer margin").toBeGreaterThan(0.035);

    // Balanced, not recentred.
    expect(Math.abs(marginL - marginR), "outer margin balance").toBeLessThan(
      0.015,
    );

    /*
     * Clear of the figure. 12px is a wide floor for regression purposes: eroded
     * mask edges and font-metric differences move these by a couple of pixels,
     * while a real collision is tens of pixels.
     */
    expect(figStart - inkEndL, "PERSONAL clear of the figure").toBeGreaterThan(
      12,
    );
    expect(inkStartR - figEnd, "PORTFOLIO clear of the figure").toBeGreaterThan(
      12,
    );
  });

  test("the size restore enlarged the type without distorting it", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(900);

    /*
     * The headline now solves ONE shared size for both words, so the two entries
     * are identical by construction. What still must hold is that the
     * enlargement came from the RECT and not from a transform: `scaleX` stays 1,
     * so no horizontal stretch is reintroduced -- the defect that made the
     * original type look compressed and clipped. Tracking stays positive.
     *
     * Measured at 1280x720: 103.23px, tracking 10.32px on BOTH words.
     */
    const type = await page.evaluate(() => {
      const out: Array<Record<string, number | string>> = [];
      for (const side of ["left", "right"]) {
        const glyphs = document.querySelector(
          `.cinematic-type__word--${side} .cinematic-type__glyphs`,
        )!;
        const cs = getComputedStyle(glyphs);
        out.push({
          side,
          fontSize: parseFloat(cs.fontSize),
          track: parseFloat(cs.letterSpacing),
          scaleX: new DOMMatrixReadOnly(cs.transform).a,
        });
      }
      return out;
    });

    const EXPECTED = [
      { side: "left", fontSize: 103.23, track: 10.32 },
      { side: "right", fontSize: 103.23, track: 10.32 },
    ];
    for (const [i, e] of EXPECTED.entries()) {
      const t = type[i];
      expect(
        Math.abs(t.fontSize - e.fontSize),
        `${e.side} font-size`,
      ).toBeLessThan(1);
      expect(Math.abs(t.track - e.track), `${e.side} tracking`).toBeLessThan(
        0.6,
      );
      // The invariant that outlives the resize: no horizontal distortion.
      expect(Math.abs(t.scaleX - 1), `${e.side} scaleX`).toBeLessThan(0.02);
      expect(t.track, `${e.side} tracking stays positive`).toBeGreaterThan(0);
    }

    // Shared size: the two words are identical, which is what aligns them.
    expect(
      Math.abs(type[0].fontSize - type[1].fontSize),
      "shared font size",
    ).toBeLessThan(0.5);

    // And the enlargement is real, relative to the pre-restore measurements.
    expect(type[0].fontSize, "PERSONAL grew").toBeGreaterThan(86.06);
    expect(type[1].fontSize, "PORTFOLIO grew").toBeGreaterThan(86.02);
  });

  test("both wordmark blocks are nudged right of their plate centres", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);

    /*
     * This test used to assert the opposite: that both blocks were inset MORE on
     * their figure-facing side, by the same amount. That mirrored inset was
     * deliberately undone. The request was for both wordmarks to sit "a little bit
     * more to the right", and on the right-hand plate "right" is AWAY from the
     * figure -- so the mirrored-inset invariant cannot also hold.
     *
     * What replaces it:
     *   - both blocks' INK sits right of their own plate's centre line,
     *   - neither runs flush against a plate edge,
     *   - both travel by a similar amount, so the pair still reads as one
     *     composition rather than one title drifting off on its own,
     *   - and mobile, where the plates STACK, stays centred on a shared axis.
     *
     * Measured at 1280x720: Data ink centre 51.3%, Cloud 52.7%.
     */
    const measure = async () =>
      page.evaluate(() => {
        const out: Record<
          string,
          {
            plateW: number;
            inkL: number;
            inkR: number;
            centre: number;
            flush: number;
          }
        > = {};
        for (const side of ["data", "cloud"]) {
          const plate = document.querySelector(`[data-plate="${side}"]`)!;
          const pb = plate.getBoundingClientRect();
          const linesEls = plate.querySelectorAll(".cinematic-plate__line");
          const Ls: number[] = [];
          const Rs: number[] = [];
          for (const l of linesEls) {
            const r = document.createRange();
            r.selectNodeContents(l);
            const rects = Array.from(r.getClientRects()).filter(
              (x) => x.width > 0,
            );
            if (!rects.length) continue;
            Ls.push(Math.min(...rects.map((x) => x.left)) - pb.left);
            Rs.push(pb.right - Math.max(...rects.map((x) => x.right)));
          }
          const inkL = Math.min(...Ls);
          const inkR = Math.min(...Rs);
          out[side] = {
            plateW: pb.width,
            inkL,
            inkR,
            centre: ((pb.width - inkR + inkL) / 2 / pb.width) * 100,
            flush: Math.min(inkL, inkR),
          };
        }
        return out;
      });

    const m = await measure();
    expect(m.data.centre, "DATA block right of plate centre").toBeGreaterThan(
      50,
    );
    expect(
      m.cloud.centre,
      "DEVOPS block right of plate centre",
    ).toBeGreaterThan(50);
    expect(m.data.flush, "Data clear of plate edges").toBeGreaterThan(2);
    expect(m.cloud.flush, "Cloud clear of plate edges").toBeGreaterThan(2);
    expect(
      Math.abs(m.data.centre - m.cloud.centre),
      "both blocks travel by a similar amount",
    ).toBeLessThan(2.5);

    // Mobile stacks the plates below the figure, so "right" is meaningless there.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await scrollToProgress(page, 0.9);
    const stacked = await measure();
    for (const side of ["data", "cloud"] as const) {
      expect(
        Math.abs(stacked[side].centre - 50),
        `${side} stacked on the shared axis`,
      ).toBeLessThan(1);
      expect(
        stacked[side].flush,
        `${side} clear of plate edges`,
      ).toBeGreaterThan(2);
    }
  });
});
