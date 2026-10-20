import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes) && window.__cwMountFace, { timeout: 25000 });
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 9, 50], target: [0, 10, 100] }; });
await page.waitForTimeout(900);
// Compute where the sign should appear using camera math (fov 50, aspect 1.6).
// With qaCam pinned, camera pos (0,9,50) target (0,10,100): view dir ≈ (0,0.02,0.9998).
// Sign center (x -0.94, y 19.43, z 90.6). Vector from cam: (−0.94, 10.43, 40.6).
// fov 50° vertical → half 25°, screen half-height = tan(25°)=0.466. Distance along
// view ≈ 40.6. y offset angle = atan(10.43/40.6) ≈ 14.4° → screen y frac = tan(14.4)/tan(25)
// ≈ 0.257/0.466 ≈ 0.55 above center → pixel y ≈ 450 − 0.55*450 ≈ 202. x frac =
// (−0.94/40.6)/(0.466*1.6) ≈ −0.031 → pixel x ≈ 720 − 21 ≈ 699.
const { PNG } = await import('pngjs');
const fs = await import('fs');
const shot = await page.screenshot({ path: 'qa-screenshots-redesign/12-vista-fixed.png' });
const png = PNG.sync.read(shot);
function px(x, y) { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i+1], png.data[i+2]]; }
// Sample a grid around the expected sign position
const samples = [];
for (const [dx, dy] of [[0,0],[-60,0],[60,0],[0,-40],[0,40],[-100,-80],[100,-80]]) {
  samples.push({ at: [699+dx, 202+dy], rgb: px(699+dx, 202+dy) });
}
console.log(JSON.stringify(samples));
await browser.close();
