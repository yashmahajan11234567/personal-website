/*
 * Align DEVOPS / CLOUD with DATA ANALYST / DATA ENGINEER.
 *
 * The user asked for the two plate wordmarks to be aligned with each other. The
 * two plates are symmetric in GEOMETRY, so alignment means the two wordmark
 * blocks must occupy the same fraction of their plate on both axes.
 *
 * Measured: the Data plate kept its original flex-end placement (centre y 0.658
 * at 1280x720) while the Cloud plate was re-centred (0.472). That is a 0.186 --
 * 18.6% of plate height -- disagreement, which is the misalignment the user can
 * see.
 *
 * This reports both plates' block centre, extent, and inset so a shared target
 * can be chosen from measurements rather than guessed.
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
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
  await p.waitForTimeout(1400);

  const r = await p.evaluate(() => {
    const out = {};
    for (const side of ['data', 'cloud']) {
      const plate = document.querySelector(`[data-plate="${side}"]`);
      const body = plate.querySelector('.cinematic-plate__body');
      const pb = plate.getBoundingClientRect();
      const bb = body.getBoundingClientRect();
      const lines = Array.from(plate.querySelectorAll('.cinematic-plate__line')).map((l) => {
        const r = l.getBoundingClientRect();
        return {
          t: l.textContent.trim(),
          top: +((r.top - pb.top) / pb.height).toFixed(4),
          bot: +((r.bottom - pb.top) / pb.height).toFixed(4),
        };
      });
      out[side] = {
        plateW: Math.round(pb.width),
        plateH: Math.round(pb.height),
        top: +((bb.top - pb.top) / pb.height).toFixed(4),
        bot: +((bb.bottom - pb.top) / pb.height).toFixed(4),
        cy: +(((bb.top + bb.bottom) / 2 - pb.top) / pb.height).toFixed(4),
        insetL: +(((bb.left - pb.left) / pb.width) * 100).toFixed(2),
        insetR: +(((pb.right - bb.right) / pb.width) * 100).toFixed(2),
        justify: getComputedStyle(plate).justifyContent,
        lines,
      };
    }
    return out;
  });

  const d = r.data;
  const c = r.cloud;
  console.log(`\n### ${vp.width}x${vp.height}   plate ${c.plateW}x${c.plateH}`);
  console.log(
    `  data  centre y ${d.cy}  span ${d.top}..${d.bot}  insets L${d.insetL} R${d.insetR}  justify=${d.justify}`
  );
  console.log(
    `  cloud centre y ${c.cy}  span ${c.top}..${c.bot}  insets L${c.insetL} R${c.insetR}  justify=${c.justify}`
  );
  console.log(`  VERTICAL DISAGREEMENT ${(Math.abs(d.cy - c.cy) * 100).toFixed(1)}% of plate height`);
  console.log(`  data  lines: ${d.lines.map((l) => `${l.t} ${l.top}..${l.bot}`).join('   ')}`);
  console.log(`  cloud lines: ${c.lines.map((l) => `${l.t} ${l.top}..${l.bot}`).join('   ')}`);
  await p.close();
}
await b.close();
