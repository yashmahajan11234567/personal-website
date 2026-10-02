/*
 * Why does PORTFOLIO render 10 ink islands for 9 letters?
 *
 * The regression test profiles column runs at the cap line and expects one island
 * per character. PORTFOLIO now reports 10, so one glyph is splitting in two.
 *
 * Two candidates, and they mean opposite things:
 *
 *   (a) A DISTRESSED COUNTER. The headline carries a mask that erodes glyph edges
 *       (see TypographyLayer.css). At 109px the mask can break the thin join
 *       between two parts of a letter -- an O's ring at its thinnest point, or an
 *       R where the leg meets the bowl -- splitting one letter into two islands.
 *       That is a rendering artefact of the mask at this size, not a letter-spacing
 *       problem, and it existed before this change at other sizes.
 *
 *   (b) A TOUCHING PAIR that the test miscounted. Not consistent: a touching pair
 *       gives 8 islands for 9 letters, not 10.
 *
 * So it is (a) or an extra split. This measures the actual island widths and gaps
 * so the anomaly can be located: a split letter shows as TWO narrow islands
 * adjacent to each other with a tiny gap, while a real letter gap is one
 * tracking step wide (~9.77px at 1280).
 */
import { chromium } from 'playwright';

const VP = { width: 1280, height: 720 };
const b = await chromium.launch();
const page = await b.newPage({ viewport: VP });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1100);

const shot = await page.screenshot();

const out = await page.evaluate(
  async ({ b64, vw, vh }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const sx = img.width / vw;

    const glyphs = [...document.querySelectorAll('.cinematic-type__glyphs')];
    const res = [];
    for (const gl of glyphs) {
      /*
       * The regression test profiles the FULL BOX height, not the glyph band. If the
       * box is taller than the glyphs and catches anything else in that band -- e.g.
       * the figure, or the desktop's own frame edges -- it reports extra islands.
       * Both bands are measured here so the difference is visible.
       */
      const gr = gl.getBoundingClientRect();
      const word = gl.closest('.cinematic-type__word');
      const wr = word.getBoundingClientRect();
      const y0 = gr.top;
      const y1 = gr.bottom;
      const sy = img.height / vh;
      const yA = Math.round(y0 * sy);
      const yB = Math.round(y1 * sy);
      const x0 = Math.round(gr.left * sx);
      const x1 = Math.round(gr.right * sx);
      const d = g.getImageData(x0, yA, x1 - x0, yB - yA).data;
      const w = x1 - x0;
      const dark = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let y = 0; y < yB - yA; y++) {
          const i = (y * w + x) * 4;
          if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 128) n++;
        }
        dark[x] = n;
      }
      const merged = [];
      let s = -1;
      for (let x = 0; x <= w; x++) {
        const on = x < w && dark[x] > 0;
        if (on && s < 0) s = x;
        else if (!on && s >= 0) {
          const last = merged[merged.length - 1];
          if (last && s - last[1] <= 1) last[1] = x - 1;
          else merged.push([s, x - 1]);
          s = -1;
        }
      }
      const islands = merged.map(([p, z]) => ({ x: (p + x0) / sx, w: (z - p + 1) / sx, gapAfter: null }));
      const boxBand = { top: wr.top, bottom: wr.bottom };
      for (let i = 0; i + 1 < islands.length; i++) islands[i].gapAfter = islands[i + 1].x - (islands[i].x + islands[i].w);
      res.push({
        text: gl.textContent.trim(),
        chars: gl.textContent.trim().length,
        glyphBand: [+y0.toFixed(1), +y1.toFixed(1)],
        boxBand: [+boxBand.top.toFixed(1), +boxBand.bottom.toFixed(1)],
        islands: islands.map((i) => ({ x: +i.x.toFixed(1), w: +i.w.toFixed(1), gapAfter: i.gapAfter === null ? null : +i.gapAfter.toFixed(1) })),
      });
    }
    return res;
  },
  { b64: shot.toString('base64'), vw: VP.width, vh: VP.height },
);

for (const w of out) {
  console.log(`\n${w.text}  (${w.chars} chars) -> ${w.islands.length} islands   glyphBand y${w.glyphBand}  boxBand y${w.boxBand}`);
  w.islands.forEach((i, idx) => {
    const flag = i.gapAfter !== null && i.gapAfter < 4 ? '   <-- TINY GAP (split letter)' : '';
    console.log(`   #${idx}  x ${String(i.x).padStart(7)}  width ${String(i.w).padStart(5)}  gapAfter ${i.gapAfter === null ? '-' : String(i.gapAfter).padStart(6)}${flag}`);
  });
}
await b.close();