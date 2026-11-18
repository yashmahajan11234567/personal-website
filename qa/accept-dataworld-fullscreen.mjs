/**
 * Full-screen acceptance — Data World fills the viewport at desktop AND mobile
 * sizes, ground sits at ~90% of the frame, avatar stays visible, camera stays
 * clamped and stable across all four pipe routes, no Phaser/page errors.
 *
 * Run: node qa/accept-dataworld-fullscreen.mjs   (expects `vite preview` on :4173)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-verify-fullscreen';
mkdirSync(OUT, { recursive: true });

const GROUND_Y = 560; // DATA_WORLD.groundY in src/game/config/worldConfig.ts
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch({ headless: true });
const errsByPage = new Map();

function watch(page, tag) {
  const errs = [];
  errsByPage.set(tag, errs);
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 200));
  });
  return errs;
}

const probe = (page) => page.evaluate(() => window.__worldProbe());

/** Ground line as a fraction of the camera view height: (groundY - scrollY) / viewH. */
const groundFrac = (p) => (GROUND_Y - p.camScrollY) / p.camViewHeight;

/** Avatar screen rect from the probe; null-safe. */
const avatarScreen = (p, W, H) => ({
  x: (p.x - p.camScrollX) * p.camZoom,
  y: (p.y - p.camScrollY) * p.camZoom,
  w: W,
  h: H,
});

async function bootWorld(page, W, H) {
  await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 20000 });
  await page.waitForTimeout(4000); // phaser boot + first frames
  await page.keyboard.press('Enter'); // dismiss the entry plate
  await page.waitForTimeout(600);
  await page.waitForFunction(() => window.__worldProbe && window.__worldProbe().ok, null, { timeout: 15000 });
}

/* ------------------------------------------------------------------ *
 * Part 1 — layout at four viewports
 * ------------------------------------------------------------------ */
const VIEWPORTS = [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
];

for (const [W, H] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = watch(page, `${W}x${H}`);
  await bootWorld(page, W, H);
  const p = await probe(page);

  const rect = await page.locator('canvas').boundingBox();
  check(`${W}x${H}: canvas fills viewport`, rect && Math.abs(rect.x) <= 1 && Math.abs(rect.y) <= 1 && Math.abs(rect.width - W) <= 2 && Math.abs(rect.height - H) <= 2,
    rect ? `canvas=${Math.round(rect.width)}x${Math.round(rect.height)} @ ${Math.round(rect.x)},${Math.round(rect.y)} vs ${W}x${H}` : 'no canvas');

  const metrics = await page.evaluate(() => ({
    hOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docHeight: document.documentElement.scrollHeight,
    innerH: window.innerHeight,
    scrollY: window.scrollY,
  }));
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrollAfter = await page.evaluate(() => window.scrollY);
  check(`${W}x${H}: no horizontal overflow`, metrics.hOverflow <= 2, `delta=${metrics.hOverflow}px`);
  check(`${W}x${H}: page does not scroll`, metrics.docHeight <= metrics.innerH + 2 && scrollAfter === 0,
    `doc=${metrics.docHeight} inner=${metrics.innerH} scrollAfter=${scrollAfter}`);

  const gf = groundFrac(p);
  check(`${W}x${H}: ground at ~90% of frame`, gf > 0.85 && gf < 0.95, `groundFrac=${gf.toFixed(3)} zoom=${p.camZoom} viewH=${p.camViewHeight} scrollY=${Math.round(p.camScrollY)}`);

  const a = avatarScreen(p, W, H);
  check(`${W}x${H}: avatar on screen`, a.x >= -2 && a.x <= W + 2 && a.y >= -2 && a.y <= H + 2,
    `avatar@screen=(${Math.round(a.x)},${Math.round(a.y)}) player=(${Math.round(p.x)},${Math.round(p.y)}) grounded=${p.grounded}`);

  check(`${W}x${H}: camera scroll clamped`, p.camScrollX >= -0.5 && p.camScrollX <= p.worldWidth - p.camViewWidth + 1 && p.camScrollY >= -0.5 && p.camScrollY <= p.worldHeight - p.camViewHeight + 1,
    `scroll=(${Math.round(p.camScrollX)},${Math.round(p.camScrollY)}) view=${p.camViewWidth}x${p.camViewHeight} world=${p.worldWidth}x${p.worldHeight}`);

  // Shell controls: RETURN TO PORTFOLIO reachable and not covered; the CONTENTS
  // toggle must be gone entirely (removed from the Data World UI).
  {
    const info = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="world-exit"]');
      if (!el) return { exists: false };
      const r = el.getBoundingClientRect();
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return { exists: true, x: r.x, y: r.y, w: r.width, h: r.height, hit: hit === el || el.contains(hit) };
    });
    check(`${W}x${H}: world-exit visible+clickable`, info.exists && info.hit && info.x >= 0 && info.y >= 0 && info.x + info.w <= W + 1 && info.y + info.h <= H + 1,
      JSON.stringify({ x: Math.round(info.x || 0), y: Math.round(info.y || 0), hit: info.hit }));
  }
  {
    const gone = await page.evaluate(() => {
      const toggle = document.querySelector('[data-testid="world-index-toggle"]');
      const drawer = document.querySelector('.world-index');
      const contentsBtn = [...document.querySelectorAll('button')].find((b) => /^\s*contents\s*$/i.test(b.textContent ?? ''));
      return { toggle: !!toggle, drawer: !!drawer, contentsBtn: !!contentsBtn };
    });
    check(`${W}x${H}: no CONTENTS button/drawer`, !gone.toggle && !gone.drawer && !gone.contentsBtn, JSON.stringify(gone));
  }

  await page.screenshot({ path: `${OUT}/fs-${W}x${H}-cliff.png` });

  // Movement + jump still work at this size.
  const x0 = (await probe(page)).x;
  await page.keyboard.down('d');
  await page.waitForTimeout(1000);
  await page.keyboard.up('d');
  const p1 = await probe(page);
  check(`${W}x${H}: walk right moves avatar`, p1.x - x0 > 80, `dx=${Math.round(p1.x - x0)}px in 1s`);
  const y0 = (await probe(page)).y;
  await page.keyboard.down('w');
  await page.waitForTimeout(260);
  await page.keyboard.up('w');
  const yApex = (await probe(page)).y;
  await page.waitForTimeout(1200);
  const p2 = await probe(page);
  check(`${W}x${H}: jump rises and lands`, yApex < y0 - 5 && p2.grounded && Math.abs(p2.y - y0) < 8,
    `y0=${Math.round(y0)} apex=${Math.round(yApex)} landed=${Math.round(p2.y)} grounded=${p2.grounded}`);

  check(`${W}x${H}: no page/console errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

/* ------------------------------------------------------------------ *
 * Part 2 — full traversal at 1440x900: all four pipe routes + repeats
 * ------------------------------------------------------------------ */
{
  const W = 1440, H = 900;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = watch(page, 'traversal');
  await bootWorld(page, W, H);

  async function walk(dir, untilChapter, maxMs) {
    await page.waitForFunction(() => {
      const p = window.__worldProbe();
      return p.ok && !p.travelling && !p.locked;
    }, null, { timeout: 20000 });
    await page.keyboard.down(dir);
    const t0 = Date.now();
    let p = await probe(page);
    while (p.chapter !== untilChapter && Date.now() - t0 < maxMs) {
      await page.waitForTimeout(250);
      p = await probe(page);
    }
    await page.keyboard.up(dir);
    await page.waitForFunction(() => {
      const q = window.__worldProbe();
      return q.ok && !q.travelling && !q.locked;
    }, null, { timeout: 20000 });
    await page.waitForTimeout(900); // let the camera settle after arrival
    return probe(page);
  }

  const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
  const seen = new Set();
  const route = [
    ['d', 'skills', 'cliff->skills'],
    ['a', 'cliff', 'skills->cliff'],
    ['d', 'skills', 'cliff->skills (repeat)'],
    ['d', 'projects', 'skills->projects'],
    ['a', 'skills', 'projects->skills'],
    ['d', 'projects', 'skills->projects (repeat)'],
  ];

  let p = await probe(page);
  check('traversal: starts in cliff', p.chapter === 'cliff', `chapter=${p.chapter}`);
  for (const [dir, target, label] of route) {
    p = await walk(dir, target, 25000);
    const gf = groundFrac(p);
    const a = avatarScreen(p, W, H);
    const avatarOk = a.x >= -2 && a.x <= W + 2 && a.y >= -2 && a.y <= H + 2;
    const clampOk = p.camScrollY >= -0.5 && p.camScrollY <= p.worldHeight - p.camViewHeight + 1;
    check(`route ${label}: arrived`, p.chapter === target, `chapter=${p.chapter} scrollY=${Math.round(p.camScrollY)}`);
    check(`route ${label}: ground ~90%`, gf > 0.85 && gf < 0.95, `groundFrac=${gf.toFixed(3)}`);
    check(`route ${label}: avatar visible, camera clamped`, avatarOk && clampOk,
      `avatarScreen=(${Math.round(a.x)},${Math.round(a.y)}) scrollY=${Math.round(p.camScrollY)} maxY=${p.worldHeight - p.camViewHeight}`);
    if (!seen.has(p.chapter)) {
      seen.add(p.chapter);
      await shot(`fs-1440x900-${p.chapter}`);
    }
  }
  check('traversal: all three chapters captured', seen.has('cliff') && seen.has('skills') && seen.has('projects'), [...seen].join(','));
  check('traversal: pipe count per chapter sane', (await probe(page)).pipeCount >= 1, `pipeSkins=${(await probe(page)).pipeCount}`);
  check('traversal: no page/console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await shot('fs-1440x900-final');
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
