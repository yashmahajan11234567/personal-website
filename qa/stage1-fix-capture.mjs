/** Stage 1 fix verification: re-pin BOTH project signs dead-center (camera
 * on the sign's facing axis, sign fills the frame center), capture, then
 * the corrected probe runs separately. Pins: the sign's yaw is
 * π + tangent*0.6 + sideTilt(±0.42); a camera placed along the board's
 * facing normal sees the board centered. Board center ≈ postTop+0.55*s
 * above ground = (2.35+0.55)*3.6 ≈ 10.44u. */
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
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  return c && c.width > 0 && (window.__cwAvatarHist?.length ?? 0) > 0;
}, { timeout: 25000 });
await page.waitForTimeout(1500);

// Marker positions mirror the source constants (zs 196/206, ±13).
const signs = [
  { name: 'rxverify', z: 196, side: 'left' },
  { name: 'gomicro', z: 206, side: 'right' },
];
for (const s of signs) {
  const x = pathCenterX(s.z) + (s.side === 'left' ? -13 : 13);
  // Camera on the facing normal: sideTilt rotates the board's normal by
  // ±0.42 rad from -Z. Step BACK along that normal 24u, aim at board center.
  const tilt = s.side === 'left' ? -0.42 : 0.42;
  const yaw = Math.PI + tilt; // facing direction of the board
  const dist = 24;
  // normal in xz: (sin(yaw), cos(yaw)) pointing away from the viewer
  const nx = Math.sin(yaw), nz = Math.cos(yaw);
  const camPos = [x + nx * dist, 11.6, s.z + nz * dist];
  await page.evaluate(({ pos, target }) => {
    window.__cwQaCam = { pos, target };
  }, { pos: camPos, target: [x, 9.6, s.z] });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${s.name === 'rxverify' ? '05-project-sign-rxverify' : '06-project-sign-gomicro'}.png` });
  console.log(`captured ${s.name} at sign(${x.toFixed(2)},${s.z}) cam(${camPos.map((v) => v.toFixed(1)).join(',')})`);
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}

console.log('pageerrors:', errors.length);
await browser.close();
console.log('DONE');
