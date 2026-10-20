import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2000);
const audit = await page.evaluate(() => {
  const found = [];
  window.__cwScene.traverse((o) => {
    const mat = o.material;
    if (mat && mat.map && mat.map.isCanvasTexture && mat.map.image && mat.map.image.width === 2048) {
      const wp = new (Object.getPrototypeOf(o.position).constructor)();
      o.getWorldPosition(wp);
      found.push({ pos: [Math.round(wp.x*10)/10, Math.round(wp.y*10)/10, Math.round(wp.z*10)/10], scale: Math.round(o.scale.x*100)/100 });
    }
  });
  return found;
});
console.log('title meshes (scale 6.46 = mounted PROJECTS, 4.56 = category, 6.84 = project):');
console.log(JSON.stringify(audit, null, 1));
await browser.close();
