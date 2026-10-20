/** Debug v2: find the R3F store by scanning ALL canvas-adjacent fibers and
 * the window for THREE objects; also try the __r3f kernel on DOM nodes. */
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
  // R3F attaches the store to the container div via __r3f? Try all elements.
  const all = document.querySelectorAll('*');
  let found = null;
  for (const el of all) {
    const rk = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
    if (!rk) continue;
    let fiber = el[rk];
    let depth = 0;
    let cur = fiber;
    while (cur && depth < 40 && !found) {
      let hook = cur.memoizedState;
      while (hook) {
        const ms = hook.memoizedState;
        if (ms && typeof ms.getState === 'function' && ms.getState().scene) { found = ms; break; }
        hook = hook.next;
      }
      cur = cur.return; depth++;
    }
    if (found) { out.foundOn = el.tagName + '.' + (el.className || '').toString().slice(0, 30); break; }
  }
  out.found = !!found;
  if (found) {
    const st = found.getState();
    out.stateKeys = Object.keys(st);
    let groups = 0;
    st.scene?.traverse((o) => { if (o.type === 'Group' && o.children.length >= 6) groups++; });
    out.signGroups = groups;
    out.size = st.size;
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
console.log('DONE');
