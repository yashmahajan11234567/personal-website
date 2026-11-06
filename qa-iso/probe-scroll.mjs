import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto('http://localhost:5174/#/cloud-world-iso', { waitUntil: 'domcontentloaded' });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__iso, { timeout: 25000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));
const before = await p.evaluate(() => ({
  scrollH: document.scrollingElement.scrollHeight, innerH: window.innerHeight,
  bodyH: document.body.scrollHeight, docH: document.documentElement.scrollHeight,
  world: window.__iso ? 'iso' : 'none',
  mainChildren: [...document.getElementById('main').children].map(c => c.tagName + '.' + String(c.className).slice(0, 40)),
  expEls: document.querySelectorAll('[class*="experience"],[id*="experience"]').length,
}));
console.log('BEFORE', JSON.stringify(before, null, 1));
await p.mouse.move(720, 450);
for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 400); await new Promise(r => setTimeout(r, 250)); }
await new Promise(r => setTimeout(r, 1500));
const after = await p.evaluate(() => ({ y: window.scrollY, scrollH: document.scrollingElement.scrollHeight, expVisible: (() => { const els = [...document.querySelectorAll('[class*="experience"],[id*="experience"]')]; return els.map(e => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.top), Math.round(r.height)]; }).slice(0, 5); })() }));
console.log('AFTER WHEEL', JSON.stringify(after, null, 1));
await p.screenshot({ path: 'qa-iso/scroll-leak.png' });
await b.close();
