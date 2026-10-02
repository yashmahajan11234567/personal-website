/*
 * Headroom audit for the latest request.
 *
 * Three things must be measured, not guessed:
 *
 *   1. How much room is left to grow PERSONAL / PORTFOLIO? The width budget was
 *      previously measured at ZERO spare, with figure clearance the binding
 *      constraint. If that is still true, "a little bit bigger" has to come
 *      from height (rect height), not width.
 *   2. What is the rendered figure silhouette at headline height, per viewport?
 *      Clearance must be measured from PIXELS -- the anchor art has wide
 *      transparent margins, so its element box overstates the collision.
 *   3. Where do the two wordmark blocks actually sit in their plates right now?
 *      Vision reports them as "centred"; CSS insets them 13.5%. Those disagree,
 *      so read the geometry.
 */
import { chromium } from 'playwright';

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const DIR = 'qa-screenshots/headroom';
const { mkdirSync } = await import('node:fs');
mkdirSync(DIR, { recursive: true });

const b = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // ---- opening state: headline + figure silhouette
  const open = await page.evaluate(() => {
    const words = {};
    for (const side of ['left', 'right']) {
      const g = document.querySelector(
        `.cinematic-type__word--${side} .cinematic-type__glyphs`
      );
      const r = g.getBoundingClientRect();
      const cs = getComputedStyle(g);
      words[side] = {
        x: r.left,
        right: r.right,
        w: r.width,
        fs: parseFloat(cs.fontSize),
        track: parseFloat(cs.letterSpacing),
        scaleX: new DOMMatrixReadOnly(cs.transform).a,
      };
    }
    const frame = document.querySelector('.cinematic-type__fit--left')
      ?.getBoundingClientRect();
    return {
      words,
      frame: frame && { x: frame.left, w: frame.width },
      vw: innerWidth,
      vh: innerHeight,
    };
  });

  // ---- rendered silhouette of the figure, by pixel column profile
  const sil = await page.evaluate(() => {
    const img = document.querySelector('img[alt*="figure" i], .cinematic-figure');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { src: img.currentSrc || img.src, x: r.left, y: r.top, w: r.width, h: r.height };
  });

  // Screenshot instead of decoding the art: the anchor is a WebP/AVIF that
  // createImageBitmap refuses, and profiling the real rendered pixels is closer
  // to what the eye sees anyway.
  await page.screenshot({ path: `${DIR}/head-${vp.width}.png` });

  console.log(`\n=== ${vp.width}x${vp.height}`);
  for (const side of ['left', 'right']) {
    const w = open.words[side];
    const outerMargin =
      side === 'left' ? w.x : open.vw - w.right;
    const gapToFigure =
      side === 'left'
        null;
    console.log(
      `  ${side.padEnd(5)} fs ${w.fs.toFixed(2)}  ink ${w.w.toFixed(0)}px  outerMargin ${outerMargin.toFixed(1)}px  ` +
        `scaleX ${w.scaleX.toFixed(3)}`
    );
  }

  // ---- wordmark placement inside its own plate (selection state)
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight - innerHeight)
  );
  await page.waitForTimeout(1600);
  const plates = await page.evaluate(() => {
    const out = {};
    for (const side of ['data', 'cloud']) {
      const plate = document.querySelector(`[data-plate="${side}"]`);
      const pb = plate.getBoundingClientRect();
      const body = plate.querySelector('.cinematic-plate__body');
      const bb = body.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(body).fontSize);
      out[side] = {
        fs,
        insetL: ((bb.left - pb.left) / pb.width) * 100,
        insetR: ((pb.right - bb.right) / pb.width) * 100,
        centreInPlate: ((bb.left + bb.width / 2 - pb.left) / pb.width) * 100,
        blockH: bb.height,
        centreYInPlate: ((bb.top + bb.height / 2 - pb.top) / pb.height) * 100,
        plateW: pb.width,
      };
    }
    return out;
  });
  for (const side of ['data', 'cloud']) {
    const d = plates[side];
    console.log(
      `  ${side.padEnd(5)} plate ${side}: fs ${d.fs.toFixed(2)}  insetL ${d.insetL.toFixed(1)}%  insetR ${d.insetR.toFixed(1)}%  ` +
        `hCentre ${d.centreInPlate.toFixed(1)}%  vCentre ${d.centreYInPlate.toFixed(1)}%  blockH ${d.blockH.toFixed(0)}px`
    );
  }
  await page.close();
}
await b.close();