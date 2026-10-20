/** Phase 1 QA: capture real Cloud World screenshots at 1440x900 */
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-unsafe-sw-sw']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  consoleLogs.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', err => {
  console.log(`  [pageerror] ${err.message}`);
});

console.log('=== Navigating to Cloud World ===');
await page.goto('http://localhost:5195/#/cloud-world', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);

// Check canvas presence and WebGL
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { found: false };
  const rect = canvas.getBoundingClientRect();
  const gl2 = canvas.getContext('webgl2');
  const gl1 = canvas.getContext('webgl');
  return {
    found: true,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    hasWebGL2: !!gl2,
    hasWebGL: !!gl1,
    contextLost: gl2 ? gl2.isContextLost() : null
  };
});
console.log('CANVAS:', JSON.stringify(canvasInfo));

// Capture default view
await page.screenshot({ path: 'qa-screenshots/phase1-default.png' });
console.log('Screenshot: phase1-default.png');

// Move forward to see Mountain Passage
await page.keyboard.down('w');
await page.waitForTimeout(20000);
await page.keyboard.up('w');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'qa-screenshots/phase1-forward20s.png' });
console.log('Screenshot: phase1-forward20s.png');

// Move forward more to Projects Sunset
await page.keyboard.down('w');
await page.waitForTimeout(20000);
await page.keyboard.up('w');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'qa-screenshots/phase1-forward40s.png' });
console.log('Screenshot: phase1-forward40s.png');

// Look around - rotate camera right
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(900, 600, { steps: 15 });
await page.mouse.up();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'qa-screenshots/phase1-rotate-right.png' });
console.log('Screenshot: phase1-rotate-right.png');

// Look around - rotate camera left
await page.mouse.move(720, 450);
await page.mouse.down();
await page.mouse.move(500, 300, { steps: 15 });
await page.mouse.up();
await page.waitForTimeout(1000);
await page.screenshot({ path: 'qa-screenshots/phase1-rotate-left.png' });
console.log('Screenshot: phase1-rotate-left.png');

// Zoom in
await page.keyboard.down('Equal'); // = key usually zooms in some setups
await page.waitForTimeout(1000);
await page.keyboard.up('Equal');
await page.waitForTimeout(500);
await page.screenshot({ path: 'qa-screenshots/phase1-zoom-attempt.png' });
console.log('Screenshot: phase1-zoom-attempt.png');

// Check console logs
console.log('\n=== CONSOLE LOGS ===');
const warnings = consoleLogs.filter(l => l.type === 'warning' || l.type === 'error');
consoleLogs.forEach(l => {
  if (l.type === 'log' && l.text.includes('[FrameDriver]')) return; // skip verbose
  console.log(`  [${l.type}] ${l.text.substring(0, 200)}`);
});
console.log(`\nTotal console messages: ${consoleLogs.length}`);
console.log(`Warnings/Errors: ${warnings.length}`);

await browser.close();
console.log('\nDone.');