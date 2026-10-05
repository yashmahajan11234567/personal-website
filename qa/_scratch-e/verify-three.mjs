/**
 * Verify all three fixes in the running game, measuring rather than eyeballing.
 *
 * 1. exit control: readable, opaque, unclipped, hit-testable
 * 2. exit pipe visible on arrival in skills AND projects
 * 3. BACK button exists, is visible, and closes the panel
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa/_scratch-e';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Relative luminance + WCAG contrast ratio against the parent's background. */
const CONTRAST_FN = `
  (fg, bg) => {
    const s = (c) => { const m = c.match(/[\\d.]+/g); return m ? m.slice(0,3).map(Number) : null; };
    const pf = s(fg), pb = s(bg);
    if (!pf || !pb) return null;
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    const L = (p) => 0.2126*lin(p[0]) + 0.7152*lin(p[1]) + 0.0722*lin(p[2]);
    const a = L(pf), b = L(pb);
    return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)) * 100) / 100;
  }
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1917, height: 933 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await sleep(900);

/* ============ 1. EXIT CONTROL ============ */
const exitAfter = await page.evaluate((contrastSrc) => {
  const contrast = eval(contrastSrc);
  const el = document.querySelector('[data-testid="world-exit"]');
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  // Walk up for the nearest non-transparent background.
  let node = el, bg = 'rgba(0, 0, 0, 0)';
  while (node && node !== document.documentElement) {
    const c = getComputedStyle(node).backgroundColor;
    if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; }
    node = node.parentElement;
  }
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  return {
    color: cs.color, bg: cs.backgroundColor, effectiveBg: bg,
    contrast: contrast(cs.color, bg),
    padding: cs.padding, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    textTransform: cs.textTransform, borderColor: cs.borderTopColor,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    clippedLeft: r.left < 0, clippedTop: r.top < 0,
    clippedRight: r.right > innerWidth, clippedBottom: r.bottom > innerHeight,
    hitIsSelf: hit === el || el.contains(hit),
    text: el.textContent.trim(),
    hiddenSpanNotVisible: (() => {
      const s = el.querySelector('.visually-hidden');
      if (!s) return 'no span';
      const sc = getComputedStyle(s);
      return sc.position === 'absolute' && sc.width === '1px';
    })(),
  };
}, CONTRAST_FN);
console.log('===== 1. EXIT CONTROL (after) =====');
console.log(JSON.stringify(exitAfter, null, 2));

await page.screenshot({ path: `${OUT}/after-1-exit.png` });

/* ============ 2. EXIT PIPE VISIBLE ============ */
await page.keyboard.press('Enter'); // dismiss entry plate
await sleep(500);

async function walkToChapter(want, maxMs = 90000) {
  const t0 = Date.now();
  await page.keyboard.down('ArrowRight');
  while (Date.now() - t0 < maxMs) {
    const ch = await page.evaluate(() => window.__worldScene?.currentChapter ?? null);
    if (ch === want) break;
    await sleep(120);
  }
  await page.keyboard.up('ArrowRight');
  // The chapter swap is asynchronous: `currentChapter` flips before the 12-phase
  // transport finishes, so reading immediately can return the OLD chapter. Wait
  // for the transport to actually settle before reading any chapter state.
  await page.waitForFunction(
    (w) => {
      const s = window.__worldScene;
      return s?.currentChapter === w && (s.playerLocked === false) && (s.transportPhases?.length ?? 0) > 0 && s.transportPhases.at(-1) === 'idle';
    },
    want,
    { timeout: 30000 },
  ).catch(() => console.log(`  (settle wait timed out for ${want})`));
  await sleep(400);
  return page.evaluate(() => window.__worldScene?.currentChapter ?? null);
}

async function pipeState(chapter) {
  return page.evaluate((ch) => {
    const s = window.__worldScene;
    if (!s) return { missing: true };
    const all = [...(s.pipeSkins ?? new Map()).entries()].map(([id, b]) => ({ id, visible: b.mouth.visible, alpha: b.mouth.alpha }));
    const e = s.world?.exitPipe;
    return {
      chapter: ch,
      currentChapter: s.currentChapter,
      exitPipeId: e?.id ?? null,
      exitPipeVisible: e ? (s.pipeSkins.get(e.id)?.mouth.visible ?? null) : 'no exit pipe',
      entryPipeId: s.world?.entryPipe?.id ?? null,
      entryPipeVisible: s.world ? (s.pipeSkins.get(s.world.entryPipe.id)?.mouth.visible ?? null) : null,
      all,
    };
  }, chapter);
}

const inSkills = await walkToChapter('skills');
console.log('\n===== 2a. SKILLS on arrival =====');
console.log(JSON.stringify(await pipeState(inSkills), null, 2));
await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/after-2-skills-arrival.png` });

// Walk right until the exit pipe is on screen, then photograph it.
// Stop 190px short of the tube so the pipe is on screen and NOT yet armed.
await page.evaluate(() => {
  const s = window.__worldScene;
  s.player.x = s.world.exitPipe.x - 190;
  s.player.body.reset(s.world.exitPipe.x - 190, s.player.y);
  s.cameras.main.centerOn(s.player.x, s.player.y - 100);
});
await sleep(700);
const nearPipe = await page.evaluate(() => {
  const s = window.__worldScene;
  const v = s.cameras.main.worldView;
  const e = s.world.exitPipe;
  return {
    playerX: Math.round(s.player.x),
    exitPipeX: e.x,
    exitInView: e.x >= v.x && e.x <= v.x + v.width,
    view: { x: Math.round(v.x), right: Math.round(v.x + v.width) },
    visible: s.pipeSkins.get(e.id)?.mouth.visible ?? null,
    armed: s.armedPipe?.id ?? null,
  };
});
console.log('\n===== 2b. SKILLS walking toward the exit tube =====');
console.log(JSON.stringify(nearPipe, null, 2));
await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/after-2-skills-pipe-visible.png` });

// Now travel through it and check PROJECTS (terminal: only the entry pipe).
const inProjects = await walkToChapter('projects', 40000);
console.log('\n===== 2c. PROJECTS on arrival =====');
console.log(JSON.stringify(await pipeState(inProjects), null, 2));
await page.locator('[data-testid="world-canvas"]').screenshot({ path: `${OUT}/after-2-projects-arrival.png` });

// Walk LEFT back into skills and confirm its exit tube is visible again.
await page.keyboard.down('ArrowLeft');
const t0 = Date.now();
let backIn = null;
while (Date.now() - t0 < 40000) {
  backIn = await page.evaluate(() => window.__worldScene?.currentChapter ?? null);
  if (backIn === 'skills') break;
  await sleep(120);
}
await page.keyboard.up('ArrowLeft');
await sleep(700);
console.log('\n===== 2d. back in SKILLS =====');
console.log(JSON.stringify(await pipeState(backIn), null, 2));

/* ============ 3. BACK BUTTON ============ */
await page.click('[data-testid="world-index-toggle"]');
await sleep(300);
await page.click('[data-testid="index-skill-python"]');
await page.waitForSelector('[data-testid="info-panel"]', { timeout: 15000 });
await sleep(600);

const panelAfter = await page.evaluate((contrastSrc) => {
  const contrast = eval(contrastSrc);
  const q = (s) => document.querySelector(s);
  const panel = q('[data-testid="info-panel"]');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const probe = (sel) => {
    const el = q(sel);
    if (!el) return { missing: true };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      box: box(el), color: cs.color, bg: cs.backgroundColor,
      contrastOnPanel: contrast(cs.color, getComputedStyle(panel).backgroundColor),
      text: el.textContent.trim(),
      ariaLabel: el.getAttribute('aria-label'),
      hitIsSelf: hit === el || el.contains(hit),
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    };
  };
  return {
    headerCs: (() => { const h = q('.info-panel__header'); const c = getComputedStyle(h); return { display: c.display, padding: c.padding, alignItems: c.alignItems }; })(),
    back: probe('[data-testid="panel-back"]'),
    closeIcon: probe('[data-testid="panel-close-icon"]'),
    closeStrip: probe('[data-testid="panel-close"]'),
    panelBox: box(panel),
  };
}, CONTRAST_FN);
console.log('\n===== 3. PANEL CONTROLS (after) =====');
console.log(JSON.stringify(panelAfter, null, 2));

await page.screenshot({ path: `${OUT}/after-3-panel.png` });

// Click BACK and confirm the panel closes and focus returns.
await page.click('[data-testid="panel-back"]');
await sleep(600);
const closed = await page.evaluate(() => ({
  panelCount: document.querySelectorAll('[data-testid="info-panel"]').length,
  focused: document.activeElement?.getAttribute('data-testid'),
}));
console.log('\n===== 3b. after clicking BACK =====');
console.log(JSON.stringify(closed, null, 2));

console.log('\nconsole errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done');