import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Navigate to Data World
await page.goto('http://[::1]:4173/#/data-world');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

// Walk to the exit portal (right side)
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(5000); // walk to portal and trigger transition
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(2000); // wait for transition

// Check if we're in Skills chapter
const chapter = await page.evaluate(() => window.__worldProbe?.chapter);
console.log('Chapter after transition:', chapter);

// Screenshot Skills arrival
await page.screenshot({ path: 'qa-screenshots-acceptance/skills-arrival-from-surface.png', fullPage: false });
console.log('Screenshot: skills-arrival-from-surface.png');

await browser.close();
console.log('Done');
