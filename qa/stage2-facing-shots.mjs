/** Direct-facing pins: place camera along the sign's facing normal. */
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

// Ansible: sign yaw = π + tangent*0.6 + 0.42 (right side). The facing
// normal (direction the board looks) is (sin(yaw), cos(yaw)); the camera
// must sit ALONG that normal on the sign's z-side: cam = sign + normal*13.
const signs = [
  { name: 'ansible-80R', x: pathCenterX(80) + 12.5, z: 80, s: 3.0, tilt: 0.42 },
  { name: 'terraform-88R', x: pathCenterX(88) + 11.5, z: 88, s: 3.0, tilt: 0.42 },
];
for (const sg of signs) {
  const by = terrainHeight(sg.x, sg.z) + 2.9 * sg.s;
  const yaw = Math.PI + sg.tilt;
  const nx = Math.sin(yaw), nz = Math.cos(yaw);
  const camPos = [sg.x + nx * 13, by + 1.2, sg.z + nz * 13];
  await page.evaluate(({ camPos, sg, by }) => {
    window.__cwQaCam = { pos: camPos, target: [sg.x, by, sg.z] };
  }, { camPos, sg, by });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${sg.name}-facing.png` });
  console.log(`${sg.name} facing shot: cam(${camPos.map((v) => v.toFixed(1)).join(',')}) → (${sg.x.toFixed(1)},${sg.z})`);
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  await page.waitForTimeout(400);
}
await browser.close();
console.log('DONE');
