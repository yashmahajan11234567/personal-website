import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes) && window.__cwMountFace, { timeout: 25000 });
await page.waitForTimeout(2000);
const suspects = await page.evaluate(() => {
  // Any dome whose inflated ellipsoid contains the sight line from (0,12,80)
  // to the sign center (-0.94, 19.43, 90.6)?
  const domes = window.__cwMountainDomes || [];
  const DISP = 1.22;
  const hits = [];
  // sample the sight line
  for (let t = 0; t <= 1; t += 0.02) {
    const px = -0.94 * t + 0 * (1-t);
    const py = 19.43 * t + 12 * (1-t);
    const pz = 90.6 * t + 80 * (1-t);
    for (const d of domes) {
      const nx = (px - d.x) / (d.sx * DISP);
      const ny = (py - d.y) / (d.sy * DISP);
      const nz = (pz - d.z) / (d.sz * DISP);
      if (nx*nx + ny*ny + nz*nz < 1) {
        hits.push({ at: [Math.round(px*10)/10, Math.round(py*10)/10, Math.round(pz*10)/10], dome: { x: Math.round(d.x), y: Math.round(d.y), z: Math.round(d.z), sx: Math.round(d.sx), sy: Math.round(d.sy), sz: Math.round(d.sz) } });
        break;
      }
    }
  }
  return hits.slice(0, 8);
});
console.log(JSON.stringify(suspects, null, 1));
await browser.close();
