/*
 * Clean measurement of the shipped page, with NO probing interference.
 *
 * Two earlier readings disagreed about the wide viewports:
 *
 *   solve-trim.mjs (writes el.style.width)   1920  +3.1%
 *   probe-tracking.mjs (also writes inline)   1920 +12.0%
 *
 * Both of those write inline widths, and TypographyLayer now has a resize handler
 * that re-applies the resolver's width on every resize event. So whichever runs
 * last can overwrite the other's candidate, and a sweep can report a geometry the
 * app never actually has. Every such number is suspect.
 *
 * This one only READS. It loads the page, waits for the fit to settle, and reports
 * the computed values -- which is exactly what a visitor sees.
 */
import { chromium } from 'playwright';

const VPS = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
];

const b = await chromium.launch();

console.log('viewport    layout   boxLeft%  boxRight%  fs       trL    trR    gap%    marginL  marginR  clipped');
for (const vp of VPS) {
  const page = await b.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);

  const m = await page.evaluate(() => {
    const o = {};
    for (const s of ['left', 'right']) {
      const bx = document.querySelector(`.cinematic-type__word--${s}`);
      const g = bx.querySelector('.cinematic-type__glyphs');
      const c = getComputedStyle(g);
      const br = bx.getBoundingClientRect();
      const gr = g.getBoundingClientRect();
      o[s] = {
        fs: parseFloat(c.fontSize),
        tr: parseFloat(c.letterSpacing),
        boxFrac: br.width / innerWidth,
        inkL: gr.left,
        inkR: gr.right,
        clipped: gr.left < 0 || gr.right > innerWidth,
        vw: innerWidth,
      };
    }
    o.layout = window.innerWidth >= 1280 ? 'wide' : window.innerWidth >= 1024 ? 'compact' : window.innerWidth >= 768 ? 'tablet' : 'mobile';
    return o;
  });

  const gap = ((m.left.tr - m.right.tr) / Math.max(m.left.tr, m.right.tr)) * 100;
  console.log(
    `${(vp.width + 'x' + vp.height).padEnd(11)} ${m.layout.padEnd(8)} ` +
      `${(0.394 * 100).toFixed(1)}/${(m.right.boxFrac * 100).toFixed(2)}  ` +
      `${m.left.fs.toFixed(2).padStart(6)}  ${m.left.tr.toFixed(2).padStart(5)}  ${m.right.tr.toFixed(2).padStart(5)}  ` +
      `${gap.toFixed(1).padStart(5)}%  ${((m.left.inkL / m.left.vw) * 100).toFixed(2)}%  ` +
      `${(((m.right.vw - m.right.inkR) / m.right.vw) * 100).toFixed(2)}%  ${m.left.clipped || m.right.clipped}`,
  );
  await page.close();
}
await b.close();