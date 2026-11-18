import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Navigate to Data World
await page.goto('http://[::1]:4173/#/data-world');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // let scene initialize

// Screenshot Surface (cliff) - initial view
await page.screenshot({ path: 'qa-screenshots-acceptance/surface-1440x900-initial.png', fullPage: false });
console.log('Screenshot: surface-1440x900-initial.png');

// Move right to see the portal
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(2000);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa-screenshots-acceptance/surface-1440x900-portal.png', fullPage: false });
console.log('Screenshot: surface-1440x900-portal.png');

// Move left to see entry gate
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(2000);
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa-screenshots-acceptance/surface-1440x900-gate.png', fullPage: false });
console.log('Screenshot: surface-1440x900-gate.png');

// Mobile viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa-screenshots-acceptance/surface-390x844.png', fullPage: false });
console.log('Screenshot: surface-390x844.png');

await browser.close();
console.log('Done');