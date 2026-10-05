/**
 * Measure the info panel's real geometry and its header/close-icon boxes.
 *
 * Note: InfoPanel.tsx's doc comment claims the panel is `position: fixed` in the
 * viewport, but InfoPanel.css line 21 sets `position: absolute` inside
 * `.world-canvas`, which has `overflow: hidden`. Measure rather than trust either.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'qa/_scratch-e';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1917, height: 933 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(600);

// Open a panel through the contents drawer (a DOM path, so no walking needed).
await page.click('[data-testid="world-index-toggle"]');
await sleep(300);
await page.click('[data-testid="index-skill-python"]');
await page.waitForSelector('[data-testid="info-panel"]', { timeout: 15000 });
await sleep(700);

const m = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; };
  const panel = q('[data-testid="info-panel"]');
  const stage = q('[data-testid="world-canvas"]');
  const header = q('.info-panel__header');
  const icon = q('.info-panel__close-icon');
  const strip = q('.info-panel__close');
  const body = q('.info-panel__body');
  const cs = (el) => { if (!el) return null; const c = getComputedStyle(el); return { position: c.position, display: c.display, color: c.color, bg: c.backgroundColor, fontSize: c.fontSize, padding: c.padding, zIndex: c.zIndex, overflow: c.overflow }; };
  const iconCs = cs(icon);
  return {
    panelBox: box(panel), panelCs: cs(panel),
    stageBox: box(stage),
    headerBox: box(header), headerCs: cs(header),
    iconBox: box(icon), iconCs,
    stripBox: box(strip), stripCs: cs(strip),
    bodyBox: box(body),
    headerHasCss: header ? getComputedStyle(header).display : null,
    iconText: icon ? icon.textContent : null,
    clippedByStage: panel && stage ? (() => {
      const p = panel.getBoundingClientRect(); const s = stage.getBoundingClientRect();
      return { panelTopAboveStage: Math.round(s.top - p.top), panelBottomBelowStage: Math.round(p.bottom - s.bottom), clippedTop: p.top < s.top, clippedBottom: p.bottom > s.bottom };
    })() : null,
    viewport: { w: innerWidth, h: innerHeight },
  };
});
console.log(JSON.stringify(m, null, 2));

// Close control hit-testability, measured at each control's centre.
const hits = await page.evaluate(() => {
  const out = [];
  for (const sel of ['.info-panel__close-icon', '.info-panel__close']) {
    const el = document.querySelector(sel);
    if (!el) { out.push({ sel, missing: true }); continue; }
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    out.push({ sel, w: Math.round(r.width), h: Math.round(r.height), hitIsSelf: hit === el || el.contains(hit), hit: hit ? hit.tagName + '.' + hit.className : null });
  }
  return out;
});
console.log('--- close control hit tests ---');
console.log(JSON.stringify(hits, null, 2));

await page.screenshot({ path: `${OUT}/panel-before.png` });
await browser.close();
console.log('done');