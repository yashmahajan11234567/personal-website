/*
 * Targeted mobile solve.
 *
 * The blind 9x9 grid found NO width-only solution at 390x844, which is not a
 * sampling artefact. Parity is one hard constraint relating the two widths:
 *
 *     track_L = track_R
 *     (W_L - k_L*S)/8 = (W_R - k_R*S)/9
 *     =>  S = (9*W_L - 8*W_R) / (9*k_L - 8*k_R)
 *
 * (`k` is each word's advance sum per unit font-size, now a stable property of the
 * face rather than of render history.) So parity does not let the tracking float
 * freely at a chosen size -- it PINS the size. At 390 the current widths imply
 *
 *     S = (9*153.7 - 8*164.3) / (9*3.92 - 8*3.98)  =  69 / 3.47  =  19.9px
 *
 * while the width limits themselves allow ~33.5px. Those two requirements are far
 * apart, which is exactly the 24.6% gap. Parity at 390 therefore needs
 *
 *     9*W_L - 8*W_R  =  S * 3.47
 *
 * so with S near 33.5 the left side must be ~116 rather than ~69: widen the LEFT
 * box by roughly 5.2px (+0.0134 of frame width) or narrow the RIGHT box by
 * roughly 5.9px (-0.0151). Widening left is the better of the two because it does
 * not push ink toward the frame edge.
 *
 * This sweeps that predicted neighbourhood finely and reports the measured optima,
 * so the prediction is checked rather than trusted.
 */
import { chromium } from 'playwright';

const VPS = [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 430, height: 932 },
  { width: 375, height: 667 },
];

const BASE = { Lw: 0.394, Rw: 0.4214 };
const b = await chromium.launch();

const read = (page) =>
  page.evaluate(() => {
    const o = {};
    for (const s of ['left', 'right']) {
      const g = document.querySelector(`.cinematic-type__word--${s} .cinematic-type__glyphs`);
      const c = getComputedStyle(g);
      const gr = g.getBoundingClientRect();
      o[s] = { fs: parseFloat(c.fontSize), tr: parseFloat(c.letterSpacing), inkL: gr.left, inkR: gr.right, vw: innerWidth };
    }
    return o;
  });

/*
 * Apply a candidate width WITHOUT being fought by the component.
 *
 * The first version of this probe set `el.style.width` and dispatched resize. That
 * silently does nothing: TypographyLayer now has a resize handler that re-applies
 * the resolver's width, so every candidate was overwritten before it could be read
 * and the sweep returned one identical gap for all 80 rows.
 *
 * An `!important` stylesheet rule beats the inline style the sync writes, so the
 * candidate survives the handler while the dispatched resize still triggers the
 * fit to re-solve against it.
 */
const apply = async (page, Lw, Rw) => {
  await page.evaluate(
    ({ Lw, Rw }) => {
      let tag = document.getElementById('probe-trim');
      if (!tag) {
        tag = document.createElement('style');
        tag.id = 'probe-trim';
        document.head.appendChild(tag);
      }
      tag.textContent =
        `.cinematic-type__word--left{width:${Lw * 100}% !important}` +
        `.cinematic-type__word--right{width:${Rw * 100}% !important}`;
      window.dispatchEvent(new Event('resize'));
    },
    { Lw, Rw },
  );
  await page.waitForTimeout(130);
};

for (const vp of VPS) {
  const page = await b.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(850);
  const base = await read(page);
  const g0 = ((base.left.tr - base.right.tr) / Math.max(base.left.tr, base.right.tr)) * 100;
  console.log(`\n=== ${vp.width}x${vp.height}  baseline fs ${base.left.fs.toFixed(2)} trL ${base.left.tr.toFixed(2)} trR ${base.right.tr.toFixed(2)} gap ${g0.toFixed(2)}%`);

  const rows = [];
  // widen left, and separately narrow right, over the predicted neighbourhoods
  for (let i = 0; i <= 40; i++) {
    const dL = i * 0.0005; // 0 .. +0.020
    await apply(page, BASE.Lw + dL, BASE.Rw);
    const m = await read(page);
    rows.push({ mode: 'widenL', dL, fs: m.left.fs, gap: ((m.left.tr - m.right.tr) / Math.max(m.left.tr, m.right.tr)) * 100, mL: m.left.inkL / m.left.vw, mR: (m.right.vw - m.right.inkR) / m.right.vw });
  }
  for (let i = 1; i <= 40; i++) {
    const dR = -i * 0.0005; // 0 .. -0.020
    await apply(page, BASE.Lw, BASE.Rw + dR);
    const m = await read(page);
    rows.push({ mode: 'narrowR', dR, fs: m.left.fs, gap: ((m.left.tr - m.right.tr) / Math.max(m.left.tr, m.right.tr)) * 100, mL: m.left.inkL / m.left.vw, mR: (m.right.vw - m.right.inkR) / m.right.vw });
  }

  const ok = rows.filter((r) => Math.abs(r.gap) <= 2 && r.mL >= 0.025 && r.mR >= 0.025).sort((a, z) => z.fs - a.fs);
  console.log(`  parity<=2% within the predicted neighbourhood: ${ok.length}`);
  for (const r of ok.slice(0, 8)) {
    const d = r.mode === 'widenL' ? `widenL +${r.dL.toFixed(4)}` : `narrowR ${r.dR.toFixed(4)}`;
    console.log(
      `    ${d.padEnd(16)} fs ${r.fs.toFixed(2)}  gap ${r.gap.toFixed(2)}%  ` +
        `margins L ${(r.mL * 100).toFixed(2)}% R ${(r.mR * 100).toFixed(2)}%`,
    );
  }
  if (!ok.length) {
    console.log('    closest to parity:');
    for (const r of rows.sort((a, z) => Math.abs(a.gap) - Math.abs(z.gap)).slice(0, 5)) {
      const d = r.mode === 'widenL' ? `widenL +${r.dL.toFixed(4)}` : `narrowR ${r.dR.toFixed(4)}`;
      console.log(`    ${d.padEnd(16)} fs ${r.fs.toFixed(2)}  gap ${r.gap.toFixed(2)}%  margins L ${(r.mL * 100).toFixed(2)}% R ${(r.mR * 100).toFixed(2)}%`);
    }
  }
  await page.close();
}
await b.close();