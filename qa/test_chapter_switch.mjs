import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000); // phaser boot + video load

// Check initial chapter (cliff -> surface)
let videoStates = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('video')).map(v => ({
    src: v.currentSrc || v.src,
    paused: v.paused,
    currentTime: v.currentTime
  }));
});
console.log('Initial (cliff):', JSON.stringify(videoStates, null, 2));

// Walk right to trigger pipe to skills chapter
await page.keyboard.down('d');
await page.waitForTimeout(8000); // walk to pipe + transport time
await page.keyboard.up('d');
await page.waitForTimeout(2000);

// Check chapter after pipe (should be skills -> infrastructure)
const probe1 = await page.evaluate(() => window.__worldProbe?.());
console.log('After first pipe:', probe1?.chapter);

videoStates = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('video')).map(v => ({
    src: v.currentSrc || v.src,
    paused: v.paused,
    currentTime: v.currentTime
  }));
});
console.log('After pipe to skills:', JSON.stringify(videoStates, null, 2));

// Walk right again to trigger pipe to projects chapter
await page.keyboard.down('d');
await page.waitForTimeout(8000);
await page.keyboard.up('d');
await page.waitForTimeout(2000);

const probe2 = await page.evaluate(() => window.__worldProbe?.());
console.log('After second pipe:', probe2?.chapter);

videoStates = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('video')).map(v => ({
    src: v.currentSrc || v.src,
    paused: v.paused,
    currentTime: v.currentTime
  }));
});
console.log('After pipe to projects:', JSON.stringify(videoStates, null, 2));

// Walk left to go back to skills
await page.keyboard.down('a');
await page.waitForTimeout(8000);
await page.keyboard.up('a');
await page.waitForTimeout(2000);

const probe3 = await page.evaluate(() => window.__worldProbe?.());
console.log('After pipe back to skills:', probe3?.chapter);

videoStates = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('video')).map(v => ({
    src: v.currentSrc || v.src,
    paused: v.paused,
    currentTime: v.currentTime
  }));
});
console.log('After pipe back to skills:', JSON.stringify(videoStates, null, 2));

await browser.close();
console.log('Errors:', errors);
