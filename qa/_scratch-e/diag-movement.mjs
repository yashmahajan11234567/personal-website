/**
 * Does movement work after a chapter swap, and is the player on screen?
 *
 * The previous probe showed the player pinned at spawn x=144 with the camera at
 * view=[275..825] — off screen, not moving, while ArrowRight was still held.
 * Two candidate causes:
 *   a) my onArrive edit (which only touches pipe visibility and setActive), or
 *   b) a pre-existing held-key / camera issue.
 *
 * This distinguishes them by testing a FRESH keypress after arrival (no held
 * key across the swap) and by recording whether the player is ever off-screen.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(600);

const st = () => page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  return {
    chapter: s.currentChapter,
    playerX: Math.round(s.player.x),
    velX: Math.round(s.player.body?.velocity?.x ?? -999),
    keyD: s.keyD?.isDown ?? null,
    keyRight: s.keyRight?.isDown ?? null,
    held: [...(s.heldAtSwap ?? [])],
    locked: s.playerLocked,
    view: { x: Math.round(v.x), right: Math.round(v.x + v.width) },
    onScreen: s.player.x >= v.x && s.player.x <= v.x + v.width,
  };
});

/* ---- Leg 1: hold ArrowRight through cliff -> skills ---- */
console.log('=== hold ArrowRight through cliff -> skills ===');
await page.keyboard.down('ArrowRight');
let arrived = false;
for (let i = 0; i < 200; i += 1) {
  const c = await st();
  if (c.chapter === 'skills') { arrived = true; break; }
  await sleep(120);
}
await page.keyboard.up('ArrowRight');
console.log('arrived:', arrived);
await sleep(3000);
console.log('after arrival (key released):', JSON.stringify(await st(), null, 2));

/* ---- Leg 2: FRESH press, no held key across the swap ---- */
console.log('\n=== fresh ArrowRight press after arrival ===');
const before = await st();
await page.keyboard.down('ArrowRight');
await sleep(1500);
const during = await st();
await page.keyboard.up('ArrowRight');
console.log('before :', JSON.stringify({ playerX: before.playerX, onScreen: before.onScreen, view: before.view }));
console.log('during :', JSON.stringify({ playerX: during.playerX, velX: during.velX, keyD: during.keyD, onScreen: during.onScreen, view: during.view }));

/* ---- Leg 3: walk far right in skills; is the tube ever framed? ---- */
console.log('\n=== walking right in skills in 1s bursts ===');
let offScreenEver = false;
let tubeFramed = false;
for (let i = 0; i < 26; i += 1) {
  await page.keyboard.down('ArrowRight');
  await sleep(1000);
  await page.keyboard.up('ArrowRight');
  await sleep(150);
  const c = await page.evaluate(() => {
    const s = window.__worldScene;
    const v = s.cameras.main.worldView;
    const e = s.world.exitPipe;
    return {
      ch: s.currentChapter, px: Math.round(s.player.x),
      view: { x: Math.round(v.x), right: Math.round(v.x + v.width) },
      onScreen: s.player.x >= v.x && s.player.x <= v.x + v.width,
      pipeX: e.x, pipeVis: s.pipeSkins.get(e.id)?.mouth.visible ?? null,
      pipeOnScreen: e.x >= v.x && e.x <= v.x + v.width,
    };
  });
  if (!c.onScreen) offScreenEver = true;
  if (c.pipeOnScreen) { tubeFramed = true; console.log('  TUBE FRAMED at step', i, JSON.stringify(c)); break; }
  if (i % 4 === 0) console.log(`  step ${i}:`, JSON.stringify(c));
}
const final = await page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  return { ch: s.currentChapter, px: Math.round(s.player.x), view: { x: Math.round(v.x), right: Math.round(v.x + v.width) }, onScreen: s.player.x >= v.x && s.player.x <= v.x + v.width };
});
console.log('\noffScreenEver:', offScreenEver, '| tubeFramed:', tubeFramed);
console.log('final:', JSON.stringify(final, null, 2));
await page.locator('[data-testid="world-canvas"]').screenshot({ path: 'qa/_scratch-e/movement-diagnosis.png' });
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done');