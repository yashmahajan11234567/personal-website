/**
 * Measure the SKILLS chapter crowding after widening to 1360.
 * Also report the player's walk speed from PLAYER.speed.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()); });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(600);

// cliff -> skills
await page.keyboard.down('ArrowRight');
for (let i = 0; i < 200; i += 1) {
  if (await page.evaluate(() => window.__worldScene?.currentChapter === 'skills')) break;
  await sleep(120);
}
await page.keyboard.up('ArrowRight');
await page.waitForFunction(() => {
  const s = window.__worldScene;
  const p = s?.transportPhases ?? [];
  return s?.playerLocked === false && p.at(-1) === 'idle';
}, undefined, { timeout: 30000 }).catch(() => console.log('(settle timeout)'));
await sleep(500);

const m = await page.evaluate(() => {
  const s = window.__worldScene;
  const w = s.world;

  // Station sprite world rects, from the built objects.
  const stations = (s.stations ?? []).map((st) => {
    const sprite = st.sprite ?? st.image ?? null;
    const wpx = sprite?.width ?? (st.kind === 'skill' ? 96 : 176);
    const hpx = sprite?.height ?? (st.kind === 'skill' ? 104 : 132);
    const cx = st.x ?? sprite?.x ?? 0;
    const bottom = st.y ?? sprite?.y ?? 0;
    return {
      kind: st.kind,
      label: st.label,
      tag: st.tag,
      x: Math.round(cx),
      w: Math.round(wpx),
      h: Math.round(hpx),
      left: Math.round(cx - wpx / 2),
      right: Math.round(cx + wpx / 2),
      top: Math.round(bottom - hpx),
      bottom: Math.round(bottom),
    };
  });

  // The exit tube's own children, in world coords, from the built container.
  const exitId = w.exitPipe?.id;
  const built = s.pipeSkins?.get(exitId);
  const cx = built?.mouth?.x ?? w.exitPipe?.x;
  const kids = (built?.mouth?.list ?? []).map((o) => {
    const key = o.texture?.key ?? o.type;
    const kind = String(key).includes('mouth') ? 'tube'
      : String(key).includes('plate') ? 'plate'
      : String(key).includes('sign') ? 'sign'
      : String(key).includes('tunnel') ? 'tunnel' : 'other';
    const wpx = o.displayWidth ?? o.width ?? 0;
    const hpx = o.displayHeight ?? o.height ?? 0;
    return {
      kind,
      key: String(key),
      worldCx: Math.round(cx + (o.x ?? 0)),
      worldCy: Math.round(built.mouth.y + (o.y ?? 0)),
      w: Math.round(wpx),
      h: Math.round(hpx),
      left: Math.round(cx + (o.x ?? 0) - wpx / 2),
      right: Math.round(cx + (o.x ?? 0) + wpx / 2),
      top: Math.round(built.mouth.y + (o.y ?? 0) - hpx / 2),
      bottom: Math.round(built.mouth.y + (o.y ?? 0) + hpx / 2),
    };
  });

  // Player speed from the PLAYER constant (if exposed)
  let playerSpeed = null;
  try {
    playerSpeed = window.__playerSpeed ?? null;
  } catch (_) { /* ignored */ }

  return {
    chapter: s.currentChapter,
    chapterWidth: w.width,
    stations,
    exitPipe: { id: exitId, x: Math.round(w.exitPipe.x), plate: w.exitPipe.plate, signText: w.exitPipe.signText },
    kids,
    playerSpeed,
    camera: (() => { const v = s.cameras.main.worldView; return { x: Math.round(v.x), right: Math.round(v.x + v.width) }; })(),
  };
});

// Overlap analysis
const last = m.stations[m.stations.length - 1];
const sign = m.kids.find((k) => k.kind === 'sign');
const plate = m.kids.find((k) => k.kind === 'plate');
const tube = m.kids.find((k) => k.kind === 'tube');
const edge = m.chapterWidth;

const overlap1d = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left);

console.log('\n===== OVERLAP =====');
console.log(`last station (${last?.label}) x=${last?.x} spans ${last?.left}..${last?.right}`);
console.log(`sign  spans ${sign?.left}..${sign?.right}  ("${m.exitPipe.signText}")`);
console.log(`plate spans ${plate?.left}..${plate?.right}  ("${m.exitPipe.plate}")`);
console.log(`tube  spans ${tube?.left}..${tube?.right}`);
console.log(`chapter right edge = ${edge}`);
console.log('');
if (last && sign) {
  const ox = overlap1d(last, sign);
  console.log(`station/sign horizontal overlap = ${ox}px ${ox > 0 ? '<-- COLLIDING' : '<-- clear'}`);
  const oy = Math.min(last.bottom, sign.bottom) - Math.max(last.top, sign.top);
  console.log(`station/sign vertical overlap   = ${oy}px ${oy > 0 ? '(same rows)' : '(different rows)'}`);
}
if (sign && tube) console.log(`sign/tube gap = ${tube.left - sign.right}px`);
if (tube) console.log(`tube right edge to chapter edge = ${edge - tube.right}px`);
if (last && tube) console.log(`station right to tube left gap = ${tube.left - last.right}px`);

console.log('\n===== PLAYER SPEED =====');
console.log(`PLAYER.speed = ${m.playerSpeed ?? 'not exposed'} px/s`);

await page.locator('[data-testid="world-canvas"]').screenshot({ path: 'qa/_scratch-e/crowding-after.png' });
await browser.close();
console.log('\ndone');