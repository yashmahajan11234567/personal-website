import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + '#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3000);

// Check entry plate visibility
const entryPlate = await page.$('[data-testid="world-entry"]');
const entryPlateVisible = entryPlate ? await entryPlate.isVisible() : false;
console.log('Entry plate visible:', entryPlateVisible);

// Check entry plate dismiss button
const dismissBtn = await page.$('[data-testid="world-entry-dismiss"]');
console.log('Dismiss button exists:', !!dismissBtn);

// Press Enter to dismiss
await page.keyboard.press('Enter');
await page.waitForTimeout(500);

const entryPlateVisible2 = entryPlate ? await entryPlate.isVisible() : false;
console.log('Entry plate visible after Enter:', entryPlateVisible2);

// Try to tab to station index
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
const focused = await page.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className + '#' + document.activeElement?.id);
console.log('Focused after Tab:', focused);

// Tab more times
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
}
const focused2 = await page.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className + '#' + document.activeElement?.id);
console.log('Focused after 10 Tabs:', focused2);

// Check if panel opens
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const panelOpen = await page.$('.info-panel');
console.log('Panel open:', !!panelOpen);

await browser.close();
