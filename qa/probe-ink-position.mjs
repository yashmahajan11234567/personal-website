/*
 * Where does the wordmark INK actually sit inside its plate?
 *
 * The block element is width-clamped by the plate's padding (max-width: 100% on
 * each nowrap line), so its box edge is NOT where the text ends. Measuring
 * getBoundingClientRect on the container therefore reports the padding, not the
 * type. This uses a Range over the text nodes to get the real ink bounds, which
 * is what "move it to the right" has to mean.
 */
import { chromium } from 'playwright';

const PORT = process.env.QA_PORT ?? '5173';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
await p.waitForTimeout(1800);

const out = await p.evaluate(() => {
  const res = {};
  for (const side of ['data', 'cloud']) {
    const plate = document.querySelector(`[data-plate="${side}"]`);
    const pb = plate.getBoundingClientRect();
    const body = plate.querySelector('.cinematic-plate__body');

    // Per-LINE ink bounds. Aggregating is misleading: the block is a flex column,
    // so each line has its own left/right edge and the widest line is not the
    // first. What matters for "moved right" is where the WIDEST line sits, since
    // that is the line the eye tracks.
    const lines = [...body.querySelectorAll('.cinematic-plate__line')].map((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      const rects = [...r.getClientRects()].filter((x) => x.width > 0);
      const L = Math.min(...rects.map((x) => x.left));
      const R = Math.max(...rects.map((x) => x.right));
      return {
        text: el.textContent,
        fromLeft: L - pb.left,
        fromRight: pb.right - R,
        width: R - L,
      };
    });
    const widest = lines.reduce((a, b2) => (b2.width > a.width ? b2 : a));
    const bb = body.getBoundingClientRect();
    res[side] = {
      plateW: pb.width,
      boxL: bb.left - pb.left,
      boxR: pb.right - bb.right,
      lines,
      widestText: widest.text,
      inkL: widest.fromLeft,
      inkR: widest.fromRight,
      inkCentrePct: ((widest.fromLeft + (pb.width - widest.fromRight)) / 2 / pb.width) * 100,
      overflowsBox: widest.fromLeft < bb.left - pb.left - 0.5,
    };
  }
  return res;
});

console.log(`port ${PORT}`);
for (const side of ['data', 'cloud']) {
  const d = out[side];
  console.log(`${side.padEnd(6)} plate ${d.plateW.toFixed(0)}px  box fromLeft ${d.boxL.toFixed(1)}`);
  for (const l of d.lines) {
    console.log(
      `       "${l.text}" w ${l.width.toFixed(0)}px  fromLeft ${l.fromLeft.toFixed(1)}  fromRight ${l.fromRight.toFixed(1)}`
    );
  }
  console.log(
    `       widest "${d.widestText}" centre ${d.inkCentrePct.toFixed(2)}% of plate width`
  );
}
await b.close();