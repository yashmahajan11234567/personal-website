/**
 * Focused test: clicking a building with the REAL mouse opens its panel.
 * This is the headline feature of the third-person upgrade, so it gets a
 * dedicated harness that positions the camera first and verifies each step
 * (hover -> tooltip -> cursor -> click -> panel) rather than assuming.
 */
import { chromium } from 'playwright';

const PORT = process.env.PORT || '5210';
const BASE = `http://localhost:${PORT}/?qa=1#/cloud-world-voxel`;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv?.view?.ready, undefined, { timeout: 90000 });
await page.waitForTimeout(3000);

let pass = 0;
let fail = 0;
const check = (n, ok, d = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
  ok ? pass++ : fail++;
};

/** Project a world point to page pixels using the live camera matrices. */
async function project(world) {
  return page.evaluate((p) => {
    const c = window.__cwv;
    const cam = c.camera;
    cam.updateMatrixWorld();
    const vm = cam.matrixWorldInverse.elements;
    const pm = cam.projectionMatrix.elements;
    const x = p.x, y = p.y, z = p.z;
    const tx = vm[0] * x + vm[4] * y + vm[8] * z + vm[12];
    const ty = vm[1] * x + vm[5] * y + vm[9] * z + vm[13];
    const tz = vm[2] * x + vm[6] * y + vm[10] * z + vm[14];
    const tw = vm[3] * x + vm[7] * y + vm[11] * z + vm[15];
    const cx = pm[0] * tx + pm[4] * ty + pm[8] * tz + pm[12] * tw;
    const cy = pm[1] * tx + pm[5] * ty + pm[9] * tz + pm[13] * tw;
    const cw = pm[3] * tx + pm[7] * ty + pm[11] * tz + pm[15] * tw;
    const rect = c.renderer.domElement.getBoundingClientRect();
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    return {
      px: rect.left + ((ndcX + 1) / 2) * rect.width,
      py: rect.top + ((1 - ndcY) / 2) * rect.height,
      onScreen: cw > 0 && Math.abs(ndcX) <= 0.98 && Math.abs(ndcY) <= 0.98,
      ndcX,
      ndcY,
    };
  }, world);
}

// Stand in the village plaza, camera low and close so the houses fill the frame
await page.evaluate(() => {
  window.__cwv.teleport(47, 40, 'walk');
  window.__cwv.look(0, 0.85, 0.5);
});
await page.waitForTimeout(1500);

const houses = await page.evaluate(() =>
  window.__cwv.hotspots
    .filter((h) => ['skills', 'projects', 'experience', 'cloud', 'data'].includes(h.panel))
    .map((h) => ({ id: h.id, panel: h.panel, label: h.label, x: h.x, y: h.y, z: h.z, r: h.r })),
);
check('five village houses registered as hotspots', houses.length === 5, houses.map((h) => h.panel).join(','));

let clickedAny = false;
let cursorChanged = false;
let tooltipShown = false;

for (const h of houses) {
  const s = await project({ x: h.x, y: h.y + 1.1, z: h.z });
  console.log(`  ${h.panel}: ndc=(${s.ndcX.toFixed(2)}, ${s.ndcY.toFixed(2)}) onScreen=${s.onScreen}`);
  if (!s.onScreen) continue;

  await page.mouse.move(s.px, s.py);
  await page.waitForTimeout(450); // let the hover raycast run

  const hover = await page.evaluate(() => ({
    tip: document.querySelector('.cwv-tip')?.textContent ?? null,
    cursor: document.querySelector('canvas')?.style.cursor ?? '',
  }));
  if (hover.tip) tooltipShown = true;
  if (hover.cursor === 'pointer') cursorChanged = true;

  await page.mouse.click(s.px, s.py);
  await page.waitForTimeout(700);
  const title = await page.evaluate(() => document.querySelector('.cwv-panel__title')?.textContent ?? null);
  if (title && title.length > 0) {
    clickedAny = true;
    console.log(`  -> opened "${title}" by clicking ${h.panel}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
  }
}

check('hovering a house shows a tooltip', tooltipShown === true);
check('cursor becomes a pointer over a house', cursorChanged === true);
check('clicking a house with the real mouse opens its panel', clickedAny === true);

// click-to-move must NOT fire when a panel is open
await page.evaluate(() => window.__cwv.teleport(47, 40, 'walk'));
await page.waitForTimeout(600);
const panelGuard = await page.evaluate(async () => {
  const c = window.__cwv;
  c.open('skills');
  await new Promise((r) => setTimeout(r, 250));
  const before = { x: c.pilot.pos.x, z: c.pilot.pos.z };
  const rect = c.renderer.domElement.getBoundingClientRect();
  return { before, cx: rect.left + rect.width * 0.7, cy: rect.top + rect.height * 0.8 };
});
await page.mouse.click(panelGuard.cx, panelGuard.cy);
await page.waitForTimeout(500);
const afterGuard = await page.evaluate(() => ({
  target: window.__cwv.pilot.moveTarget,
  x: window.__cwv.pilot.pos.x,
  z: window.__cwv.pilot.pos.z,
}));
check(
  'clicking the world behind an open panel does not move the player',
  afterGuard.target === null,
  JSON.stringify(afterGuard.target),
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// clicking open ground DOES order a walk — find a point that is genuinely
// ground (no tooltip under it) instead of hardcoding one that may be a house
await page.evaluate(() => window.__cwv.teleport(47, 40, 'walk'));
await page.waitForTimeout(600);

const candidates = await page.evaluate(() => {
  const r = window.__cwv.renderer.domElement.getBoundingClientRect();
  const pts = [];
  for (let fy = 0.3; fy <= 0.92; fy += 0.08) {
    for (let fx = 0.12; fx <= 0.9; fx += 0.08) {
      pts.push({ px: r.left + r.width * fx, py: r.top + r.height * fy });
    }
  }
  return pts;
});

let groundPoint = null;
for (const pt of candidates) {
  await page.mouse.move(pt.px, pt.py);
  await page.waitForTimeout(90);
  const tip = await page.evaluate(() => document.querySelector('.cwv-tip')?.textContent ?? null);
  if (!tip) {
    groundPoint = pt;
    break;
  }
}

check('found a genuine open-ground point to click', groundPoint !== null);
if (groundPoint) {
  await page.evaluate(() => {
    window.__cwv.pilot.moveTarget = null;
  });
  await page.mouse.click(groundPoint.px, groundPoint.py);
  await page.waitForTimeout(450);
  const groundClick = await page.evaluate(() => ({
    target: window.__cwv.pilot.moveTarget,
    panel: document.querySelector('.cwv-panel__title')?.textContent ?? null,
  }));
  check(
    'clicking open ground orders a walk (click-to-move)',
    groundClick.target !== null && groundClick.panel === null,
    JSON.stringify(groundClick),
  );
}

check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
await browser.close();
process.exit(fail ? 1 : 0);