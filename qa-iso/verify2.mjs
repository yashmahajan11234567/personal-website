import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));
console.log('HERO', await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, exp: !!document.getElementById('experience') })));
// scroll to experience and click a destination card
await p.evaluate(() => document.getElementById('experience')?.scrollIntoView({ block: 'start' }));
await new Promise(r => setTimeout(r, 4000));
const card = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('#experience button')].map(b => b.textContent?.trim().slice(0, 40));
  return btns.slice(0, 6);
});
console.log('EXP-BUTTONS', JSON.stringify(card));
await p.evaluate(() => { const b = [...document.querySelectorAll('#experience button')].find(x => /lighthouse/i.test(x.textContent || '')); b?.click(); });
await new Promise(r => setTimeout(r, 3500));
console.log('AFTER-CLICK', await p.evaluate(() => JSON.stringify({ cert: document.querySelectorAll('[class*="certificate" i], [class*="cert" i]').length, panel: document.querySelectorAll('#experience aside, #experience [class*="panel" i]').length, scrollH: document.scrollingElement.scrollHeight })));
await p.screenshot({ path: 'qa-iso/reg-6-card-click.png' });
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
