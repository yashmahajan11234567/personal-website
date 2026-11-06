import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => window.scrollTo(0, 3000));
await new Promise(r => setTimeout(r, 500));
const y0 = await p.evaluate(() => window.scrollY);
for (const h of ['#/cloud-world-25d', '#/cloud-world-iso', '#/cloud-world']) {
  await p.evaluate((hh) => { location.hash = hh; }, h);
  await new Promise(r => setTimeout(r, 7000));
  const st = await p.evaluate(() => JSON.stringify({ hash: location.hash, expInDom: !!document.getElementById('experience'), scrollH: document.scrollingElement.scrollHeight, vh: innerHeight, overflow: getComputedStyle(document.documentElement).overflow, canvas: document.querySelectorAll('canvas').length }));
  console.log('OPEN', h, st);
}
await p.evaluate(() => { const b = document.querySelector('.cw25d-back, .iso-back, [class*="back" i]'); (b || [...document.querySelectorAll('button')].find(x => /back/i.test(x.textContent||'')))?.click(); });
await new Promise(r => setTimeout(r, 5000));
console.log('BACK', await p.evaluate(() => JSON.stringify({ exp: !!document.getElementById('experience'), overflow: getComputedStyle(document.documentElement).overflow, scrollH: document.scrollingElement.scrollHeight, y: window.scrollY, y0: 3000, hero: !!document.querySelector('header, .hero, #hero') })));
await p.screenshot({ path: 'qa-iso/reg-7-after-back.png' });
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
