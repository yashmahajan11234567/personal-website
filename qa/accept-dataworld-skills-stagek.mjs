/** Stage K acceptance — Skills chapter real-artwork integration.
 *  Pipe travel auto-triggers on walk-in (audit §4), so navigation = hold a
 *  direction key until the probe reports the destination chapter settled.
 *  Run: node qa/accept-dataworld-skills-stagek.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-stagek';
mkdirSync(OUT, { recursive: true });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const EXPECTED_PHASES = ['approach','activate','entering','occluded','conduit','blackout','build','position','reveal','emerging','settle','idle'];
const SKILL_IDS = ['sql','python','excel','power-bi','tableau','streamlit'];
const EXPECTED_STATION_X = { sql: 440, python: 570, excel: 700, 'power-bi': 830, tableau: 960, streamlit: 1090 };

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });

async function newPage(viewport, reducedMotion = 'no-preference') {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => page.errs.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') page.errs.push(m.text().slice(0, 200)); });
  await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(4500);
  await page.keyboard.press('Enter'); // dismiss entry plate
  await page.waitForTimeout(400);
  return page;
}
const P = (page) => page.evaluate(() => window.__worldProbe());

/** Hold a direction key until the world probe reports `expectChapter` settled. */
async function travel(page, dir, expectChapter, timeoutMs = 45000) {
  const key = dir > 0 ? 'd' : 'a';
  await page.keyboard.down(key);
  const t0 = Date.now();
  let p = await P(page);
  let holding = true;
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(200);
    p = await P(page);
    // On LEFTWARD legs release the key the moment the ride starts: the transport
    // is self-driving, and holding 'a' through arrival would overshoot the spawn
    // leftward into the skills return-portal trigger zone (38..82). Rightward
    // legs keep holding through arrival (overshoot is away from that zone and
    // preserves the camera look-ahead the mobile portal-visibility check reads).
    if (holding && dir < 0 && p.travelling) {
      await page.keyboard.up(key);
      holding = false;
    }
    if (!p.travelling && !p.locked && p.chapter === expectChapter) break;
  }
  if (holding) await page.keyboard.up(key);
  await page.waitForTimeout(600);
  p = await P(page);
  const phases = await page.evaluate(() => (window.__worldScene.transportPhases ?? []).slice(-12));
  return { probe: p, phases };
}

/** Walk to a world x (direction-aware), stopping when within 12px. */
async function walkTo(page, targetX, timeoutMs = 30000) {
  let p = await P(page);
  const dir = p.x < targetX - 12 ? 1 : p.x > targetX + 12 ? -1 : 0;
  if (dir === 0) return p;
  const key = dir > 0 ? 'd' : 'a';
  await page.keyboard.down(key);
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(150);
    p = await P(page);
    if (p.travelling) continue;
    if ((dir > 0 && p.x >= targetX - 12) || (dir < 0 && p.x <= targetX + 12)) break;
  }
  await page.keyboard.up(key);
  await page.waitForTimeout(250);
  return P(page);
}

const inventory = (page) => page.evaluate(() => {
  const s = window.__worldScene;
  const list = s.children.list.map((o) => ({
    type: o.type,
    key: o.texture ? o.texture.key : (o.name || null),
    x: Math.round(o.x * 100) / 100, y: Math.round(o.y * 100) / 100,
    ox: o.originX ?? 0, oy: o.originY ?? 0,
    w: Math.round(o.displayWidth * 100) / 100, h: Math.round(o.displayHeight * 100) / 100,
    depth: o.depth, visible: o.visible,
    playing: o.anims ? o.anims.isPlaying : undefined,
    frameIndex: o.anims?.currentFrame ? o.anims.currentFrame.index : undefined,
  }));
  const textures = Object.keys(s.textures.list);
  const pipes = Array.from(s.pipeSkins.entries()).map(([id, b]) => ({ id, mouthVisible: b.mouth.visible }));
  const anims = {};
  for (const k of ['skills-portal-return-anim', 'skills-portal-forward-anim']) {
    const a = s.anims.get(k);
    anims[k] = a ? { frameRate: a.frameRate, frames: a.frames.length, repeat: a.repeat } : null;
  }
  return { list, textures, pipes, anims, reducedMotion: s.reducedMotion };
});
const left = (o) => o.x - o.w * (o.ox ?? 0);

// ================= desktop pass =================
{
  const page = await newPage({ width: 1440, height: 900 });
  const t1 = await travel(page, 1, 'skills');
  check('cliff->skills walk-in: 12 phases in order', JSON.stringify(t1.phases) === JSON.stringify(EXPECTED_PHASES), t1.phases.join(','));
  let p = t1.probe;
  check('arrived in skills near spawn, grounded', p.chapter === 'skills' && p.x < 400 && p.grounded, `ch=${p.chapter} x=${Math.round(p.x)} grounded=${p.grounded}`);
  check('world 1500x900, 6 stations', p.worldWidth === 1500 && p.worldHeight === 900 && p.stationCount === 6, `${p.worldWidth}x${p.worldHeight} st=${p.stationCount} pipes=${p.pipeCount} (pipeSkins accumulates across chapters — pre-existing)`);
  await page.screenshot({ path: `${OUT}/k-skills-arrival-1440.png` });

  const inv = await inventory(page);
  const needTex = [];
  for (let i = 0; i < 8; i++) needTex.push(`skills-portal-return-f${i}`, `skills-portal-forward-f${i}`);
  for (const id of SKILL_IDS) needTex.push(`skills-station-${id}`, `skills-station-${id}-lit`);
  for (const pc of ['ground-left','ground-mid','ground-mid-alt','ground-right','util-vent','util-support','util-pipe-v','util-pipe-h']) needTex.push(`skills-${pc}`);
  const missing = needTex.filter((k) => !inv.textures.includes(k));
  check('all 36 skills texture keys registered', missing.length === 0, missing.join(',') || 'ok');
  const retired = ['skills-elevated-a','skills-elevated-b','skills-elevated-wide','skills-util-ladder'];
  check('retired correction-pass textures not registered', retired.every((k) => !inv.textures.includes(k)), retired.filter((k) => inv.textures.includes(k)).join(',') || 'none');
  const gone = [];
  for (const k of retired) {
    // vite preview SPA-fallback returns 200+HTML for missing files, so test the PNG magic bytes
    const isPng = await page.evaluate(async (u) => {
      const b = new Uint8Array(await (await fetch(u)).arrayBuffer());
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    }, `/assets/data-world/${k}.png`);
    if (isPng) gone.push(k);
  }
  check('retired PNG files removed from public/ (not served as PNG)', gone.length === 0, gone.join(',') || 'all gone');
  check('no procedural station-skill canvas textures in skills', !inv.textures.some((k) => k.startsWith('station-skill-')), inv.textures.filter((k) => k.startsWith('station-skill-')).join(',') || 'none');

  const ground = inv.list.filter((o) => o.key && o.key.startsWith('skills-ground-') && o.visible);
  check('4 ground tiles visible at depth 2', ground.length === 4 && ground.every((o) => o.depth === 2), ground.map((o) => `${o.key.replace('skills-ground-','')}@${Math.round(left(o))}..${Math.round(left(o) + o.w)}`).join(' '));
  check('ground spans 0..1500, top at y=560', ground.length === 4 && Math.abs(left(ground[0])) < 1 && Math.abs(left(ground[3]) + ground[3].w - 1500) < 1 && Math.abs(ground[0].y - 560) < 1, '');
  check('no floating ledge artwork or platform bodies in skills (correction)', !inv.list.some((o) => o.key && o.key.startsWith('skills-elevated') && o.visible) && (await page.evaluate(() => window.__worldScene.world.platforms.length)) === 0, `elevated visible=${inv.list.filter((o) => o.key?.startsWith('skills-elevated')).length}`);
  const utils = inv.list.filter((o) => o.key && o.key.startsWith('skills-util-') && o.visible);
  check('4 utility props at depth 2, ladder removed (correction)', utils.length === 4 && utils.every((o) => o.depth === 2) && !utils.some((o) => o.key === 'skills-util-ladder'), utils.map((o) => o.key.replace('skills-util-','')).join(','));

  const ret = inv.list.find((o) => o.depth === 3 && o.key && o.key.startsWith('skills-portal-return'));
  const fwd = inv.list.find((o) => o.depth === 3 && o.key && o.key.startsWith('skills-portal-forward'));
  check('return portal spans x 0..165, visible bottom at y=563 (560+pad+overlap)', !!ret && Math.abs(left(ret) - 0) < 1 && Math.abs(ret.w - 165) < 1 && Math.abs(ret.y - (560 + (5 / 288) * ret.h + 3)) < 0.6 && ret.depth === 3, ret ? `left=${left(ret)} w=${ret.w} y=${ret.y}` : 'missing');
  check('forward portal spans 1260..1440 centred on 1350, visible bottom at y=563', !!fwd && Math.abs(left(fwd) - 1260) < 1 && Math.abs(fwd.w - 180) < 1 && Math.abs(fwd.y - (560 + (5 / 288) * fwd.h + 3)) < 0.6, fwd ? `left=${left(fwd)} w=${fwd.w} y=${fwd.y} centre=${left(fwd) + fwd.w / 2}` : 'missing');
  check('no visible object extends left of world x=0', inv.list.every((o) => !o.visible || left(o) >= -0.5), inv.list.filter((o) => o.visible && left(o) < -0.5).map((o) => `${o.key}@${left(o).toFixed(1)}`).join(',') || 'none');
  check('portal anims: 8 frames @10fps, repeat -1', inv.anims['skills-portal-return-anim']?.frames === 8 && inv.anims['skills-portal-return-anim']?.frameRate === 10 && inv.anims['skills-portal-return-anim']?.repeat === -1 && inv.anims['skills-portal-forward-anim']?.frames === 8 && inv.anims['skills-portal-forward-anim']?.frameRate === 10, JSON.stringify(inv.anims));
  const f1 = ret?.frameIndex;
  await page.waitForTimeout(500);
  const inv2 = await inventory(page);
  const ret2 = inv2.list.find((o) => o.depth === 3 && o.key && o.key.startsWith('skills-portal-return'));
  check('return portal animating (playing, frame advances)', ret?.playing === true && ret2 && ret2.frameIndex !== f1, `f${f1}->f${ret2?.frameIndex} playing=${ret?.playing}`);

  const stKeys = inv.list.filter((o) => o.depth === 6 && o.key && /^skills-station-(.+?)(-lit)?$/.test(o.key));
  const stIds = [...new Set(stKeys.map((o) => o.key.replace('skills-station-', '').replace('-lit', '')))];
  check('6 station sprites on PNG keys (idle or lit)', stIds.length === 6 && SKILL_IDS.every((id) => stIds.includes(id)), stIds.join(','));
  check('station x positions + 96x104 display rect (hitbox unchanged)', stKeys.every((o) => Math.abs(o.x - EXPECTED_STATION_X[o.key.replace('skills-station-', '').replace('-lit', '')]) < 1 && Math.abs(o.w - 96) < 1 && Math.abs(o.h - 104) < 1), '');
  // Transparent px below the object inside each 362px sheet cell, measured from PNG alpha
  const IDLE_PAD = { sql: 38, python: 36, excel: 38, 'power-bi': 38, tableau: 38, streamlit: 33 };
  const LIT_PAD = { sql: 33, python: 33, excel: 32, 'power-bi': 33, tableau: 32, streamlit: 31 };
  check('all 6 stations grounded: visible bottom exactly at y=560 (correction)',
    stKeys.length === 6 && stKeys.every((o) => {
      const id = o.key.replace('skills-station-', '').replace('-lit', '');
      const pad = o.key.endsWith('-lit') ? LIT_PAD[id] : IDLE_PAD[id];
      return pad !== undefined && Math.abs(o.y - (560 + (pad / 362) * 104 + 3)) < 0.6;
    }), stKeys.map((o) => `${o.key}:y=${o.y?.toFixed(1)}`).join(' '));
  const gDepths = inv.list.filter((o) => o.key && o.key.startsWith('skills-ground-') && o.visible).map((o) => o.depth);
  check('depth order: platform tiles (2) < portals (3) < stations (6) — foreground in front of platform', gDepths.length === 4 && gDepths.every((d) => d === 2) && ret.depth === 3 && stKeys.every((o) => o.depth === 6), `ground=[${gDepths}] portal=${ret.depth} stations=${[...new Set(stKeys.map((o) => o.depth))]}`);
  check('no SKILLS chapter label drawn over the return portal (correction)', !inv.list.some((o) => o.visible && !!o.key && o.key.includes('chapter-skills')), inv.list.filter((o) => o.key?.includes('chapter')).map((o) => `${o.key}:${o.visible}`).join(',') || 'none');
  const skPipes = inv.pipes.filter((x) => x.id.startsWith('skills-'));
  check('both skills pipe containers hidden (portals replace them)', skPipes.length === 2 && skPipes.every((x) => !x.mouthVisible), JSON.stringify(skPipes));
  check('foundation-probe gem absent in skills', !inv.list.some((o) => o.key === 'gem' && o.visible), '');

  // --- station lit swap + InfoPanel at sql (x=440) ---
  p = await walkTo(page, 440);
  check('proximity lights sql station', p.focusedStationId === 'sql' && p.stationLit, `focused=${p.focusedStationId} x=${Math.round(p.x)}`);
  let invS = await inventory(page);
  check('sql sprite swapped to -lit texture and still grounded', invS.list.some((o) => o.depth === 6 && o.key === 'skills-station-sql-lit' && Math.abs(o.y - (560 + (33 / 362) * 104 + 3)) < 0.6), invS.list.filter((o) => o.key === 'skills-station-sql-lit').map((o) => `y=${o.y?.toFixed(1)}`).join(''));
  await page.screenshot({ path: `${OUT}/k-station-sql-lit.png` });
  await page.keyboard.down('Enter');
  await page.waitForTimeout(350);
  await page.keyboard.up('Enter');
  try {
    await page.waitForFunction(() => window.__worldProbe().panelOpen === true, null, { timeout: 4000 });
  } catch { /* fall through to the check below */ }
  p = await P(page);
  const inter = await page.evaluate(() => document.querySelector('[data-testid="world-interaction"]')?.textContent ?? null);
  check('Enter opens InfoPanel for sql', p.panelOpen === true && !!inter && inter.toLowerCase().includes('sql'), `panelOpen=${p.panelOpen} interaction=${inter}`);
  await page.screenshot({ path: `${OUT}/k-infopanel-sql.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  p = await P(page);
  check('Escape closes panel', p.panelOpen === false, `panelOpen=${p.panelOpen}`);
  p = await walkTo(page, 200); // out of range of every station (nearest sql at 440, range 132)
  invS = await inventory(page);
  check('leaving range restores idle textures', invS.list.some((o) => o.depth === 6 && o.key === 'skills-station-sql') && !invS.list.some((o) => o.depth === 6 && o.key.endsWith('-lit')), invS.list.filter((o) => o.depth === 6).map((o) => o.key).join(','));

  // --- every skill station: proximity focus + Enter opens ITS InfoPanel ---
  for (const id of SKILL_IDS) {
    const x = EXPECTED_STATION_X[id];
    p = await walkTo(page, x);
    const focusedOk = p.focusedStationId === id && p.stationLit;
    await page.keyboard.down('Enter');
    await page.waitForTimeout(350);
    await page.keyboard.up('Enter');
    try { await page.waitForFunction(() => window.__worldProbe().panelOpen === true, null, { timeout: 4000 }); } catch { /* checked below */ }
    const p2 = await P(page);
    const txt = await page.evaluate(() => document.querySelector('[data-testid="world-interaction"]')?.textContent ?? '');
    check(`station ${id}: proximity focus + Enter opens its InfoPanel`, focusedOk && p2.panelOpen === true && txt.toLowerCase().includes(id), `focused=${p.focusedStationId} panelOpen=${p2.panelOpen} "${txt}"`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }

  // --- skills -> projects (walk into exit portal at 1350) ---
  await page.screenshot({ path: `${OUT}/k-skills-mid.png` });
  const t2 = await travel(page, 1, 'projects');
  check('skills->projects: 12 phases, arrived projects', JSON.stringify(t2.phases) === JSON.stringify(EXPECTED_PHASES) && t2.probe.chapter === 'projects', `${t2.probe.chapter} phases=${t2.phases.join(',')}`);
  await page.screenshot({ path: `${OUT}/k-projects-arrival.png` });

  // --- projects -> skills (walk left into entry at 60) ---
  const t3 = await travel(page, -1, 'skills');
  check('projects->skills reverse: 12 phases', JSON.stringify(t3.phases) === JSON.stringify(EXPECTED_PHASES) && t3.probe.chapter === 'skills', `${t3.probe.chapter}`);

  // --- skills -> cliff via return portal (walk LEFT into the trigger at x=60,
  //      whose zone 38..82 sits inside the visible portal opening ~31.5..141) ---
  const t4 = await travel(page, -1, 'cliff');
  check('skills->cliff via return portal: 12 phases', JSON.stringify(t4.phases) === JSON.stringify(EXPECTED_PHASES) && t4.probe.chapter === 'cliff', `${t4.probe.chapter}`);
  const cliffInv = await inventory(page);
  check('gem present on cliff (regression)', cliffInv.list.some((o) => o.key === 'gem' && o.visible), '');
  check('cliff pipe containers still hidden by surface artwork', cliffInv.pipes.filter((x) => x.id.startsWith('cliff-')).every((x) => !x.mouthVisible), JSON.stringify(cliffInv.pipes.filter((x) => x.id.startsWith('cliff-'))));
  check('surface artwork textures + images intact on cliff', ['surface-platform', 'surface-entry', 'surface-skills-portal'].every((k) => cliffInv.textures.includes(k)) && cliffInv.list.filter((o) => ['surface-platform', 'surface-entry', 'surface-skills-portal'].includes(o.key) && o.visible).length === 3, cliffInv.list.filter((o) => o.key && o.key.startsWith('surface-')).map((o) => `${o.key}:${o.visible}`).join(' '));
  await page.screenshot({ path: `${OUT}/k-cliff-after-return.png` });

  // --- cliff -> skills again (repeat transition) ---
  const t5 = await travel(page, 1, 'skills');
  check('cliff->skills again after round trip: 12 phases', JSON.stringify(t5.phases) === JSON.stringify(EXPECTED_PHASES) && t5.probe.chapter === 'skills', t5.probe.chapter);
  const inv3 = await inventory(page);
  check('skills pipes hidden again after re-arrival; portals present', inv3.pipes.filter((x) => x.id.startsWith('skills-')).every((x) => !x.mouthVisible) && inv3.list.filter((o) => o.depth === 3 && o.key?.startsWith('skills-portal-')).length === 2, '');
  await page.screenshot({ path: `${OUT}/k-skills-rearrival-1440.png` });

  check('zero pageerrors on desktop pass', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

// ================= reduced motion =================
{
  const page = await newPage({ width: 1440, height: 900 }, 'reduce');
  await travel(page, 1, 'skills');
  const inv = await inventory(page);
  check('reducedMotion flag true in scene', inv.reducedMotion === true, String(inv.reducedMotion));
  const ret = inv.list.find((o) => o.depth === 3 && o.key && o.key.startsWith('skills-portal-return'));
  const fwd = inv.list.find((o) => o.depth === 3 && o.key && o.key.startsWith('skills-portal-forward'));
  check('portals frozen on frame 0 under reduced motion', ret?.playing === false && ret?.key === 'skills-portal-return-f0' && fwd?.playing === false && fwd?.key === 'skills-portal-forward-f0',
    `ret=${ret?.key} playing=${ret?.playing} | fwd=${fwd?.key} playing=${fwd?.playing}`);
  await page.screenshot({ path: `${OUT}/k-skills-reduced-motion.png` });
  check('zero pageerrors (reduced motion)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

// ================= responsive arrivals =================
for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  const page = await newPage(vp);
  const t = await travel(page, 1, 'skills');
  // Let the look-ahead camera settle before measuring: with the player stationary
  // at spawn 90, wantedX = 90 - viewW/2 < 0 at every QA viewport, so scrollX -> 0.
  // Without this the arrival-window check measures the easing frame (scrollX ~35 at 390px).
  await page.waitForFunction(() => (window.__worldProbe()?.camScrollX ?? 1) <= 0.5, null, { timeout: 8000 }).catch(() => {});
  const p = await P(page);
  const groundRatio = (560 - p.camScrollY) / p.camViewHeight;
  check(`[${vp.width}x${vp.height}] zoom 2, ground line at 90%±1%`, p.camZoom === 2 && Math.abs(groundRatio - 0.9) <= 0.01, `zoom=${p.camZoom} ground=${groundRatio.toFixed(3)} scrollX=${Math.round(p.camScrollX)} scrollY=${Math.round(p.camScrollY)}`);
  const inv = await inventory(page);
  const ret = inv.list.find((o) => o.depth === 3 && o.key && o.key.startsWith('skills-portal-return'));
  const viewW = vp.width / p.camZoom;
  await page.screenshot({ path: `${OUT}/k-arrival-${vp.width}x${vp.height}.png` });
  // The meaningful moment is the FIRE moment, not the arrival frame: on arrival the
  // look-ahead camera can be shifted right (measured scrollX ~40 at 390px with the
  // player at x~138), which would cut a portal anchored at the world's left edge.
  // Walk left until the transport fires and capture the probe at that instant.
  await page.keyboard.down('a');
  let fire = null;
  for (let i = 0; i < 150 && !fire; i++) {
    await page.waitForTimeout(100);
    const q = await P(page);
    if (q.travelling) fire = q;
  }
  await page.keyboard.up('a');
  // Glowing opening inside the 220px source frame spans x 42..188, opaque art 11..218 (measured from PNG alpha).
  const opaqueL = left(ret) + (11 / 220) * ret.w;
  const openingL = left(ret) + (42 / 220) * ret.w;
  const openingR = left(ret) + (188 / 220) * ret.w;
  const fireScrollX = fire ? fire.camScrollX : p.camScrollX;
  check(`[${vp.width}x${vp.height}] return portal FULLY visible at the fire moment, fire zone inside the glowing opening`,
    !!ret && !!fire && opaqueL >= fireScrollX - 0.5 && left(ret) + ret.w <= fireScrollX + viewW + 0.5 && fire.x >= openingL - 0.5 && fire.x <= openingR + 0.5 && fire.x >= 38 - 0.5 && fire.x <= 82 + 0.5,
    `portal ${ret ? `${left(ret).toFixed(0)}..${(left(ret) + ret.w).toFixed(0)}` : '?'} opaque ${opaqueL.toFixed(0)} opening ${openingL.toFixed(0)}..${openingR.toFixed(0)} fire.x=${fire ? fire.x.toFixed(1) : '?'} window ${fireScrollX.toFixed(0)}..${(fireScrollX + viewW).toFixed(0)}`);
  check(`[${vp.width}x${vp.height}] zero pageerrors`, page.errs.length === 0, page.errs.slice(0, 2).join(' | '));
  await page.context().close();
}

// ================= pixel acceptance: every foreground base touches the floor line =================
// Videos hidden so the transparent canvas region shows the dark page background;
// then the saved screenshots are verified pixel-wise by qa script (manifest below):
// at each object's world x, the rows just ABOVE the floor line (world y 559) must be
// object pixels (bright), while empty control columns at the same rows stay dark.
{
  const manifest = { captures: [] };
  const hideVideo = (page) => page.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => { v.style.display = 'none'; });
  });

  // desktop close-up 1: return portal + robot + first stations (arrival window 0..720)
  {
    const page = await newPage({ width: 1440, height: 900 });
    await travel(page, 1, 'skills');
    await walkTo(page, 350); // robot onto open ground, clear of the portal art
    await hideVideo(page);
    await page.waitForTimeout(250);
    const p = await P(page);
    check('robot stands on the floor plane (grounded, y=560)', p.grounded === true && Math.abs(p.y - 560) < 2, `grounded=${p.grounded} x=${Math.round(p.x)} y=${p.y}`);
    await page.screenshot({ path: `${OUT}/k-pixel-left-1440.png` });
    manifest.captures.push({ file: `${OUT}/k-pixel-left-1440.png`, scrollX: p.camScrollX, scrollY: p.camScrollY, zoom: p.camZoom, objects: [{ x: 146, kind: 'return-portal' }, { x: Math.round(p.x), kind: 'robot' }, { x: 440, kind: 'sql' }, { x: 570, kind: 'python' }, { x: 700, kind: 'excel' }], controls: [310, 400] });
    check('zero pageerrors (pixel pass left)', page.errs.length === 0, page.errs.slice(0, 2).join(' | '));
    await page.context().close();
  }
  // desktop close-up 2: last stations + forward portal
  {
    const page = await newPage({ width: 1440, height: 900 });
    await travel(page, 1, 'skills');
    await walkTo(page, 1120);
    await hideVideo(page);
    await page.waitForTimeout(250);
    const p = await P(page);
    await page.screenshot({ path: `${OUT}/k-pixel-right-1440.png` });
    manifest.captures.push({ file: `${OUT}/k-pixel-right-1440.png`, scrollX: p.camScrollX, scrollY: p.camScrollY, zoom: p.camZoom, objects: [{ x: 830, kind: 'power-bi' }, { x: 960, kind: 'tableau' }, { x: 1090, kind: 'streamlit' }, { x: 1350, kind: 'forward-portal' }, { x: Math.round(p.x), kind: 'robot' }], controls: [1200, 1420] });
    check('zero pageerrors (pixel pass right)', page.errs.length === 0, page.errs.slice(0, 2).join(' | '));
    await page.context().close();
  }
  // mobile close-up: return portal fully in window
  {
    const page = await newPage({ width: 390, height: 844 });
    await travel(page, 1, 'skills');
    await hideVideo(page);
    await page.waitForTimeout(250);
    const p = await P(page);
    await page.screenshot({ path: `${OUT}/k-pixel-mobile-390.png` });
    manifest.captures.push({ file: `${OUT}/k-pixel-mobile-390.png`, scrollX: p.camScrollX, scrollY: p.camScrollY, zoom: p.camZoom, objects: [{ x: 146, kind: 'return-portal' }, { x: Math.round(p.x), kind: 'robot' }], controls: [300] });
    check('zero pageerrors (pixel pass mobile)', page.errs.length === 0, page.errs.slice(0, 2).join(' | '));
    await page.context().close();
  }
  const { writeFileSync } = await import('fs');
  writeFileSync(`${OUT}/k-pixel-manifest.json`, JSON.stringify(manifest, null, 1));
  check('pixel-acceptance captures + manifest written', manifest.captures.length === 3, manifest.captures.map((c) => c.file).join(','));
}

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n==== Stage K: ${results.length - fails.length}/${results.length} PASS ====`);
process.exit(fails.length ? 1 : 0);
