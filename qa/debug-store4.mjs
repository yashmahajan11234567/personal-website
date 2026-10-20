/** Debug v4: the Canvas root fiber is at d3 (tag0 'cx' — the R3F root
 * component). R3F v9 uses zustand store in context, not hooks. Read the
 * CONTEXT: fiber d3's memoizedState chain won't hold it; look at
 * pendingProps of the root or the `container` connected via
 * canvasEl.__r3f-like keys. Alternative: THREE objects are reachable from
 * WebGL: window.__THREE__ registry? Try gl.context and renderer globals. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  const out = {};
  // Every THREE Scene registered? THREE keeps a global objects registry only
  // via devtools. But Object3D has .isObject3D; we can find the scene via
  // WebGLRenderer.renderLists? Simplest: use the WebGL context to find the
  // canvas's __r3f DOM prop.
  const canvasEl = document.querySelector('canvas');
  out.canvasKeys = Object.keys(canvasEl);
  // The container div:
  const parent = canvasEl.parentElement;
  out.parentKeys = Object.keys(parent);
  const gp = parent.parentElement;
  out.gpKeys = Object.keys(gp).slice(0, 10);
  // look for anything with .scene
  for (const el of [canvasEl, parent, gp]) {
    for (const k of Object.keys(el)) {
      try {
        const v = el[k];
        if (v && typeof v === 'object' && v.scene && v.scene.isScene) out.sceneOn = el.tagName + ':' + k;
      } catch {}
    }
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
console.log('DONE');
