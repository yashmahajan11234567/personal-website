import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Navigate to Data World
await page.goto('http://[::1]:4173/#/data-world');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

// Walk to the exit portal (right side) - cliff is 900 wide, portal at 750, spawn at 120
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(8000); // longer walk + transition
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(3000); // wait for transition

// Check if we're in Skills chapter
const probe = await page.evaluate(() => window.__worldProbe);
console.log('Probe:', JSON.stringify(probe, null, 2));

await page.screenshot({ path: 'qa-screenshots-acceptance/skills-arrival-from-surface2.png', fullPage: false });
console.log('Screenshot: skills-arrival-from-surface2.png');

await browser.close();
console.log('Done');
