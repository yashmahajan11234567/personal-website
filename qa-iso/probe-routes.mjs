import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
// hero: wait load, scroll to experience section
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 25000 });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => document.getElementById('experience')?.scrollIntoView());
await new Promise(r => setTimeout(r, 3500));
const exp = await p.evaluate(() => {
  const el = document.getElementById('experience');
  const r = el ? el.getBoundingClientRect() : null;
  return { exists: !!el, top: r && Math.round(r.top), scrollY: window.scrollY, scrollH: document.scrollingElement.scrollHeight, canvases: document.querySelectorAll('canvas').length };
});
console.log('EXPERIENCE', JSON.stringify(exp));
await p.screenshot({ path: 'qa-iso/route-experience.png' });
// into iso world
await p.evaluate(() => { window.location.hash = '#/cloud-world-iso'; });
await p.waitForFunction(() => window.__iso, { timeout: 25000 });
await new Promise(r => setTimeout(r, 3000));
const iso = await p.evaluate(() => ({ scrollH: document.scrollingElement.scrollHeight, overflow: document.documentElement.style.overflow, y: window.scrollY, expInDom: !!document.getElementById('experience') }));
console.log('ISO', JSON.stringify(iso));
await p.mouse.move(720, 450);
for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 500); await new Promise(r => setTimeout(r, 200)); }
await new Promise(r => setTimeout(r, 800));
console.log('ISO-AFTER-WHEEL', await p.evaluate(() => JSON.stringify({ y: window.scrollY, scrollH: document.scrollingElement.scrollHeight })));
await p.screenshot({ path: 'qa-iso/route-iso.png' });
// back to portfolio
await p.evaluate(() => { window.location.hash = ''; });
await new Promise(r => setTimeout(r, 4000));
const back = await p.evaluate(() => ({ world: !!document.querySelector('.iso-shell') ? 'iso' : 'hero', expInDom: !!document.getElementById('experience'), overflow: document.documentElement.style.overflow, scrollH: document.scrollingElement.scrollHeight, y: window.scrollY }));
console.log('BACK', JSON.stringify(back));
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
