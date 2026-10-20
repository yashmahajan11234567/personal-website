import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);

// ---- Performance probe: 5s of frame stats via the site's own instrumentation ----
const perf = await page.evaluate(async () => {
  const read = () => ({
    fps: document.documentElement.dataset.cwFps,
    calls: document.documentElement.dataset.cwDrawCalls,
    tris: document.documentElement.dataset.cwTriangles,
  });
  const samples = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    samples.push(read());
  }
  return samples;
});
console.log('PERF SAMPLES:', JSON.stringify(perf));

// ---- Gameplay probe: drive the character forward for ~6s, record trajectory ----
await page.keyboard.down('w');
await page.waitForTimeout(6000);
await page.keyboard.up('w');
const traj = await page.evaluate(() => {
  const h = window.__cwAvatarHist || [];
  const first = h[0], last = h[h.length - 1];
  return { start: first && { x: first.x, z: first.z }, end: last && { x: last.x, z: last.z }, n: h.length };
});
console.log('TRAJECTORY:', JSON.stringify(traj));

// ---- Interaction probe: click a skill sign, check the card opens ----
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 8, -6], target: [-11, 4, 18] }; });
await page.waitForTimeout(1200);
// The category signs are canvas meshes; simulate a click at the sign's screen position.
// Simpler + robust: dispatch through the store — but the plan requires real UI. Click canvas center-left where the sign projects.
const vp = page.viewportSize();
await page.mouse.click(Math.round(vp.width * 0.36), Math.round(vp.height * 0.52));
await page.waitForTimeout(1200);
const cardOpen = await page.evaluate(() => !!document.querySelector('.cloud-card, [class*="card"]'));
console.log('CARD OPEN AFTER CLICK:', cardOpen);
await page.evaluate(() => { window.__cwQaCam = undefined; });

console.log('CONSOLE ERRORS:', JSON.stringify(errors));
await page.screenshot({ path: 'qa-screenshots-v9-final/qa-full-pass.png', fullPage: true });
await browser.close();
console.log('done');
