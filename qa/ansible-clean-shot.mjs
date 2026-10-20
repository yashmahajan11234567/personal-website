/** Clean ansible shot: camera positioned so the sign is the ONLY thing at
 * frame center — compute the pin from the sign's exact facing normal and
 * verify no billboard intersection (billboard at (6.99,72) must not cross
 * the cam→sign segment). */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-fix';

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
  const tm = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

const sx = pathCenterX(80) + 12.5;   // 10.36
const by = terrainHeight(sx, 80) + 8.7;
// Camera on the -z side of the sign, level, 12u out, offset laterally so
// the billboard (6.99,72) is NOT on the segment: use x offset +3.
const camPos = [sx + 3, by + 1.0, 80 - 11.7];
// check billboard distance to the segment
const seg = { x0: camPos[0], z0: camPos[2], x1: sx, z1: 80 };
const L = Math.hypot(seg.x1 - seg.x0, seg.z1 - seg.z0);
const t = ((6.99 - seg.x0) * (seg.x1 - seg.x0) + (72 - seg.z0) * (seg.z1 - seg.z0)) / (L * L);
const qx = seg.x0 + t * (seg.x1 - seg.x0), qz = seg.z0 + t * (seg.z1 - seg.z0);
const bbDist = Math.hypot(6.99 - qx, 72 - qz);
console.log(`billboard distance from cam→sign segment: ${bbDist.toFixed(2)}u (need >5.5 to not occlude)`);

await page.evaluate(({ camPos, sx, by }) => {
  window.__cwQaCam = { pos: camPos, target: [sx, by, 80] };
}, { camPos, sx, by });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/ansible-clean.png` });
console.log('clean shot saved');
await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
