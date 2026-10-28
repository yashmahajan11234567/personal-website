// VIS-010 FPS probe — headed, GPU args, 20s window, port 4180.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4180/#/cloud-world';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(2000);
const s1 = await page.evaluate(() => ({
  f: Number(document.documentElement.dataset.cwFps || 0),
  t: Number(document.documentElement.dataset.cwFpsAt || 0),
  calls: Number(document.documentElement.dataset.cwDrawCalls || 0),
  tris: Number(document.documentElement.dataset.cwTriangles || 0),
}));
await page.waitForTimeout(20000);
const s2 = await page.evaluate(() => ({
  f: Number(document.documentElement.dataset.cwFps || 0),
  t: Number(document.documentElement.dataset.cwFpsAt || 0),
  calls: Number(document.documentElement.dataset.cwDrawCalls || 0),
  tris: Number(document.documentElement.dataset.cwTriangles || 0),
}));
const dFrames = s2.f - s1.f;
const dSec = (s2.t - s1.t) / 1000;
const fps = dSec > 0 ? dFrames / dSec : 0;
console.log(`frames ${s1.f} -> ${s2.f} (+${dFrames}) over ${dSec.toFixed(2)}s`);
console.log(`FPS = ${fps.toFixed(1)}  drawCalls=${s2.calls} tris=${s2.tris}`);
console.log(fps >= 30 ? 'PASS: FPS >= 30' : 'FAIL: FPS < 30');
await browser.close();
