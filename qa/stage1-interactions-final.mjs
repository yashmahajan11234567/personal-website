/** Stage 1 interactions FINAL: exact-ground-height pin + click viewport
 * center. The QA pin aims the controls target AT the board center, so the
 * clicked point is the board itself — no pixel heuristics needed. */
import { chromium } from 'playwright';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage1-fix';

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
  const towardMountains = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + towardMountains * 2.2;
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

/** Pin 13u in front of the sign at its exact board center; click center. */
async function clickSign(x, z, scale) {
  const gy = terrainHeight(x, z);
  const by = gy + (2.35 + 0.55) * scale;
  await page.evaluate(({ x, z, by }) => {
    window.__cwQaCam = { pos: [x + 0.4, by + 1.0, z - 13], target: [x, by, z] };
  }, { x, z, by });
  await page.waitForTimeout(800);
  // click center; if no card, try a tight 3x3 cross (perspective offsets)
  const pts = [[720, 450], [720, 415], [720, 485], [660, 450], [780, 450], [720, 380], [720, 520]];
  for (const [px, py] of pts) {
    await page.mouse.click(px, py);
    await page.waitForTimeout(200);
    const opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (opened) return { opened: true, px, py };
    // Escape any card opened by a distant sign's sphere
    const cardOpen = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (cardOpen) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  }
  return { opened: false };
}

async function readCard() {
  return page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    desc: document.querySelector('.cloud-card-desc')?.textContent,
    buttons: Array.from(document.querySelectorAll('.cloud-card button')).length,
    links: Array.from(document.querySelectorAll('.cloud-card a')).length,
    linkHref: document.querySelector('.cloud-card a')?.href ?? null,
    lock: window.__cwInputLocked,
  }));
}
async function closeCard() {
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(350);
  return page.evaluate(() => ({
    closed: !document.querySelector('.cloud-card-scrim'),
    lock: window.__cwInputLocked,
  }));
}

// --- Project signs (actual mapping: rxverify@196L, devops-masterclass@206R, go-micro@216L) ---
const projects = [
  { id: 'rxverify', x: pathCenterX(196) - 13, z: 196 },
  { id: 'devops-masterclass', x: pathCenterX(206) + 13, z: 206 },
  { id: 'go-microservices', x: pathCenterX(216) - 13, z: 216 },
];
for (const p of projects) {
  const hit = await clickSign(p.x, p.z, 3.6);
  check(`${p.id} click opens card`, hit.opened, hit.opened ? `clicked (${hit.px},${hit.py})` : 'no click landed');
  if (hit.opened) {
    const c = await readCard();
    const expected = await page.evaluate((id) => {
      const pr = window.__PORTFOLIO__?.projects?.[id];
      return pr ? { title: pr.title, desc: pr.description } : null;
    }, p.id);
    check(`${p.id} title exact`, expected && c.title === expected.title, c.title);
    check(`${p.id} desc exact`, expected && c.desc === expected.desc, '');
    // 2026-10-15 requirement 5: project cards carry ONE repository link driven
    // by the data's own `github` field (Return button stays the only close
    // action). Skill cards keep zero links.
    const gh = await page.evaluate((id) => window.__PORTFOLIO__?.projects?.[id]?.github, p.id);
    check(
      `${p.id} one button + repository link matching data`,
      c.buttons === 1 && c.links === 1 && c.linkHref === gh,
      `buttons=${c.buttons} links=${c.links} href=${c.linkHref}`,
    );
    await page.screenshot({ path: `${OUT}/card-${p.id}.png` });
    const cl = await closeCard();
    check(`${p.id} Return-to-World closes + unlocks`, cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

// --- Skill CATEGORY signs (2026-10-16 redesign: 4 boards replace the
// per-skill signs). Live scene positions (world.ts stations + clearSignPosition):
// cloud-infrastructure@17.4L, cicd-observability@33.4R, containerization@49.4L,
// dev-automation@63.4R. Overlay contract: title = category title; the card
// lists the category's real skills (assert the first skill's name appears).
const categoryBoards = [
  { id: 'cloud-infrastructure', x: -10.7, z: 17.4, firstSkill: 'Terraform / AWS' },
  { id: 'cicd-observability', x: 13.8, z: 33.4, firstSkill: 'CI/CD' },
];
for (const cb of categoryBoards) {
  const hit = await clickSign(cb.x, cb.z, 2.4);
  check(`${cb.id} click opens card`, hit.opened, hit.opened ? `(${hit.px},${hit.py})` : '');
  if (hit.opened) {
    const c = await readCard();
    const expected = await page.evaluate((id) => {
      const cat = (window.__SKILL_CATEGORIES__ || []).find((k) => k.id === id);
      return cat ? { title: cat.title } : null;
    }, cb.id);
    check(`${cb.id} title exact`, expected && c.title === expected.title, c.title);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('.cloud-card-skill-name')].map((n) => n.textContent));
    check(`${cb.id} lists its skills`, names.length >= 2 && names[0] === cb.firstSkill,
      names.join(', '));
    check(`${cb.id} one button, zero links`, c.buttons === 1 && c.links === 0,
      `b=${c.buttons} l=${c.links}`);
    await page.screenshot({ path: `${OUT}/card-${cb.id}.png` });
    const cl = await closeCard();
    check(`${cb.id} card closes`, cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

// --- Return-to-World state restoration (uses the first category board) ---
{
  await page.evaluate(() => { window.__cwQaCam = { pos: [-1, 4, 2], target: [-5.4, 3.5, 12] }; });
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => {
    const h = window.__cwAvatarHist?.slice(-1)[0];
    return { x: h.x, y: h.y, z: h.z };
  });
  const hit = await clickSign(-10.7, 17.4, 2.4);
  check('state-test sign opens', hit.opened, '');
  if (hit.opened) {
    const lock1 = await page.evaluate(() => window.__cwInputLocked);
    check('input locked while open', lock1 === true, '');
    const cl = await closeCard();
    check('closed for state test', cl.closed, '');
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => {
      const h = window.__cwAvatarHist?.slice(-1)[0];
      return { x: h.x, y: h.y, z: h.z };
    });
    const drift = Math.hypot(after.x - before.x, after.z - before.z);
    check('avatar position preserved through open/close', drift < 0.15, `drift=${drift.toFixed(3)}u`);
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    await page.keyboard.up('w');
    const moved = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]);
    check('movement restored after Return', Math.abs(moved.z - after.z) > 0.3, `Δz=${(moved.z - after.z).toFixed(2)}`);
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
}

const errs = pageErrors.length + consoleErrors.length;
check('zero page/console errors', errs === 0, `${pageErrors.length} page, ${consoleErrors.length} console`);

const fails = results.filter((r) => !r.pass);
console.log(`\n=== STAGE 1 INTERACTIONS (final): ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));

await browser.close();
console.log('DONE');
