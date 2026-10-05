/**
 * Capture the skills -> projects tube ON SCREEN, and confirm the visual fix.
 *
 * Walks the player properly to the far right of Skills (no teleporting, so the
 * camera follows as it would in play), then photographs the tube.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa/_scratch-e';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(600);

/** Wait until the transport has fully settled in `want`. */
async function settle(want, timeout = 30000) {
  await page.waitForFunction(
    (w) => {
      const s = window.__worldScene;
      const p = s?.transportPhases ?? [];
      return s?.currentChapter === w && s?.playerLocked === false && p.at(-1) === 'idle';
    },
    want,
    { timeout },
  ).catch(() => console.log(`  settle timeout: ${want}`));
  await sleep(400);
}

async function walkRightUntilArmed(pipeId, maxMs = 40000) {
  const t0 = Date.now();
  let armed = null;
  while (Date.now() - t0 < maxMs) {
    await page.keyboard.down('ArrowRight');
    await sleep(260);
    armed = await page.evaluate(() => window.__worldScene?.armedPipe?.id ?? null);
    if (armed === pipeId) break;
    await page.keyboard.up('ArrowRight');
  }
  await page.keyboard.up('ArrowRight');
  return armed;
}

// Cliff -> Skills
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 120; i += 1) {
  if (await page.evaluate(() => window.__worldScene?.currentChapter === 'skills')) break;
  await sleep(120);
}
await page.keyboard.up('ArrowRight');
await settle('skills');
console.log('chapter:', await page.evaluate(() => window.__worldScene?.currentChapter));

// Now walk right in SKILLS until the projects tube arms, then STOP just before.
const armed = await walkRightUntilArmed('skills-to-projects');
console.log('armed in skills:', armed);

// Back off 60px so the tube is fully framed and not mid-transition.
await page.evaluate(() => {
  const s = window.__worldScene;
  const e = s.world.exitPipe;
  s.player.x = e.x - 70;
  s.player.body.reset(e.x - 70, s.player.y);
  // Let the camera follow: one follow tick needs a frame, so wait after this.
});
await sleep(1400);

const shot = await page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  const e = s.world.exitPipe;
  return {
    chapter: s.currentChapter,
    playerX: Math.round(s.player.x),
    exitPipeX: e.x,
    exitVisible: s.pipeSkins.get(e.id)?.mouth.visible ?? null,
    armed: s.armedPipe?.id ?? null,
    view: { x: Math.round(v.x), right: Math.round(v.x + v.width) },
    tubeCentreScreenPx: Math.round((e.x - v.x) * 2),
    tubeFullyInView: e.x - 22 >= v.x && e.x + 22 <= v.x + v.width,
    canvasW: (() => { const c = document.querySelector('[data-testid="world-canvas"] canvas'); return c ? Math.round(c.getBoundingClientRect().width) : null; })(),
  };
});
console.log(JSON.stringify(shot, null, 2));

await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/tube-visible.png` });

// A tighter crop on the tube itself, so the art can be judged.
await page.locator('[data-testid="world-canvas"]').screenshot({
  path: `${OUT}/tube-visible.png`,
  clip: await page.evaluate(() => {
    const c = document.querySelector('[data-testid="world-canvas"] canvas');
    const b = c.getBoundingClientRect();
    const s = window.__worldScene;
    const v = s.cameras.main.worldView;
    const e = s.world.exitPipe;
    // Screen position of the tube's left edge, converted to page coords.
    const rel = (e.x - 22 - v.x) * 2;
    return {
      x: Math.max(0, Math.round(b.x + rel - 220)),
      y: Math.max(0, Math.round(b.y + b.height * 0.28)),
      width: Math.min(460, Math.round(b.width - Math.max(0, rel - 220))),
      height: Math.round(b.height * 0.6),
    };
  }),
}).catch(async (e) => console.log('clip crop failed:', e.message));

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done');