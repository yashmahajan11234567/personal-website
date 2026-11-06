import { chromium } from 'playwright';
for (const h of ['#/cloud-world-iso', '#/cloud-world', '#/data-world']) {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 100)));
  await p.goto('http://localhost:5174/' + h, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 9000));
  const open = await p.evaluate(() => JSON.stringify({ scrollH: document.scrollingElement.scrollHeight, overflow: getComputedStyle(document.documentElement).overflow, expInDom: !!document.getElementById('experience') }));
  await p.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 5000));
  const back = await p.evaluate(() => JSON.stringify({ hash: location.hash || '(empty)', exp: !!document.getElementById('experience'), overflow: getComputedStyle(document.documentElement).overflow, scrollH: document.scrollingElement.scrollHeight }));
  console.log('RT', h, 'open:', open, 'back:', back, 'errors:', errs.length);
  await b.close();
}
