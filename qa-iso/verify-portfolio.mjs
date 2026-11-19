import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 140)));

// 1) HERO
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 30000 });
await new Promise(r => setTimeout(r, 3500));
console.log('HERO', await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, exp: !!document.getElementById('experience'), canvases: document.querySelectorAll('canvas').length })));
await p.screenshot({ path: 'qa-iso/reg-1-hero.png' });

// 2) scroll through to Experience
await p.mouse.move(720, 450);
for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 700); await new Promise(r => setTimeout(r, 220)); }
await new Promise(r => setTimeout(r, 4000));
const exp = await p.evaluate(() => {
  const el = document.getElementById('experience');
  const r = el ? el.getBoundingClientRect() : null;
  return { y: Math.round(window.scrollY), scrollH: document.scrollingElement.scrollHeight, expTop: r && Math.round(r.top), expH: r && Math.round(r.height), canvases: document.querySelectorAll('canvas').length };
});
console.log('EXPERIENCE', JSON.stringify(exp));
await p.screenshot({ path: 'qa-iso/reg-2-experience.png' });

// 3) scroll further (certificates / lower sections)
for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 700); await new Promise(r => setTimeout(r, 220)); }
await new Promise(r => setTimeout(r, 3500));
console.log('LOWER', await p.evaluate(() => JSON.stringify({ y: Math.round(window.scrollY), scrollH: document.scrollingElement.scrollHeight, certs: document.querySelectorAll('[class*="certificate"], [class*="cert"]').length })));
await p.screenshot({ path: 'qa-iso/reg-3-lower.png' });

// 4) open Cloud World 25d from here, then back via button
await p.evaluate(() => { window.location.hash = '#/cloud-world-25d'; });
await p.waitForFunction(() => window.__cw25d, { timeout: 30000 });
await new Promise(r => setTimeout(r, 4000));
console.log('CW-OPEN', await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, overflow: document.documentElement.style.overflow, expInDom: !!document.getElementById('experience'), fps: __cw25d.fps })));
await p.screenshot({ path: 'qa-iso/reg-4-cloud25d.png' });
await p.click('.cw25d-back');
await new Promise(r => setTimeout(r, 5000));
console.log('CW-BACK', await p.evaluate(() => JSON.stringify({ exp: !!document.getElementById('experience'), overflow: document.documentElement.style.overflow, scrollH: document.scrollingElement.scrollHeight, cwGone: !document.querySelector('.cw25d-shell') })));
await p.screenshot({ path: 'qa-iso/reg-5-back.png' });

// 5) other worlds still boot
for (const h of ['#/cloud-world', '#/cloud-world-iso']) {
  await p.evaluate((hh) => { window.location.hash = hh; }, h);
  await new Promise(r => setTimeout(r, 6000));
  const st = await p.evaluate(() => ({ hash: location.hash, shell: !!document.querySelector('.cw25d-shell, .iso-shell, canvas'), scrollH: document.scrollingElement.scrollHeight }));
  console.log('WORLD', h, JSON.stringify(st));
}
console.log('pageerrors:', errs.length, errs.slice(0, 4));
await b.close();
