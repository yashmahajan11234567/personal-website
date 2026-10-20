/** Debug v3: R3F v9 keeps the store inside the fiber of the Canvas's
 * internal Container; try reading the fiber's return chain tags and
 * memoizedState shapes, and check window.__THREE_DEVTOOLS__ hooks. */
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
  const canvasEl = document.querySelector('canvas');
  const rk = Object.keys(canvasEl).find((k) => k.startsWith('__reactFiber'));
  const shapes = [];
  let cur = canvasEl[rk];
  let depth = 0;
  while (cur && depth < 80) {
    const tag = cur.tag;
    const type = typeof cur.type === 'function' ? (cur.type.name || 'anon-fn') : (typeof cur.type === 'string' ? cur.type : String(cur.type));
    let hookDesc = [];
    let hook = cur.memoizedState;
    let hi = 0;
    while (hook && hi < 12) {
      const ms = hook.memoizedState;
      hookDesc.push(`${hi}:${ms ? (typeof ms.getState === 'function' ? 'STORE' : typeof ms) : 'null'}`);
      hook = hook.next; hi++;
    }
    shapes.push(`d${depth} tag${tag} ${String(type).slice(0, 40)} [${hookDesc.join(' ')}]`);
    cur = cur.return; depth++;
  }
  out.shapes = shapes;
  out.devtools = typeof window.__THREE_DEVTOOLS__;
  return out;
});
console.log(info.shapes.join('\n'));
console.log('devtools:', info.devtools);

await browser.close();
console.log('DONE');
