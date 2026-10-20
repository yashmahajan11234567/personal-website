import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-flatfix';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
// baseline captures (regression)
for (const [name, cam, target] of [
  ['base-approach', [0, 9, 50], [0, 11, 96]],
  ['base-frontal', [0, 10, 62], [0, 9, 102]],
  ['base-oblique', [-32, 14, 58], [0, 10, 105]],
]) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('baseline:', name);
}
// LIVE PROBE 1: vertical raycast down onto the mountain mesh at key world points
const probe = await page.evaluate(() => {
  const scene = window.__cwScene;
  let surface = null;
  scene.traverse((o) => {
    if (o.type === 'Mesh' && o.material?.vertexColors && !surface && o.geometry?.attributes?.position?.count > 3000) surface = o;
  });
  if (!surface) return { surface: false };
  const V3 = surface.position.constructor;
  // Minimal Möller–Trumbore raycast straight down from y=80 at (x, z) points
  const pos = surface.geometry.attributes.position;
  const a = new V3(), b = new V3(), c = new V3();
  const heights = {};
  const sampleAt = (x, z) => {
    // ray origin (x, 80, z), dir (0, -1, 0)
    let best = -Infinity;
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i+1); c.fromBufferAttribute(pos, i+2);
      // 2D containment in xz + y interpolation (surface is a heightfield-like strip)
      const d1x = b.x-a.x, d1z = b.z-a.z, d2x = c.x-a.x, d2z = c.z-a.z;
      const det = d1x*d2z - d1z*d2x;
      if (Math.abs(det) < 1e-9) continue;
      const wx = x-a.x, wz = z-a.z;
      const u = (wx*d2z - wz*d2x)/det, v = (d1x*wz - d1z*wx)/det;
      if (u >= 0 && v >= 0 && u+v <= 1) {
        const y = a.y + u*(b.y-a.y) + v*(c.y-a.y);
        if (y > best) best = y;
      }
    }
    return best === -Infinity ? null : Math.round(best*10)/10;
  };
  for (const [x, z] of [[0,76],[0,84],[0,90],[0,100],[0,115],[0,136],[-15,90],[15,90],[-30,90],[30,90],[0,160],[0,180]]) {
    heights[`${x},${z}`] = sampleAt(x, z);
  }
  return { surface: true, triCount: pos.count/3, heights, footprint: window.__cwMountainFootprint };
});
console.log(JSON.stringify(probe, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 4)));
await browser.close();
