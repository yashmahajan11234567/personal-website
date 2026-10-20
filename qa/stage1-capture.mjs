/** Stage 1 verification capture: skill signs repositioned/enlarged/oriented.
 * Screenshots from the SAME pins as the baseline for A/B comparison. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage1-newreq';

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', (m) => consoleLogs.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (err) => console.log(`  [pageerror] ${err.message}`));

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(
  () => {
    const c = document.querySelector('canvas');
    const gl = c?.getContext('webgl2') || c?.getContext('webgl');
    return gl && c.width > 0 && c.height > 0;
  },
  { timeout: 20000 },
);
await page.waitForTimeout(3000);

console.log('=== 1. Spawn view — start area must be clear of signs ===');
await page.screenshot({ path: `${OUT}/01-spawn-clear.png` });

console.log('=== 2. Pinned wide (same as baseline 02) ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 26, -34], target: [0, 1, 14] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-start-wide-pinned.png` });
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(400);

console.log('=== 3. Approach walk to first signs ===');
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-approach-first-signs.png` });

console.log('=== 4. Close-up pinned on first sign (Git) ===');
// Avatar walked ~10-13u; place camera near the path looking at the Git sign
// at (-5.40, 12). Pin camera slightly behind avatar height 8.
await page.evaluate(() => {
  window.__cwQaCam = { pos: [-2, 7, 4], target: [-5.4, 3.5, 12] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/04-git-sign-closeup.png` });
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(400);

console.log('=== 5. Mid-route pinned on Docker sign (right side) ===');
await page.evaluate(() => {
  window.__cwQaCam = { pos: [10, 8, 20], target: [7.6, 3.5, 27] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/05-docker-sign-closeup.png` });
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(400);

console.log('=== 6. Read sign titles from the running scene (JS) ===');
// Verify all 7 signs + 3 project signs exist with correct ids by checking
// the scene graph via the R3F store (sign groups are identifiable by name).
const signData = await page.evaluate(() => {
  // Walk up the fiber tree from canvas to find the R3F store, list scene
  // objects that are groups with userData or positions matching sign stops.
  const canvas = document.querySelector('canvas');
  const fiberKey = Object.keys(canvas).find((k) => k.startsWith('__reactFiber'));
  if (!fiberKey) return null;
  let fiber = canvas[fiberKey];
  let store = null;
  let depth = 0;
  while (fiber && depth < 25) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') {
        store = hook.memoizedState;
        break;
      }
      hook = hook.next;
    }
    if (store) break;
    fiber = fiber.return;
    depth++;
  }
  if (!store) return { error: 'no store' };
  const scene = store.getState().scene;
  const signs = [];
  scene.traverse((obj) => {
    if (obj.type === 'Group' && obj.children && obj.children.length >= 4) {
      const pos = obj.position;
      // Sign groups have ~6 children (2 posts + 3 boards + title + hit sphere)
      if (obj.children.length >= 6 && Math.abs(pos.y) < 40) {
        signs.push({ x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2), n: obj.children.length });
      }
    }
  });
  return signs;
});
console.log('sign-like groups in scene:', JSON.stringify(signData));

console.log('=== 7. Hover + click the first sign (grid-scan near pinned view) ===');
// Return to gameplay camera and click near the Git sign screen position.
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(500);
let opened = false;
outer: for (let y = 150; y <= 700; y += 50) {
  for (let x = 300; x <= 1150; x += 50) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(100);
    const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (has) { opened = true; console.log(`card opened at (${x},${y})`); break outer; }
  }
}
if (opened) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06-card-open.png` });
  const info = await page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    desc: document.querySelector('.cloud-card-desc')?.textContent,
  }));
  console.log('card shows:', JSON.stringify(info));
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(400);
} else {
  console.log('WARN: no card opened in scan');
}

console.log('=== Console ===');
const errs = consoleLogs.filter((l) => l.type === 'error');
console.log(`msgs: ${consoleLogs.length}, errors: ${errs.length}`);
errs.slice(0, 8).forEach((e) => console.log('  [error]', e.text.slice(0, 180)));

await browser.close();
console.log('DONE');
