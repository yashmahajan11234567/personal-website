/** Full functionality test */
import { chromium } from 'playwright';
import { createReadStream } from 'fs';
import { PNG } from 'pngjs';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
  console.log(`  [${log.type}] ${log.text}`);
});
page.on('pageerror', err => {
  console.log(`  [error] ${err.message}`);
});

console.log('\n=== Navigating to Cloud World ===');
await page.goto('http://localhost:5195/#/cloud-world');
await page.waitForTimeout(3000);
await page.waitForTimeout(5000);

console.log('\n=== Step 1: Capture with effects ===');
await page.screenshot({ path: 'qa-screenshots/full-with-effects.png', fullPage: true });
console.log('Screenshot saved: full-with-effects.png');

console.log('\n=== Step 2: Test character movement (W key) ===');
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
console.log('Movement test done');

await page.screenshot({ path: 'qa-screenshots/full-after-movement.png', fullPage: true });
console.log('Screenshot after movement captured');

console.log('\n=== Step 3: Test mouse look (OrbitControls) ===');
await page.mouse.move(800, 400);
await page.mouse.down();
await page.mouse.move(900, 500, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(500);
console.log('Mouse look test done');

await page.screenshot({ path: 'qa-screenshots/full-after-mouse.png', fullPage: true });
console.log('Screenshot after mouse captured');

console.log('\n=== Step 4: Click on a skill marker ===');
// Try clicking near the first skill marker (AWS at x=-20, z=0)
// The marker should be visible on screen
await page.mouse.click(500, 400);
await page.waitForTimeout(1000);
console.log('Click test done');

await page.screenshot({ path: 'qa-screenshots/full-after-click.png', fullPage: true });
console.log('Screenshot after click captured');

console.log('\n=== Step 5: Check overlay content ===');
const overlayTitle = await page.textContent('#overlay-title');
const overlayBody = await page.textContent('#overlay-body');
console.log('Overlay title:', overlayTitle);
console.log('Overlay body length:', overlayBody?.length || 0);

console.log('\n=== Step 6: Check canvas and WebGL ===');
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return {
    width: canvas.width,
    height: canvas.height,
    webgl2: !!canvas.getContext('webgl2'),
    webgl: !!canvas.getContext('webgl'),
    drawingBufferWidth: canvas.width,
    drawingBufferHeight: canvas.height,
  };
});
console.log('Canvas info:', canvasInfo);

console.log('\n=== Step 7: FrameDriver logs ===');
const frameDriverLogs = consoleLogs.filter(l => l.text.includes('FrameDriver'));
for (const log of frameDriverLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

console.log('\n=== Step 8: Composer logs ===');
const composerLogs = consoleLogs.filter(l => l.text.includes('Composer'));
for (const log of composerLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

console.log('\n=== Step 9: Check for duplicate FrameDriver mounts ===');
const frameDriverStarts = consoleLogs.filter(l => l.text.includes('FrameDriver] Effect started')).length;
const frameDriverCleanups = consoleLogs.filter(l => l.text.includes('FrameDriver] Cleanup')).length;
console.log(`FrameDriver started: ${frameDriverStarts} times`);
console.log(`FrameDriver cleaned up: ${frameDriverCleanups} times`);
if (frameDriverStarts !== frameDriverCleanups) {
  console.log('  >>> WARNING: Potential duplicate loops or cleanup issue! <<<');
} else {
  console.log('  >>> OK: FrameDriver mounts match cleanups <<<');
}

console.log('\n=== Step 10: Check for errors ===');
const errors = consoleLogs.filter(l => l.type === 'error');
if (errors.length > 0) {
  console.log('Errors found:');
  for (const err of errors) {
    console.log(`  [error] ${err.text}`);
  }
} else {
  console.log('No errors found');
}

console.log('\n=== Final screenshot ===');
await page.screenshot({ path: 'qa-screenshots/full-final.png', fullPage: true });
console.log('Final screenshot saved');

await browser.close();
