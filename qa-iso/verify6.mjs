import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen') && document.querySelectorAll('#experience canvas').length > 0, { timeout: 40000 });
await new Promise(r => setTimeout(r, 1500));
await p.evaluate(() => window.scrollTo(0, 3000));
await new Promise(r => setTimeout(r, 400));
console.log('Y0', await p.evaluate(() => Math.round(window.scrollY)));
for (const h of ['#/cloud-world-25d', '#/cloud-world-iso', '#/cloud-world']) {
  await p.evaluate((hh) => { location.hash = hh; }, h);
  await new Promise(r => setTimeout(r, 7000));
  const open = await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, overflow: getComputedStyle(document.documentElement).overflow, expInDom: !!document.getElementById('experience'), canvas: document.querySelectorAll('canvas').length }));
  await p.keyboard.press('Escape');
  if (h === '#/cloud-world-25d') await p.click('.cw25d-back').catch(() => {});
  const ys = [];
  for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 500)); ys.push(await p.evaluate(() => Math.round(window.scrollY))); }
  const back = await p.evaluate(() => JSON.stringify({ hash: location.hash || "(empty)", exp: !!document.getElementById('experience'), overflow: getComputedStyle(document.documentElement).overflow, scrollH: document.scrollingElement.scrollHeight, canvases: document.querySelectorAll('canvas').length }));
  console.log('RT', h, 'open:', open, 'back:', back, 'y-samples:', ys.join(','));
}
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
