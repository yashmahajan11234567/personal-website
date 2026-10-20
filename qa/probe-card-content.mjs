import { chromium } from 'playwright';
const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(9000);
await page.evaluate(() => { window.__cwQaCam = { pos: [-11, 5, 4], target: [-11, 4.5, 18] }; });
await page.waitForTimeout(1500);
await page.mouse.click(720, 450);
await page.waitForTimeout(1500);
const card = await page.evaluate(() => {
  // find the visible card element (not the hidden ones)
  const candidates = [...document.querySelectorAll('div,aside,section,article')].filter((el) => {
    const cls = (el.className || '').toString().toLowerCase();
    return (cls.includes('cloud-card') || cls.includes('card')) && el.offsetParent !== null && el.textContent.length > 40;
  });
  const el = candidates[candidates.length - 1];
  if (!el) return null;
  return {
    cls: el.className.toString().slice(0, 60),
    heading: el.querySelector('h1,h2,h3')?.textContent || null,
    textSample: el.textContent.replace(/\s+/g, ' ').slice(0, 220),
    hasCloseBtn: !!el.querySelector('button'),
  };
});
console.log('CARD:', JSON.stringify(card, null, 1));
await browser.close();
console.log('done');
