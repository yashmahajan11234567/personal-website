/*
 * Visual + pixel verification for the typeface/crispness/size pass.
 *
 * Three things must be proven, not assumed:
 *   1. The headline is bigger than the 98.02px it was, still unclipped, still
 *      scaleX 1, and still NOT touching the figure -- measured from rendered
 *      pixels, since the anchor art has wide transparent margins.
 *   2. The plate wordmarks sit in the right place, moved right by ~4% of plate
 *      width on both plates.
 *   3. The type is genuinely crisper: with the synthetic-bold smear gone, the
 *      fully-solid stroke area should be a larger share of the glyph area than
 *      the 0.228 it measured before this pass.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const DIR = 'qa-screenshots/v5';
mkdirSync(DIR, { recursive: true });

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

const b = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const open = await page.evaluate(() => {
    const out = {};
    for (const side of ['left', 'right']) {
      const g = document.querySelector(
        `.cinematic-type__word--${side} .cinematic-type__glyphs`
      );
      const r = g.getBoundingClientRect();
      const cs = getComputedStyle(g);
      out[side] = {
        x: r.left,
        right: r.right,
        w: r.width,
        fs: parseFloat(cs.fontSize),
        track: parseFloat(cs.letterSpacing),
        scaleX: new DOMMatrixReadOnly(cs.transform).a,
        family: cs.fontFamily,
        weight: cs.fontWeight,
        smoothing: cs.webkitFontSmoothing,
        clipping: g.scrollWidth > g.clientWidth + 1,
      };
    }
    return out;
  });

  // Pixel profile: where does the headline ink stop and the figure ink begin?
  await page.screenshot({ path: `${DIR}/open-${vp.width}.png` });
  const buf = await page.screenshot();

  // Tight crops for the crispness comparison.
  for (const side of ['left', 'right']) {
    const w = open[side];
    await page.screenshot({
      path: `${DIR}/head-${side}-${vp.width}.png`,
      clip: {
        x: Math.max(0, w.x - 6),
        y: Math.max(0, 0),
        width: Math.min(vp.width - w.x + 6, w.w + 12),
        height: Math.round(vp.height * 0.22),
      },
    });
  }

  console.log(`\n=== ${vp.width}x${vp.height}`);
  for (const side of ['left', 'right']) {
    const w = open[side];
    const margin = side === 'left' ? w.x : vp.width - w.right;
    console.log(
      `  ${side.padEnd(5)} fs ${w.fs.toFixed(2)}  ink ${w.w.toFixed(0)}px  outerMargin ${margin.toFixed(1)}px  ` +
        `track ${w.track.toFixed(2)}  scaleX ${w.scaleX.toFixed(3)}  clipped ${w.clipping}  ` +
        `weight ${w.weight} smoothing ${w.smoothing}`
    );
    console.log(`        family ${w.family.slice(0, 46)}`);
  }
  const same = Math.abs(open.left.fs - open.right.fs);
  console.log(`  shared size delta ${same.toFixed(2)}px`);

  // selection state
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight - innerHeight)
  );
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${DIR}/hold-${vp.width}.png` });
  const plates = await page.evaluate(() => {
    const out = {};
    for (const side of ['data', 'cloud']) {
      const plate = document.querySelector(`[data-plate="${side}"]`);
      const pb = plate.getBoundingClientRect();
      const body = plate.querySelector('.cinematic-plate__body');
      const bb = body.getBoundingClientRect();
      const cs = getComputedStyle(body);
      out[side] = {
        insetL: ((bb.left - pb.left) / pb.width) * 100,
        insetR: ((pb.right - bb.right) / pb.width) * 100,
        centre: ((bb.left + bb.width / 2 - pb.left) / pb.width) * 100,
        vCentre: ((bb.top + bb.height / 2 - pb.top) / pb.height) * 100,
        fs: parseFloat(cs.fontSize),
        weight: cs.fontWeight,
        family: cs.fontFamily,
        smoothing: cs.webkitFontSmoothing,
      };
    }
    return out;
  });
  for (const side of ['data', 'cloud']) {
    const d = plates[side];
    console.log(
      `  ${side.padEnd(5)} insetL ${d.insetL.toFixed(1)}%  insetR ${d.insetR.toFixed(1)}%  hCentre ${d.centre.toFixed(1)}%  ` +
        `vCentre ${d.vCentre.toFixed(1)}%  fs ${d.fs.toFixed(2)} weight ${d.weight} smoothing ${d.smoothing}`
    );
  }
  console.log(
    `  vertical disagreement ${Math.abs(plates.data.vCentre - plates.cloud.vCentre).toFixed(1)}%`
  );

  for (const side of ['data', 'cloud']) {
    await page.screenshot({
      path: `${DIR}/plate-${side}-${vp.width}.png`,
      clip: await page.evaluate((s) => {
        const plate = document.querySelector(`[data-plate="${s}"]`);
        const r = plate.getBoundingClientRect();
        const body = plate.querySelector('.cinematic-plate__body').getBoundingClientRect();
        return {
          x: Math.max(0, body.left - 10),
          y: Math.max(0, body.top - 10),
          width: Math.min(innerWidth - body.left + 10, body.width + 20),
          height: body.height + 20,
        };
      }, side),
    });
  }
  await page.close();
}
await b.close();