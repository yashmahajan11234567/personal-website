/*
 * Why PORTFOLIO tracks tighter than PERSONAL, and what it would cost to equalise.
 *
 * The fitter hands out each word's leftover width as tracking:
 *
 *     track = (boxWidth - advances) / count
 *
 * PERSONAL has 8 characters in a 0.3559-wide box; PORTFOLIO has 9 in a 0.3746
 * box. Same shared font size, different character counts, so the per-gap
 * spacing comes out different -- measured 8.69px vs 7.22px at 1280x720.
 *
 * To give PORTFOLIO the same spacing as PERSONAL its box must be WIDER, and the
 * right side is hemmed by two things: the frame edge and the figure's
 * silhouette. Both are measured here from rendered pixels, plus the tracking
 * each word would get for a range of candidate box widths -- so the cost of
 * equalising is known before anything is changed.
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

for (const vp of VIEWPORTS) {
  const page = await b.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const m = await page.evaluate(() => {
    const out = {};
    for (const side of ['left', 'right']) {
      // The word span IS the rect box: it carries the measured width/height.
      const box = document.querySelector(`.cinematic-type__word--${side}`);
      const glyphs = document.querySelector(
        `.cinematic-type__word--${side} .cinematic-type__glyphs`,
      );
      const br = box.getBoundingClientRect();
      const gr = glyphs.getBoundingClientRect();
      const cs = getComputedStyle(glyphs);
      const text = glyphs.textContent.trim();
      out[side] = {
        text,
        chars: text.length,
        gaps: text.length - 1,
        fontSize: parseFloat(cs.fontSize),
        trackPx: parseFloat(cs.letterSpacing),
        trackEm: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize),
        boxW: br.width,
        boxLeft: br.left,
        boxRight: br.right,
        inkW: gr.width,
        marginRight: parseFloat(cs.marginRight),
        // advances = ink minus the visible gaps
        advances: gr.width - (text.length - 1) * parseFloat(cs.letterSpacing),
      };
    }
    return out;
  });

  const L = m.left;
  const R = m.right;
  console.log(`\n=== ${vp.width}x${vp.height}`);
  for (const [k, d] of Object.entries(m)) {
    console.log(
      `  ${d.text.padEnd(10)} ${d.chars}ch  fs ${d.fontSize.toFixed(2)}  track ${d.trackPx.toFixed(2)}px ` +
        `(${(d.trackEm * 1000).toFixed(1)}/1000 em)  box ${d.boxW.toFixed(0)}px  ink ${d.inkW.toFixed(0)}px  ` +
        `advances ${d.advances.toFixed(0)}px`,
    );
  }
  console.log(
    `  tracking gap: PERSONAL is ${(((L.trackPx - R.trackPx) / L.trackPx) * 100).toFixed(1)}% looser`,
  );

  // Budget on the right: frame edge minus figure silhouette, in CSS px.
  const band = await page.evaluate(() => {
    const el = document.querySelector('.cinematic-type__word--right');
    const r = el.getBoundingClientRect();
    const pad = Math.round(r.height * 0.35);
    return { y0: r.top - pad, y1: r.bottom + pad, vw: innerWidth, vh: innerHeight };
  });
  const profile = async () => {
    const shot = await page.screenshot();
    return page.evaluate(
      async ({ b64, y0, y1, vw, vh }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
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
      { b64: shot.toString('base64'), y0: band.y0, y1: band.y1, vw: band.vw, vh: band.vh },
    );
  };
  const runs = await profile();
  await page.addStyleTag({ content: '.cinematic-type{visibility:hidden !important}' });
  await page.waitForTimeout(140);
  const fig = await profile();
  await page
    .evaluate(() => {
      document
        .querySelectorAll('style')
        .forEach((s) => {
          if (s.textContent?.includes('visibility:hidden')) s.remove();
        });
    })
    .catch(() => {});

  if (fig.length) {
    const figR = fig[fig.length - 1][1];
    console.log(
      `  figure silhouette right edge ${figR.toFixed(0)}px | frame edge ${vp.width}px | ` +
        `RIGHT BUDGET ${(vp.width - figR).toFixed(0)}px`,
    );
    console.log(
      `  PORTFOLIO ink ends ${runs[runs.length - 1][1].toFixed(0)}px, ` +
        `outer margin ${(vp.width - runs[runs.length - 1][1]).toFixed(1)}px`,
    );
  }

  /*
   * What tracking would PORTFOLIO get at wider boxes, holding the shared size?
   * track = (boxW - advances) / count, and `count` includes the trailing step
   * that is cancelled by the negative margin, so visible gaps = count - 1.
   */
  const target = L.trackPx;
  const neededBox = R.advances + R.chars * target;
  console.log(
    `  to match PERSONAL's ${target.toFixed(2)}px, PORTFOLIO needs a box of ` +
      `${neededBox.toFixed(0)}px (currently ${R.boxW.toFixed(0)}px, +${(neededBox - R.boxW).toFixed(0)}px)`,
  );
  const budget = fig.length ? vp.width - fig[fig.length - 1][1] : Infinity;
  console.log(
    `  that is ${neededBox > budget ? 'BEYOND' : 'within'} the ${budget.toFixed(0)}px right budget`,
  );
  await page.close();
}
await b.close();