import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 10, 62], target: [0, 9, 102] }; });
await page.waitForTimeout(900);
// Unproject the slot's screen center (240, 450) to a world ray and intersect the scene.
const res = await page.evaluate(() => {
  const scene = window.__cwScene;
  // rebuild camera state from the QA pin (the rig applied it last frame)
  const canvas = document.querySelector('canvas');
  // Use THREE from the page bundle via the scene's lights? Simpler: find the
  // PerspectiveCamera in the scene graph? Cameras aren't scene children in R3F
  // default. Use manual math with fov 50, aspect 1.6, cam pos/target known.
  // Ray through NDC (-0.667, 0): dir = camDir rotated left by atan(0.667*0.4663*1.6).
  const camPos = { x: 0, y: 10, z: 62 };
  const target = { x: 0, y: 9, z: 102 };
  // forward
  const f = { x: target.x - camPos.x, y: target.y - camPos.y, z: target.z - camPos.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x/=fl; f.y/=fl; f.z/=fl;
  const ang = Math.atan(0.667 * Math.tan(25*Math.PI/180) * 1.6);
  // rotate f about Y by +ang (left = negative x when looking +z)
  const dx = f.x * Math.cos(ang) - f.z * Math.sin(ang);
  const dz = f.x * Math.sin(ang) + f.z * Math.cos(ang);
  // March the ray, find first intersect with the mountain surface AABB test:
  // the surface is one mesh — instead march and report what's there per step:
  const steps = [];
  for (let d = 0; d < 60; d += 4) {
    const px = camPos.x + dx * d, py = camPos.y + f.y * d, pz = camPos.z + dz * d;
    steps.push({ d: Math.round(d), x: Math.round(px), y: Math.round(py*10)/10, z: Math.round(pz) });
  }
  return { dir: { dx: Math.round(dx*1000)/1000, dz: Math.round(dz*1000)/1000 }, steps };
});
console.log(JSON.stringify(res, null, 0));
await browser.close();
