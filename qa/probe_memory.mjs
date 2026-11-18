import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--enable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(4000);
await page.keyboard.press('Enter');
await page.waitForTimeout(1000);
const heap = () => page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1));
const loops = () => page.evaluate(() => document.querySelector('.background-video-layer')?.getAttribute('data-loops'));
const h0 = await heap(); const l0 = await loops();
console.log(`t=0s heap=${h0}MB loops=${l0}`);
for (let i = 1; i <= 6; i++) {
  await page.waitForTimeout(10000);
  console.log(`t=${i*10}s heap=${await heap()}MB loops=${await loops()}`);
}
await browser.close();
