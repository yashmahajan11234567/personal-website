/**
 * Defect 2: is the SKILLS -> PROJECTS pipe actually visible, and where?
 *
 * Walks the player to the far right of the skills chapter, then reports:
 *   - where the exit pipe is in world x, and in which camera rect
 *   - whether the tube draws any non-background pixels in that rect
 *   - a screenshot of the right edge
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5174/#/data-world';
const OUT = 'qa/_scratch-e';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });

await page.goto(BASE);
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter'); // dismiss entry plate
await sleep(600);

/** Hold ArrowRight until the chapter is `want`, or time out. */
async function walkToChapter(want, maxMs = 60000) {
  const t0 = Date.now();
  await page.keyboard.down('ArrowRight');
  while (Date.now() - t0 < maxMs) {
    const ch = await page.evaluate(() => window.__worldScene?.currentChapter ?? null);
    if (ch === want) break;
    await sleep(120);
  }
  await page.keyboard.up('ArrowRight');
  return page.evaluate(() => window.__worldScene?.currentChapter ?? null);
}

const arrived = await walkToChapter('skills');
console.log('arrived chapter:', arrived);
await sleep(700);

const report = async (label) => {
  const r = await page.evaluate(() => {
    const s = window.__worldScene;
    if (!s) return { missing: true };
    const cam = s.cameras?.main;
    const camRect = cam ? { x: Math.round(cam.worldView.x), y: Math.round(cam.worldView.y), w: Math.round(cam.worldView.width), h: Math.round(cam.worldView.height), zoom: cam.zoom } : null;
    const skins = [];
    for (const [id, built] of s.pipeSkins ?? []) {
      const c = built.mouth;
      skins.push({
        id,
        containerX: Math.round(c.x),
        containerY: Math.round(c.y),
        visible: c.visible,
        depth: c.depth,
        children: c.list.map((o) => ({
          type: o.type,
          x: Math.round(o.x),
          y: Math.round(o.y),
          w: o.width ? Math.round(o.width) : null,
          h: o.height ? Math.round(o.height) : null,
          visible: o.visible,
          texture: o.texture?.key ?? null,
        })),
      });
    }
    return {
      chapter: s.currentChapter,
      chapterWidth: s.world?.width ?? null,
      playerX: Math.round(s.player?.x ?? -1),
      camRect,
      skins,
    };
  });
  console.log(`--- ${label} ---`);
  console.log(JSON.stringify(r, null, 2));
  return r;
};

await report('on arrival in skills');

// Walk all the way right toward the exit pipe.
await page.keyboard.down('ArrowRight');
await sleep(6000);
await page.keyboard.up('ArrowRight');
await sleep(400);
const atEnd = await report('after walking right');

// Screenshot so the tube itself can be inspected, not just the numbers.
await page.screenshot({ path: `${OUT}/skills-pipe-right.png` });
await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/skills-canvas-right.png` });

// How much of the tube is inside the camera view?
const inView = await page.evaluate(() => {
  const s = window.__worldScene;
  const cam = s.cameras.main;
  const v = cam.worldView;
  return (s.world.pipes ?? []).map((p) => ({
    id: p.id,
    dest: p.destination,
    x: p.x,
    left: p.x - 22,
    right: p.x + 22,
    top: p.y - 60,
    bottom: p.y,
    fullyInView: p.x - 22 >= v.x && p.x + 22 <= v.x + v.width && p.y - 60 >= v.y,
    anyPartInView: !(p.x + 22 < v.x || p.x - 22 > v.x + v.width || p.y < v.y || p.y - 60 > v.y + v.height),
    viewRight: Math.round(v.x + v.width),
    viewLeft: Math.round(v.x),
  }));
});
console.log('--- pipe vs camera view ---');
console.log(JSON.stringify(inView, null, 2));

await browser.close();
console.log('done');