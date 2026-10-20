/** Debug: why does the store lookup fail? Try multiple approaches to reach
 * the R3F store / scene from the canvas element. */
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
  const canvasEl = document.querySelector('canvas');
  const keys = Object.keys(canvasEl);
  // Walk fiber for the store
  const fiberKey = keys.find((k) => k.startsWith('__reactFiber'));
  let fiber = canvasEl[fiberKey];
  const path = [];
  let store = null;
  let depth = 0;
  let cur = fiber;
  while (cur && depth < 60) {
    let hook = cur.memoizedState;
    let hi = 0;
    while (hook) {
      if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') {
        store = hook.memoizedState;
        path.push(`depth${depth}.hook${hi}`);
        break;
      }
      hook = hook.next; hi++;
    }
    if (store) break;
    cur = cur.return; depth++;
  }
  const out = { keys, fiberKey: !!fiberKey, storeFound: !!store, path };
  if (store) {
    const st = store.getState();
    out.stateKeys = Object.keys(st);
    out.hasScene = !!st.scene;
    out.hasCamera = !!st.camera;
    out.size = st.size;
    // count sign groups
    let groups = 0;
    if (st.scene) st.scene.traverse((o) => { if (o.type === 'Group' && o.children.length >= 6) groups++; });
    out.signGroups = groups;
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
console.log('DONE');
