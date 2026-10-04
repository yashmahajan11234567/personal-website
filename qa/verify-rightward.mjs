/*
 * Multi-viewport check on the rightward move.
 *
 * "A little bit more to the right" has to hold at every size, and the words must
 * stay inside their plates -- the right-hand plate is where the push runs out of
 * room. Verifies, per viewport:
 *   - both wordmark blocks sit right of centre of their own plate,
 *   - no line's ink escapes the plate bounds,
 *   - the two plates still agree vertically,
 *   - the block is not flush against an edge.
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

const b = await chromium.launch();
let bad = 0;

for (const vp of VIEWPORTS) {
  const page = await b.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
  await page.waitForTimeout(1700);

  const m = await page.evaluate(() => {
    const res = {};
    for (const side of ['data', 'cloud']) {
      const plate = document.querySelector(`[data-plate="${side}"]`);
      const pb = plate.getBoundingClientRect();
      const body = plate.querySelector('.cinematic-plate__body');
      const lines = [...body.querySelectorAll('.cinematic-plate__line')].map((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0);
        const L = Math.min(...rects.map((x) => x.left));
        const R = Math.max(...rects.map((x) => x.right));
        return { text: el.textContent, L: L - pb.left, R: pb.right - R, w: R - L };
      });
      const widest = lines.reduce((x, y) => (y.w > x.w ? y : x));
      const allL = Math.min(...lines.map((l) => l.L));
      const allR = Math.min(...lines.map((l) => l.R));
      const bb = body.getBoundingClientRect();
      res[side] = {
        plateW: pb.width,
        lines,
        widest,
        inkL: allL,
        inkR: allR,
        centrePct: ((pb.width - allR + allL) / 2 / pb.width) * 100,
        bodyTop: bb.top,
        bodyBottom: bb.bottom,
        bodyCyPct: ((bb.top + bb.height / 2 - plate.getBoundingClientRect().top) / plate.getBoundingClientRect().height) * 100,
      };
    }
    return res;
  });

  const d = m.data;
  const c = m.cloud;
  const notes = [];
  /*
   * Mobile STACKS the plates below the figure, so there is no left/right pair to
   * bias: "to the right" has no meaning when the two titles are no longer side
   * by side, and the mobile rule deliberately keeps both centred on one axis.
   * So the rightward push is asserted only in the side-by-side layout, and
   * mobile is checked for being safely centred and unclipped instead.
   */
  const stacked = vp.width < 700;
  if (!stacked) {
    if (d.centrePct <= 50) notes.push(`data centre ${d.centrePct.toFixed(1)}% not right of 50%`);
    if (c.centrePct <= 50) notes.push(`cloud centre ${c.centrePct.toFixed(1)}% not right of 50%`);
  } else {
    if (Math.abs(d.centrePct - 50) > 1) notes.push(`mobile data off-axis ${d.centrePct.toFixed(1)}%`);
    if (Math.abs(c.centrePct - 50) > 1) notes.push(`mobile cloud off-axis ${c.centrePct.toFixed(1)}%`);
  }
  // inside the plate with a margin
  if (d.inkL < 4) notes.push(`data flush left (${d.inkL.toFixed(1)}px)`);
  if (d.inkR < 4) notes.push(`data flush right (${d.inkR.toFixed(1)}px)`);
  if (c.inkL < 4) notes.push(`cloud flush left (${c.inkL.toFixed(1)}px)`);
  if (c.inkR < 4) notes.push(`cloud flush right (${c.inkR.toFixed(1)}px)`);
  // Vertical agreement only applies while the plates sit side by side; stacked,
  // they are separate rows and share no baseline to match.
  const vd = Math.abs(d.bodyCyPct - c.bodyCyPct);
  if (!stacked && vd > 1.2) notes.push(`vertical disagreement ${vd.toFixed(1)}%`);

  bad += notes.length;
  console.log(
    `${vp.width}x${vp.height}${stacked ? ' (stacked)' : ''}  data centre ${d.centrePct.toFixed(1)}%  ` +
      `cloud centre ${c.centrePct.toFixed(1)}%  vDisagree ${vd.toFixed(1)}%  ` +
      `${notes.length ? 'FAIL: ' + notes.join('; ') : 'ok'}`
  );
  await page.close();
}
await b.close();
console.log(bad === 0 ? '\nALL VIEWPORTS OK' : `\n${bad} PROBLEM(S)`);
process.exit(bad === 0 ? 0 : 1);