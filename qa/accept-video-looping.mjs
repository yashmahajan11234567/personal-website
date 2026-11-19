// accept-video-looping.mjs — Phase C acceptance: continuous crossfade looping.
// Verifies >=7 loops per chapter, no frozen visible video, movement doesn't
// interrupt playback, and chapter round-trip cliff->skills->projects->skills->cliff.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/data-world';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-gpu', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000);
await page.keyboard.press('Enter'); // dismiss entry plate (user gesture)
await page.waitForTimeout(500);

const state = () => page.evaluate(() => {
  const layer = document.querySelector('.background-video-layer');
  const videos = Array.from(document.querySelectorAll('.background-video-layer video')).map((v) => ({
    src: (v.currentSrc || v.src).split('/').slice(-2)[0],
    paused: v.paused,
    ended: v.ended,
    t: v.currentTime,
    op: parseFloat(getComputedStyle(v).opacity),
  }));
  return {
    chapter: layer?.getAttribute('data-chapter'),
    loops: parseInt(layer?.getAttribute('data-loops') || '0', 10),
    videos,
  };
});

// Watch a chapter for `seconds`; assert the visible video keeps advancing and
// never ends frozen. Returns { loopsGained, froze }.
async function watchChapter(seconds, moveKey = null) {
  if (moveKey) await page.keyboard.down(moveKey);
  const t0 = Date.now();
  const start = await state();
  let froze = false;
  let lastT = -1;
  let stalled = 0;
  let endedVisibleStreak = 0;
  try {
    while (Date.now() - t0 < seconds * 1000) {
      await page.waitForTimeout(500);
      const s = await state();
      const visible = s.videos.filter((v) => v.op > 0.5);
      const playing = visible.find((v) => !v.paused);
      const endedVisible = visible.find((v) => v.ended);
      if (endedVisible) {
        endedVisibleStreak += 1;
        if (endedVisibleStreak >= 4) froze = true; // >=2s frozen on last frame
      } else {
        endedVisibleStreak = 0;
      }
      if (!playing && visible.length > 0 && !endedVisible) froze = true;
      if (playing) {
        if (Math.abs(playing.t - lastT) < 0.01 && lastT >= 0) {
          stalled += 1;
          if (stalled > 6) froze = true; // >3s without time advancing while "playing"
        } else stalled = 0;
        lastT = playing.t;
      }
    }
  } finally {
    if (moveKey) await page.keyboard.up(moveKey);
  }
  const end = await state();
  return { chapter: end.chapter, loopsGained: end.loops - start.loops, loops: end.loops, froze };
}

async function goChapter(target, key) {
  const t0 = Date.now();
  await page.keyboard.down(key);
  try {
    while (Date.now() - t0 < 25000) {
      await page.waitForTimeout(400);
      const s = await state();
      if (s.chapter === target) return true;
    }
    return false;
  } finally {
    await page.keyboard.up(key);
  }
}

// --- cliff: 65s idle ---
let r = await watchChapter(65);
check('cliff idle 65s: >=7 loops', r.loopsGained >= 7, `loops gained=${r.loopsGained}`);
check('cliff idle 65s: no freeze', !r.froze);

// --- cliff: 15s moving left (stays in cliff) ---
r = await watchChapter(15, 'a');
check('cliff moving 15s: loops continue', r.loopsGained >= 1, `loops gained=${r.loopsGained}`);
check('cliff moving 15s: no freeze', !r.froze);

// --- cliff: 15s alternating move/idle ---
for (let i = 0; i < 5; i++) {
  await page.keyboard.down('a'); await page.waitForTimeout(1500); await page.keyboard.up('a');
  await page.waitForTimeout(1500);
}
const alt = await state();
check('cliff alternating move/idle: still playing', alt.videos.some((v) => v.op > 0.5 && !v.paused && !v.ended), `t=${alt.videos.filter(v=>v.op>0.5).map(v=>v.t.toFixed(2)).join(',')}`);

// --- go to skills ---
check('traverse cliff->skills', await goChapter('skills', 'd'));
r = await watchChapter(65);
check('skills idle 65s: >=7 loops', r.loopsGained >= 7, `loops gained=${r.loopsGained}`);
check('skills idle 65s: no freeze', !r.froze);
// skills: 15s alternating short moves (stays inside skills, no pipe traversal)
{
  const before = await state();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down('d'); await page.waitForTimeout(1200); await page.keyboard.up('d');
    await page.keyboard.down('a'); await page.waitForTimeout(1200); await page.keyboard.up('a');
    await page.waitForTimeout(600);
  }
  const after = await state();
  const visPlaying = after.videos.some((v) => v.op > 0.5 && !v.paused && !v.ended);
  check('skills moving 15s (in-place): stays in skills', after.chapter === 'skills', `ch=${after.chapter}`);
  check('skills moving 15s (in-place): video playing, loops advanced', visPlaying && after.loops > before.loops, `loops ${before.loops}->${after.loops}, playing=${visPlaying}`);
}

// --- go to projects ---
check('traverse skills->projects', await goChapter('projects', 'd'));
r = await watchChapter(65);
check('projects idle 65s: >=7 loops', r.loopsGained >= 7, `loops gained=${r.loopsGained}`);
check('projects idle 65s: no freeze', !r.froze);

// --- back: projects->skills->cliff ---
check('traverse projects->skills', await goChapter('skills', 'a'));
r = await watchChapter(20);
check('skills again 20s: loops continue', r.loopsGained >= 2, `loops gained=${r.loopsGained}`);
check('traverse skills->cliff', await goChapter('cliff', 'a'));
r = await watchChapter(20);
check('cliff again 20s: loops continue', r.loopsGained >= 2, `loops gained=${r.loopsGained}`);

// --- only active chapter playing ---
const s = await state();
const playing = s.videos.filter((v) => !v.paused);
check('only active chapter videos playing', playing.length > 0 && playing.every((v) => v.src === ({ cliff: 'surface', skills: 'infrastructure', projects: 'core' })[s.chapter]), `playing=[${playing.map((v) => v.src)}] chapter=${s.chapter}`);

// --- no console/page errors ---
check('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join('; '));

await browser.close();
const failed = results.filter((x) => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
