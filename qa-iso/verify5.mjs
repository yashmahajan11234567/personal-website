import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen') && document.querySelectorAll('#experience canvas').length > 0, { timeout: 40000 });
await new Promise(r => setTimeout(r, 2000));
await p.evaluate(() => window.scrollTo(0, 3000));
await new Promise(r => setTimeout(r, 400));
const y0 = await p.evaluate(() => Math.round(window.scrollY));
console.log('Y0', y0);
const cases = [
  ['#/cloud-world-25d', '.cw25d-back'],
  ['#/cloud-world-iso', '.iso-index-btn'],
  ['#/cloud-world', 'button'],
];
for (const [h, sel] of cases) {
  await p.evaluate((hh) => { location.hash = hh; }, h);
  await new Promise(r => setTimeout(r, 7000));
  const open = await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, overflow: getComputedStyle(document.documentElement).overflow, expInDom: !!document.getElementById('experience') }));
  let clicked = null;
  if (h === '#/cloud-world') {
    clicked = await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find(x => /back to portfolio/i.test(x.textContent || '')); if (el) { el.click(); return 'worldshell'; } return null; });
  } else {
    clicked = await p.evaluate((s) => { const el = document.querySelector(s); if (el) { el.click(); return s; } return null; }, sel);
  }
  await new Promise(r => setTimeout(r, 5000));
  const back = await p.evaluate(() => JSON.stringify({ hash: location.hash, exp: !!document.getElementById('experience'), overflow: getComputedStyle(document.documentElement).overflow, scrollH: document.scrollingElement.scrollHeight, y: Math.round(window.scrollY) }));
  console.log('RT', h, 'open:', open, 'clicked:', clicked, 'back:', back);
}
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
