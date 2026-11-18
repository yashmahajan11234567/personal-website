import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Capture console
page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

// Navigate to Data World
await page.goto('http://[::1]:4173/#/data-world');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1500);

// Check initial probe
let probe = await page.evaluate(() => window.__worldProbe);
console.log('Initial probe chapter:', probe?.chapter, 'x:', probe?.x);

// Walk to the exit portal
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(10000);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(4000);

// Check probe after transition
probe = await page.evaluate(() => window.__worldProbe);
console.log('After transition probe:', probe ? { chapter: probe.chapter, x: probe.x, travelling: probe.travelling } : 'undefined');

await page.screenshot({ path: 'qa-screenshots-acceptance/skills-arrival-final.png', fullPage: false });

await browser.close();
console.log('Done');
