import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => window.scrollTo(0, 3000));
const y0 = await p.evaluate(() => window.scrollY);
for (const h of ['#/cloud-world-25d', '#/cloud-world-iso', '#/cloud-world']) {
  await p.evaluate((hh) => { location.hash = hh; }, h);
  await new Promise(r => setTimeout(r, 6500));
  // use each world's own exit control
  const clicked = await p.evaluate(() => {
    const sel = '.cw25d-back, .iso-back';
    let el = document.querySelector(sel);
    if (!el) { el = [...document.querySelectorAll('button, a')].find(x => /back to portfolio|back/i.test(x.textContent || '') && x.offsetParent); }
    if (el) { el.click(); return el.className || el.textContent?.slice(0, 30); }
    return null;
  });
  await new Promise(r => setTimeout(r, 4500));
  console.log("ROUNDTRIP", h, "clicked:", clicked, await p.evaluate(() => JSON.stringify({ hash: location.hash, exp: !!document.getElementById('experience'), overflow: getComputedStyle(document.documentElement).overflow, scrollH: document.scrollingElement.scrollHeight, y: Math.round(window.scrollY), y: Math.round(window.scrollY) })));
}
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
