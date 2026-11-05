// Browser QA smoke test for the River Expedition Cloud World (headless Chromium).
// Covers: board at spawn, sail to Technology Dock, disembark/re-board round trip,
// foot movement (east + diagonal), skill-station panel, about panel.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174/#/cloud-world-iso';
const w2s = (x, y) => ({ x: 104 * 32 + (x - y) * 32, y: (x + y) * 16 });
const VIEW = { width: 1440, height: 900 };
const inRect = (bx, by, d) => Math.abs(bx - d.x) <= d.w / 2 + 1 && Math.abs(by - d.y) <= d.h / 2 + 1;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: VIEW });
const page = await context.newPage();
let errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });

const iso = await page.waitForFunction(() => window.__iso, { timeout: 20000 }).then(() => page.evaluate(() => window.__iso));
let fails = 0;
function check(name, cond, extra = '') {
  if (cond) console.log('PASS:', name);
  else { fails++; console.error('FAIL:', name, extra); }
}
check('hook present', iso && typeof iso.fps === 'number');
check('starts on foot at spawn', iso.mode === 'foot' && Math.abs(iso.x - 31.5) < 2 && Math.abs(iso.y - 89) < 2);
check('zero console errors at load', iso.errors.length === 0);

const press = (k, ms) => page.keyboard.down(k).then(() => new Promise((r) => setTimeout(r, ms))).then(() => page.keyboard.up(k)).then(() => new Promise((r) => setTimeout(r, 350)));
const state = () => page.evaluate(() => window.__iso);

// sail toward a dock rect: greedy axis steering + escape + visited-set
const sailTo = async (dockId, maxIt = 40) => {
  const visited = new Set();
  const kp = (x, y) => Math.round(x) + ',' + Math.round(y);
  for (let i = 0; i < maxIt; i++) {
    const st = await state();
    const d = st.docks.find((x) => x.id === dockId);
    if (inRect(st.bx, st.by, d)) return true;
    visited.add(kp(st.bx, st.by));
    const wantY = st.by < d.y - d.h / 2 - 1 ? 'ArrowDown' : st.by > d.y + d.h / 2 + 1 ? 'ArrowUp' : null;
    const wantX = st.bx < d.x - d.w / 2 - 1 ? 'ArrowRight' : st.bx > d.x + d.w / 2 + 1 ? 'ArrowLeft' : null;
    const cands = [];
    if (wantY) cands.push(wantY);
    if (wantX) cands.push(wantX);
    if (wantY) cands.push(wantY === 'ArrowDown' ? 'ArrowUp' : 'ArrowDown');
    if (wantX) cands.push(wantX === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight');
    let moved = false;
    for (const dir of cands) {
      const before = kp(st.bx, st.by);
      await press(dir, 500);
      await new Promise((r) => setTimeout(r, 500));
      const after = await state();
      const k2 = kp(after.bx, after.by);
      if (k2 !== before && !visited.has(k2)) { moved = true; break; }
    }
    if (!moved) return false;
  }
  const st = await state(); const d = st.docks.find((x) => x.id === dockId);
  return inRect(st.bx, st.by, d);
};

// wait for camera to settle on the player (followTarget now in world coords)
const settled = async () => {
  let prev = (await state()).cam;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const cur = (await state()).cam;
    if (Math.abs(cur.x - prev.x) < 1 && Math.abs(cur.y - prev.y) < 1) return;
    prev = cur;
  }
};

// teleport the player to a hotspot list index (QA digit keys 1-5)
const jump = async (n) => { await page.keyboard.press(String(n)); await settled(); };

// --- board at spawn
await page.keyboard.press('e'); await new Promise((r) => setTimeout(r, 700));
let s = await state();
check('boarded: mode=boat', s.mode === 'boat');

// --- sail to Technology Dock d2
await press('ArrowLeft', 1000);
for (let i = 0; i < 8; i++) await press('ArrowUp', 700);
await press('ArrowRight', 1500);
for (let i = 0; i < 6; i++) await press('ArrowUp', 700);
await press('ArrowRight', 2000);
for (let i = 0; i < 8; i++) await press('ArrowUp', 700);
await press('ArrowUp', 2100);
await press('ArrowDown', 700);
await sailTo('d2');
s = await state();
const d2 = s.docks.find((d) => d.id === 'd2');
check('reached dock zone d2 (engine margin)', inRect(s.bx, s.by, d2), JSON.stringify({ bx: s.bx, by: s.by }));
await page.keyboard.press('e'); await new Promise((r) => setTimeout(r, 700));
s = await state();
check('disembarked at d2: mode=foot', s.mode === 'foot');
await page.keyboard.press('e'); await new Promise((r) => setTimeout(r, 700));
s = await state();
check('re-boarded at d2: mode=boat', s.mode === 'boat');

// --- foot movement at d2 pier
await page.keyboard.press('e'); await new Promise((r) => setTimeout(r, 700));
s = await state();
check('disembarked again: mode=foot', s.mode === 'foot');
const x0 = s.x, y0 = s.y;
await press('ArrowRight', 2000);
const s4 = await state();
check('moving east increases x', s4.x > x0 + 0.4);
const sx = s4.x, sy = s4.y;
await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowRight'); await new Promise((r) => setTimeout(r, 1500));
await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowRight');
const s5 = await state();
check('diagonal input moves the character', Math.hypot(s5.x - sx, s5.y - sy) > 0.5);

await jump(5);
const sttA = await state();
const hotA = sttA.hotspots.find((h) => h.id === 'docker');
const camA = sttA.cam || { x: 0, y: 0 };
const swA = w2s(hotA.x, hotA.y);
const spA = { x: swA.x - camA.x, y: swA.y - camA.y };
await page.mouse.move(spA.x, spA.y);
await page.mouse.click(spA.x, spA.y);
await new Promise((r) => setTimeout(r, 800));
const panelA = await page.evaluate(() => { const el = document.querySelector('.iso-panel'); return el ? el.textContent : null; });
check('docker panel opens', panelA && panelA.length > 20, panelA ? panelA.slice(0, 80) : null);
if (panelA) check('panel mentions docker', /docker/.test(panelA));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 600));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 600));
const goneA = await page.evaluate(() => document.querySelector('.iso-panel') === null);
check('panel closes on Escape', goneA);


await jump(1);
const sttB = await state();
const hotB = sttB.hotspots.find((h) => h.id === 'about');
const camB = sttB.cam || { x: 0, y: 0 };
const swB = w2s(hotB.x, hotB.y);
const spB = { x: swB.x - camB.x, y: swB.y - camB.y };
await page.mouse.move(spB.x, spB.y);
await page.mouse.click(spB.x, spB.y);
await new Promise((r) => setTimeout(r, 800));
const panelB = await page.evaluate(() => { const el = document.querySelector('.iso-panel'); return el ? el.textContent : null; });
check('about panel opens', panelB && panelB.length > 20, panelB ? panelB.slice(0, 80) : null);
if (panelB) check('panel mentions about', /about/.test(panelB));
await page.keyboard.press('Escape');

await page.screenshot({ path: '/Users/yashsiphone/personal-website-river/qa-iso/shot-journey.png', fullPage: true });
const finalState = await state();
check('final no console errors', finalState.errors.length === 0);
console.log(`\nSMOKE QA: failures = ${fails} | console errors: ${errors.length}`);
await browser.close();
process.exit(fails || errors.length ? 1 : 0);
