import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:5174/#/cloud-world-iso', { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__iso, { timeout: 20000 });
const state = () => page.evaluate(() => window.__iso);
let s = await state();
console.log('mobile load ok:', s.mode, s.x, s.y, 'fps', s.fps, 'errors', errs.length);
// tap-to-move: tap at canvas center-ish (land near spawn)
await page.mouse.click(0.5 * 390, 0.5 * 844);
await new Promise(r => setTimeout(r, 500));
s = await state();
console.log('after tap:', s.x, s.y, s.mode, 'fps', s.fps);
// board: tap boat (near spawn)
await page.mouse.click(0.52 * 390, 0.48 * 844);
await new Promise(r => setTimeout(r, 700));
s = await state();
console.log('after boat tap:', s.mode, s.bx, s.by, 'fps', s.fps, 'err', errs.length);
await page.keyboard.press('e'); await new Promise(r => setTimeout(r, 700));
s = await state();
console.log('after e:', s.mode, s.bx, s.by);
await browser.close();
console.log('MOBILE DONE, console errors:', errs.length);
