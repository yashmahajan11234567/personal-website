import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
// Entrance camera but aimed higher, at the billboard
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 7, 84], target: [0, 18, 98] }; });
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa-screenshots-polish/c1-entrance-high.png' });
console.log('shot: c1-entrance-high');
await browser.close();
