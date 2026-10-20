/** Isolation: does the app's OWN CloudSign component render 'PROJECTS'
 * fully when alone? Load the app page, then in-page: temporarily hide the
 * whole scene except one sign? Too invasive. Instead: verify on-screen
 * text visibility from MANY approach angles with tight crops + vision is
// burning rate limits. Alternative deterministic check: read the RENDERED
 * title plane from the GPU is impossible; but we CAN verify the app's
 * placed sign positions from the page — expose them first. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1000);

// Walk the camera along the path toward the sign, sampling MANY positions,
// and for each, count cream text pixels in the frame (the title halo is
// unlit so it should be bright wherever visible). This maps WHERE the
// title becomes visible/hidden.
const samples = [];
for (let camZ = 60; camZ <= 100; camZ += 4) {
  const r = await page.evaluate(async (camZ) => {
    function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
    const sx = -12.46, sz = 95.5, by = 11.24;
    window.__cwQaCam = { pos: [pathCenterX(camZ), by + 1.2, camZ], target: [sx, by, sz] };
    await new Promise((r) => setTimeout(r, 350));
    // read back the actual camera pose after controls.update()
    // count bright pixels across the whole frame via a 2D readPixels pass
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const W = c.width, H = c.height;
    // wait a frame for the composer to render with the new cam
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // preserveDrawingBuffer is on; count cream-ish and white pixels
    let cream = 0;
    const step = 4; // subsample
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      if (px[i] > 205 && px[i + 1] > 190 && px[i + 2] > 140 && px[i + 2] < 235) cream++;
    }
    return { camZ, cream };
  }, camZ);
  samples.push(r);
}
console.log(JSON.stringify(samples));
await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
