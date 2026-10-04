/*
 * Resolve an apparent contradiction before touching the right rect.
 *
 * The tracking probe reported the figure silhouette's right edge at 772px while
 * PORTFOLIO's box starts at 739px -- which would be a 33px overlap, yet the
 * clearance test passes. One of those two numbers is measuring the wrong thing.
 *
 * Likely cause: the padded profiling band is tall enough to catch the figure at a
 * height where its silhouette is much wider than at the headline's own cap line
 * (an arm, a bag strap, a shoulder). The clearance that matters visually is the
 * gap at the CAP LINE, not at the widest point of the figure within the band.
 *
 * So this prints the full ink-run structure of the band, row by row, plus the
 * gap measured at several heights, so the geometry is unambiguous.
 */
import { chromium } from 'playwright';

const VP = { width: 1280, height: 720 };

/** Column runs of dark ink within a horizontal strip. */
async function runsIn(page, y0, y1) {
  const shot = await page.screenshot();
  return page.evaluate(
    async ({ b64, y0, y1, vw, vh }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const sx = img.width / vw;
      const sy = img.height / vh;
      const yA = Math.round(y0 * sy);
      const yB = Math.round(y1 * sy);
      const d = g.getImageData(0, yA, img.width, yB - yA).data;
      const dark = new Uint8Array(img.width);
      for (let x = 0; x < img.width; x++) {
        let n = 0;
        for (let y = 0; y < yB - yA; y++) {
          const i = (y * img.width + x) * 4;
          if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 128) n++;
        }
        dark[x] = n;
      }
      const merged = [];
      let s = -1;
      for (let x = 0; x <= img.width; x++) {
        const on = x < img.width && dark[x] > 0;
        if (on && s < 0) s = x;
        else if (!on && s >= 0) {
          const last = merged[merged.length - 1];
          if (last && s - last[1] <= 1) last[1] = x - 1;
          else merged.push([s, x - 1]);
          s = -1;
        }
      }
      return merged.map(([a, z]) => [(a + 1) / sx, (z + 1) / sx]);
    },
    { b64: shot.toString('base64'), y0, y1, vw: VP.width, vh: VP.height },
  );
}

const b = await chromium.launch();
const p = await b.newPage({ viewport: VP });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);

const boxes = await p.evaluate(() => {
  const out = {};
  for (const side of ['left', 'right']) {
    const box = document.querySelector(`.cinematic-type__word--${side}`);
    const glyphs = box.querySelector('.cinematic-type__glyphs');
    const gr = glyphs.getBoundingClientRect();
    out[side] = { boxX: box.getBoundingClientRect().left, boxW: box.getBoundingClientRect().width,
                  inkL: gr.left, inkR: gr.right, inkTop: gr.top, inkBottom: gr.bottom };
  }
  return out;
});
console.log(`PERSONAL  box ${boxes.left.boxX.toFixed(0)}..${(boxes.left.boxX + boxes.left.boxW).toFixed(0)}  ink ${boxes.left.inkL.toFixed(0)}..${boxes.right ? '' : ''}${boxes.left.inkR.toFixed(0)}  y ${boxes.left.inkTop.toFixed(0)}..${boxes.left.inkBottom.toFixed(0)}`);
console.log(`PORTFOLIO box ${boxes.right.boxX.toFixed(0)}..${(boxes.right.boxX + boxes.right.boxW).toFixed(0)}  ink ${boxes.right.inkL.toFixed(0)}..${boxes.right.inkR.toFixed(0)}  y ${boxes.right.inkTop.toFixed(0)}..${boxes.right.inkBottom.toFixed(0)}`);

/* 1. Full padded band, with the headline visible. */
const pad = Math.round((boxes.right.inkBottom - boxes.right.inkTop) * 0.35);
const bandY = [boxes.right.inkTop - pad, boxes.right.inkBottom + pad];
console.log(`\npadded band y ${bandY[0].toFixed(0)}..${bandY[1].toFixed(0)}  (ink rows only ${boxes.right.inkTop.toFixed(0)}..${boxes.right.inkBottom.toFixed(0)})`);
const all = await runsIn(p, bandY[0], bandY[1]);
console.log(`runs in padded band: ${all.length}`);
console.log('  ' + all.map(([a, z]) => `${a.toFixed(0)}-${z.toFixed(0)}`).join('  '));

/* 2. Tight band on the cap line only -- where the type actually is. */
const capY = [boxes.right.inkTop, boxes.right.inkBottom];
const caps = await runsIn(p, capY[0], capY[1]);
console.log(`\ncap-line band y ${capY[0].toFixed(0)}..${capY[1].toFixed(0)}`);
console.log(`runs: ${caps.length}`);
console.log('  ' + caps.map(([a, z]) => `${a.toFixed(0)}-${z.toFixed(0)}`).join('  '));
const figRuns = caps.filter(([a, z]) => a > boxes.left.inkR && z < boxes.right.inkL);
console.log(`runs strictly between the two words (figure): ${JSON.stringify(figRuns.map(([a,z])=>[+a.toFixed(0),+z.toFixed(0)]))}`);

/* 3. Figure alone in the padded band, at several sub-bands, to find its true
      right edge at the cap line vs at the band's widest. */
await p.addStyleTag({ content: '.cinematic-type{visibility:hidden !important}' });
await p.waitForTimeout(150);
for (const [label, y0, y1] of [
  ['padded band', bandY[0], bandY[1]],
  ['cap line    ', capY[0], capY[1]],
  ['upper third ', capY[0], capY[0] + (capY[1] - capY[0]) / 3],
  ['middle third', capY[0] + (capY[1] - capY[0]) / 3, capY[0] + (2 * (capY[1] - capY[0])) / 3],
  ['lower third ', capY[0] + (2 * (capY[1] - capY[0])) / 3, capY[1]],
]) {
  const r = await runsIn(p, y0, y1);
  const right = r.length ? Math.max(...r.map(([a, z]) => z)) : null;
  const left = r.length ? Math.min(...r.map(([a, z]) => a)) : null;
  console.log(`figure alone, ${label} y ${y0.toFixed(0)}..${y1.toFixed(0)}: x ${left?.toFixed(0)}..${right?.toFixed(0)}`);
}
console.log(`\nPORTFOLIO ink starts at ${boxes.right.inkL.toFixed(0)}px`);
await b.close();