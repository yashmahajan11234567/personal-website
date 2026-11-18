import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3500);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const sample = () => page.evaluate(() => {
  const layer = document.querySelector('.background-video-layer');
  const probe = window.__worldProbe ? window.__worldProbe() : null;
  return {
    ch: layer?.getAttribute('data-chapter'),
    robotX: probe ? Math.round(probe.x ?? probe.robotX ?? -1) : -1,
    vids: Array.from(document.querySelectorAll('.background-video-layer video')).map(v => `${v.currentSrc.split('/').slice(-2)[0]}:p=${v.paused?1:0},e=${v.ended?1:0},t=${v.currentTime.toFixed(2)},op=${v.style.opacity||getComputedStyle(v).opacity}`),
  };
});
console.log('=== MOVE LEFT in cliff (20s) ===');
await page.keyboard.down('a');
const t0 = Date.now(); let last = '';
while (Date.now() - t0 < 20000) {
  await page.waitForTimeout(500);
  const s = await sample();
  const line = `t=${((Date.now()-t0)/1000).toFixed(1)} ch=${s.ch} x=${s.robotX} ${s.vids.slice(0,2).join(' | ')}`;
  if (line !== last) { console.log(line); last = line; }
}
await page.keyboard.up('a');
await browser.close();
