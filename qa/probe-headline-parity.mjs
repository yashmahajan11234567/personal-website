/*
 * Why do PERSONAL and PORTFOLIO look unaligned, and why can't they just be bigger?
 *
 * Both headline words are fitted INDEPENDENTLY: each solves its own font size
 * from its own box. PERSONAL's box and PORTFOLIO's box have different widths and
 * slightly different height constraints once the browser rounds them, so the
 * solver can land on two different font sizes -- which makes the two words
 * visibly mismatched even though their boxes share a y and a height.
 *
 * This measures, per side: box rect, solved font size, rendered ink height, ink
 * top/bottom in viewport px, and the baseline. Then the vertical ink delta
 * between the two words, which is the actual misalignment.
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
for (const vp of VPS) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => {
    const out = [];
    for (const side of ['left', 'right']) {
      const box = document.querySelector(`.cinematic-type__word--${side}`);
      const glyphs = box.querySelector('.cinematic-type__glyphs');
      const br = box.getBoundingClientRect();
      const gr = glyphs.getBoundingClientRect();
      const cs = getComputedStyle(glyphs);
      const fs = parseFloat(cs.fontSize);
      out.push({
        side,
        box: {
          x: +br.left.toFixed(1),
          y: +br.top.toFixed(1),
          w: +br.width.toFixed(1),
          h: +br.height.toFixed(1),
          cw: box.clientWidth,
          ch: box.clientHeight,
        },
        fontSize: +fs.toFixed(2),
        track: +parseFloat(cs.letterSpacing).toFixed(2),
        inkW: +gr.width.toFixed(1),
        inkH: +gr.height.toFixed(1),
        // Viewport-space ink top/bottom: the real alignment signal.
        inkTop: +gr.top.toFixed(1),
        inkBottom: +gr.bottom.toFixed(1),
        baseline: +(gr.bottom).toFixed(1),
      });
    }
    return out;
  });

  const [L, R] = r;
  console.log(`\n### ${vp.width}x${vp.height}`);
  for (const d of r) {
    console.log(
      `  ${d.side.padEnd(5)} box ${String(d.box.w).padStart(6)}x${String(d.box.h).padStart(5)} (client ${d.box.cw}x${d.box.ch})  ` +
        `fontSize ${String(d.fontSize).padStart(7)}  track ${String(d.track).padStart(6)}  ` +
        `inkH ${String(d.inkH).padStart(6)}  inkTop ${String(d.inkTop).padStart(7)}  inkBottom ${String(d.inkBottom).padStart(7)}`
    );
  }
  const dSize = Math.abs(L.fontSize - R.fontSize);
  const dTop = Math.abs(L.inkTop - R.inkTop);
  const dBot = Math.abs(L.inkBottom - R.inkBottom);
  console.log(
    `  DELTA fontSize ${dSize.toFixed(2)}px   inkTop ${dTop.toFixed(1)}px   inkBottom ${dBot.toFixed(1)}px   inkH ${Math.abs(L.inkH - R.inkH).toFixed(1)}px`
  );
  // How much could BOTH grow together, capped by the smaller of the two?
  const limiting = Math.min(L.fontSize, R.fontSize);
  console.log(`  smaller word is ${limiting.toFixed(2)}px — a shared size must not exceed it`);
  await p.close();
}
await b.close();
