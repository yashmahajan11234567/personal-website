import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(5000); // phaser boot + video load

// Dismiss entry plate
await page.keyboard.press('Enter');
await page.waitForTimeout(500);

// Walk around and trigger chapter changes
await page.keyboard.down('d');
await page.waitForTimeout(10000);
await page.keyboard.up('d');
await page.waitForTimeout(2000);

await page.keyboard.down('d');
await page.waitForTimeout(10000);
await page.keyboard.up('d');
await page.waitForTimeout(2000);

await page.keyboard.down('a');
await page.waitForTimeout(10000);
await page.keyboard.up('a');
await page.waitForTimeout(2000);

await page.keyboard.down('a');
await page.waitForTimeout(10000);
await page.keyboard.up('a');
await page.waitForTimeout(2000);

console.log('Console errors:', errors.length > 0 ? errors : 'NONE');
console.log('Page errors:', errors.length > 0 ? errors : 'NONE');

await browser.close();
