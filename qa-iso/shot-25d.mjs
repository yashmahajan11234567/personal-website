import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 140)); });
await p.goto('http://localhost:5174/#/cloud-world-25d', { waitUntil: 'domcontentloaded' });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__cw25d, { timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
console.log('SPAWN', await p.evaluate(() => JSON.stringify({ mode: __cw25d.mode, pos: __cw25d.pos, fps: __cw25d.fps, scrollH: document.scrollingElement.scrollHeight })));
await p.screenshot({ path: 'qa-iso/cw-spawn.png' });
// walk toward dock
await p.evaluate(() => __cw25d.key('d'));
await new Promise(r => setTimeout(r, 2600));
await p.evaluate(() => __cw25d.key('d', false));
await new Promise(r => setTimeout(r, 600));
console.log('WALK', await p.evaluate(() => JSON.stringify({ mode: __cw25d.mode, pos: __cw25d.pos })));
await p.screenshot({ path: 'qa-iso/cw-walk.png' });
// board + sail
await p.evaluate(() => __cw25d.board());
await new Promise(r => setTimeout(r, 800));
console.log('BOARD', await p.evaluate(() => JSON.stringify({ mode: __cw25d.mode, boat: __cw25d.boat })));
await p.evaluate(() => __cw25d.key('d'));
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => __cw25d.key('d', false));
await new Promise(r => setTimeout(r, 800));
console.log('SAIL', await p.evaluate(() => JSON.stringify({ mode: __cw25d.mode, boat: __cw25d.boat, pos: __cw25d.pos })));
await p.screenshot({ path: 'qa-iso/cw-boat.png' });
// card
await p.evaluate(() => __cw25d.clickHotspot('about'));
await new Promise(r => setTimeout(r, 700));
await p.screenshot({ path: 'qa-iso/cw-card.png' });
console.log('CARD', await p.evaluate(() => JSON.stringify({ card: __cw25d.card, errors: __cw25d.errors, fps: __cw25d.fps })));
console.log('pageerrors:', errs.length, errs.slice(0, 4));
await b.close();
