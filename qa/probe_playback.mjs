import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000);
await page.keyboard.press('Enter'); // dismiss entry plate
await page.waitForTimeout(500);

const sample = () => page.evaluate(() => {
  const layer = document.querySelector('.background-video-layer');
  const chapter = layer ? layer.getAttribute('data-chapter') : '?';
  return {
    chapter,
    videos: Array.from(document.querySelectorAll('.background-video-layer video')).map(v => ({
      src: (v.currentSrc || v.src).split('/').slice(-2).join('/'),
      paused: v.paused, ended: v.ended, t: +v.currentTime.toFixed(2),
      rs: v.readyState, op: v.style.opacity || getComputedStyle(v).opacity,
    })),
  };
});

const phase = async (name, seconds, move) => {
  console.log(`\n=== ${name} (${seconds}s${move ? ', MOVING' : ', idle'}) ===`);
  if (move) await page.keyboard.down('d');
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < seconds * 1000) {
    await page.waitForTimeout(250);
    const s = await sample();
    const line = `t=${((Date.now()-t0)/1000).toFixed(1)} ch=${s.chapter} ` + s.videos.map(v => `${v.src.split('/')[0]}:p=${v.paused?1:0},e=${v.ended?1:0},t=${v.t},rs=${v.rs},op=${v.op}`).join(' | ');
    if (line !== last) { console.log(line); last = line; }
  }
  if (move) await page.keyboard.up('d');
};

await phase('IDLE', 30, false);
await phase('MOVE', 15, true);
await phase('IDLE2', 30, false);
await browser.close();
