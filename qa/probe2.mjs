import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0,200)));
await page.goto('http://localhost:4173/#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const t0 = Date.now(); let last = '';
while (Date.now() - t0 < 70000) {
  await page.waitForTimeout(250);
  const s = await page.evaluate(() => {
    const layer = document.querySelector('.background-video-layer');
    return {
      ch: layer?.getAttribute('data-chapter'),
      loops: layer?.getAttribute('data-loops'),
      av: layer?.getAttribute('data-active-video'),
      vids: Array.from(document.querySelectorAll('.background-video-layer video')).slice(0,2).map(v =>
        `${v.currentSrc.split('/').slice(-2)[0]}:p=${v.paused?1:0},e=${v.ended?1:0},t=${v.currentTime.toFixed(2)},rs=${v.readyState},op=${(parseFloat(getComputedStyle(v).opacity)).toFixed(2)}`).join(' '),
    };
  });
  const line = `t=${((Date.now()-t0)/1000).toFixed(1)} ch=${s.ch} loops=${s.loops} av=${s.av} ${s.vids}`;
  if (line !== last) { console.log(line); last = line; }
}
await browser.close();
