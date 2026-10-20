/** Stage 2b: walk-through with camera rotated to face the mountain (+Z),
 * lantern pulse via material-emissive scan. */
import { chromium } from 'playwright';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-newreq';

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleLogs = [];
page.on('console', (m) => consoleLogs.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (e) => console.log(`  [pageerror] ${e.message}`));

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(
  () => {
    const c = document.querySelector('canvas');
    const gl = c?.getContext('webgl2') || c?.getContext('webgl');
    return gl && c.width > 0 && c.height > 0 && Array.isArray(window.__cwMountainDomes);
  },
  { timeout: 20000 },
);
await page.waitForTimeout(2500);

// Rotate the orbit camera to face +Z (toward the mountain): drag from center
// toward the bottom of the screen (OrbitControls azimuth → π).
console.log('=== Rotate camera to face the mountain ===');
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(720 + i * 30, 450, { steps: 2 });
}
await page.mouse.up();
await page.waitForTimeout(800);

// Verify azimuth via avatar velocity direction: tap W briefly and read drift.
await page.keyboard.down('w');
await page.waitForTimeout(1200);
await page.keyboard.up('w');
await page.waitForTimeout(600);
const probe = await page.evaluate(() => {
  const h = window.__cwAvatarHist;
  if (!h || h.length < 2) return null;
  const a = h[h.length - 6] ?? h[0];
  const b = h[h.length - 1];
  return { dz: +(b.z - a.z).toFixed(2), dx: +(b.x - a.x).toFixed(2) };
});
console.log('W probe (should be dz>0 now):', JSON.stringify(probe));

console.log('=== Walk through the bore to the Sunset zone ===');
await page.keyboard.down('w');
let zNow = 0, t0 = Date.now(), innerShots = 0;
while (zNow < 186 && Date.now() - t0 < 120000) {
  await page.waitForTimeout(1500);
  zNow = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h.length ? h[h.length - 1].z : 0;
  });
  // Capture entrance + interior + exit frames once each
  if (zNow > 96 && zNow < 108 && innerShots === 0) {
    innerShots = 1;
    await page.screenshot({ path: `${OUT}/05-walk-entering-bore.png` });
    console.log('  shot: entering bore @z', zNow.toFixed(1));
  } else if (zNow > 126 && zNow < 152 && innerShots === 1) {
    innerShots = 2;
    await page.screenshot({ path: `${OUT}/06-walk-inside-bore.png` });
    console.log('  shot: inside bore @z', zNow.toFixed(1));
  } else if (zNow > 170 && innerShots === 2) {
    innerShots = 3;
    await page.screenshot({ path: `${OUT}/07-walk-exiting-bore.png` });
    console.log('  shot: exiting bore @z', zNow.toFixed(1));
  }
}
await page.keyboard.up('w');
console.log(`avatar z after walk: ${zNow.toFixed(1)} (took ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/08-sunset-zone-arrival.png` });

// Path-lock drift inside the canyon from the recorded history.
const drift = await page.evaluate(() => {
  const h = window.__cwAvatarHist ?? [];
  const seg = h.filter((s) => s.z > 100 && s.z < 170);
  if (!seg.length) return null;
  const pcx = (z) => {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  };
  let maxOff = 0;
  for (const s of seg) maxOff = Math.max(maxOff, Math.abs(s.x - pcx(s.z)));
  return { samples: seg.length, maxOff: +maxOff.toFixed(2) };
});
console.log('in-canyon path-lock max |x - pathCenter|:', JSON.stringify(drift));

// ---- Lantern pulse: scan scene materials for the warm lantern emissive ----
const pulse = await page.evaluate(async () => {
  const canvas = document.querySelector('canvas');
  const key = Object.keys(canvas).find((k) => k.startsWith('__reactFiber'));
  let fiber = canvas[key], store = null, depth = 0;
  while (fiber && depth < 30) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') { store = hook.memoizedState; break; }
      hook = hook.next;
    }
    if (store) break;
    fiber = fiber.return; depth++;
  }
  if (!store) return { error: 'no store' };
  const scene = store.getState().scene;
  const lanternMats = new Set();
  scene.traverse((o) => {
    const m = o.material;
    if (m && m.emissive && m.emissive.getHexString?.() === 'ffb45e' && m.emissiveIntensity !== undefined && m.color?.getHexString() === 'ffd9a0') {
      lanternMats.add(m);
    }
  });
  if (!lanternMats.size) return { error: 'no lantern material' };
  const mat = [...lanternMats][0];
  const samples = [];
  for (let i = 0; i < 14; i++) {
    samples.push(+mat.emissiveIntensity.toFixed(3));
    await new Promise((r) => setTimeout(r, 220));
  }
  return { count: lanternMats.size, min: Math.min(...samples), max: Math.max(...samples), samples };
});
console.log('lantern pulse over ~3s:', JSON.stringify(pulse));

const errs = consoleLogs.filter((l) => l.type === 'error');
console.log(`console: ${consoleLogs.length} msgs, ${errs.length} errors`);
errs.slice(0, 6).forEach((e) => console.log('  [error]', e.text.slice(0, 160)));

await browser.close();
console.log('DONE');
