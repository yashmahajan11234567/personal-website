/** Stage 1 interactions v2: click each sign at its PROJECTED screen center
 * (computed in-page from the live scene), then verify the card data. This
 * removes the grid-scan ambiguity (a distant sign's generous hit-sphere
 * overlaps the same screen cells as the pinned target). */
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

/** Pin the QA cam, then project the sign's board center to screen px and
 * click exactly there. Board center world pos: (x, groundY + (2.35+0.55)*s, z). */
async function clickSignAtCenter(signX, signZ, scale, camPos) {
  await page.evaluate(({ pos }) => { window.__cwQaCam = { pos, target: null }; }, { pos: camPos });
  // aim the controls target at the sign via a second evaluate (needs target)
  await page.evaluate(({ pos, tx, ty, tz }) => {
    window.__cwQaCam = { pos, target: [tx, ty, tz] };
  }, { pos: camPos, tx: signX, ty: 9.5, tz: signZ });
  await page.waitForTimeout(800);
  const scr = await page.evaluate(({ x, z, s }) => {
    // find the sign group nearest (x,z) and project its board center
    const canvasEl = document.querySelector('canvas');
    const fiberKey = Object.keys(canvasEl).find((k) => k.startsWith('__reactFiber'));
    let fiber = canvasEl[fiberKey];
    let store = null;
    let depth = 0;
    while (fiber && depth < 30 && !store) {
      let hook = fiber.memoizedState;
      while (hook) {
        if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') { store = hook.memoizedState; break; }
        hook = hook.next;
      }
      fiber = fiber.return; depth++;
    }
    if (!store) return null;
    const scene = store.getState().scene;
    const cam = store.getState().camera;
    const size = store.getState().size;
    let best = null;
    const wp = new (Object.getPrototypeOf(cam.position).constructor)();
    scene.traverse((obj) => {
      if (obj.type !== 'Group' || obj.children.length < 6) return;
      const d = Math.hypot(obj.position.x - x, obj.position.z - z);
      if (d < 2 && (!best || d < best.d)) best = { obj, d };
    });
    if (!best) return { error: 'sign group not found' };
    const y = best.obj.position.y + (2.35 + 0.55) * s;
    wp.set(x, y, z);
    wp.project(cam);
    return {
      px: Math.round((wp.x * 0.5 + 0.5) * size.width),
      py: Math.round((-wp.y * 0.5 + 0.5) * size.height),
    };
  }, { x: signX, z: signZ, s: scale });
  if (!scr || scr.error || scr.px == null) return { error: scr?.error || 'projection failed' };
  await page.mouse.click(scr.px, scr.py);
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  return { px: scr.px, py: scr.py, opened };
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

// --- Project signs ---
const projects = [
  { id: 'rxverify', x: pathCenterX(196) - 13, z: 196, scale: 3.6 },
  { id: 'go-microservices', x: pathCenterX(206) + 13, z: 206, scale: 3.6 },
  { id: 'medigen', x: pathCenterX(216) - 13, z: 216, scale: 3.6 },
];
for (const p of projects) {
  const camPos = [p.x + Math.sign(pathCenterX(p.z) - p.x || 1) * 1.2, 11.5, p.z - 14];
  const hit = await clickSignAtCenter(p.x, p.z, p.scale, camPos);
  check(`${p.id} click opens card`, hit.opened, hit.error ? hit.error : `clicked (${hit.px},${hit.py})`);
  if (hit.opened) {
    const c = await readCard();
    const expected = await page.evaluate((id) => {
      const pr = window.__PORTFOLIO__?.projects?.[id];
      return pr ? { title: pr.title, desc: pr.description } : null;
    }, p.id);
    check(`${p.id} title exact`, expected && c.title === expected.title, c.title);
    check(`${p.id} desc exact`, expected && c.desc === expected.desc, '');
    check(`${p.id} one button, zero links`, c.buttons === 1 && c.links === 0, '');
    await page.screenshot({ path: `${OUT}/card-${p.id}.png` });
    const cl = await closeCard();
    check(`${p.id} Return-to-World closes + unlocks`, cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

// --- Skill signs (nearest-first: Git at z16, Docker z29) ---
const skills = [
  { id: 'git', x: pathCenterX(16) - 11.5, z: 16, scale: 3.0, cam: [-1, 4, 2] },
  { id: 'docker', x: pathCenterX(29) + 11.5, z: 29, scale: 3.0, cam: [4, 4, 16] },
];
for (const sk of skills) {
  const hit = await clickSignAtCenter(sk.x, sk.z, sk.scale, sk.cam);
  check(`${sk.id} click opens card`, hit.opened, hit.error ? hit.error : `(${hit.px},${hit.py})`);
  if (hit.opened) {
    const c = await readCard();
    const expected = await page.evaluate((id) => {
      const s = window.__PORTFOLIO__?.skills?.[id];
      return s ? { title: s.name, desc: s.summary } : null;
    }, sk.id);
    check(`${sk.id} title exact`, expected && c.title === expected.title, c.title);
    check(`${sk.id} desc exact`, expected && c.desc === expected.desc, '');
    await page.screenshot({ path: `${OUT}/card-${sk.id}.png` });
    const cl = await closeCard();
    check(`${sk.id} card closes`, cl.closed && cl.lock === false, '');
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

// --- Return-to-World state restoration ---
{
  await page.evaluate(() => { window.__cwQaCam = { pos: [-1, 4, 2], target: [-5.4, 3.5, 12] }; });
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => {
    const h = window.__cwAvatarHist?.slice(-1)[0];
    return { x: h.x, y: h.y, z: h.z };
  });
  const hit = await clickSignAtCenter(pathCenterX(16) - 11.5, 16, 3.0, [-1, 4, 2]);
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

const errs = errors.length + consoleErrors.length;
check('zero page/console errors', errs === 0, `${errors.length} page, ${consoleErrors.length} console`);

const fails = results.filter((r) => !r.pass);
console.log(`\n=== STAGE 1 INTERACTIONS v2: ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));

await browser.close();
console.log('DONE');
