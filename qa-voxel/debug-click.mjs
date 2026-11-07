import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto('http://localhost:5210/?qa=1#/cloud-world-voxel', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv?.view?.ready, undefined, { timeout: 90000 });
await page.waitForTimeout(2500);

await page.evaluate(() => { window.__cwv.teleport(47, 40, 'walk'); window.__cwv.look(0, 0.85, 0.5); });
await page.waitForTimeout(1500);

// what does a centre-lower click resolve to?
const diag = await page.evaluate(() => {
  const c = window.__cwv;
  const rect = c.renderer.domElement.getBoundingClientRect();
  const px = rect.left + rect.width * 0.5;
  const py = rect.top + rect.height * 0.62;
  const ndcX = ((px - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((py - rect.top) / rect.height) * 2 + 1;
  // replicate the hover raycast against hotspot proxies
  const THREE = window.__THREE_DEBUG;
  const cam = c.camera;
  const dir = { x: 0, y: 0, z: 0 };
  // manual ray from camera through ndc using camera matrices
  const vm = cam.matrixWorldInverse.elements;
  const pm = cam.projectionMatrix.elements;
  // unproject: inverse of (pm*vm)
  return { px, py, ndcX, ndcY, hasThree: !!THREE, hotspots: c.hotspots.length, player: [c.pilot.pos.x, c.pilot.pos.z] };
});
console.log('diag:', JSON.stringify(diag));

// brute force: sample a grid of screen points, report which hotspot (if any) is under each
const grid = await page.evaluate(() => {
  const c = window.__cwv;
  const rect = c.renderer.domElement.getBoundingClientRect();
  const out = [];
  for (let fy = 0.35; fy <= 0.9; fy += 0.1) {
    const row = [];
    for (let fx = 0.15; fx <= 0.85; fx += 0.1) {
      row.push({ fx: +fx.toFixed(2), fy: +fy.toFixed(2) });
    }
    out.push(row);
  }
  return { rect: { l: rect.left, t: rect.top, w: rect.width, h: rect.height }, out };
});

let groundHits = 0;
let hotspotHits = 0;
for (const row of grid.out) {
  for (const cell of row) {
    const px = grid.rect.l + grid.rect.w * cell.fx;
    const py = grid.rect.t + grid.rect.h * cell.fy;
    await page.mouse.move(px, py);
    await page.waitForTimeout(120);
    const tip = await page.evaluate(() => document.querySelector('.cwv-tip')?.textContent ?? null);
    if (tip) hotspotHits++;
    else groundHits++;
  }
}
console.log(`grid sample: ${groundHits} ground points, ${hotspotHits} hotspot points of ${groundHits + hotspotHits}`);

// now click one that is ground and see if a walk order is created
await page.evaluate(() => { window.__cwv.pilot.moveTarget = null; });
const target = await page.evaluate(() => {
  const c = window.__cwv;
  const rect = c.renderer.domElement.getBoundingClientRect();
  return { px: rect.left + rect.width * 0.5, py: rect.top + rect.height * 0.88 };
});
await page.mouse.move(target.px, target.py);
await page.waitForTimeout(200);
const tipAt = await page.evaluate(() => document.querySelector('.cwv-tip')?.textContent ?? null);
await page.mouse.click(target.px, target.py);
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({
  target: window.__cwv.pilot.moveTarget,
  panel: document.querySelector('.cwv-panel__title')?.textContent ?? null,
  pos: [window.__cwv.pilot.pos.x, window.__cwv.pilot.pos.z],
}));
console.log('bottom-centre click: tip=', JSON.stringify(tipAt), 'result=', JSON.stringify(after));

await browser.close();