import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
await page.goto('http://localhost:5174/#/cloud-world-iso', { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__iso, { timeout: 25000 });
await new Promise(r => setTimeout(r, 5000));
await page.screenshot({ path: 'qa-iso/r1-spawn.png' });
// board boat + sail a bit
await page.keyboard.press('e'); await new Promise(r => setTimeout(r, 800));
await page.keyboard.down('ArrowUp'); await new Promise(r => setTimeout(r, 2500)); await page.keyboard.up('ArrowUp');
await new Promise(r => setTimeout(r, 1200));
await page.screenshot({ path: 'qa-iso/r2-boat.png' });
// skills dock
await page.evaluate(() => window.__iso.gotoHotspot('terraform'));
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: 'qa-iso/r3-skills.png' });
// open docker station panel via converged click
const sp = await page.evaluate(() => {
  const w = window.__iso; const h = w.hotspots.find(h => h.id === 'docker');
  const cam = w.cam; const sx = 3328 + (h.x - h.y) * 32 - cam.x, sy = (h.x + h.y) * 16 - cam.y;
  return { sx, sy };
});
await page.mouse.move(sp.sx, sp.sy); await new Promise(r => setTimeout(r, 600));
await page.mouse.click(sp.sx, sp.sy); await new Promise(r => setTimeout(r, 900));
await page.screenshot({ path: 'qa-iso/r4-station-panel.png' });
await page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 400));
// projects harbour
await page.evaluate(() => window.__iso.gotoHotspot('rxverify'));
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: 'qa-iso/r5-projects.png' });
// about / welcome
await page.evaluate(() => window.__iso.gotoHotspot('about'));
await new Promise(r => setTimeout(r, 3000));
const sp2 = await page.evaluate(() => {
  const w = window.__iso; const h = w.hotspots.find(h => h.id === 'about');
  const cam = w.cam; return { sx: 3328 + (h.x - h.y) * 32 - cam.x, sy: (h.x + h.y) * 16 - cam.y };
});
await page.mouse.move(sp2.sx, sp2.sy); await new Promise(r => setTimeout(r, 500));
await page.mouse.click(sp2.sx, sp2.sy); await new Promise(r => setTimeout(r, 900));
await page.screenshot({ path: 'qa-iso/r6-about-panel.png' });
const st = await page.evaluate(() => ({ fps: window.__iso.fps, mode: window.__iso.mode, errors: window.__iso.errors }));
console.log('STATE', JSON.stringify(st), 'PAGEERRORS', JSON.stringify(errs.slice(0, 5)));
await browser.close();
