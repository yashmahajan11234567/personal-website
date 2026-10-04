/*
 * Plate geometry probe: where the wordmark and status line actually sit inside
 * each plate, expressed as fractions of the plate's own measured bounds.
 *
 * Used to reposition the Cloud wordmark to the plate's optical centre without
 * guessing at percentages, and to confirm the Data plate is left alone.
 */
import { chromium } from 'playwright';

const VPS = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1024, height: 768, name: '1024-tablet' },
  { width: 390, height: 844, name: '390-mobile' },
];

const b = await chromium.launch();

for (const vp of VPS) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
  await p.waitForTimeout(1400);

  const data = await p.evaluate(() => {
    const out = {};
    for (const side of ['data', 'cloud']) {
      const plate = document.querySelector(`[data-plate="${side}"]`);
      const pb = plate.getBoundingClientRect();
      const body = plate.querySelector('.cinematic-plate__body');
      const status = plate.querySelector('.cinematic-plate__status');
      const bb = body.getBoundingClientRect();
      const sb = status.getBoundingClientRect();
      const lines = Array.from(plate.querySelectorAll('.cinematic-plate__line')).map((l) => {
        const r = l.getBoundingClientRect();
        return {
          text: l.textContent.trim(),
          // Centre of each line, as a fraction of the plate.
          cx: +(((r.left + r.right) / 2 - pb.left) / pb.width).toFixed(4),
          cy: +(((r.top + r.bottom) / 2 - pb.top) / pb.height).toFixed(4),
          w: +((r.width / pb.width)).toFixed(4),
        };
      });
      out[side] = {
        plate: { w: +pb.width.toFixed(1), h: +pb.height.toFixed(1) },
        // Wordmark block centre as a fraction of the plate box.
        bodyCx: +(((bb.left + bb.right) / 2 - pb.left) / pb.width).toFixed(4),
        bodyCy: +(((bb.top + bb.bottom) / 2 - pb.top) / pb.height).toFixed(4),
        bodyW: +((bb.width / pb.width)).toFixed(4),
        bodyH: +((bb.height / pb.height)).toFixed(4),
        statusCy: +(((sb.top + sb.bottom) / 2 - pb.top) / pb.height).toFixed(4),
        statusCx: +(((sb.left + sb.right) / 2 - pb.left) / pb.width).toFixed(4),
        lines,
        justify: getComputedStyle(plate).justifyContent,
        padT: getComputedStyle(plate).paddingTop,
        padB: getComputedStyle(plate).paddingBottom,
      };
    }
    return out;
  });

  console.log(`\n### ${vp.name}  plate ${data.cloud.plate.w}x${data.cloud.plate.h}`);
  for (const side of ['data', 'cloud']) {
    const d = data[side];
    console.log(
      `  ${side.padEnd(5)} bodyCentre=(${d.bodyCx}, ${d.bodyCy})  size=${d.bodyW}x${d.bodyH}  ` +
        `statusCentre=(${d.statusCx}, ${d.statusCy})  justify=${d.justify} pad=${d.padT}/${d.padB}`
    );
    for (const l of d.lines) console.log(`         line ${l.text.padEnd(13)} centre=(${l.cx}, ${l.cy}) width=${l.w}`);
  }
  await p.close();
}

await b.close();
