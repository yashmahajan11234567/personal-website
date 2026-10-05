/**
 * Measure the three reported defects before changing anything.
 *
 *  1. top-left EXIT button: is it clipped, what is its contrast, is it hit-testable
 *  2. SKILLS -> PROJECTS pipe: is it visible on arrival in skills, where is it
 *  3. panel close controls: what exists, is it visible
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5174/#/data-world';
const OUT = 'qa/_scratch-e';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });

await page.goto(BASE);
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await sleep(900);

/* ---------------- 1. the exit control ---------------- */
const exit = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="world-exit"]');
  if (!el) return { missing: true };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  return {
    rect: { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    clippedLeft: r.left < 0,
    clippedTop: r.top < 0,
    color: cs.color,
    bg: cs.backgroundColor,
    border: cs.borderColor,
    fontSize: cs.fontSize,
    position: cs.position,
    offsetParent: el.offsetParent ? el.offsetParent.className : null,
    rectMatchesPos: cs.position === 'absolute' || cs.position === 'fixed',
    hitTarget: hit ? (hit.tagName + '.' + hit.className) : null,
    hitIsSelf: hit === el || el.contains(hit),
    text: el.textContent,
  };
});
console.log('=== 1. EXIT CONTROL ===');
console.log(JSON.stringify(exit, null, 2));

/* ---------------- 2. the skills -> projects pipe ---------------- */
// Dismiss the entry plate, walk right in the cliff, take the pipe into skills.
await page.keyboard.press('Enter');
await sleep(500);

const pipeInfo = await page.evaluate(async () => {
  const s = window.__worldScene;
  if (!s) return { missing: true };
  const world = s.world ?? s.chapterWorld ?? null;
  return {
    chapter: s.currentChapter ?? null,
    worldKeys: Object.keys(s).slice(0, 40),
  };
});
console.log('=== 2a. scene/chapter ===');
console.log(JSON.stringify(pipeInfo, null, 2));

await browser.close();
console.log('done');