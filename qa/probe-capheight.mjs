/*
 * Rendered CAP HEIGHT per viewport -- the value BASELINE holds.
 *
 * The regression test pins rendered cap height (`Range.getBoundingClientRect()`
 * height over the glyph run), not font-size. They differ: for this face the cap
 * height is about 0.72 of the font-size, so recording font sizes as the baseline
 * made every assertion fail by that ratio. Measured here directly.
 */
import { chromium } from 'playwright';

const VPS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

const b = await chromium.launch();
const rows = [];
for (const vp of VPS) {
  const page = await b.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  // Sample repeatedly: the test and this probe disagreed by 2.6px on the same
  // viewport, which points at the fit settling at different times rather than at a
  // measurement error.
  const samples = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(300);
    samples.push(
      await page.evaluate(() => {
        const g = document.querySelector('.cinematic-type__word--left .cinematic-type__glyphs');
        return {
          elH: g.getBoundingClientRect().height,
          fs: parseFloat(getComputedStyle(g).fontSize),
          ls: getComputedStyle(g).letterSpacing,
        };
      }),
    );
  }
  console.log(`   samples over 1.8s: ${samples.map((x) => x.elH.toFixed(2)).join(', ')}`);
  const m = await page.evaluate(() => {
    const out = {};
    for (const s of ['left', 'right']) {
      const g = document.querySelector(`.cinematic-type__word--${s} .cinematic-type__glyphs`);
      // The regression test measures the ELEMENT rect, not a Range.
      const el = g.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(g);
      const r = range.getBoundingClientRect();
      const cs = getComputedStyle(g);
      out[s] = {
        inkH: el.height,
        rangeH: r.height,
        fs: parseFloat(cs.fontSize),
        track: parseFloat(cs.letterSpacing),
        trackEm: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize),
      };
    }
    return out;
  });
  rows.push({ vp, ...m });
  console.log(
    `"${vp.width}x${vp.height}": { left: ${m.left.inkH.toFixed(2)}, right: ${m.right.inkH.toFixed(2)} },   ` +
      `// fontSize ${m.left.fs.toFixed(2)}, trackEm ${m.left.trackEm.toFixed(4)}, elH/fontSize ${(m.left.inkH / m.left.fs).toFixed(4)}, rangeH ${m.left.rangeH.toFixed(2)}`,
  );
  await page.close();
}
await b.close();