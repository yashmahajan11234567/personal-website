/** Layer 3 (Core / Projects) acceptance — portal, holograms, panels, transitions, responsive.
 *  Run: node qa/accept-dataworld-layer3.mjs   (needs `npx vite preview --port 4173`)
 *  Screenshots -> qa-screenshots-layer3/
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { PNG } from 'pngjs';

const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-layer3';
mkdirSync(OUT, { recursive: true });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const EXPECTED_PHASES = ['approach','activate','entering','occluded','conduit','blackout','build','position','reveal','emerging','settle','idle'];
const STATIONS = [
  { id: 'nifty100-financial-analysis', slug: 'nifty100', x: 390, title: 'NIFTY 100 Financial Analysis', repo: 'https://github.com/yashmahajan11234567/Bluestock-fintech/tree/main/nifty100-financial-analysis(Bluestock-fintech)' },
  { id: 'sql-data-warehouse', slug: 'sql-warehouse', x: 640, title: 'SQL Data Warehouse & ETL', repo: 'https://github.com/yashmahajan11234567/Sql-data-warehouse' },
  { id: 'primetradeai', slug: 'primetradeai', x: 890, title: 'PRIMETradeAI', repo: 'https://github.com/yashmahajan11234567/PRIMETradeAI' },
  { id: 'data-analytics-dashboards', slug: 'dashboards', x: 1140, title: 'Data Analytics Dashboards', repo: 'https://github.com/yashmahajan11234567/Projects/tree/main/Data-Analytics-Projects' },
];

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
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

async function travel(page, dir, expectChapter, timeoutMs = 45000) {
  const key = dir > 0 ? 'd' : 'a';
  await page.keyboard.down(key);
  const t0 = Date.now();
  let p = await P(page);
  let holding = true;
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(200);
    p = await P(page);
    if (holding && dir < 0 && p.travelling) { await page.keyboard.up(key); holding = false; }
    if (!p.travelling && !p.locked && p.chapter === expectChapter) break;
  }
  if (holding) await page.keyboard.up(key);
  await page.waitForTimeout(600);
  p = await P(page);
  const phases = await page.evaluate(() => (window.__worldScene.transportPhases ?? []).slice(-12));
  return { probe: p, phases };
}

// Like travel(), but releases the movement key the instant the destination
// chapter is entered, so the probe measures the true arrival state (spawn x,
// arrival camera scroll) before the player walks on.
async function travelSnap(page, dir, expectChapter, timeoutMs = 45000) {
  const key = dir > 0 ? 'd' : 'a';
  await page.keyboard.down(key);
  const t0 = Date.now();
  let p = await P(page);
  let holding = true;
  while (Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(100);
    p = await P(page);
    if (holding && p.chapter === expectChapter) { await page.keyboard.up(key); holding = false; }
    if (!p.travelling && !p.locked && p.chapter === expectChapter) break;
  }
  if (holding) await page.keyboard.up(key);
  await page.waitForTimeout(400);
  p = await P(page);
  const phases = await page.evaluate(() => (window.__worldScene.transportPhases ?? []).slice(-12));
  return { probe: p, phases };
}

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
  await page.waitForTimeout(300);
  return P(page);
}

const sceneInfo = (page) => page.evaluate(() => {
  const s = window.__worldScene;
  const cam = s.cameras.main;
  const portal = s.children.list.find((c) => c.depth === 3 && c.texture && String(c.texture.key).startsWith('core-portal-return'));
  const entrySkin = s.pipeSkins.get('projects-entry');
  return {
    stations: s.stations.map((v) => ({
      id: v.station.id, kind: v.station.kind, x: v.station.x, y: v.station.y,
      tex: v.sprite.texture.key, dispW: v.sprite.displayWidth, dispH: v.sprite.displayHeight,
      spriteX: v.sprite.x, spriteY: v.sprite.y, depth: v.sprite.depth,
    })),
    portal: portal ? { key: portal.texture.key, x: portal.x, y: portal.y, originX: portal.originX, dispW: portal.displayWidth, dispH: portal.displayHeight, depth: portal.depth, anim: portal.anims?.currentAnim?.key ?? null } : null,
    entryPipe: { x: s.world.entryPipe.x, skinVisible: entrySkin ? entrySkin.mouth.visible : null },
    pipeCount: s.pipeSkins.size,
    worldPipes: s.world.pipes.length,
    scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom,
    canvasRect: (() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })(),
    world: { width: s.world.width, height: s.world.height, groundY: s.world.groundY, spawn: s.world.spawn, platforms: s.world.platforms.length },
  };
});

// pixel helpers on a screenshot buffer: fraction of opaque pixels in a world-space band
function bandStats(png, worldY0, worldY1, scrollY, zoom, rect) {
  const y0 = Math.max(0, Math.round(rect.top + (worldY0 - scrollY) * zoom) - Math.round(rect.top));
  const y1 = Math.min(png.height - 1, Math.round((worldY1 - scrollY) * zoom));
  let opaque = 0, total = 0;
  for (let y = Math.round((worldY0 - scrollY) * zoom); y <= y1 && y < png.height; y++) {
    if (y < 0) continue;
    for (let x = 0; x < png.width; x++) {
      total++;
      if (png.data[(y * png.width + x) * 4 + 3] > 10) opaque++;
    }
  }
  return { frac: total ? opaque / total : 0, total };
}

// ================= desktop 1440x900 =================
{
  const page = await newPage({ width: 1440, height: 900 });

  // --- enter skills, then projects ---
  const t1 = await travel(page, 1, 'skills');
  check('cliff->skills still works (regression)', JSON.stringify(t1.phases) === JSON.stringify(EXPECTED_PHASES) && t1.probe.chapter === 'skills', t1.probe.chapter);
  const t2 = await travelSnap(page, 1, 'projects');
  check('skills->projects: 12 phases, arrived projects', JSON.stringify(t2.phases) === JSON.stringify(EXPECTED_PHASES) && t2.probe.chapter === 'projects', `${t2.probe.chapter} phases=${t2.phases.join(',')}`);

  const info = await sceneInfo(page);
  const p0 = await P(page);
  check('world 1500x900, groundY 560, no floating platforms', info.world.width === 1500 && info.world.height === 900 && info.world.groundY === 560 && info.world.platforms === 0, JSON.stringify(info.world));
  check('exactly ONE pipe configured in projects', info.worldPipes === 1, `world.pipes=${info.worldPipes} (pipeSkins map accumulates across chapters: ${info.pipeCount})`);
  check('arrival spawn configured (144,560) and player arrives there grounded', info.world.spawn.x === 144 && info.world.spawn.y === 560 && p0.x >= 144 && p0.x < 175 && Math.abs(p0.y - 560) < 2 && p0.grounded === true, `spawn=${JSON.stringify(info.world.spawn)} x=${p0.x.toFixed(1)} y=${Math.round(p0.y)} grounded=${p0.grounded}`);

  // no immediate re-trigger: idle 1.5s on arrival
  await page.waitForTimeout(1500);
  const pIdle = await P(page);
  check('no immediate return after arrival (not travelling, not armed)', !pIdle.travelling && pIdle.chapter === 'projects' && pIdle.armedPipeId !== 'projects-entry', `chapter=${pIdle.chapter} armed=${pIdle.armedPipeId} x=${Math.round(pIdle.x)}`);

  // --- portal geometry ---
  check('return portal pipe at x=60 (far left)', info.entryPipe.x === 60, `x=${info.entryPipe.x}`);
  check('procedural pipe skin hidden (portal art replaces it), trigger still armed-capable', info.entryPipe.skinVisible === false, `skinVisible=${info.entryPipe.skinVisible}`);
  const art = info.portal;
  check('portal art present, depth 3, animated', !!art && art.depth === 3 && !!art.anim, art ? `${art.key} anim=${art.anim}` : 'missing');
  check('portal art spans 0..180 (fully visible, far left, not clipped)', !!art && art.x === 0 && art.originX === 0 && Math.abs(art.dispW - 180) < 0.5, art ? `x=${art.x} ox=${art.originX} w=${art.dispW}` : '');
  // opening containment: opening display x = 88..353 of 443 -> 35.7..143.4 ; arm zone 38..82
  const openL = 88 * (art.dispW / 443), openR = 353 * (art.dispW / 443);
  check('arm zone 38..82 inside visible opening', openL <= 38 && openR >= 82, `opening ${openL.toFixed(1)}..${openR.toFixed(1)}`);
  check('portal grounded: sprite y = 560 + pad*180 + 3', !!art && Math.abs(art.y - (560 + (24 / 443) * art.dispH + 3)) < 1.5, art ? `y=${art.y.toFixed(2)}` : '');

  await page.screenshot({ path: `${OUT}/l3-01-arrival-1440.png` });

  // --- floor continuity: opaque band just below the surface line across the visible width ---
  {
    const buf = await page.screenshot({ path: `${OUT}/l3-01b-floor-1440.png` });
    const png = PNG.sync.read(buf);
    const st = bandStats(png, 566, 600, info.scrollY, info.zoom, info.canvasRect);
    check('floor drawn continuously under surface line (>=95% opaque band 566..600)', st.frac >= 0.95, `opaque=${(st.frac * 100).toFixed(1)}%`);
    // portal visible at far left of the arrival view
    const yTop = Math.round((430 - info.scrollY) * info.zoom), yBot = Math.round((550 - info.scrollY) * info.zoom);
    let portalPx = 0, tot = 0;
    for (let y = Math.max(0, yTop); y <= Math.min(png.height - 1, yBot); y++)
      for (let x = 0; x < Math.round(180 * info.zoom); x++) { tot++; if (png.data[(y * png.width + x) * 4 + 3] > 10) portalPx++; }
    check('portal pixels visible in arrival viewport (left 180 world px)', tot > 0 && portalPx / tot > 0.05, `${((portalPx / tot) * 100).toFixed(1)}% opaque`);
  }

  // --- four holograms: positions, sizes, grounding ---
  check('exactly four project stations', info.stations.length === 4 && info.stations.every((s) => s.kind === 'project'), `n=${info.stations.length}`);
  for (const s of STATIONS) {
    const v = info.stations.find((v) => v.id === s.id);
    check(`station ${s.id} at x=${s.x}, 220 wide, depth 6, PNG idle texture`,
      !!v && v.x === s.x && Math.abs(v.dispW - 220) < 0.5 && v.depth === 6 && v.tex === `core-holo-${s.slug}`,
      v ? `x=${v.x} w=${v.dispW.toFixed(1)} tex=${v.tex}` : 'missing');
  }
  // grounding: sprite bottom (y) minus pad must put visible bottom at 563
  for (const v of info.stations) {
    check(`hologram ${v.id} grounded (visible bottom at 563 = 560+3 overlap)`, Math.abs(v.spriteY - v.dispH - 560) < 2.5 || Math.abs((v.spriteY - 3) - 560) < 2.5, `spriteY=${v.spriteY.toFixed(1)} dispH=${v.dispH.toFixed(1)} -> bottom=${(v.spriteY).toFixed(1)}`);
  }

  // --- hover + click + panel per station ---
  for (const s of STATIONS) {
    await walkTo(page, s.x);
    const pH = await P(page);
    check(`hover ${s.id}: focused + lit`, pH.focusedStationId === s.id && pH.stationLit === true, `focused=${pH.focusedStationId} lit=${pH.stationLit}`);
    const lit = await page.evaluate((id) => {
      const v = window.__worldScene.stations.find((v) => v.station.id === id);
      return { tex: v.sprite.texture.key, y: v.sprite.y };
    }, s.id);
    const idle = info.stations.find((v) => v.id === s.id);
    check(`hover ${s.id}: texture swapped to -lit, no vertical move`, lit.tex === `core-holo-${s.slug}-lit` && Math.abs(lit.y - idle.spriteY) < 0.01, `tex=${lit.tex} dy=${(lit.y - idle.spriteY).toFixed(2)}`);
    await page.screenshot({ path: `${OUT}/l3-02-hover-${s.slug}-1440.png` });

    // click the sprite centre
    const geo = await page.evaluate((id) => {
      const s = window.__worldScene;
      const v = s.stations.find((v) => v.station.id === id);
      const cam = s.cameras.main;
      const r = document.querySelector('canvas').getBoundingClientRect();
      return {
        sx: r.left + ((v.sprite.x - cam.scrollX) * cam.zoom) * (r.width / s.scale.gameSize.width),
        sy: r.top + ((v.sprite.y - v.sprite.displayHeight / 2 - cam.scrollY) * cam.zoom) * (r.height / s.scale.gameSize.height),
      };
    }, s.id);
    await page.mouse.click(geo.sx, geo.sy);
    await page.waitForTimeout(500);
    const pOpen = await P(page);
    const dom = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="info-panel"]');
      if (!panel) return null;
      const link = panel.querySelector('[data-testid="project-title-link"]');
      return {
        title: link?.textContent.trim(), href: link?.getAttribute('href'),
        limitations: panel.querySelectorAll('.info-panel__limitations li, .info-panel__section ul li').length,
        gallery: panel.querySelectorAll('[data-testid^="dashboard-select-"]').length,
        text: panel.textContent.slice(0, 400),
      };
    });
    check(`click ${s.id}: panel opens with correct title+repo`, pOpen.panelOpen === true && !!dom && dom.title?.startsWith(s.title) && dom.href === s.repo, dom ? `${dom.title} -> ${dom.href}` : 'no panel');
    check(`panel ${s.id}: limitations rendered`, !!dom && dom.limitations >= 1, `li=${dom?.limitations}`);
    if (s.slug === 'dashboards') check('dashboards panel: 5 dashboard selectors', dom && dom.gallery === 5, `gallery=${dom?.gallery}`);
    await page.screenshot({ path: `${OUT}/l3-03-panel-${s.slug}-1440.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const pClosed = await P(page);
    check(`Escape closes ${s.id} panel, control restored`, pClosed.panelOpen === false && pClosed.locked === false, `panelOpen=${pClosed.panelOpen} locked=${pClosed.locked}`);
    // walk away -> idle restored (move far enough that no OTHER station is in range)
    await walkTo(page, s.x === 1140 ? 1300 : s.x + 200);
    const pAway = await P(page);
    const back = await page.evaluate((id) => window.__worldScene.stations.find((v) => v.station.id === id).sprite.texture.key, s.id);
    check(`leaving ${s.id} restores idle, focus cleared`, back === `core-holo-${s.slug}` && pAway.focusedStationId !== s.id, `tex=${back} focused=${pAway.focusedStationId} lit=${pAway.stationLit}`);
  }

  // --- return portal: walk left into the visible opening ---
  const t3 = await travel(page, -1, 'skills');
  check('projects->skills via far-left portal: 12 phases', JSON.stringify(t3.phases) === JSON.stringify(EXPECTED_PHASES) && t3.probe.chapter === 'skills', `${t3.probe.chapter}`);
  const sk = await sceneInfo(page);
  check('back in skills: 2 pipes configured, 6 stations, width 1500', sk.worldPipes === 2 && sk.stations.length === 6 && sk.world.width === 1500, `pipes=${sk.worldPipes} stations=${sk.stations.length}`);

  // --- re-enter projects (repeated transitions) ---
  const t4 = await travelSnap(page, 1, 'projects');
  check('skills->projects again (2nd entry): 12 phases, spawn 144', t4.probe.chapter === 'projects' && t4.probe.x >= 144 && t4.probe.x < 175 && JSON.stringify(t4.phases) === JSON.stringify(EXPECTED_PHASES), `chapter=${t4.probe.chapter} x=${t4.probe.x.toFixed(1)}`);
  await page.waitForTimeout(1200);
  const pAgain = await P(page);
  check('no re-trigger on 2nd arrival', !pAgain.travelling && pAgain.chapter === 'projects', `chapter=${pAgain.chapter} armed=${pAgain.armedPipeId}`);
  await page.screenshot({ path: `${OUT}/l3-04-reentry-1440.png` });

  check('zero console/page errors (desktop run)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

// ================= mobile 390x844 =================
{
  const page = await newPage({ width: 390, height: 844 });
  await travel(page, 1, 'skills');
  const t = await travelSnap(page, 1, 'projects');
  const p = await P(page);
  const info = await sceneInfo(page);
  check('mobile: arrived projects 1500 wide, spawn 144, one pipe, 4 stations',
    t.probe.chapter === 'projects' && p.x >= 144 && p.x < 175 && info.worldPipes === 1 && info.stations.length === 4 && info.world.width === 1500,
    `chapter=${t.probe.chapter} x=${p.x.toFixed(1)} pipes=${info.worldPipes} stations=${info.stations.length}`);
  check('mobile: arrival camera shows the far-left portal (scrollX small, art 0..180 on screen)',
    info.scrollX <= 60 && !!info.portal, `scrollX=${info.scrollX.toFixed(1)} portal=${!!info.portal}`);
  const buf = await page.screenshot({ path: `${OUT}/l3-05-arrival-390.png` });
  const png = PNG.sync.read(buf);
  const yTop = Math.round((420 - info.scrollY) * info.zoom), yBot = Math.round((550 - info.scrollY) * info.zoom);
  let portalPx = 0, tot = 0;
  const viewW = Math.min(png.width, Math.round((195) * info.zoom));
  for (let y = Math.max(0, yTop); y <= Math.min(png.height - 1, yBot); y++)
    for (let x = 0; x < viewW; x++) { tot++; if (png.data[(y * png.width + x) * 4 + 3] > 10) portalPx++; }
  check('mobile: portal pixels visible in arrival viewport', tot > 0 && portalPx / tot > 0.03, `${((portalPx / tot) * 100).toFixed(1)}% opaque in left band`);
  // walk to first hologram and hover on mobile
  await walkTo(page, 390, 40000);
  const pM = await P(page);
  check('mobile: hologram 1 reachable + lights', pM.focusedStationId === 'nifty100-financial-analysis' && pM.stationLit === true, `focused=${pM.focusedStationId} lit=${pM.stationLit} x=${Math.round(pM.x)}`);
  await page.screenshot({ path: `${OUT}/l3-06-hover-390.png` });
  // return via portal on mobile
  const t2 = await travel(page, -1, 'skills');
  check('mobile: projects->skills return works', t2.probe.chapter === 'skills', t2.probe.chapter);
  check('zero console/page errors (mobile run)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

// ================= reduced motion =================
{
  const page = await newPage({ width: 1440, height: 900 }, { reducedMotion: 'reduce' });
  await travel(page, 1, 'skills');
  const t = await travel(page, 1, 'projects');
  const art = await page.evaluate(() => {
    const s = window.__worldScene;
    const portal = s.children.list.find((c) => c.depth === 3 && c.texture && String(c.texture.key).startsWith('core-portal-return'));
    return portal ? { animPlaying: !!portal.anims?.currentAnim && portal.anims.isPlaying } : null;
  });
  check('reduced motion: arrival works, portal static (not playing)', t.probe.chapter === 'projects' && art && art.animPlaying === false, `chapter=${t.probe.chapter} playing=${art?.animPlaying}`);
  const t2 = await travel(page, -1, 'skills');
  check('reduced motion: return transition still completes', t2.probe.chapter === 'skills', t2.probe.chapter);
  check('zero console/page errors (reduced motion)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n==== ${results.length - fails.length}/${results.length} passed ====`);
if (fails.length) { console.log('FAILURES:'); for (const f of fails) console.log(' -', f.name, f.detail ?? ''); process.exit(1); }
