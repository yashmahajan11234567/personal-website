import { chromium } from 'playwright';
const OUT = '/Users/yashsiphone/CLOUD_WORLD_DOCKSIDE/PHASE_4_PROTOTYPE/shots/';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
await p.goto('http://localhost:5174/#/cloud-world-25d', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__cw25d, { timeout: 30000 });
await p.evaluate(() => __cw25d.forceHigh());
await new Promise(r => setTimeout(r, 6000));
// p4-6 boat moving WITH keys held (wake visible)
await p.evaluate(() => { __cw25d.teleport(29.5, 0); __cw25d.board(); });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => { __cw25d.key('d'); __cw25d.key('s'); });
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: OUT + 'p4-6-boat-moving.png' });
console.log('SAIL', await p.evaluate(() => JSON.stringify({ mode: __cw25d.mode, boat: __cw25d.boat, fps: __cw25d.fps })));
// p4-4 walking shot
await p.goto('http://localhost:5174/#/cloud-world-25d', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__cw25d, { timeout: 30000 });
await p.evaluate(() => __cw25d.forceHigh());
await new Promise(r => setTimeout(r, 5000));
await p.evaluate(() => { __cw25d.zoom(0.4); __cw25d.teleport(26.5, 0.8); __cw25d.key('a'); __cw25d.key('s'); });
await new Promise(r => setTimeout(r, 900));
await p.screenshot({ path: OUT + 'p4-4-walking.png' });
console.log('WALK pos', await p.evaluate(() => JSON.stringify(__cw25d.pos)));
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
