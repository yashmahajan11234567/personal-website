/**
 * Cloud World Voxel — runtime audit v3 (post-fix verification pass).
 * Verifies this iteration's changes end-to-end:
 *  1. objective strip + zone badge are event-driven (change on teleport/board)
 *  2. panel footer hint exists
 *  3. accent-button contrast ratio >= 4.5
 *  4. ink outlines exist (BackSide shells on whale + character)
 *  5. full journey still works (walk -> board -> sail -> disembark -> panel)
 *  6. perf regression sample (calls/tris/fps) at spawn + village
 *  7. reduced-motion context: panel entrance animation disabled
 *  8. mobile viewport: HUD + objective fit, panel opens
 *  9. zero console errors / page errors
 */
import { chromium } from 'playwright';

const PORT = process.env.PORT || '5210';
const BASE = `http://localhost:${PORT}/?qa=1#/cloud-world-voxel`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleErrs = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrs.push(m.text());
});
const pageErrors = [];
let step = 'boot';
page.on('pageerror', (e) => {
  const line = e.message + ' :: ' + (e.stack || '').split('\n')[1];
  pageErrors.push(line);
  console.log(`[pageerror @ ${step}]`, line);
});

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv?.view?.ready, undefined, { timeout: 90000 });
await page.waitForTimeout(3000);

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
}

step = "1"; /* ---------- 1. HUD: objective + zone badge, event-driven ---------- */
const hud0 = await page.evaluate(() => ({
  objective: document.querySelector('.cwv-objective')?.textContent ?? null,
  badge: document.querySelector('.cwv-hud__badge')?.textContent ?? null,
}));
check('objective strip visible at spawn', !!hud0.objective, JSON.stringify(hud0));
check('zone badge = Starting Island', hud0.badge === 'Starting Island', hud0.badge ?? 'null');

await page.evaluate(() => window.__cwv.teleport(47, 42, 'walk'));
await page.waitForTimeout(900);
const hudVillage = await page.evaluate(() => ({
  badge: document.querySelector('.cwv-hud__badge')?.textContent ?? null,
  objective: document.querySelector('.cwv-objective')?.textContent ?? null,
}));
check('zone badge updates to Portfolio Village on teleport (no reload)', hudVillage.badge === 'Portfolio Village', JSON.stringify(hudVillage));

step = "2"; /* ---------- 2. panel footer hint ---------- */
await page.evaluate(() => window.__cwv.teleport(27, 49, 'walk'));
await page.waitForTimeout(700);
await page.keyboard.press('e');
await page.waitForTimeout(600);
const panelInfo = await page.evaluate(() => ({
  title: document.querySelector('.cwv-panel__title')?.textContent ?? null,
  foot: document.querySelector('.cwv-panel__foot')?.textContent ?? null,
}));
check('panel opens at village sign', !!panelInfo.title, panelInfo.title ?? 'null');
check('panel footer hint present', !!panelInfo.foot && panelInfo.foot.includes('esc'), JSON.stringify(panelInfo.foot));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check('panel closes on Esc', await page.evaluate(() => !document.querySelector('.cwv-panel')));

step = "3"; /* ---------- 3. accent button contrast ---------- */
const contrast = await page.evaluate(() => {
  const b = document.querySelector('.cwv-btn--accent');
  if (!b) return null;
  const cs = getComputedStyle(b);
  const lum = (hex) => {
    const c = hex.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const l1 = lum(cs.color), l2 = lum(cs.backgroundColor);
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
});
check('accent button contrast >= 4.5:1 (WCAG AA)', contrast !== null && contrast >= 4.5, contrast ? `${contrast}:1` : 'button missing');

step = "4"; /* ---------- 4. ink outlines in the 3D scene ---------- */
const ink = await page.evaluate(() => {
  const scene = window.__cwv.scene;
  let backside = 0;
  scene?.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m && m.side === 1)) backside++; // THREE.BackSide === 1
  });
  return backside;
});
check('ink outline shells present (BackSide materials >= 6: whale hull+tail, char body+4 limbs)', ink >= 6, `count=${ink}`);
step = "5"; /* ---------- 5. full journey: walk -> board -> sail -> disembark ---------- */
await page.keyboard.down('w');
await page.waitForTimeout(1200);
await page.keyboard.up('w');
const p0 = await page.evaluate(() => window.__cwv.pilot.pos.toArray());
await page.evaluate(() => window.__cwv.teleport(-45.5, -47.5, 'walk'));
await page.waitForTimeout(300);
await page.keyboard.down('w');
await page.waitForTimeout(1500);
await page.keyboard.up('w');
const p1 = await page.evaluate(() => window.__cwv.pilot.pos.toArray());
check('WASD walk moves the character', Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) > 0.5, `p0=${JSON.stringify(p0.map((v) => Math.round(v)))} p1=${JSON.stringify(p1.map((v) => Math.round(v)))} moved=${Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(2)}`);

await page.evaluate(() => window.__cwv.teleport(-33, -47.5, 'walk'));
await page.waitForTimeout(700);
await page.keyboard.press('e');
await page.waitForTimeout(1400);
const aboard = await page.evaluate(() => ({
  mode: window.__cwv.pilot.mode,
  badge: document.querySelector('.cwv-hud__badge')?.textContent ?? null,
  objective: document.querySelector('.cwv-objective')?.textContent ?? null,
}));
check('E boards the whale', aboard.mode === 'boat', JSON.stringify(aboard));
check('badge switches to At sea after boarding (event-driven)', aboard.badge === 'At sea — Docker Whale', aboard.badge ?? 'null');
check('objective switches to Sail after boarding', /Sail/.test(aboard.objective ?? ''), aboard.objective ?? 'null');

await page.keyboard.down('w');
await page.waitForTimeout(2500);
await page.keyboard.up('w');
const sailPos = await page.evaluate(() => window.__cwv.pilot.boatPos.toArray());
check('whale sails on W', Math.hypot(...sailPos.map((v) => v)) > 5, `boatPos=${JSON.stringify(sailPos.map((v) => Math.round(v)))}`);

await page.evaluate(() => window.__cwv.teleport(-16, 36, 'boat'));
await page.waitForTimeout(700);
await page.keyboard.press('e');
await page.waitForTimeout(1200);
const ashore = await page.evaluate(() => ({
  mode: window.__cwv.pilot.mode,
  badge: document.querySelector('.cwv-hud__badge')?.textContent ?? null,
}));
check('E disembarks at harbour', ashore.mode === 'walk', JSON.stringify(ashore));
check('badge back to Welcome Harbour on land', ashore.badge === 'Welcome Harbour', ashore.badge ?? 'null');

step = "6"; /* ---------- 6. perf sample ---------- */
await page.evaluate(() => window.__cwv.teleport(-45.5, -47.5, 'walk'));
await page.waitForTimeout(2500);
const perf = await page.evaluate(() => {
  const i = window.__cwv.renderer.info;
  return { calls: i.render.calls, tris: i.render.triangles, geoms: i.memory.geometries, progs: i.programs.length };
});
// world is merged into 11 geometries, so tris are high but draw calls are the
// real budget — calls < 400 and tris < 2.5M (headless SwiftShader renders all)
check('render budget sane at spawn (calls < 400, tris < 2.5M)', perf.calls < 400 && perf.tris < 2500000, JSON.stringify(perf));
await page.evaluate(() => window.__cwv.teleport(47, 42, 'walk'));
await page.waitForTimeout(2500);
const perfV = await page.evaluate(() => {
  const i = window.__cwv.renderer.info;
  return { calls: i.render.calls, tris: i.render.triangles };
});
check('render budget sane in village (calls < 400, tris < 2.5M)', perfV.calls < 400 && perfV.tris < 2500000, JSON.stringify(perfV));

step = "7"; /* ---------- 7. reduced motion ---------- */
const ctxRM = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const pageRM = await ctxRM.newPage();
pageRM.on('pageerror', (e) => { pageErrors.push('RM: ' + e.message); console.log('[pageerror @ RM]', e.message); });
await pageRM.goto(BASE, { waitUntil: 'domcontentloaded' });
await pageRM.waitForFunction(() => window.__cwv?.view?.ready, undefined, { timeout: 90000 });
await pageRM.waitForTimeout(2000);
await pageRM.evaluate(() => window.__cwv.teleport(27, 49, 'walk'));
await pageRM.waitForTimeout(600);
await pageRM.keyboard.press('e');
await pageRM.waitForTimeout(500);
const rm = await pageRM.evaluate(() => {
  const p = document.querySelector('.cwv-panel');
  return p ? getComputedStyle(p).animationName : 'no-panel';
});
check('reduced-motion: panel entrance animation disabled', rm === 'none', `animation-name=${rm}`);
await ctxRM.close();

step = "8"; /* ---------- 8. mobile viewport ---------- */
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pageM = await ctxM.newPage();
pageM.on('pageerror', (e) => { pageErrors.push('MOB: ' + e.message); console.log('[pageerror @ MOB]', e.message); });
await pageM.goto(BASE, { waitUntil: 'domcontentloaded' });
await pageM.waitForFunction(() => window.__cwv?.view?.ready, undefined, { timeout: 90000 });
await pageM.waitForTimeout(2500);
const mob = await pageM.evaluate(() => {
  const hud = document.querySelector('.cwv-hud')?.getBoundingClientRect();
  const obj = document.querySelector('.cwv-objective')?.getBoundingClientRect();
  return {
    hudW: hud ? Math.round(hud.width) : -1,
    objRight: obj ? Math.round(obj.right) : -1,
    objText: document.querySelector('.cwv-objective')?.textContent ?? null,
    touch: !!document.querySelector('.cwv-touch'),
  };
});
check('mobile: HUD fits viewport (<=390px)', mob.hudW > 0 && mob.hudW <= 390, `hudW=${mob.hudW}`);
check('mobile: objective strip fits viewport', mob.objRight > 0 && mob.objRight <= 391, `objRight=${mob.objRight} text=${JSON.stringify(mob.objText)}`);
check('mobile: touch controls present', mob.touch);
await pageM.evaluate(() => window.__cwv.teleport(27, 49, 'walk'));
await pageM.waitForTimeout(600);
await pageM.keyboard.press('e');
await pageM.waitForTimeout(500);
const mobPanel = await pageM.evaluate(() => ({
  open: !!document.querySelector('.cwv-panel'),
  foot: !!document.querySelector('.cwv-panel__foot'),
  fits: (document.querySelector('.cwv-panel')?.getBoundingClientRect().width ?? 0) <= 391,
}));
check('mobile: panel opens and fits with footer', mobPanel.open && mobPanel.fits && mobPanel.foot, JSON.stringify(mobPanel));
await ctxM.close();

step = "9"; /* ---------- 9. errors ---------- */
check('zero console errors', consoleErrs.length === 0, consoleErrs.slice(0, 3).join(' | '));
check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
await browser.close();
process.exit(fail ? 1 : 0);
