/** Phase 3 acceptance — Surface return portal alignment + six redesigned skill cards.
 *  Run: node qa/accept-dataworld-cards-portal.mjs
 *  Covers: portal art/trigger alignment, both portal transitions, all six cards'
 *  content + design invariants, close/back, desktop + mobile, console errors.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-cards';
mkdirSync(OUT, { recursive: true });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const EXPECTED_PHASES = ['approach','activate','entering','occluded','conduit','blackout','build','position','reveal','emerging','settle','idle'];
const SKILLS = [
  { id: 'sql', x: 440, title: 'SQL / T-SQL' },
  { id: 'python', x: 570, title: 'Python / pandas' },
  { id: 'excel', x: 700, title: 'Excel' },
  { id: 'power-bi', x: 830, title: 'Power BI' },
  { id: 'tableau', x: 960, title: 'Tableau' },
  { id: 'streamlit', x: 1090, title: 'Streamlit' },
];

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport });
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
    // Leftward legs release once the ride starts, so arrival cannot overshoot
    // the spawn into the return-portal trigger zone (38..82); rightward legs
    // hold through arrival (overshoot is away from the zone and keeps the
    // camera look-ahead the mobile portal check relies on).
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

const portalArt = (page) => page.evaluate(() => {
  const s = window.__worldScene;
  const o = s.children.list.find((c) => c.depth === 3 && c.texture && c.texture.key.startsWith('skills-portal-return'));
  return o ? { left: o.x - o.originX * o.displayWidth, right: o.x + (1 - o.originX) * o.displayWidth, y: o.y, h: o.displayHeight, ox: o.originX } : null;
});

// ================= desktop: portal alignment + both transitions =================
{
  const page = await newPage({ width: 1440, height: 900 });
  const t1 = await travel(page, 1, 'skills');
  check('surface->skills transition: 12 phases, arrived skills', JSON.stringify(t1.phases) === JSON.stringify(EXPECTED_PHASES) && t1.probe.chapter === 'skills', `${t1.probe.chapter} phases=${t1.phases.join(',')}`);

  const pipe = await page.evaluate(() => ({ x: window.__worldScene.world.entryPipe.x, spawn: window.__worldScene.world.spawn.x }));
  const art = await portalArt(page);
  check('entry trigger at x=60 (recording-verified gameplay position)', pipe.x === 60, `entryPipe.x=${pipe.x}`);
  check('portal art moved LEFT around trigger: art covers the fire zone', !!art && art.left >= 0 && art.left <= pipe.x + 22 && art.right >= pipe.x + 22 && art.right - art.left >= 100, `art ${art.left.toFixed(0)}..${art.right.toFixed(0)} zone ${pipe.x - 22}..${pipe.x + 22}`);
  check('spawn 90 outside trigger zone (no re-trigger on arrival)', pipe.spawn === 90 && (pipe.spawn < pipe.x - 22 || pipe.spawn > pipe.x + 22), `spawn=${pipe.spawn}`);
  const pArrive = await P(page);
  check('not armed at arrival spawn (skills pipe)', pArrive.armedPipeId !== 'skills-entry', `armed=${pArrive.armedPipeId} x=${Math.round(pArrive.x)}`);
  check('portal grounded: bottom edge at 560+pad+3 overlap', !!art && Math.abs(art.y - (560 + 5 * (art.h / 288) + 3)) < 1, `y=${art.y.toFixed(2)} expected=${(560 + 5 * (art.h / 288) + 3).toFixed(2)}`);
  check('portal art fully inside world 0..1500', !!art && art.left >= 0 && art.right <= 1500, `art ${art.left.toFixed(0)}..${art.right.toFixed(0)}`);

  await walkTo(page, 400); // open ground, clear of portal art
  await page.screenshot({ path: `${OUT}/portal-return-1440.png` });

  // skills -> surface: walk LEFT into the trigger inside the visible opening
  const t2 = await travel(page, -1, 'cliff');
  check('skills->surface via corrected portal: 12 phases, arrived cliff', JSON.stringify(t2.phases) === JSON.stringify(EXPECTED_PHASES) && t2.probe.chapter === 'cliff', `${t2.probe.chapter} phases=${t2.phases.join(',')}`);

  // surface -> skills again (round trip)
  const t3 = await travel(page, 1, 'skills');
  check('surface->skills again: 12 phases', JSON.stringify(t3.phases) === JSON.stringify(EXPECTED_PHASES) && t3.probe.chapter === 'skills', t3.probe.chapter);

  // ================= six cards =================
  for (const s of SKILLS) {
    await walkTo(page, s.x);
    await page.keyboard.down('Enter');
    await page.waitForTimeout(350);
    await page.keyboard.up('Enter');
    try { await page.waitForFunction(() => window.__worldProbe().panelOpen === true, null, { timeout: 4000 }); } catch { /* checked below */ }
    const pOpen = await P(page);
    const dom = await page.evaluate(() => {
      const panel = document.querySelector('.info-panel--skill');
      if (!panel) return null;
      const h4s = [...panel.querySelectorAll('h4')].map((h) => h.textContent.trim().toUpperCase());
      const apps = [...panel.querySelectorAll('.info-panel__apps li')].map((li) => ({
        name: li.querySelector('.info-panel__app-name')?.textContent.trim() ?? '',
        contrib: li.querySelector('.info-panel__app-contrib')?.textContent.trim() ?? '',
      }));
      const cs = getComputedStyle(panel);
      const body = panel.querySelector('.info-panel__body');
      body.scrollTop = body.scrollHeight; // scroll to the very bottom
      const last = body.lastElementChild;
      return {
        id: panel.getAttribute('data-panel-id'),
        title: panel.querySelector('.info-panel__title')?.textContent.trim() ?? '',
        h4s,
        appCount: apps.length,
        apps,
        progressbars: panel.querySelectorAll('[role="progressbar"], progress').length,
        // Percentages are banned only as proficiency stats in the card's own
        // sections; dataset facts in removed sections no longer exist.
        ownText: ['.info-panel__title', '.info-panel__body-text', '.info-panel__apps']
          .map((sel) => panel.querySelector(sel)?.textContent ?? '').join(' '),
        factsCount: panel.querySelectorAll('.info-panel__facts').length,
        summaryCount: panel.querySelectorAll('.info-panel__summary').length,
        bannedLabel: /\b(EVIDENCE|REPOSITORIES|EXPERIENCE|DRAWN AS|CONTRIBUTIONS?)\b/i.test(panel.textContent),
        bodyChildren: body.children.length,
        lastIsApps: !!last && last.querySelector('h4')?.textContent.trim().toUpperCase() === 'PROJECT APPLICATION',
        bg: cs.backgroundColor,
        border: cs.borderColor,
        font: cs.fontFamily,
        width: panel.getBoundingClientRect().width,
      };
    });
    const pctInOwnSections = dom ? /\d+\s?%/.test(dom.ownText) : true;
    check(`card ${s.id}: opens own panel (input captured behind card)`, pOpen.panelOpen === true && dom?.id === s.id, `panelOpen=${pOpen.panelOpen} id=${dom?.id}`);
    check(`card ${s.id}: title "${s.title}"`, dom?.title === s.title, `"${dom?.title}"`);
    check(`card ${s.id}: EXACTLY three sections — title + HOW I USED IT + PROJECT APPLICATION`, !!dom && JSON.stringify(dom.h4s) === JSON.stringify(['HOW I USED IT', 'PROJECT APPLICATION']) && dom.bodyChildren === 3 && dom.lastIsApps, `h4s=${JSON.stringify(dom?.h4s)} bodyChildren=${dom?.bodyChildren} lastIsApps=${dom?.lastIsApps}`);
    check(`card ${s.id}: no Experience/Drawn as/Evidence/Repositories/Contributions remain`, !!dom && dom.factsCount === 0 && dom.summaryCount === 0 && !dom.bannedLabel, `facts=${dom?.factsCount} summary=${dom?.summaryCount} banned=${dom?.bannedLabel}`);
    check(`card ${s.id}: applications listed with name+contribution`, !!dom && dom.appCount >= 1 && dom.apps.every((a) => a.name.length > 2 && a.contrib.length > 10), `apps=${dom?.appCount}`);
    check(`card ${s.id}: no progress bars / proficiency percentages`, !!dom && dom.progressbars === 0 && !pctInOwnSections, '');
    check(`card ${s.id}: dark navy cyberpunk bg, glowing cyan border, IBM Plex Mono`, !!dom && dom.bg === 'rgb(4, 15, 35)' && dom.border.includes('34, 211, 238') && dom.font.includes('IBM Plex Mono'), `bg=${dom?.bg} border=${dom?.border} font=${dom?.font?.slice(0, 40)}`);
    check(`card ${s.id}: large centered card (<=720px on 1440 viewport)`, !!dom && dom.width <= 720, `width=${Math.round(dom?.width ?? 0)}`);
    await page.screenshot({ path: `${OUT}/card-${s.id}-1440.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const pClosed = await P(page);
    check(`card ${s.id}: Escape closes, back to gameplay`, pClosed.panelOpen === false && !pClosed.locked, `panelOpen=${pClosed.panelOpen} locked=${pClosed.locked}`);
  }

  // back button path on one card
  await walkTo(page, 1090);
  await page.keyboard.down('Enter');
  await page.waitForTimeout(350);
  await page.keyboard.up('Enter');
  await page.waitForFunction(() => window.__worldProbe().panelOpen === true, null, { timeout: 4000 });
  await page.click('[data-testid="panel-back"]');
  await page.waitForTimeout(500);
  const pBack = await P(page);
  check('BACK button closes panel, returns to gameplay', pBack.panelOpen === false && !pBack.locked, `panelOpen=${pBack.panelOpen}`);

  // movement still functional after all panels
  const x0 = (await P(page)).x;
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const x1 = (await P(page)).x;
  check('robot movement functional after card interactions', x1 > x0 + 20, `x ${Math.round(x0)} -> ${Math.round(x1)}`);

  check('zero pageerrors/console errors (desktop)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

// ================= mobile 390x844 =================
{
  const page = await newPage({ width: 390, height: 844 });
  const t = await travel(page, 1, 'skills');
  const p = t.probe;
  const art = await portalArt(page);
  const viewW = 390 / p.camZoom;
  // The arrival frame can be look-ahead-shifted right (measured scrollX ~45 with the
  // player at x~138), which would cut a portal anchored at the world's left edge.
  // Stand just right of the fire zone and let the camera settle, then measure.
  await walkTo(page, 90);
  await page.waitForTimeout(1200);
  const ps = await P(page);
  const opaqueL = art.left + (11 / 220) * (art.right - art.left); // opaque art starts at src x=11 (PNG alpha)
  check('[390] return portal fully visible with settled camera at the portal', !!art && opaqueL >= ps.camScrollX - 0.5 && art.right <= ps.camScrollX + viewW + 0.5, `art ${art.left.toFixed(0)}..${art.right.toFixed(0)} opaque ${opaqueL.toFixed(0)} window ${ps.camScrollX.toFixed(0)}..${(ps.camScrollX + viewW).toFixed(0)} x=${ps.x.toFixed(0)}`);
  await walkTo(page, 400);
  await page.screenshot({ path: `${OUT}/portal-return-390.png` });

  await walkTo(page, 440);
  await page.keyboard.down('Enter');
  await page.waitForTimeout(350);
  await page.keyboard.up('Enter');
  await page.waitForFunction(() => window.__worldProbe().panelOpen === true, null, { timeout: 4000 });
  const m = await page.evaluate(() => {
    const panel = document.querySelector('.info-panel--skill');
    const body = panel?.querySelector('.info-panel__body');
    const back = panel?.querySelector('[data-testid="panel-back"]');
    const pr = panel.getBoundingClientRect();
    const br = back.getBoundingClientRect();
    return {
      width: pr.width, height: pr.height, vw: innerWidth, vh: innerHeight,
      bodyScrollable: body ? body.scrollHeight >= body.clientHeight : false,
      bodyHasScroll: body ? body.scrollHeight > body.clientHeight : false,
      backVisible: br.top >= 0 && br.bottom <= innerHeight && br.right <= innerWidth,
    };
  });
  check('[390] card constrained to viewport', m.width <= m.vw - 19 && m.height <= m.vh * 0.85, `card ${Math.round(m.width)}x${Math.round(m.height)} vp ${m.vw}x${m.vh}`);
  check('[390] card content scrolls vertically when tall', m.bodyHasScroll === true, `scrollable=${m.bodyScrollable} hasScroll=${m.bodyHasScroll}`);
  check('[390] BACK control visible/accessible', m.backVisible === true, '');
  await page.screenshot({ path: `${OUT}/card-sql-390.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const pc = await P(page);
  check('[390] Escape closes card on mobile', pc.panelOpen === false, '');
  check('zero pageerrors (mobile)', page.errs.length === 0, page.errs.slice(0, 3).join(' | '));
  await page.context().close();
}

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n==== Cards+Portal: ${results.length - fails.length}/${results.length} PASS ====`);
process.exit(fails.length ? 1 : 0);
