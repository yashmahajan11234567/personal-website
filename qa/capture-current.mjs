/** Capture current Cloud World state at 1440x900 */
import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
});
page.on('pageerror', err => {
  console.log(`  [error] ${err.message}`);
});

console.log('\n=== Navigating to Cloud World ===');
await page.goto('http://localhost:5195/#/cloud-world');
await page.waitForTimeout(3000);
await page.waitForTimeout(5000);

console.log('\n=== Capture current state ===');
await page.screenshot({ path: 'qa-screenshots/current-before-polish.png', fullPage: true });
console.log('Screenshot saved: current-before-polish.png');

console.log('\n=== Capture multiple angles ===');// Default view
await page.screenshot({ path: 'qa-screenshots/angle-1-default.png', fullPage: true });
// Move forward to see Mountain Passage Zone
await page.keyboard.down('w');
await page.waitForTimeout(40000); // 40 seconds
await page.keyboard.up('w');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'qa-screenshots/angle-2-forward.png', fullPage: true });
// Move forward more to see Projects Sunset Zone and look left
await page.keyboard.down('w');
await page.waitForTimeout(40000); // 40 more seconds (total 80)
await page.keyboard.up('w');
await page.waitForTimeout(1000);
await page.mouse.move(800, 400);
await page.mouse.down();
await page.mouse.move(600, 300, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa-screenshots/angle-3-left.png', fullPage: true });
// Move forward even more and look right
await page.keyboard.down('w');
await page.waitForTimeout(20000); // 20 more seconds (total 100)
await page.keyboard.up('w');
await page.waitForTimeout(1000);
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(900, 600, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa-screenshots/angle-4-right.png', fullPage: true });