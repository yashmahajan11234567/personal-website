/** Sign→card mapping v2: for each project marker, sweep the pin target-y
 * and pick the pin where the frame's largest wood region is closest to
 * frame center; click that region's centroid; print the card title. */
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
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

function woodCentroid(shot) {
  const png = PNG.sync.read(fs.readFileSync(shot));
  const { width: W, height: H, data } = png;
  const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const isWood = ([r, g, b]) => Math.abs(r - 139) < 55 && Math.abs(g - 94) < 50 && Math.abs(b - 52) < 45 && r > g && g > b;
  const seen = new Uint8Array(W * H);
  let best = null;
  for (let sy = 250; sy < 800; sy += 30) {
    for (let sx = 150; sx < W - 150; sx += 40) {
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
      if (!best || n > best.n) best = { n, cx: Math.round(sumX / n), cy: Math.round(sumY / n) };
    }
  }
  return best;
}

const markers = [
  { z: 196, side: 'L', x: pathCenterX(196) - 13 },
  { z: 206, side: 'R', x: pathCenterX(206) + 13 },
  { z: 216, side: 'L', x: pathCenterX(216) - 13 },
  { z: 226, side: 'R', x: pathCenterX(226) + 13 },
];

for (const m of markers) {
  const tilt = m.side === 'L' ? -0.42 : 0.42;
  const yaw = Math.PI + tilt;
  const nx = Math.sin(yaw), nz = Math.cos(yaw);
  let bestPin = null;
  for (const ty of [6, 8, 10.4, 12.5]) {
    const camPos = [m.x + nx * 12, ty + 1.2, m.z + nz * 12];
    await page.evaluate(({ pos, tx, ty }) => {
      window.__cwQaCam = { pos, target: [tx, ty, window.__cwTz] };
    }, { pos: camPos, tx: m.x, ty });
    await page.evaluate(({ z }) => { window.__cwTz = z; }, { z: m.z });
    // simpler: set both at once
    await page.evaluate(({ pos, tx, ty, tz }) => {
      window.__cwQaCam = { pos, target: [tx, ty, tz] };
    }, { pos: camPos, tx: m.x, ty, tz: m.z });
    await page.waitForTimeout(700);
    const shot = `${OUT}/_sweep.png`;
    await page.screenshot({ path: shot });
    const c = woodCentroid(shot);
    if (c && c.n > 20000) {
      const dist = Math.hypot(c.cx - 720, c.cy - 450);
      if (!bestPin || dist < bestPin.dist) bestPin = { dist, ...c, ty };
    }
  }
  if (!bestPin) { console.log(`marker z=${m.z} ${m.side} → (no board isolated)`); continue; }
  // re-pin at best height and click the centroid
  const camPos = [m.x + nx * 12, bestPin.ty + 1.2, m.z + nz * 12];
  await page.evaluate(({ pos, tx, ty, tz }) => {
    window.__cwQaCam = { pos, target: [tx, ty, tz] };
  }, { pos: camPos, tx: m.x, ty: bestPin.ty, tz: m.z });
  await page.waitForTimeout(700);
  await page.mouse.click(bestPin.cx, bestPin.cy);
  await page.waitForTimeout(300);
  const title = await page.evaluate(() => document.querySelector('.cloud-card-title')?.textContent || '(none)');
  const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  if (has) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  console.log(`marker z=${m.z} ${m.side} → card: ${title}  (clicked ${bestPin.cx},${bestPin.cy}, ${Math.round(bestPin.dist)}px off center, board ${bestPin.n}px)`);
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

await browser.close();
console.log('DONE');
