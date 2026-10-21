/** Full mesh inventory — every mesh, no vertex filter. */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);

const inv = await page.evaluate(() => {
  const scene = window.__cwScene;
  const out = [];
  scene.traverse((o) => {
    if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      out.push({
        verts: o.geometry.attributes.position.count,
        min: [+(bb.min.x).toFixed(1), +(bb.min.y).toFixed(1), +(bb.min.z).toFixed(1)],
        max: [+(bb.max.x).toFixed(1), +(bb.max.y).toFixed(1), +(bb.max.z).toFixed(1)],
        parentY: o.parent && o.parent.position ? +o.parent.position.y.toFixed(1) : 0,
      });
    }
  });
  return out.sort((a, b) => b.verts - a.verts);
});
for (const m of inv) console.log(JSON.stringify(m));
await browser.close();
console.log('done');
