import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://[::1]:4173/#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(3000);

// Initial view (spawn area)
await page.screenshot({ path: 'qa-screenshots-acceptance/surface-final-1440x900-initial.png', fullPage: false });
console.log('Screenshot: surface-final-1440x900-initial.png');

// Check initial probe
let probe = await page.evaluate(() => window.__worldProbe?.());
console.log('Initial probe:', probe ? { chapter: probe.chapter, x: probe.x, y: probe.y, grounded: probe.grounded } : 'undefined');

// Walk right toward portal
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(8000);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(3000);

// Check if transitioned to skills
probe = await page.evaluate(() => window.__worldProbe?.());
console.log('After walk right probe:', probe ? { chapter: probe.chapter, x: probe.x, travelling: probe.travelling } : 'undefined');

await page.screenshot({ path: 'qa-screenshots-acceptance/surface-final-1440x900-portal.png', fullPage: false });
console.log('Screenshot: surface-final-1440x900-portal.png');

// Walk left toward entry
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(5000);
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(1000);

await page.screenshot({ path: 'qa-screenshots-acceptance/surface-final-1440x900-entry.png', fullPage: false });
console.log('Screenshot: surface-final-1440x900-entry.png');

// Mobile viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'qa-screenshots-acceptance/surface-final-390x844.png', fullPage: false });
console.log('Screenshot: surface-final-390x844.png');

await browser.close();
console.log('Done');
