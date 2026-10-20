import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes) && window.__cwMountFace, { timeout: 25000 });
await page.waitForTimeout(2500);
// Expose the three module objects for raycasting via a debug hook: R3F stores
// the scene on canvas fiber root. Use __cwCamHist canvas: get renderer via
// document.querySelector('canvas') fiber.
const res = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const fiberRoot = Object.keys(canvas).find(k => k.startsWith('__reactContainer') || k.startsWith('__reactFiber'));
  // Walk the R3F store: window.__r3f not exposed; instead use the QA camera +
  // THREE raycaster against a list built from __cwMountainDomes math — but the
  // MESHES aren't exposed. Expose scene via a different route: __cwQaCam already
  // proves CameraTargetRig runs. The FrameDriver has `gl` and `scene`? Not exposed.
  return { fiberRoot: !!fiberRoot };
});
console.log(JSON.stringify(res));
await browser.close();
