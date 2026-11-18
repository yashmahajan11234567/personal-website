import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000); // phaser boot + video load

// Dismiss entry plate
await page.keyboard.press('Enter');
await page.waitForTimeout(500);

// Monitor video for 20 seconds to check looping
console.log('Monitoring video loop for 20 seconds...');
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1000);
  const videoStates = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('video')).map(v => ({
      src: v.currentSrc || v.src,
      paused: v.paused,
      currentTime: v.currentTime,
      duration: v.duration,
      ended: v.ended
    }));
  });
  const playing = videoStates.filter(v => !v.paused && v.currentTime > 0);
  if (playing.length > 0) {
    console.log(`t=${i+1}s: Playing video - time=${playing[0].currentTime.toFixed(2)}/${playing[0].duration.toFixed(2)}, ended=${playing[0].ended}`);
  }
}

await browser.close();
console.log('Done');
