import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const warns = [];
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warns.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => warns.push('PAGEERROR ' + e.message.slice(0, 200)));
// production URL: NO ?qa=1
await page.goto('http://localhost:5210/#/cloud-world-voxel', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__cwv && window.__cwv.view.ready, undefined, { timeout: 60000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'qa-voxel/a-prod-spawn.png' });
const info = await page.evaluate(() => ({ calls: window.__cwv.renderer.info.render.calls, tris: window.__cwv.renderer.info.render.triangles, mode: window.__cwv.pilot.mode }));
console.log('prod info:', JSON.stringify(info));
console.log('warnings/errors (expect only THREE.Clock):');
console.log(warns.length ? warns.join('\n') : 'none');
await browser.close();
