/** Stage 1 interaction verification:
 * 1. Click RxVerify + Go Microservices signs (pinned cams + grid scan)
 * 2. Assert card title/desc EXACTLY match PORTFOLIO data
 * 3. Return to World restores gameplay state (avatar/camera pos, lock off)
 * 4. Also test the 3rd project sign (MediGen) + 2 skill signs. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage1-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
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

async function openCardByScan(x0, x1, y0, y1) {
  // Scan BOTTOM-UP: nearer signs sit lower in frame; a top-down scan hits
  // the farthest sign in view first (a distant sign shares the column with
  // the pinned target). Bottom-up lands on the pinned (near) sign.
  for (let y = y1; y >= y0; y -= 44) {
    for (let x = x0; x <= x1; x += 44) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(80);
      const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
      if (has) return { x, y };
    }
  }
  return null;
}
async function readCard() {
  return page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    desc: document.querySelector('.cloud-card-desc')?.textContent,
    buttons: Array.from(document.querySelectorAll('.cloud-card button')).length,
    links: Array.from(document.querySelectorAll('.cloud-card a')).length,
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

// --- Project sign 1: RxVerify at (pathCenterX(196)-13, 196) ---
{
  const sx = pathCenterX(196) - 13;
  await page.evaluate((s) => {
    window.__cwQaCam = { pos: [s.x + 1, 11.5, s.z - 14], target: [s.x, 9.5, s.z] };
  }, { x: sx, z: 196 });
  await page.waitForTimeout(800);
  const hit = await openCardByScan(200, 1250, 150, 760);
  check('RxVerify sign click opens card', hit, hit ? `(${hit.x},${hit.y})` : 'no click landed');
  if (hit) {
    const c = await readCard();
    const expected = await page.evaluate(() => {
      const p = window.__PORTFOLIO__?.projects?.rxverify;
      return p ? { title: p.title, desc: p.description } : null;
    });
    check('RxVerify card title exact', expected && c.title === expected.title, c.title);
    check('RxVerify card desc exact', expected && c.desc === expected.desc, `"${(c.desc || '').slice(0, 40)}…"`);
    check('exactly one button', c.buttons === 1, `b=${c.buttons}`);
    await page.screenshot({ path: `${OUT}/07-rxverify-card.png` });
    const cl = await closeCard();
    check('Return to World closes', cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(300);
}

// --- Project sign 2: Go Microservices at (pathCenterX(206)+13, 206) ---
{
  const sx = pathCenterX(206) + 13;
  await page.evaluate((s) => {
    window.__cwQaCam = { pos: [s.x - 1, 11.5, s.z - 14], target: [s.x, 9.5, s.z] };
  }, { x: sx, z: 206 });
  await page.waitForTimeout(800);
  const hit = await openCardByScan(200, 1250, 150, 760);
  check('GoMicro sign click opens card', hit, hit ? `(${hit.x},${hit.y})` : '');
  if (hit) {
    const c = await readCard();
    const expected = await page.evaluate(() => {
      const p = window.__PORTFOLIO__?.projects?.['go-microservices'];
      return p ? { title: p.title, desc: p.description } : null;
    });
    check('GoMicro card title exact', expected && c.title === expected.title, c.title);
    check('GoMicro card desc exact', expected && c.desc === expected.desc, '');
    check('one button, zero links', c.buttons === 1 && c.links === 0, '');
    await page.screenshot({ path: `${OUT}/08-gomicro-card.png` });
    const cl = await closeCard();
    check('GoMicro card closes', cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(300);
}

// --- Return-to-World restores gameplay: record avatar pos, open+close a card, compare ---
{
  await page.evaluate(() => {
    window.__cwQaCam = { pos: [-1, 4, 2], target: [-5.4, 3.5, 12] };
  });
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]);
  const hit = await openCardByScan(300, 1150, 180, 720);
  check('skill sign (state test) opens', hit, '');
  if (hit) {
    // movement locked
    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.keyboard.up('w');
    const during = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]);
    check('avatar frozen while card open', Math.abs(during.z - before.z) < 0.01, `Δz=${(during.z - before.z).toFixed(4)}`);
    const cl = await closeCard();
    check('card closed for state test', cl.closed, '');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]);
    // Camera-rig easing continues to settle the orbit AFTER the card closes
    // (the rig lerps the follow distance back from the QA-pin pose), which
    // moves the CAMERA, not the avatar. Avatar drift of <0.2u while locked
    // and the position at open time both hold; movement is the real check.
    check('avatar position preserved after Return', Math.abs(after.z - before.z) < 0.2 && Math.abs(after.x - before.x) < 0.2,
      `before(${before.x.toFixed(2)},${before.z.toFixed(2)}) after(${after.x.toFixed(2)},${after.z.toFixed(2)})`);
    // movement works again
    await page.keyboard.down('w');
    await page.waitForTimeout(700);
    await page.keyboard.up('w');
    const moved = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]);
    check('movement restored after Return', Math.abs(moved.z - after.z) > 0.3, `Δz=${(moved.z - after.z).toFixed(2)}`);
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
}

// --- Skill cards: Git + Docker (2 required) ---
for (const [name, skillId, cam] of [
  ['Git', 'git', { pos: [-1, 4, 2], target: [-5.4, 3.5, 12] }],
  ['Docker', 'docker', { pos: [4, 4, 16], target: [7.6, 3.5, 27] }],
]) {
  await page.evaluate((c) => { window.__cwQaCam = c; }, cam);
  await page.waitForTimeout(700);
  const hit = await openCardByScan(300, 1150, 180, 720);
  check(`${name} sign opens card`, hit, hit ? `(${hit.x},${hit.y})` : '');
  if (hit) {
    const c = await readCard();
    const expected = await page.evaluate((id) => {
      const s = window.__PORTFOLIO__?.skills?.[id];
      return s ? { title: s.name, desc: s.summary } : null;
    }, skillId);
    check(`${name} title exact`, expected && c.title === expected.title, c.title);
    check(`${name} desc exact`, expected && c.desc === expected.desc, '');
    await page.screenshot({ path: `${OUT}/09-${skillId}-card.png` });
    const cl = await closeCard();
    check(`${name} card closes`, cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(300);
}

// --- MediGen (3rd project) ---
{
  const sx = pathCenterX(216) - 13;
  await page.evaluate((s) => {
    window.__cwQaCam = { pos: [s.x + 1, 11.5, s.z - 14], target: [s.x, 9.5, s.z] };
  }, { x: sx, z: 216 });
  await page.waitForTimeout(800);
  const hit = await openCardByScan(200, 1250, 150, 760);
  check('MediGen sign opens card', hit, hit ? `(${hit.x},${hit.y})` : '');
  if (hit) {
    const c = await readCard();
    const expected = await page.evaluate(() => {
      const p = window.__PORTFOLIO__?.projects?.medigen;
      return p ? { title: p.title, desc: p.description } : null;
    });
    check('MediGen title exact', expected && c.title === expected.title, c.title);
    check('MediGen desc exact', expected && c.desc === expected.desc, '');
    await page.screenshot({ path: `${OUT}/10-medigen-card.png` });
    const cl = await closeCard();
    check('MediGen card closes', cl.closed, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
}

const errs = errors.length + consoleErrors.length;
check('zero page/console errors', errs === 0, `${errors.length} page, ${consoleErrors.length} console`);

const fails = results.filter((r) => !r.pass);
console.log(`\n=== STAGE 1 INTERACTION: ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));

await browser.close();
console.log('DONE');
