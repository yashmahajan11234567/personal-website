import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3000); // phaser boot + video load

// Check for video elements
const videoCount = await page.evaluate(() => document.querySelectorAll('video').length);
console.log('Video elements found:', videoCount);

// Check video sources
const videoSources = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('video')).map(v => ({
    src: v.currentSrc || v.src,
    paused: v.paused,
    readyState: v.readyState,
    poster: v.poster
  }));
});
console.log('Video details:', JSON.stringify(videoSources, null, 2));

// Check world probe
const probe = await page.evaluate(() => window.__worldProbe?.());
console.log('World probe:', JSON.stringify(probe, null, 2));

// Check canvas transparency
const canvasBg = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(10, 10, 1, 1).data;
  return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
});
console.log('Canvas pixel at (10,10):', canvasBg);

await browser.close();
console.log('Errors:', errors);
