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
const shot = (n) => p.screenshot({ path: OUT + n });

// 1. full harbour
await p.evaluate(() => __cw25d.zoom(1));
await new Promise(r => setTimeout(r, 1500));
await shot('p4-1-full-harbour.png');

// 2. character close-up
await p.evaluate(() => { __cw25d.teleport(15.5, 4.5); __cw25d.zoom(0.13); });
await new Promise(r => setTimeout(r, 2000));
await shot('p4-2-character-closeup.png');

// 3. walking on the dock (mid-stride)
await p.evaluate(() => { __cw25d.zoom(0.4); __cw25d.teleport(26.5, 0.8); __cw25d.key('a'); __cw25d.key('s'); });
await new Promise(r => setTimeout(r, 900));
await shot('p4-4-walking.png');
await p.evaluate(() => { __cw25d.key('a', false); __cw25d.key('s', false); });

// 4. approach dock end + board (prompt visible before boarding)
await p.evaluate(() => { __cw25d.teleport(29.5, 0); __cw25d.zoom(0.5); });
await new Promise(r => setTimeout(r, 1500));
await shot('p4-5-boarding.png'); // E prompt visible over boat
await p.evaluate(() => __cw25d.board());
await new Promise(r => setTimeout(r, 1200));
const mode1 = await p.evaluate(() => __cw25d.mode);

// 5. boat close-up while sailing (side profile of whale)
await p.evaluate(() => { __cw25d.key('d'); __cw25d.key('s'); });
await new Promise(r => setTimeout(r, 2200));
await p.evaluate(() => __cw25d.zoom(0.16));
await new Promise(r => setTimeout(r, 1800));
await shot('p4-3-boat-closeup.png');

// 6. boat moving wide with wake
await p.evaluate(() => { __cw25d.zoom(1); });
await new Promise(r => setTimeout(r, 2000));
await shot('p4-6-boat-moving.png');
const boat = await p.evaluate(() => JSON.stringify({ mode: __cw25d.mode, boat: __cw25d.boat, fps: __cw25d.fps }));
await p.evaluate(() => { __cw25d.key('d', false); __cw25d.key('s', false); });

// 7. About card open (fresh walk mode)
await p.goto('http://localhost:5174/#/cloud-world-25d', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__cw25d, { timeout: 30000 });
await p.evaluate(() => __cw25d.forceHigh());
await new Promise(r => setTimeout(r, 5000));
await p.evaluate(() => { __cw25d.zoom(1); __cw25d.teleport(16.5, -3); __cw25d.clickHotspot('about'); });
await new Promise(r => setTimeout(r, 1800));
await shot('p4-7-about-card.png');

console.log('BOARD-MODE:', mode1, 'SAIL:', boat);
console.log('pageerrors:', errs.length, errs.slice(0, 4));
await b.close();

// mobile pass
const b2 = await chromium.launch({ headless: true });
const p2 = await (await b2.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs2 = [];
p2.on('pageerror', e => errs2.push(String(e).slice(0, 120)));
await p2.goto('http://localhost:5174/#/cloud-world-25d', { waitUntil: 'domcontentloaded' });
await p2.waitForFunction(() => window.__cw25d, { timeout: 30000 });
await new Promise(r => setTimeout(r, 6000));
await p2.evaluate(() => { __cw25d.key('w'); });
await new Promise(r => setTimeout(r, 1500));
await p2.evaluate(() => { __cw25d.key('w', false); });
const mob = await p2.evaluate(() => JSON.stringify({ fps: __cw25d.fps, mode: __cw25d.mode }));
await p2.screenshot({ path: OUT + 'p4-8-mobile-390x844.png' });
console.log('MOBILE:', mob, 'errors:', errs2.length);
await b2.close();
