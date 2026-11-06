import { chromium } from 'playwright';
const out = [];
const cases = [['#/cloud-world-iso', '.iso-index-btn'], ['#/data-world', null]];
for (const [h, sel] of cases) {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 100)));
  await p.goto('http://localhost:5174/' + h, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 9000));
  const open = await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, overflow: getComputedStyle(document.documentElement).overflow, expInDom: !!document.getElementById('experience') }));
  const clicked = await p.evaluate((s) => {
    let el = s ? document.querySelector(s) : null;
    if (!el) el = [...document.querySelectorAll('button, a')].find(x => /back to portfolio/i.test(x.textContent || '') && x.offsetParent !== null);
    if (el) { el.click(); return (el.className || el.textContent).slice(0, 40); }
    return null;
  }, sel);
  await new Promise(r => setTimeout(r, 5000));
  const back = await p.evaluate(() => JSON.stringify({ hash: location.hash || '(empty)', exp: !!document.getElementById('experience'), overflow: getComputedStyle(document.documentElement).overflow, scrollH: document.scrollingElement.scrollHeight }));
  out.push('RT ' + h + ' open: ' + open + ' clicked: ' + clicked + ' back: ' + back + ' errors: ' + errs.length);
  await b.close();
}
console.log(out.join('\n'));
