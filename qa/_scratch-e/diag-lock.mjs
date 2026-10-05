/**
 * WHY is the player still locked after arriving in skills?
 *
 * In pipeTransport's `settle` phase the order is:
 *     occludePlayer(false) -> conduitEnd() -> show() -> onArrive(...) -> lockPlayer(false)
 * `lockPlayer(false)` runs LAST, so ANY throw inside `onArrive` leaves
 * `playerLocked === true` forever and the player is frozen. That is exactly the
 * observed state, so this probe captures uncaught errors and the phase log.
 *
 * `addInitScript` installs the error hooks BEFORE any page script runs, which is
 * the only way to catch an exception thrown inside Phaser's update loop.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
await page.addInitScript(() => {
  window.__caught = [];
  window.addEventListener('error', (e) => {
    window.__caught.push({ kind: 'error', msg: e.message, src: e.filename, line: e.lineno, col: e.colno, stack: e.error?.stack ?? null });
  });
  window.addEventListener('unhandledrejection', (e) => {
    window.__caught.push({ kind: 'rejection', msg: String(e.reason?.message ?? e.reason), stack: e.reason?.stack ?? null });
  });
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(600);

await page.keyboard.down('ArrowRight');
for (let i = 0; i < 200; i += 1) {
  if (await page.evaluate(() => window.__worldScene?.currentChapter === 'skills')) break;
  await sleep(120);
}
await page.keyboard.up('ArrowRight');
await sleep(4000);

const r = await page.evaluate(() => {
  const s = window.__worldScene;
  return {
    chapter: s.currentChapter,
    locked: s.playerLocked,
    playerX: Math.round(s.player.x),
    phases: s.transportPhases ?? [],
    lastPhase: (s.transportPhases ?? []).at(-1),
    swapping: s.swappingChapter,
    pendingDest: s.pendingDestination,
    pipeVisibility: [...(s.pipeSkins ?? new Map()).entries()].map(([id, b]) => ({ id, v: b.mouth.visible })),
    caught: window.__caught ?? [],
  };
});
console.log(JSON.stringify(r, null, 2));
console.log('\nconsole errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done');