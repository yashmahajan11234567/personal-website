// Measure sky share at the NATURAL rig pose for avatar z=85 (follow 15u,
// target avatar+1.8) vs the audit replacement pose (trail 9.5). Evidence for
// calibrating the 01 sky gate — no scene changes.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';

const BASE = 'http://[::1]:4173/#/cloud-world';
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) { const c = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * c); }
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  return (swell + medium * 0.55 + fine) * smoothstep(4.5, 16, d) + smoothstep(55, 105, Math.abs(x)) * 14 + smoothstep(-38, -95, z) * 10 + (1 - smoothstep(-95, -72, z)) * 2.2;
}
const isSkyRGB = ([r, g, b]) => r > 200 && g > 150 && b > 55 && b < 0.68 * r && g < 0.88 * r && g > 0.6 * r;

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(6000);

for (const [label, az, trail] of [['natural-15u', 85, 15], ['incanyon-9.5u', 85, 9.5], ['far-30u', 85, 30]]) {
  const cx = pathCenterX(az);
  const camZ = az - trail;
  const camY = terrainHeight(cx, camZ) + 7.5;
  const tgtY = terrainHeight(cx, az) + 1.8;
  const pos = [cx, camY, camZ], target = [cx, tgtY, az];
  await page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [pos, target]);
  await page.waitForTimeout(1200);
  const f = `qa-screenshots-vis007/pose-calib-${label}.png`;
  await page.screenshot({ path: f });
  const png = PNG.sync.read(fs.readFileSync(f));
  let sky = 0, tot = 0, dark = 0;
  for (let y = 0; y < png.height * 0.5; y += 2) for (let x = 0; x < png.width; x += 4) {
    const i = (y * png.width + x) * 4, r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    tot++;
    if (isSkyRGB([r, g, b])) sky++;
    if (r < 60 && g < 45 && b < 35) dark++;
  }
  console.log(`${label}: cam z=${camZ.toFixed(1)} y=${camY.toFixed(1)} → sky(upper half)=${(100 * sky / tot).toFixed(2)}% dark=${(100 * dark / tot).toFixed(2)}%`);
}
await browser.close();
