/*
 * Is the headline fit IDEMPOTENT?
 *
 * qa/solve-narrow.mjs found something it should not have: with ZERO geometry change
 * (dLH = 0, dRin = 0), re-applying the same inline rects moved the tracking gap
 * from 9.10% to 0.45% at 768x1024. Same input, very different output.
 *
 * That matters well beyond the probe. TypographyLayer runs `measure()` on mount,
 * again on `document.fonts.ready`, and again on every resize. If the solve is not
 * idempotent, then which value the USER SEES depends on how many times it has run
 * -- and the first render (mount, before the webfont settles) is exactly what a
 * visitor sees first. It would also explain why PORTFOLIO has repeatedly read as
 * cramped across several passes: a good value may exist but not be the one the
 * opening frame gets.
 *
 * The likely mechanism is a discrete branch flip. `sizeLimit` is
 * `min(sizeForHeight, sizeForWidth)`, and at the chosen geometry the two limits
 * sit close together, so a subpixel difference in the measured advance can flip
 * which one binds. The second run measures from a different starting font-size,
 * so it can land on the other side of the crossover.
 *
 * This measures the value after each successive re-solve to confirm or refute it.
 */
import { chromium } from 'playwright';

const VPS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const b = await chromium.launch();

for (const vp of VPS) {
  const page = await b.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const sample = () =>
    page.evaluate(() => {
      const o = {};
      for (const s of ['left', 'right']) {
        const g = document.querySelector(`.cinematic-type__word--${s} .cinematic-type__glyphs`);
        const c = getComputedStyle(g);
        o[s] = { fs: parseFloat(c.fontSize), tr: parseFloat(c.letterSpacing) };
      }
      return o;
    });

  const fmt = (m) =>
    `fs ${m.left.fs.toFixed(2)}  trL ${m.left.tr.toFixed(2)} trR ${m.right.tr.toFixed(2)}  gap ${(
      ((m.left.tr - m.right.tr) / Math.max(m.left.tr, m.right.tr)) *
      100
    ).toFixed(2)}%`;

  const first = await sample();

  // Force re-solves WITHOUT changing any geometry.
  const seq = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(160);
    seq.push(await sample());
  }

  console.log(`\n=== ${vp.width}x${vp.height}`);
  console.log(`  initial (mount + fonts.ready): ${fmt(first)}`);
  seq.forEach((m, i) => console.log(`  after resize #${i + 1}:                ${fmt(m)}`));

  const fsSpread = Math.max(...seq.map((m) => m.left.fs)) - Math.min(...seq.map((m) => m.left.fs));
  const trSpread = Math.max(...seq.map((m) => m.left.tr)) - Math.min(...seq.map((m) => m.left.tr));
  const gapSpread =
    Math.max(...seq.map((m) => ((m.left.tr - m.right.tr) / Math.max(m.left.tr, m.right.tr)) * 100)) -
    Math.min(...seq.map((m) => ((m.left.tr - m.right.tr) / Math.max(m.left.tr, m.right.tr)) * 100));
  const stable = trSpread < 0.05 && fsSpread < 0.05;
  console.log(
    `  spread over 6 runs: fontSize ${fsSpread.toFixed(4)}px  tracking ${trSpread.toFixed(4)}px  parityGap ${gapSpread.toFixed(3)}%`,
  );
  console.log(`  idempotent: ${stable ? 'YES' : 'NO -- opening value differs from the settled value'}`);
  await page.close();
}
await b.close();