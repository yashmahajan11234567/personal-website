/*
 * Which typeface gives the BIGGEST legible headline inside the measured budget?
 *
 * The fuzziness fix (real face, no synthetic bold, no thinning smoothing) is
 * settled and non-negotiable. But the face choice now controls WIDTH, and width
 * is what the figure caps. Archivo Black is a wide geometric grotesk: at the same
 * cap height it needs far more horizontal room than the Impact it replaced, so
 * bundling it naively SHRANK the headline from 98px to 65px.
 *
 * This measures each candidate face's actual ink width for "PERSONAL" and
 * "PORTFOLIO" at a reference size, in the browser, so the comparison is on real
 * metrics rather than on reputation.
 */
import { chromium } from 'playwright';

const FACES = [
  'Archivo Black',
  'Anton',
  'Impact',
  'Haettenschweiler',
  'Arial Black',
  'Arial Narrow Bold',
];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });

// Load every candidate up front so availability and metrics are both real.
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
for (const face of FACES) {
  await p.evaluate(async (f) => {
    try {
      await document.fonts.load('100px "' + f + '"');
    } catch {
      /* unavailable */
    }
  }, face);
}

const rows = await p.evaluate((faces) => {
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;visibility:hidden;white-space:nowrap;letter-spacing:0;font-size:100px;font-weight:400';
  document.body.appendChild(probe);
  const out = {};
  for (const f of faces) {
    probe.style.fontFamily = `"${f}", monospace`;
    const widths = {};
    for (const word of ['PERSONAL', 'PORTFOLIO']) {
      probe.textContent = word;
      widths[word] = probe.getBoundingClientRect().width;
    }
    // Cap height via a canvas TextMetrics actualBoundingBoxAscent.
    const c = document.createElement('canvas').getContext('2d');
    c.font = `100px "${f}", monospace`;
    const m = c.measureText('PERSONAL');
    const cap = m.actualBoundingBoxAscent;
    probe.style.fontFamily = 'monospace';
    probe.textContent = 'PERSONAL';
    const monoW = probe.getBoundingClientRect().width;
    out[f] = { ...widths, cap, available: Math.abs(widths.PERSONAL - monoW) > 0.5 };
  }
  probe.remove();
  return out;
}, FACES);

// Measured budgets: 524px left, 551px right at 1280 (frame edge -> figure).
const LEFT_BUDGET = 524;
const RIGHT_BUDGET = 551;

console.log('face                  PERSONAL   PORTFOLIO   cap@100  w/cap  P-fits@  PORT-fits@');
for (const [f, d] of Object.entries(rows)) {
  const ratioL = d.PERSONAL / d.cap;
  const ratioR = d.PORTFOLIO / d.cap;
  // Largest cap height where BOTH words fit their own budget at zero extra.
  const capL = LEFT_BUDGET / ratioL;
  const capR = RIGHT_BUDGET / ratioR;
  const cap = Math.min(capL, capR);
  console.log(
    `${f.padEnd(20)} ${d.PERSONAL.toFixed(0).padStart(6)}px ${d.PORTFOLIO.toFixed(0).padStart(8)}px ` +
      `${d.cap.toFixed(0).padStart(7)}  ${((ratioL + ratioR) / 2).toFixed(3)}  ` +
      `${cap.toFixed(1).padStart(7)}  ${cap.toFixed(1).padStart(8)}  ${d.available ? '' : ' [NOT AVAILABLE]'}`
  );
}
console.log('\nbudgets: left 524px, right 551px (at 1280x720)');
await b.close();