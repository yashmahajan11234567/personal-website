/** Read the live camera pose (position + azimuth toward avatar) at the
 * approach point to find why the PROJECTS sign is out of frame. */
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world');
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0;
}, { timeout: 20000 });
await page.waitForTimeout(2500);

// Face +Z (same drag as the walkthrough scripts)
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(600);

await page.keyboard.down('w');
let z = 0;
const t0 = Date.now();
while (z < 75 && Date.now() - t0 < 40000) {
  await page.waitForTimeout(700);
  z = await page.evaluate(() => {
    const h = window.__cwAvatarHist;
    return h?.length ? h[h.length - 1].z : 0;
  });
}
await page.keyboard.up('w');
await page.waitForTimeout(800);

const state = await page.evaluate(() => {
  const cam = (window.__cwCamHist ?? []).slice(-1)[0];
  const av = (window.__cwAvatarHist ?? []).slice(-1)[0];
  if (!cam || !av) return null;
  // Azimuth of the camera→avatar view direction
  const dx = av.x - cam.x;
  const dz = av.z - cam.z;
  const az = Math.atan2(dx, dz); // 0 = looking +Z
  return {
    cam: { x: +cam.x.toFixed(2), y: +cam.y.toFixed(2), z: +cam.z.toFixed(2) },
    av: { x: +av.x.toFixed(2), z: +av.z.toFixed(2) },
    viewAzimuthDeg: +(az * 180 / Math.PI).toFixed(1),
    // angle from view dir to the PROJECTS sign at (-7.73, 88)
    signAngleDeg: +(
      Math.atan2(-7.73 - cam.x, 88 - cam.z) * 180 / Math.PI
    ).toFixed(1),
  };
});
console.log('camera state at approach:', JSON.stringify(state, null, 1));

// What does the canvas renderer report as its actual camera direction?
// Pin the camera explicitly to where the sign SHOULD be perfectly framed.
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 4.5, 66], target: [-7.7, 3, 88] };
});
await page.waitForTimeout(800);
await page.screenshot({ path: 'qa-screenshots-stage2-newreq/10-pinned-projects-sign.png' });
console.log('pinned shot saved');

await browser.close();
console.log('DONE');
