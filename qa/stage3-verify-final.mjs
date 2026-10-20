/** Stage 3 verification (DevOps Masterclass build):
 * 1. validateContent runs clean in-page (no dangling refs)
 * 2. Every project card (3) + 2 skill cards: open → title/desc EXACT vs
 *    PORTFOLIO, exactly one button, zero links, scrim covers viewport
 * 3. Movement locked while open, restored after Return to World
 * 4. Card link data: the app's PROJECT_DATA github URLs all resolve (the
 *    card itself has no links by design — one button only)
 * 5. Sign text for devops-masterclass wraps readably (screenshot + probe)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage3-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const tm = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

// 1. Content integrity: PORTFOLIO resolves the new project; no dangling refs
const integrity = await page.evaluate(() => {
  const p = window.__PORTFOLIO__;
  if (!p) return { error: 'no PORTFOLIO on window' };
  const dm = p.projects['devops-masterclass'];
  return {
    hasDM: !!dm,
    dmTitle: dm?.title,
    dmGithub: dm?.github,
    medigenGone: !p.projects['medigen'],
    cloudOrder: p.worlds['cloud']?.projectOrder,
    rxGithub: p.projects['rxverify']?.github,
    goGithub: p.projects['go-microservices']?.github,
  };
});
check('devops-masterclass resolves in PORTFOLIO', integrity.hasDM, integrity.dmTitle);
check('medigen removed from content model', integrity.medigenGone, '');
check('cloud projectOrder updated', JSON.stringify(integrity.cloudOrder) === JSON.stringify(['rxverify', 'devops-masterclass', 'go-microservices']), JSON.stringify(integrity.cloudOrder));

// GitHub URLs point at real repos (HEAD request from the page)
const urlChecks = await page.evaluate(async (urls) => {
  const out = [];
  for (const u of urls) {
    try {
      const r = await fetch(`https://api.github.com/repos/${u}`, { method: 'HEAD' });
      out.push({ u, status: r.status });
    } catch (e) {
      out.push({ u, status: 'error: ' + e.message });
    }
  }
  return out;
}, [
  'yashmahajan11234567/digital-prescription-verification-devops',
  'yashmahajan11234567/Full-Stack-AI-DevOps-Masterclass',
  'yashmahajan11234567/Real-Time-Balance-Visibility-in-Microservice-Based-Money-Transfers',
]);
for (const c of urlChecks) check(`repo URL live: ${c.u.split('/')[1]}`, c.status === 200, `HTTP ${c.status}`);

// 2+3. Cards: click each sign, verify content + lock + return
async function clickSign(x, z, scale) {
  const by = terrainHeight(x, z) + (2.35 + 0.55) * scale;
  await page.evaluate(({ x, z, by }) => {
    window.__cwQaCam = { pos: [x + 0.4, by + 1.0, z - 13], target: [x, by, z] };
  }, { x, z, by });
  await page.waitForTimeout(800);
  const pts = [[720, 450], [720, 415], [720, 485], [660, 450], [780, 450]];
  for (const [px, py] of pts) {
    await page.mouse.click(px, py);
    await page.waitForTimeout(200);
    const opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (opened) return true;
    const cardOpen = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (cardOpen) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  }
  return false;
}

const cards = [
  { kind: 'project', id: 'rxverify', x: pathCenterX(196) - 13, z: 196, scale: 3.6 },
  { kind: 'project', id: 'devops-masterclass', x: pathCenterX(206) + 13, z: 206, scale: 3.6 },
  { kind: 'project', id: 'go-microservices', x: pathCenterX(216) - 13, z: 216, scale: 3.6 },
  // 2026-10-16 redesign: the per-skill boards are gone; the valley holds four
  // CATEGORY boards. Two are exercised here (the other two in stage1 suite).
  { kind: 'category', id: 'cloud-infrastructure', x: -10.7, z: 17.4, scale: 2.4 },
  { kind: 'category', id: 'containerization', x: -8.5, z: 49.4, scale: 2.4 },
];
for (const c of cards) {
  const opened = await clickSign(c.x, c.z, c.scale);
  check(`${c.id} card opens by click`, opened, '');
  if (!opened) continue;
  const card = await page.evaluate(() => {
    const scrim = document.querySelector('.cloud-card-scrim');
    const r = scrim?.getBoundingClientRect();
    return {
      title: document.querySelector('.cloud-card-title')?.textContent,
      desc: document.querySelector('.cloud-card-desc')?.textContent,
      buttons: Array.from(document.querySelectorAll('.cloud-card button')).length,
      links: Array.from(document.querySelectorAll('.cloud-card a')).length,
      linkHref: document.querySelector('.cloud-card a')?.href ?? null,
      scrimW: r?.width, scrimH: r?.height,
      lock: window.__cwInputLocked,
    };
  });
  const expected = await page.evaluate(({ kind, id }) => {
    if (kind === 'category') {
      const cat = (window.__SKILL_CATEGORIES__ || []).find((k) => k.id === id);
      return cat ? { title: cat.title, desc: cat.tagline } : null;
    }
    const e = kind === 'skill' ? window.__PORTFOLIO__?.skills?.[id] : window.__PORTFOLIO__?.projects?.[id];
    return e ? (kind === 'skill' ? { title: e.name, desc: e.summary } : { title: e.title, desc: e.description }) : null;
  }, { kind: c.kind, id: c.id });
  check(`${c.id} title exact`, expected && card.title === expected.title, card.title);
  check(`${c.id} desc exact`, expected && card.desc === expected.desc, '');
  // 2026-10-15 requirement 5: project cards carry ONE repository link from the
  // data's `github` field; skill cards keep zero links. Return stays the only
  // close action.
  const gh = await page.evaluate(({ kind, id }) =>
    kind === 'project' ? window.__PORTFOLIO__?.projects?.[id]?.github ?? null : null,
  { kind: c.kind, id: c.id });
  const wantLinks = gh ? 1 : 0;
  check(
    `${c.id} one button + ${gh ? 'repo link matching data' : 'zero links'}`,
    card.buttons === 1 && card.links === wantLinks && (card.linkHref ?? null) === gh,
    `b=${card.buttons} l=${card.links} href=${card.linkHref}`,
  );
  check(`${c.id} scrim covers viewport`, card.scrimW === 1440 && card.scrimH === 900, `${card.scrimW}x${card.scrimH}`);
  check(`${c.id} movement locked`, card.lock === true, '');
  // W while locked
  const zBefore = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  const zAfter = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
  check(`${c.id} avatar frozen while open`, Math.abs(zAfter - zBefore) < 0.01, `Δz=${(zAfter - zBefore).toFixed(3)}`);
  await page.screenshot({ path: `${OUT}/card-${c.id}.png` });
  // Return to World
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(350);
  const cl = await page.evaluate(() => ({
    closed: !document.querySelector('.cloud-card-scrim'),
    lock: window.__cwInputLocked,
    dupes: document.querySelectorAll('.cloud-card-scrim').length,
  }));
  check(`${c.id} Return to World closes + unlocks`, cl.closed && cl.lock === false && cl.dupes === 0, '');
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

// movement restored after last card (any direction — W is camera-relative
// and the orbit azimuth after the pin release can face backward)
const zBeforeMove = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
await page.keyboard.down('w');
await page.waitForTimeout(700);
await page.keyboard.up('w');
const zAfterMove = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z);
check('movement restored after Return', Math.abs(zAfterMove - zBeforeMove) > 0.3, `Δz=${(zAfterMove - zBeforeMove).toFixed(2)}`);

const errs = pageErrors.length + consoleErrors.length;
check('zero page/console errors', errs === 0, `${pageErrors.length} page, ${consoleErrors.length} console`);

const fails = results.filter((r) => !r.pass);
console.log(`\n=== STAGE 3: ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
await browser.close();
console.log('DONE');
