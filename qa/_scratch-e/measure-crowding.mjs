/**
 * Measure the SKILLS chapter crowding: last station vs sign vs tube.
 *
 * Reported: "the sign next chapter is behind streamlit skill". Config predicts
 * this exactly, so measure it in the browser rather than from the arithmetic.
 *
 * skills: SKILLS_WIDTH=1200, SKILL_SPACING=130, STATION_RUN_START=200,
 *         EXIT_PIPE_CLEARANCE=130, pipe at width-150, PIPE_HALF_WIDTH=22
 * => lastAllowed = min(1200-130,1200-40)-40 = 1030, available = 830
 * => pitch = min(130, 830/5) = 130, startX = 200 + (830-650)/2 = 290
 * => stations at 290,420,550,680,810,940   (streamlit = 940)
 * => pipe centre 1050; sign centre = 1050 - (22 + signW/2 + 16) = 1050-104 = 946
 *
 * The sign spans roughly 880..1012 and the streamlit station sits at 940, so they
 * occupy the same ground. Measure to confirm and to size the fix.
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

  /*
   * Station rects, read from the BUILT SPRITE rather than from the config.
   *
   * The sprite is 96x104 for a skill and is placed with `setOrigin(0.5, 1)` — X
   * centred, Y at the BOTTOM. An earlier version of this probe assumed a
   * centre-origin 48x64 box and produced NaN for every station, which is how the
   * first run reported `station/sign overlap = NaNpx` instead of a number.
   */
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
      // child x is relative to the container centre
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

  return {
    chapter: s.currentChapter,
    chapterWidth: w.width,
    playerSpeed: null,
    stations,
    exitPipe: { id: exitId, x: Math.round(w.exitPipe.x), plate: w.exitPipe.plate, signText: w.exitPipe.signText },
    kids,
    camera: (() => { const v = s.cameras.main.worldView; return { x: Math.round(v.x), right: Math.round(v.x + v.width) }; })(),
  };
});

console.log(JSON.stringify(m, null, 2));

// Overlap analysis, computed here rather than eyeballed.
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

// Put the crowding on camera, then photograph it.
await page.evaluate(() => {
  const s = window.__worldScene;
  const e = s.world.exitPipe;
  s.player.x = e.x - 210;
  s.player.body.reset(e.x - 210, s.player.y);
  s.cameras.main.centerOn(e.x - 60, s.world.groundY - 100);
  s.cameras.main.stopFollow();
});
await sleep(900);
const onCam = await page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  const last = (s.stations ?? []).at(-1);
  return {
    view: { x: Math.round(v.x), right: Math.round(v.x + v.width) },
    lastStation: last ? { label: last.label, x: Math.round(last.x), left: Math.round(last.x - 48), right: Math.round(last.x + 48) } : null,
    sign: (() => {
      const b = s.pipeSkins.get(s.world.exitPipe.id).mouth;
      const o = b.list.find((q) => String(q.texture?.key).includes('sign'));
      return { left: Math.round(b.x + o.x - o.displayWidth / 2), right: Math.round(b.x + o.x + o.displayWidth / 2) };
    })(),
    tubeLeft: Math.round(s.world.exitPipe.x - 22),
    tubeRight: Math.round(s.world.exitPipe.x + 22),
  };
});
console.log('\n===== ON-CAMERA FRAMING =====');
console.log(JSON.stringify(onCam, null, 2));
const l = onCam.lastStation;
if (l) {
  const gapSign = onCam.sign.left - l.right;
  const gapTube = onCam.tubeLeft - l.right;
  console.log(`station right edge -> sign left  = ${gapSign}px ${gapSign < 0 ? '<-- OVERLAP' : ''}`);
  console.log(`station right edge -> tube left  = ${gapTube}px ${gapTube < 0 ? '<-- OVERLAP' : ''}`);
}
await page.locator('[data-testid="world-canvas"]').screenshot({ path: 'qa/_scratch-e/crowding-before.png' });
await browser.close();
console.log('\ndone');