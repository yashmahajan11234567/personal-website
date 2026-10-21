/** FPS re-measurement (prior pass measured 28.6-28.7 on this iGPU — ~4% under
 * the 30 gate; this build cut triangles ~42%). 20s sampled windows via the
 * site's own frame instrumentation, plus final journey captures: approach
 * during real movement, plaza arrival. */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-v10-recon';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 100)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__cwAvatarHist?.length > 0, { timeout: 25000 });
await page.waitForTimeout(2500);

// ---- FPS window 1: idle-ish (camera pin on the mountain vista) ----
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 6.5, 44], target: [0, 6, 100] }; });
await page.waitForTimeout(500);
const w1 = await page.evaluate(async () => {
  const t0 = performance.now();
  const f0 = +(document.documentElement.dataset.cwFps ?? 0);
  await new Promise((r) => setTimeout(r, 20000));
  const f1 = +(document.documentElement.dataset.cwFps ?? 0);
  const t1 = performance.now();
  return { fps: +((f1 - f0) / ((t1 - t0) / 1000)).toFixed(2), frames: f1 - f0, secs: +((t1 - t0) / 1000).toFixed(1) };
});
console.log('FPS window 1 (pinned vista):', JSON.stringify(w1));

// ---- FPS window 2: walking (worst case - movement + camera easing) ----
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(400);
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.keyboard.down('w');
const w2 = await page.evaluate(async () => {
  const t0 = performance.now();
  const f0 = +(document.documentElement.dataset.cwFps ?? 0);
  await new Promise((r) => setTimeout(r, 20000));
  const f1 = +(document.documentElement.dataset.cwFps ?? 0);
  const t1 = performance.now();
  return { fps: +((f1 - f0) / ((t1 - t0) / 1000)).toFixed(2), frames: f1 - f0, secs: +((t1 - t0) / 1000).toFixed(1) };
});
await page.keyboard.up('w');
console.log('FPS window 2 (walking):', JSON.stringify(w2));

// draw stats snapshot
const stats = await page.evaluate(() => ({
  drawCalls: document.documentElement.dataset.cwDrawCalls,
  triangles: document.documentElement.dataset.cwTriangles,
}));
console.log('render stats:', JSON.stringify(stats));

// ---- Final journey captures ----
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/final-valley-walk.png` });
// walk to the tunnel for the real gameplay approach shot
let z = 0;
for (let i = 0; i < 14 && z < 88; i++) {
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  z = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
}
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/final-gameplay-approach.png` });
console.log('gameplay approach @z', z.toFixed(1));
// continue through the bore to the plaza
for (let i = 0; i < 26 && z < 240; i++) {
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  z = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
}
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/final-plaza-arrival.png` });
console.log('plaza arrival @z', z.toFixed(1));

console.log('errors:', JSON.stringify(errors.slice(0, 3)), `total ${errors.length}`);
await browser.close();
console.log('DONE');
