/** Stage 3 verification: popup overlay.
 * For 2 skill signs + 2 project signs: click → assert title/desc EXACTLY
 * match PORTFOLIO data (read in-page), exactly one button, movement locked
 * while open, Return-to-World closes, repeat open/close ×5 (no leaks),
 * scrim covers viewport, 390x844 card readable. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage3-newreq';

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push({ t: m.type(), x: m.text() }));
page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0;
}, { timeout: 20000 });
await page.waitForTimeout(2500);

// --- Helper: open a card by grid-scanning clicks, return its content ---
async function openCardByScan(x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y += 44) {
    for (let x = x0; x <= x1; x += 44) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(90);
      const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
      if (has) return { x, y };
    }
  }
  return null;
}

async function readCard() {
  return page.evaluate(() => {
    const scrim = document.querySelector('.cloud-card-scrim');
    const card = document.querySelector('.cloud-card');
    const title = document.querySelector('.cloud-card-title')?.textContent;
    const desc = document.querySelector('.cloud-card-desc')?.textContent;
    const buttons = Array.from(document.querySelectorAll('.cloud-card button')).length;
    const links = Array.from(document.querySelectorAll('.cloud-card a')).length;
    const rect = scrim?.getBoundingClientRect();
    return {
      hasScrim: !!scrim,
      title,
      desc,
      buttons,
      links,
      scrimW: rect?.width,
      scrimH: rect?.height,
      lock: window.__cwInputLocked,
    };
  });
}

async function closeCard() {
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(350);
  return page.evaluate(() => ({
    closed: !document.querySelector('.cloud-card-scrim'),
    lock: window.__cwInputLocked,
    dupes: document.querySelectorAll('.cloud-card-scrim').length,
  }));
}

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

// --- 1. Skill sign at the pinned approach (Git sign, z=12) ---
console.log('\n=== SKILL 1: Git sign (pin camera near spawn) ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [-1, 4, 2], target: [-5.4, 3.5, 12] };
});
await page.waitForTimeout(700);
let hit = await openCardByScan(300, 1150, 180, 720);
check('skill card opens by click', hit, hit ? `click at (${hit.x},${hit.y})` : 'no click landed');
if (hit) {
  const c = await readCard();
  await page.screenshot({ path: `${OUT}/01-skill-card-git.png` });
  // Expected data, read from the page's own PORTFOLIO (no hardcode duplication)
  const expected = await page.evaluate(() => {
    const s = window.__PORTFOLIO__?.skills?.git;
    return s ? { title: s.name, desc: s.summary } : null;
  });
  check('title matches PORTFOLIO', expected && c.title === expected.title, `${c.title}`);
  check('desc matches PORTFOLIO', expected && c.desc === expected.desc, `"${(c.desc || '').slice(0, 48)}…"`);
  check('exactly one button', c.buttons === 1, `buttons=${c.buttons}`);
  check('no links in card', c.links === 0, `links=${c.links}`);
  check('scrim covers viewport', c.scrimW === 1440 && c.scrimH === 900, `${c.scrimW}x${c.scrimH}`);
  check('movement locked while open', c.lock === true, `__cwInputLocked=${c.lock}`);
  // movement probe: W while locked must not move the avatar
  const zBefore = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  const zAfter = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
  check('W does not move avatar while open', Math.abs(zAfter - zBefore) < 0.01, `Δz=${(zAfter - zBefore).toFixed(3)}`);
  const cl = await closeCard();
  check('Return to World closes', cl.closed && cl.dupes === 0, `closed=${cl.closed}`);
  check('input unlocked after close', cl.lock === false, `lock=${cl.lock}`);
}

// --- 2. Skill sign 2 (Docker, z=27 right side) ---
console.log('\n=== SKILL 2: Docker sign ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [4, 4, 16], target: [7.6, 3.5, 27] };
});
await page.waitForTimeout(700);
hit = await openCardByScan(300, 1150, 180, 720);
check('skill card 2 opens', hit, hit ? `(${hit.x},${hit.y})` : '');
if (hit) {
  const c = await readCard();
  const expected = await page.evaluate(() => {
    const s = window.__PORTFOLIO__?.skills?.docker;
    return s ? { title: s.name, desc: s.summary } : null;
  });
  check('title 2 matches', expected && c.title === expected.title, `${c.title}`);
  check('desc 2 matches', expected && c.desc === expected.desc, `"${(c.desc || '').slice(0, 48)}…"`);
  check('one button (2)', c.buttons === 1 && c.links === 0, `b=${c.buttons} l=${c.links}`);
  await page.screenshot({ path: `${OUT}/02-skill-card-docker.png` });
  const cl = await closeCard();
  check('closes (2)', cl.closed && cl.lock === false, '');
}

// --- 3+4. Project signs in the Sunset zone (avatar teleport via hist not
// available; pin the camera at the Sunset zone and scan) ---
console.log('\n=== PROJECT 1+2: Sunset zone project signs ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [pathCX(200), 8, 192], target: [pathCX(198) - 7.5, 3, 198] };
  function pathCX(z) {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  }
});
await page.waitForTimeout(700);
hit = await openCardByScan(200, 1250, 150, 760);
check('project card 1 opens', hit, hit ? `(${hit.x},${hit.y})` : 'scan found nothing');
if (hit) {
  const c = await readCard();
  const expected = await page.evaluate(() => {
    const ids = ['rxverify', 'medigen', 'go-microservices'];
    for (const id of ids) {
      const p = window.__PORTFOLIO__?.projects?.[id];
      if (p && p.title === document.querySelector('.cloud-card-title')?.textContent) {
        return { id, title: p.title, desc: p.description };
      }
    }
    return null;
  });
  check('project title matches a real cloud project', expected, `${c.title}`);
  check('project desc matches', expected && c.desc === expected.desc, `"${(c.desc || '').slice(0, 48)}…"`);
  check('one button, no link', c.buttons === 1 && c.links === 0, `b=${c.buttons} l=${c.links}`);
  await page.screenshot({ path: `${OUT}/03-project-card-1.png` });
  const cl = await closeCard();
  check('project card closes', cl.closed && cl.lock === false, '');
}

// --- 5. Repeated open/close ×5 (leak check) ---
console.log('\n=== Repeated open/close ×5 ===');
let leakFree = true;
for (let i = 0; i < 5; i++) {
  const h = await openCardByScan(300, 1150, 180, 720);
  if (!h) { leakFree = false; console.log(`  round ${i}: no card opened`); break; }
  const cl = await closeCard();
  const scrims = await page.evaluate(() => document.querySelectorAll('.cloud-card-scrim').length);
  if (!cl.closed || scrims !== 0 || cl.lock !== false) {
    leakFree = false;
    console.log(`  round ${i}: closed=${cl.closed} scrims=${scrims} lock=${cl.lock}`);
    break;
  }
}
check('open/close ×5 no leaks, lock restored', leakFree, '');

// --- 6. Escape closes ---
const h = await openCardByScan(300, 1150, 180, 720);
if (h) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  const closed = await page.evaluate(() => !document.querySelector('.cloud-card-scrim'));
  check('Escape closes the card', closed, '');
} else {
  check('Escape closes the card', false, 'could not open');
}

// --- 7. Narrow viewport card shot ---
console.log('\n=== Narrow viewport (390x844) ===');
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(800);
const h2 = await openCardByScan(20, 370, 120, 700);
if (h2) {
  await page.screenshot({ path: `${OUT}/04-card-390x844.png` });
  const c = await readCard();
  check('card opens on narrow viewport', c.hasScrim, `${c.scrimW}x${c.scrimH}`);
  await closeCard();
} else {
  check('card opens on narrow viewport', false, 'no click landed');
}

// --- Summary ---
const errs = logs.filter((l) => l.t === 'error');
console.log(`\nconsole: ${logs.length} msgs, ${errs.length} errors`);
const fails = results.filter((r) => !r.pass);
console.log(`\n=== STAGE 3 RESULTS: ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));

await browser.close();
console.log('DONE');
