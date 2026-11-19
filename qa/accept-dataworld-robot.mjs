/** Robot replacement verification: animation states, all 4 pipe transitions,
 *  hub visibility, viewports, mid-transition screenshots. Follows the proven
 * traversal pattern: walk + Enter when armedPipeId. */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-robot';
mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(5000);

const P = () => page.evaluate(() => window.__worldProbe());
const S = () => page.evaluate(() => {
  const s = window.__worldScene;
  const p = s?.player;
  return {
    tex: p?.texture.key, visible: p?.visible, depth: p?.depth, scale: p?.scaleX,
    phase: s?.transport?.phase, travelling: s?.transport?.isTravelling,
    phaseLog: s?.transport?.phaseLog ? [...s.transport.phaseLog] : [],
  };
});

// 1. Cliff idle: robot texture, grounded
let p = await P(), st = await S();
check('cliff: robot texture active', st.tex === 'player-robot-idleA' || st.tex === 'player-robot-idleB', st.tex);
check('cliff: grounded at spawn', p.grounded && Math.abs(p.y - 560) < 2, JSON.stringify({ x: p.x, y: p.y }));
await page.screenshot({ path: `${OUT}/r1-cliff-idle.png` });

// 2. Walk right in open space — walk frames must cycle
await page.keyboard.down('d');
const walkTexs = new Set();
for (let i = 0; i < 8; i++) { await page.waitForTimeout(110); const s = await S(); walkTexs.add(s.tex); }
await page.keyboard.up('d');
const walkFrames = [...walkTexs].filter((t) => /walk[A-H]/.test(t));
check('walk: 8-frame walk cycle playing', walkFrames.length >= 3, [...walkTexs].join(','));
await page.screenshot({ path: `${OUT}/r2-cliff-walk.png` });

// 3. Jump / fall frames
await page.keyboard.press(' ');
await page.waitForTimeout(220);
st = await S();
check('jump: airborne jump/fall frame', /jump|fall/.test(st.tex), st.tex);
await page.screenshot({ path: `${OUT}/r3-jump.png` });
await page.waitForTimeout(1500);

// Helper: walk toward target x (dir 'd'/'a'), pressing Enter when a pipe arms.
async function travelTo(targetX, chapterWanted, maxMs = 25000) {
  const t0 = Date.now();
  const key = targetX > (await P()).x ? 'd' : 'a';
  await page.keyboard.down(key);
  let keyHeld = true;
  let lastFired = null;
  const seen = { enter: new Set(), exit: new Set(), phases: new Set() };
  let shotEnter = false, shotExit = false;
  try {
    while (Date.now() - t0 < maxMs) {
      await page.waitForTimeout(90);
      const pr = await P();
      const s = await S();
      if (s.phase) seen.phases.add(s.phase);
      if (/tubeEnter/.test(s.tex)) seen.enter.add(s.tex);
      if (/tubeExit/.test(s.tex)) seen.exit.add(s.tex);
      if (s.phase === 'entering' && !shotEnter) { shotEnter = true; await page.screenshot({ path: `${OUT}/r4-entering.png` }); }
      if (s.phase === 'emerging' && !shotExit) { shotExit = true; await page.screenshot({ path: `${OUT}/r5-emerging.png` }); }
      if (pr.travelling) {
        // Ride started: release the key so arrival cannot overshoot into the
        // destination's return-pipe trigger zone.
        await page.keyboard.up(key);
        keyHeld = false;
        continue;
      }
      if (pr.armedPipeId && pr.armedPipeId !== lastFired) {
        // Keep the movement key held: at the skills spawn the probe can report a
        // STALE armed pipe from the previous chapter, and releasing the key here
        // would strand the player. The pipe auto-fires on arm; Enter is just a
        // belt-and-braces nudge.
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        lastFired = pr.armedPipeId;
        continue;
      }
      if (pr.chapter === chapterWanted) {
        if (keyHeld) await page.keyboard.up(key);
        return { ok: true, seen, p: pr };
      }
      if (Math.abs(pr.x - targetX) < 30 && !pr.armedPipeId) {
        // close but not armed: keep nudging
      }
    }
    return { ok: false, seen, p: await P() };
  } finally {
    await page.keyboard.up(key);
  }
}

// 4. Cliff -> Skills (walk right to the exit pipe)
let r = await travelTo(99999, 'skills');
check('cliff->skills: arrived', r.ok, JSON.stringify({ ch: r.p?.chapter, x: r.p?.x }));
check('cliff->skills: tubeEnter strip played', r.seen.enter.size >= 2, [...r.seen.enter].join(','));
check('cliff->skills: tubeExit strip played', r.seen.exit.size >= 2, [...r.seen.exit].join(','));
check('cliff->skills: phase order sane', ['entering', 'occluded', 'emerging', 'settle'].every((ph) => r.seen.phases.has(ph)), [...r.seen.phases].join(','));
await page.waitForTimeout(900);
p = await P(); st = await S();
check('skills: robot visible, grounded, robot tex', p.chapter === 'skills' && st.visible && p.grounded && st.tex.startsWith('player-robot-'), JSON.stringify({ tex: st.tex, vis: st.visible, depth: st.depth }));
await page.screenshot({ path: `${OUT}/r6-skills.png` });

// 5. Skills -> Projects
r = await travelTo(99999, 'projects');
check('skills->projects: arrived', r.ok, JSON.stringify({ ch: r.p?.chapter }));
await page.waitForTimeout(900);
p = await P(); st = await S();
check('projects: robot visible, grounded, robot tex', p.chapter === 'projects' && st.visible && p.grounded && st.tex.startsWith('player-robot-'), JSON.stringify({ tex: st.tex, vis: st.visible, depth: st.depth }));
await page.screenshot({ path: `${OUT}/r7-projects.png` });

// 6. Projects -> Skills (walk left)
r = await travelTo(-99999, 'skills');
check('projects->skills: arrived', r.ok, JSON.stringify({ ch: r.p?.chapter }));
check('projects->skills: tube strips played', r.seen.enter.size + r.seen.exit.size >= 2, `in:${[...r.seen.enter].length} out:${[...r.seen.exit].length}`);
await page.waitForTimeout(900);
p = await P(); st = await S();
check('skills (return): robot visible', p.chapter === 'skills' && st.visible && st.tex.startsWith('player-robot-'), JSON.stringify({ tex: st.tex, vis: st.visible }));
await page.screenshot({ path: `${OUT}/r8-skills-return.png` });

// 7. Skills -> Cliff (walk left), repeat transition
r = await travelTo(-99999, 'cliff');
{ const pp = await P(); if (pp.chapter === 'cliff') r.ok = true; }
check('skills->cliff: arrived', r.ok, JSON.stringify({ ch: r.p?.chapter }));
await page.waitForTimeout(900);
p = await P(); st = await S();
check('cliff (return): robot visible, grounded', p.chapter === 'cliff' && st.visible && p.grounded, JSON.stringify({ tex: st.tex, vis: st.visible }));
await page.screenshot({ path: `${OUT}/r9-cliff-return.png` });

// 8. Viewports
for (const vp of [{ width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  await page.setViewportSize(vp);
  await page.waitForTimeout(1200);
  p = await P(); st = await S();
  check(`viewport ${vp.width}x${vp.height}: robot visible+grounded`, st.visible && p.grounded && st.tex.startsWith('player-robot-'), JSON.stringify({ tex: st.tex, vis: st.visible, x: p.x, y: p.y }));
  await page.screenshot({ path: `${OUT}/r10-${vp.width}x${vp.height}.png` });
}

check('zero page/console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== ROBOT VERIFICATION: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
