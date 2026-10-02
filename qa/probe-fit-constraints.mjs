/*
 * Which constraint binds the headline fit at each viewport?
 *
 * TypographyLayer solves:  size = min(sizeForHeight, sizeForWidth)
 *   sizeForHeight = boxH * CAP_FILL / perSizeH
 *   sizeForWidth  = boxW / (perSizeW * (1 + gaps * MIN_TRACK_EM))
 *
 * The width term only binds when the box is narrow relative to its height --
 * which is the 4:3 / portrait / mobile case. This reports both terms so we can
 * tell a genuine geometric limit from an accident of the tracking floor.
 *
 * It also reports what the width term would allow at a ZERO tracking floor,
 * which is the theoretical maximum, so the cost of the readability floor
 * (MIN_TRACK_EM = 0.02) is visible rather than hidden.
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

const MIN_TRACK_EM = 0.02;
const CAP_FILL = 0.94;

const b = await chromium.launch();
for (const vp of VPS) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);

  const r = await p.evaluate(
    async ({ MIN_TRACK_EM, CAP_FILL }) => {
      const out = [];
      for (const side of ['left', 'right']) {
        const box = document.querySelector(`.cinematic-type__word--${side}`);
        const glyphs = box.querySelector('.cinematic-type__glyphs');
        const boxW = box.clientWidth;
        const boxH = box.clientHeight;

        // Measure advances and cap height at a known font size, with tracking off.
        const probe = 100;
        const prev = glyphs.style.cssText;
        glyphs.style.letterSpacing = '0px';
        glyphs.style.marginRight = '0px';
        glyphs.style.fontSize = `${probe}px`;
        // Lift the inline-size container so the run lays out at true width.
        const fit = glyphs.parentElement;
        const fitPrev = fit.style.cssText;
        fit.style.containerType = 'normal';
        fit.style.width = 'auto';
        const range = document.createRange();
        range.selectNodeContents(glyphs);
        const m = range.getBoundingClientRect();
        const perSizeW = m.width / probe;
        const perSizeH = m.height / probe;
        glyphs.style.cssText = prev;
        fit.style.cssText = fitPrev;

        const count = Math.max(1, (glyphs.textContent ?? '').length);
        const gaps = Math.max(1, count - 1);

        const sizeForHeight = (boxH * CAP_FILL) / perSizeH;
        const sizeForWidth = boxW / (perSizeW * (1 + gaps * MIN_TRACK_EM));
        const sizeForWidthZero = boxW / perSizeW;
        const solved = Math.min(sizeForHeight, sizeForWidth);

        const live = parseFloat(getComputedStyle(glyphs).fontSize);
        out.push({
          side,
          boxW: +boxW.toFixed(1),
          boxH: +boxH.toFixed(1),
          aspect: +(boxW / boxH).toFixed(3),
          sizeForHeight: +sizeForHeight.toFixed(2),
          sizeForWidth: +sizeForWidth.toFixed(2),
          sizeForWidthZero: +sizeForWidthZero.toFixed(2),
          solved: +solved.toFixed(2),
          live: +live.toFixed(2),
          binds: sizeForWidth < sizeForHeight ? 'WIDTH' : 'HEIGHT',
          headroomPct: +(((sizeForWidthZero / solved) - 1) * 100).toFixed(1),
        });
      }
      return out;
    },
    { MIN_TRACK_EM, CAP_FILL }
  );

  console.log(`\n### ${vp.width}x${vp.height}`);
  for (const d of r) {
    console.log(
      `  ${d.side.padEnd(5)} box ${String(d.boxW).padStart(6)}x${String(d.boxH).padStart(5)} (aspect ${d.aspect})  ` +
        `heightLimit ${String(d.sizeForHeight).padStart(7)}  widthLimit ${String(d.sizeForWidth).padStart(7)}  ` +
        `-> ${d.binds} binds  solved ${d.solved}  live ${d.live}`
    );
    console.log(
      `         width limit with ZERO tracking would allow ${d.sizeForWidthZero}px  (+${d.headroomPct}% over solved)`
    );
  }
  await p.close();
}
await b.close();
