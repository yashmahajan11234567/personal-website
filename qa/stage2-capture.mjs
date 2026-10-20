/** Stage 2 verification: carved bore clearance (live audit against
 * __cwMountainDomes), avatar walk-through z 88→182, lantern pulse, shots. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
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
await page.waitForTimeout(3000);

// ---- 1. LIVE clearance audit: same corridor test against rendered domes ----
const audit = await page.evaluate(() => {
  const domes = window.__cwMountainDomes;
  const BORE_R = 5.2, DISP = 1.22, MARGIN = 1.15;
  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const pathCenterX = (z) => {
    const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
    const amp = 1 - 0.75 * canyon;
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
  };
  const terrainHeight = (x, z) => {
    const d = Math.abs(x - pathCenterX(z));
    const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7)
      + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
    const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6)
      + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
    const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
    const flatten = smoothstep(4.5, 16, d);
    const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
    const rimZ = smoothstep(-38, -95, z) * 10;
    const toward = 1 - smoothstep(-95, -72, z);
    return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + toward * 2.2;
  };
  let blocking = 0, worst = 1e9, worstAt = null;
  for (const d of domes) {
    for (let z = 98; z <= 172; z += 2) {
      const cx = pathCenterX(z);
      const gy = terrainHeight(cx, z);
      for (const dx of [0, -(BORE_R - 0.8), BORE_R - 0.8]) {
        for (const h of [0.5, 2.5, 4.5]) {
          const nx = (cx + dx - d.x) / (d.sx * DISP);
          const ny = (gy + h - d.y) / (d.sy * DISP);
          const nz = (z - d.z) / (d.sz * DISP);
          const r2 = nx * nx + ny * ny + nz * nz;
          if (r2 < worst) { worst = r2; worstAt = { x: d.x, y: d.y, z: d.z }; }
          if (r2 < MARGIN * MARGIN) { blocking++; break; }
        }
      }
    }
  }
  return { total: domes.length, blocking, worst: Math.sqrt(worst), worstAt };
});
console.log('LIVE clearance audit (rendered domes):');
console.log(`  total mass elements: ${audit.total}`);
console.log(`  elements intersecting the corridor (r<1.15): ${audit.blocking}`);
console.log(`  worst normalized distance: ${audit.worst.toFixed(3)} (need >= 1.15)`);

// ---- 2. Pinned approach shot (same pin as baseline 04) ----
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 30, 60], target: [0, 2, 130] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/01-mountain-approach.png` });

// ---- 3. Entrance close-up (same pin as baseline 05) ----
await page.evaluate(() => {
  const pcx = (z) => {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    const amp = 1 - 0.75 * canyon;
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
  };
  window.__cwQaCam = { pos: [pcx(88), 16, 82], target: [pcx(100), 4, 102] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-tunnel-entrance.png` });

// ---- 4. Through-bore view: camera inside the tunnel looking down it ----
await page.evaluate(() => {
  const pcx = (z) => {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    const amp = 1 - 0.75 * canyon;
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
  };
  window.__cwQaCam = { pos: [pcx(102), 3.2, 104], target: [pcx(168), 3.5, 170] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/03-bore-interior-lookthrough.png` });
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(500);

// ---- 5. Walk through: hold W and let the path lock carry the avatar ----
console.log('=== Walk-through z 88→182 (hold W, sample hist) ===');
const zStart = await page.evaluate(() => {
  const h = window.__cwAvatarHist;
  return h.length ? h[h.length - 1].z : null;
});
console.log('avatar z before walk:', zStart);
// The avatar starts at spawn; walking forward from z0 to z>180 takes ~35-45s
// at ~7 u/s incl. camera-relative orientation. Use long hold.
await page.keyboard.down('w');
let zNow = zStart;
let t0 = Date.now();
while (zNow < 182 && Date.now() - t0 < 90000) {
  await page.waitForTimeout(2000);
  zNow = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h.length ? h[h.length - 1].z : 0;
  });
}
await page.keyboard.up('w');
console.log(`avatar z after walk: ${zNow} (took ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/04-exit-after-walkthrough.png` });

// x-drift check inside the canyon: the path lock should hold |x - pcx| small.
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
  return { samples: seg.length, maxOff };
});
console.log('in-canyon path-lock drift:', JSON.stringify(drift));

// ---- 6. Lantern pulse: sample emissive over 3s (never dark) ----
await page.evaluate(() => { window.__cwQaCam = undefined; });
const pulse = await page.evaluate(async () => {
  const canvas = document.querySelector('canvas');
  const key = Object.keys(canvas).find((k) => k.startsWith('__reactFiber'));
  let fiber = canvas[key];
  let store = null, depth = 0;
  while (fiber && depth < 25) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (hook.memoizedState?.getState) { store = hook.memoizedState; break; }
      hook = hook.next;
    }
    if (store) break;
    fiber = fiber.return; depth++;
  }
  if (!store) return { error: 'no store' };
  const scene = store.getState().scene;
  let lanternMats = [];
  scene.traverse((o) => {
    if (o.material?.emissive && o.material.color?.getHexString() === 'ffd9a0') {
      lanternMats.push(o.material);
    }
  });
  if (!lanternMats.length) return { error: 'no lantern material found' };
  const samples = [];
  for (let i = 0; i < 12; i++) {
    samples.push(+lanternMats[0].emissiveIntensity.toFixed(3));
    await new Promise((r) => setTimeout(r, 250));
  }
  return { count: lanternMats.length, min: Math.min(...samples), max: Math.max(...samples), samples };
});
console.log('lantern pulse over 3s:', JSON.stringify(pulse));

// ---- 7. Console ----
const errs = consoleLogs.filter((l) => l.type === 'error');
console.log(`console msgs: ${consoleLogs.length}, errors: ${errs.length}`);
errs.slice(0, 8).forEach((e) => console.log('  [error]', e.text.slice(0, 180)));

await browser.close();
console.log('DONE');
