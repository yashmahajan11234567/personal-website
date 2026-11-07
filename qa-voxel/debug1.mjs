import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message, '\n', (e.stack || '').split('\n').slice(0, 6).join('\n')));
await page.goto('http://localhost:5210/?qa=1#/cloud-world-voxel', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv?.view?.ready, undefined, { timeout: 90000 });
await page.waitForTimeout(2500);

const badge = () => page.evaluate(() => document.querySelector('.cwv-hud__badge')?.textContent);
console.log('badge at spawn:', await badge());

await page.evaluate(() => window.__cwv.teleport(47, 42, 'walk'));
await page.waitForTimeout(1200);
console.log('pos after teleport(47,42):', await page.evaluate(() => window.__cwv.pilot.pos.toArray().map((v) => Math.round(v * 10) / 10)));
console.log('badge after teleport(47,42):', await badge());
console.log('objective:', await page.evaluate(() => document.querySelector('.cwv-objective')?.textContent));

// walk one step and re-check
await page.keyboard.down('w');
await page.waitForTimeout(600);
await page.keyboard.up('w');
console.log('pos after W:', await page.evaluate(() => window.__cwv.pilot.pos.toArray().map((v) => Math.round(v * 10) / 10)));
console.log('badge after W:', await badge());

// ink shells: BackSide === 1
const ink = await page.evaluate(() => {
  let bs1 = 0, any = 0;
  window.__cwv.scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m && m.side === 1)) bs1++;
    if (o.material) any++;
  });
  return { backside1: bs1, withMaterial: any, hasScene: !!window.__cwv.scene };
});
console.log('ink shells:', JSON.stringify(ink));
await browser.close();
