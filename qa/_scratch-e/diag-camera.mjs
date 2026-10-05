/**
 * Is the camera-follow failure real, or an artifact of teleporting the player?
 *
 * The previous probe teleported `player.x` directly and the camera stayed put at
 * view.x=275 while the player stood at x=980. Two possibilities:
 *   a) the probe broke it (camera lerp is frame-driven, and a `body.reset` plus a
 *      raw x write can desync it), or
 *   b) `startFollow` is genuinely not running after arrival, which would be a
 *      far more serious bug — the player would walk off the visible screen.
 *
 * Walk normally with no writes to the player at all and report the camera's own
 * state each step.
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

const camState = () => page.evaluate(() => {
  const s = window.__worldScene;
  const cam = s.cameras.main;
  const v = cam.worldView;
  return {
    playerX: Math.round(s.player.x),
    viewX: Math.round(v.x),
    viewRight: Math.round(v.x + v.width),
    playerOnScreen: s.player.x >= v.x && s.player.x <= v.x + v.width,
    followActive: cam._follow ? { target: cam._follow.target?.constructor?.name, deadzone: !!cam._follow.deadzone } : null,
    locked: s.playerLocked,
    chapter: s.currentChapter,
  };
});

console.log('--- walking right in CLIFF, no player writes ---');
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 14; i += 1) {
  await sleep(300);
  const c = await camState();
  console.log(`  step ${i}: playerX=${c.playerX} view=[${c.viewX}..${c.viewRight}] onScreen=${c.playerOnScreen} follow=${c.followActive ? 'yes' : 'NO'} locked=${c.locked} chapter=${c.chapter}`);
  if (c.chapter === 'skills') break;
}
await page.keyboard.up('ArrowRight');
await sleep(2500);
console.log('after travel:', JSON.stringify(await camState(), null, 2));

console.log('--- walking right in SKILLS, no player writes ---');
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 20; i += 1) {
  await sleep(300);
  const c = await camState();
  const e = await page.evaluate(() => {
    const s = window.__worldScene;
    const x = s.world.exitPipe.x;
    return { pipeX: x, pipeVisible: s.pipeSkins.get(s.world.exitPipe.id)?.mouth.visible ?? null, armed: s.armedPipe?.id ?? null };
  });
  console.log(`  step ${i}: playerX=${c.playerX} view=[${c.viewX}..${c.viewRight}] onScreen=${c.playerOnScreen} pipeX=${e.pipeX} pipeVisible=${e.pipeVisible} armed=${e.armed}`);
  // Release before the trigger range (pipe triggers at x-52) so it stays framed.
  if (c.playerX >= 940) { await page.keyboard.up('ArrowRight'); console.log('  released at', c.playerX); break; }
}
await sleep(900);
const final = await page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  const e = s.world.exitPipe;
  return {
    playerX: Math.round(s.player.x),
    view: { x: Math.round(v.x), right: Math.round(v.x + v.width) },
    pipeX: e.x, pipeVisible: s.pipeSkins.get(e.id)?.mouth.visible ?? null,
    armed: s.armedPipe?.id ?? null,
    tubeScreenX: Math.round((e.x - v.x) * 2),
    canvasW: Math.round(document.querySelector('[data-testid="world-canvas"] canvas').getBoundingClientRect().width),
  };
});
console.log('final:', JSON.stringify(final, null, 2));
await page.locator('[data-testid="world-canvas"]').screenshot({ path: 'qa/_scratch-e/tube-walked.png' });

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done');