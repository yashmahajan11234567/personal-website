/*
 * Headline size restore and Cloud wordmark centring.
 *
 * The headline geometry assertions are measured from PIXELS rather than DOM
 * boxes, because the figure's element box is far wider than its silhouette (the
 * anchor art carries a transparent margin) and comparing against it reports an
 * overlap that does not exist.
 */
import { expect, test } from "@playwright/test";

/** Ink extents of the headline band, from column-profiling the rendered frame. */
async function profileHeadline(page) {
  const band = await page.evaluate(() => {
    const el = document.querySelector(".cinematic-type__word--left");
    const r = el.getBoundingClientRect();
    return { y0: r.top, y1: r.bottom, vw: innerWidth, vh: innerHeight };
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
      const g = c.getContext("2d");
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
          if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 128) n++;
        }
        dark[x] = n;
      }
      const merged = [];
      let s = -1;
      for (let x = 0; x <= img.width; x++) {
        const on = x < img.width && dark[x] > 0;
        if (on && s < 0) s = x;
        else if (!on && s >= 0) {
          const last = merged[merged.length - 1];
          if (last && s - last[1] <= 1) last[1] = x - 1;
          else merged.push([s, x - 1]);
          s = -1;
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

  const left = runs.filter((r) => r[1] < band.vw * 0.42);
  const centre = runs.filter(
    (r) => r[0] >= band.vw * 0.42 && r[1] <= band.vw * 0.58,
  );
  const right = runs.filter((r) => r[0] > band.vw * 0.58);
  expect(left.length, "PERSONAL ink").toBeGreaterThan(0);
  expect(centre.length, "figure ink").toBeGreaterThan(0);
  expect(right.length, "PORTFOLIO ink").toBeGreaterThan(0);

  return {
    inkL: left[0][0],
    inkEndL: left[left.length - 1][1],
    figL: centre[0][0],
    figR: centre[centre.length - 1][1],
    inkStartR: right[0][0],
    inkR: right[right.length - 1][1],
    vw: band.vw,
  };
}

async function glyphMetrics(page) {
  return page.evaluate(() => {
    const out = {};
    for (const side of ["left", "right"]) {
      const glyphs = document.querySelector(
        `.cinematic-type__word--${side} .cinematic-type__glyphs`,
      );
      const g = getComputedStyle(glyphs);
      const r = glyphs.getBoundingClientRect();
      const fs = parseFloat(g.fontSize);
      out[side] = {
        fontSize: fs,
        inkH: r.height,
        trackPx: parseFloat(g.letterSpacing),
        trackEm: parseFloat(g.letterSpacing) / fs,
        transform: g.transform,
      };
    }
    return out;
  });
}

/**
 * Rendered cap height (px) per viewport, measured with qa/probe-headline-parity.mjs
 * after the shared-size fit.
 *
 * Both words are IDENTICAL by construction: the fitter takes one shared size, so
 * the two entries can only differ by measurement noise. Asserting a shared value
 * is what pins the headline to a single baseline.
 */
const BASELINE: Record<string, { left: number; right: number }> = {
  "1920x1080": { left: 147.35, right: 147.35 },
  "1440x900": { left: 109.49, right: 109.49 },
  "1280x720": { left: 98.02, right: 98.02 },
  "1024x768": { left: 78.68, right: 78.68 },
  "390x844": { left: 30.38, right: 30.38 },
};
test.describe("typography polish — headline size restore", () => {
  const VPS = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ];

  for (const vp of VPS) {
    test(`${vp.width}x${vp.height} — larger, undistorted, unclipped`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await page.goto("/");
      await page.waitForTimeout(900);

      const m = await glyphMetrics(page);

      /*
       * Cap height, pinned to the SHARED value.
       *
       * Both words render at one font size by construction, so this asserts each
       * word against the same number and therefore pins them to a single
       * baseline. Before the shared-size fit the two solved independently and
       * differed by up to 4.79px (a 4.7px baseline mismatch at 1440x900).
       *
       * Values are measured, not derived: rendered cap height is not a constant
       * fraction of viewport height, because the fitter caps the size by WIDTH
       * wherever the box is narrow relative to its height.
       */
      const base = BASELINE[`${vp.width}x${vp.height}`];
      expect(m.left.inkH, "PERSONAL cap height").toBeGreaterThan(
        base.left * 0.99,
      );
      expect(m.right.inkH, "PORTFOLIO cap height").toBeGreaterThan(
        base.right * 0.99,
      );

      // Tracking stays positive — the readability fix must survive the enlargement.
      expect(m.left.trackEm, "PERSONAL tracking").toBeGreaterThan(0.02);
      expect(m.right.trackEm, "PORTFOLIO tracking").toBeGreaterThan(0.02);

      // Still undistorted: no horizontal scale is reintroduced.
      expect(m.left.transform, "PERSONAL transform").toBe("none");
      expect(m.right.transform, "PORTFOLIO transform").toBe("none");

      // Nothing clips at the frame edge.
      const dom = await page.evaluate(() => {
        const out = [];
        for (const side of ["left", "right"]) {
          const g = document.querySelector(
            `.cinematic-type__word--${side} .cinematic-type__glyphs`,
          );
          const r = g.getBoundingClientRect();
          if (r.left < 0 || r.right > innerWidth) out.push(side);
        }
        return out;
      });
      expect(dom, "no glyph box overflows the frame").toEqual([]);
    });
  }

  test("1280x720 — ink margins stay balanced and clear of the figure", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(900);

    const p = await profileHeadline(page);

    // Outer margins: measured 4.45% / 5.16% after the restore.
    const mL = p.inkL / p.vw;
    const mR = (p.vw - p.inkR) / p.vw;
    expect(mL, "PERSONAL outer margin").toBeGreaterThan(0.04);
    expect(mR, "PORTFOLIO outer margin").toBeGreaterThan(0.04);
    expect(Math.abs(mL - mR), "outer margin balance").toBeLessThan(0.015);

    // Clearance from the figure's SILHOUETTE: measured 58px and 61px at 1280x720.
    expect(
      p.figL - p.inkEndL,
      "PERSONAL clearance to the figure",
    ).toBeGreaterThan(12);
    expect(
      p.inkStartR - p.figR,
      "PORTFOLIO clearance to the figure",
    ).toBeGreaterThan(12);

    // Neither word touches the frame edge.
    expect(p.inkL, "PERSONAL left edge").toBeGreaterThan(0.5);
    expect(p.inkR, "PORTFOLIO right edge").toBeLessThan(p.vw - 0.5);
  });

  test("both headline words share one font size and one baseline", async ({
    page,
  }) => {
    /*
     * The specific defect the user reported: the two words were fitted
     * INDEPENDENTLY, so they solved to different font sizes and their baselines
     * did not line up. Measured before this fix: PERSONAL 114.28px vs PORTFOLIO
     * 109.49px at 1440x900, a 4.7px baseline difference; 2.1px at 1024x768;
     * 1.3px at 390 mobile.
     *
     * The fitter now solves ONE size across both words, so both the font size and
     * the rendered ink box must match exactly at every viewport.
     */
    for (const vp of [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/");
      await page.waitForTimeout(800);

      const m = await page.evaluate(() => {
        const out: Record<string, { fs: number; top: number; bottom: number }> =
          {};
        for (const side of ["left", "right"]) {
          const g = document.querySelector(
            `.cinematic-type__word--${side} .cinematic-type__glyphs`,
          );
          const r = g.getBoundingClientRect();
          out[side] = {
            fs: parseFloat(getComputedStyle(g).fontSize),
            top: r.top,
            bottom: r.bottom,
          };
        }
        return out;
      });

      expect(
        Math.abs(m.left.fs - m.right.fs),
        `${vp.width} shared font size`,
      ).toBeLessThan(0.5);
      expect(
        Math.abs(m.left.top - m.right.top),
        `${vp.width} shared ink top`,
      ).toBeLessThan(0.5);
      expect(
        Math.abs(m.left.bottom - m.right.bottom),
        `${vp.width} shared baseline`,
      ).toBeLessThan(0.5);
    }
  });

  test("the figure stays fixed while the headline grows", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(900);

    /*
     * The figure must not drift. Measured in VIEWPORT coordinates, because the
     * page scrolls: comparing document-space Y across scroll positions reports
     * the full 4536px of scroll range as "drift" (measured 4536 against a 1px
     * threshold). The hero is pinned, so a fixed element's viewport rect stays
     * constant -- that is the actual invariant.
     */
    const samples = await page.evaluate(async () => {
      const el = document.querySelector('[data-testid="cinematic-figure"]');
      const max = document.documentElement.scrollHeight - innerHeight;
      const out = [];
      for (const t of [0, 0.1, 0.25, 0.4, 0.5, 0.7, 0.9]) {
        window.scrollTo(0, max * t);
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
        const r = el.getBoundingClientRect();
        out.push({ t, x: r.left, y: r.top, w: r.width, h: r.height });
      }
      return out;
    });

    const spread = (key) =>
      Math.max(...samples.map((s) => s[key])) -
      Math.min(...samples.map((s) => s[key]));
    expect(spread("x"), "figure horizontal drift").toBeLessThan(1);
    expect(spread("y"), "figure vertical drift").toBeLessThan(1);
    expect(spread("w"), "figure width drift").toBeLessThan(1);
    expect(spread("h"), "figure height drift").toBeLessThan(1);
  });
});

test.describe("typography polish — plate wordmarks aligned with each other", () => {
  const VPS = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ];

  for (const vp of VPS) {
    test(`${vp.width}x${vp.height} — both wordmarks share a vertical position`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      await page.goto("/");
      await page.waitForTimeout(800);
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight - innerHeight),
      );
      await page.waitForTimeout(1400);

      const m = await page.evaluate(() => {
        const out: Record<string, Record<string, number | string[]>> = {};
        for (const side of ["data", "cloud"]) {
          const plate = document.querySelector(`[data-plate="${side}"]`);
          const body = plate.querySelector(".cinematic-plate__body");
          const pb = plate.getBoundingClientRect();
          const bb = body.getBoundingClientRect();
          out[side] = {
            cyFrac: ((bb.top + bb.bottom) / 2 - pb.top) / pb.height,
            topFrac: (bb.top - pb.top) / pb.height,
            botFrac: (bb.bottom - pb.top) / pb.height,
            insetL: ((bb.left - pb.left) / pb.width) * 100,
            insetR: ((pb.right - bb.right) / pb.width) * 100,
            lines: Array.from(
              plate.querySelectorAll(".cinematic-plate__line"),
            ).map((l) => l.textContent.trim()),
          };
        }
        return out;
      });

      const d = m.data as { cyFrac: number; topFrac: number; botFrac: number };
      const c = m.cloud as { cyFrac: number; topFrac: number; botFrac: number };

      // Line order preserved on both plates.
      expect(
        (m.cloud as { lines: string[] }).lines,
        "Cloud line order",
      ).toEqual(["DEVOPS", "CLOUD"]);
      expect((m.data as { lines: string[] }).lines, "Data line order").toEqual([
        "DATA ANALYST",
        "DATA ENGINEER",
      ]);

      /*
       * The two wordmarks must agree. An earlier pass re-centred the Cloud block
       * on its own plate, which left the plates disagreeing by 15.7-25.8% of
       * plate height -- directly visible because the plates are geometrically
       * symmetric. Both now sit on their shared bottom content edge.
       *
       * The residual is half the difference in block height, since Cloud is set
       * slightly larger (2.52vw vs 2.42vw, because its longest word "DEVOPS" is
       * 6 characters against Data's 8). Measured disagreement is 0.3-0.6%.
       */
      expect(
        Math.abs(d.cyFrac - c.cyFrac),
        "wordmark centres agree across plates",
      ).toBeLessThan(0.012);

      // And the bottoms coincide, which is what actually reads as "aligned".
      expect(
        Math.abs(d.botFrac - c.botFrac),
        "wordmark bottoms agree",
      ).toBeLessThan(0.006);

      // The inwards insets are MIRRORED: Data insets from its left, Cloud from
      // its right, by the same amount, so both titles are pushed the same
      // distance toward the figure.
      const dIn = (m.data as { insetL: number }).insetL;
      const cIn = (m.cloud as { insetR: number }).insetR;
      const isMobile = vp.width < 700;
      if (isMobile) {
        // Stacked plates: even insets keep both on a shared centre axis.
        expect(Math.abs(dIn - cIn), "mobile insets even").toBeLessThan(0.5);
      } else {
        expect(dIn, "Data inset on the figure side").toBeGreaterThan(12);
        expect(cIn, "Cloud inset on the figure side").toBeGreaterThan(12);
        expect(Math.abs(dIn - cIn), "mirrored insets match").toBeLessThan(0.5);
      }
    });
  }

  test("Cloud wordmark stays inside its plate", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForTimeout(800);
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight - innerHeight),
    );
    await page.waitForTimeout(1400);

    const gap = await page.evaluate(() => {
      const plate = document.querySelector("[data-plate='cloud']");
      const body = plate.querySelector(".cinematic-plate__body");
      const p = plate.getBoundingClientRect();
      const b = body.getBoundingClientRect();
      return {
        inside: b.left - p.left,
        leftOverflow: p.left - b.left,
        rightOverflow: b.right - p.right,
      };
    });
    expect(gap.inside, "Cloud wordmark inset within its plate").toBeGreaterThan(
      8,
    );
    expect(gap.leftOverflow, "no overflow left").toBeLessThanOrEqual(0);
    expect(gap.rightOverflow, "no overflow right").toBeLessThanOrEqual(0);
  });
});
