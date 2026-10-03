/*
 * A TRUE before/after for the plate wordmark crispness.
 *
 * The earlier crisp-*.png captures were overwritten by later probe runs, so they
 * cannot serve as a baseline. This captures the CURRENT state, then the caller
 * stashes the CSS changes, re-runs to capture the OLD state, and restores.
 *
 * Both sides are captured at deviceScaleFactor 2 so the erosion radius is
 * comparable, and the metric is the share of glyph area that is fully-solid
 * stroke (surviving a 5-device-px erosion). Synthetic bolding smears the outline,
 * which pushes real stroke area outward and shrinks that share; removing it
 * should raise the number.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const DIR = process.env.QA_DIR ?? 'qa-screenshots/crispness-ab';
mkdirSync(DIR, { recursive: true });
const TAG = process.argv[2] ?? 'current';

const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
});
const PORT = process.env.QA_PORT ?? '5173';
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);

/*
 * HMR does not always settle before the next capture, which silently produces a
 * "before" that is actually the "after". Assert the applied CSS matches the tag
 * so a stale capture fails loudly instead of reporting a fake no-op.
 */
const applied = await p.evaluate(() => {
  const b = document.querySelector('.cinematic-plate__body');
  const cs = getComputedStyle(b);
  return { family: cs.fontFamily, weight: cs.fontWeight, smoothing: cs.webkitFontSmoothing };
});
/*
 * Guards against a silently stale capture. The "after" run MUST have the bundled
 * face at its real weight; the "before" run must NOT, since that run serves the
 * pre-pass commit from a separate worktree.
 */
const heavy = /Archivo Black/.test(applied.family) && applied.weight === '400';
if (TAG.startsWith('after') !== heavy) {
  throw new Error(
    `WRONG STATE for "${TAG}": family="${applied.family}" weight=${applied.weight}`
  );
}
console.log(`applied for ${TAG}:`, JSON.stringify(applied));
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
await p.waitForTimeout(1800);

for (const side of ['data', 'cloud']) {
  const r = await p.evaluate((s) => {
    const body = document
      .querySelector(`[data-plate="${s}"]`)
      .querySelector('.cinematic-plate__body')
      .getBoundingClientRect();
    return { x: body.left, y: body.top, w: body.width, h: body.height };
  }, side);
  await p.screenshot({
    path: `${DIR}/${TAG}-${side}.png`,
    clip: {
      x: Math.max(0, r.x - 6),
      y: Math.max(0, r.y - 6),
      width: r.w + 12,
      height: r.h + 12,
    },
  });
}
await b.close();
console.log('captured', TAG);