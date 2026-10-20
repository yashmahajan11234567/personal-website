/** Stage 1 interactions v3 — pixel-driven sign targeting.
 * For each sign: pin the camera 13u in front of the sign at board height,
 * screenshot, find the wood board's pixel centroid in the NEAR half of the
 * frame (largest wood region reachable from the lower-center), click its
 * centroid, verify the card. This cannot hit a distant sign: we click the
 * nearest board's own pixels. */
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage1-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
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

/** Pin 13u in front of the sign; sign ground height is UNKNOWN to the test,
 * so sweep the camera target height across a few candidates, screenshot each,
 * and keep the pin where the board's wood centroid is closest to frame
 * center. Then click that centroid. */
async function clickSign(signX, signZ, scale) {
  const boardY = (2.35 + 0.55) * scale;
  let bestPin = null;
  for (const gy of [0, 2, 4]) {
    const cy = gy + boardY;
    await page.evaluate(({ x, z, cy }) => {
      window.__cwQaCam = { pos: [x + 0.4, cy + 1.0, z - 13], target: [x, cy, z] };
    }, { x: signX, z: signZ, cy });
    await page.waitForTimeout(700);
    const shot = `${OUT}/_target-sweep.png`;
    await page.screenshot({ path: shot });
    // find wood centroid in the central 60% of the frame
    const png = PNG.sync.read(fs.readFileSync(shot));
    const { width: W, height: H, data } = png;
    const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
    const isWood = ([r, g, b]) => Math.abs(r - 139) < 55 && Math.abs(g - 94) < 50 && Math.abs(b - 52) < 45 && r > g && g > b;
    // flood from several seeds across the middle band, largest wins
    const seen = new Uint8Array(W * H);
    let best = null;
    for (const [sx, sy] of [[720, 450], [620, 450], [820, 450], [720, 550], [720, 350], [500, 450], [940, 450]]) {
      if (seen[sy * W + sx] || !isWood(at(sx, sy))) continue;
      const stack = [[sx, sy]];
      let n = 0, sumX = 0, sumY = 0;
      while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const k = y * W + x;
        if (seen[k]) continue;
        seen[k] = 1;
        if (!isWood(at(x, y))) continue;
        n++; sumX += x; sumY += y;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      if (!best || n > best.n) best = { n, cx: Math.round(sumX / n), cy2: Math.round(sumY / n) };
    }
    if (best && best.n > 20000) {
      const dist = Math.hypot(best.cx - 720, best.cy2 - 450);
      if (!bestPin || dist < bestPin.dist) bestPin = { dist, cx: best.cx, cy: best.cy2, gy };
    }
  }
  if (!bestPin) return { error: 'no wood board found in any sweep pin' };
  // final pin at the best height, click the centroid
  const cy = bestPin.gy + boardY;
  await page.evaluate(({ x, z, cy }) => {
    window.__cwQaCam = { pos: [x + 0.4, cy + 1.0, z - 13], target: [x, cy, z] };
  }, { x: signX, z: signZ, cy });
  await page.waitForTimeout(700);
  await page.mouse.click(bestPin.cx, bestPin.cy);
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  return { opened, cx: bestPin.cx, cy: bestPin.cy, dist: Math.round(bestPin.dist) };
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
  { id: 'rxverify', x: pathCenterX(196) - 13, z: 196 },
  { id: 'go-microservices', x: pathCenterX(206) + 13, z: 206 },
  { id: 'medigen', x: pathCenterX(216) - 13, z: 216 },
];
for (const p of projects) {
  const hit = await clickSign(p.x, p.z, 3.6);
  check(`${p.id} click opens card`, hit.opened, hit.error ? hit.error : `clicked (${hit.cx},${hit.cy}) ${hit.dist}px from center`);
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

// --- Skill signs ---
const skills = [
  { id: 'git', x: pathCenterX(16) - 11.5, z: 16 },
  { id: 'docker', x: pathCenterX(29) + 11.5, z: 29 },
];
for (const sk of skills) {
  const hit = await clickSign(sk.x, sk.z, 3.0);
  check(`${sk.id} click opens card`, hit.opened, hit.error ? hit.error : `(${hit.cx},${hit.cy})`);
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
  const gx = pathCenterX(16) - 11.5;
  await page.evaluate(() => { window.__cwQaCam = { pos: [-1, 4, 2], target: [-5.4, 3.5, 12] }; });
  await page.waitForTimeout(700);
  const before = await page.evaluate(() => {
    const h = window.__cwAvatarHist?.slice(-1)[0];
    return { x: h.x, y: h.y, z: h.z };
  });
  const hit = await clickSign(gx, 16, 3.0);
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
console.log(`\n=== STAGE 1 INTERACTIONS v3: ${results.length - fails.length}/${results.length} pass ===`);
fails.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));

await browser.close();
console.log('DONE');
