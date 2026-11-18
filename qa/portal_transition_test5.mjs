import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://[::1]:4173/#/data-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForTimeout(5000);

// Check initial probe (call as function)
const probe0 = await page.evaluate(() => window.__worldProbe?.());
console.log('Initial probe:', probe0 ? { chapter: probe0.chapter, x: probe0.x } : 'undefined/null');

// Walk to the exit portal
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(10000);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(5000);

// Check probe after transition (call as function)
const probe1 = await page.evaluate(() => window.__worldProbe?.());
console.log('After transition probe:', probe1 ? { chapter: probe1.chapter, x: probe1.x, travelling: probe1.travelling } : 'undefined/null');

await page.screenshot({ path: 'qa-screenshots-acceptance/skills-arrival-final3.png', fullPage: false });

await browser.close();
console.log('Done');
