/** Test Cloud World via hero selection */
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleLogs.push({ type: 'error', text: err.message }));

// Navigate to hero page
await page.goto('http://localhost:5195/');
await page.waitForTimeout(2000);

// Scroll to selection hold (bottom of cinematic)
await page.evaluate(() => {
  const track = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, track);
});
await page.waitForTimeout(2000);

// Find and click the Cloud board
const cloudBoard = await page.locator('[data-testid="world-board-cloud"]').first();
if (await cloudBoard.isVisible()) {
  await cloudBoard.click();
  console.log('Clicked Cloud board');
} else {
  console.log('Cloud board not visible, trying hover first');
  await cloudBoard.hover();
  await page.waitForTimeout(500);
  await cloudBoard.click();
  console.log('Clicked Cloud board after hover');
}

// Wait for handoff and world mount
await page.waitForTimeout(3000);

// Check for canvas
const canvas = await page.$('canvas');
console.log('Canvas found:', !!canvas);

if (canvas) {
  // Get renderer info
  const rendererInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'No WebGL' };
    return {
      width: canvas.width,
      height: canvas.height,
      webglVersion: gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1',
      renderer: gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
    };
  });
  console.log('\n=== Renderer Info ===');
  console.log(JSON.stringify(rendererInfo, null, 2));

  // Capture screenshot
  await page.screenshot({ path: 'qa-screenshots/cloudworld-verify.png', fullPage: true });
  console.log('\nScreenshot captured');
}

// Console logs
console.log('\n=== Console Logs ===');
for (const log of consoleLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

// Post-processing related
const ppLogs = consoleLogs.filter(l => 
  l.text.toLowerCase().includes('postprocess') || 
  l.text.toLowerCase().includes('effectcomposer') ||
  l.text.toLowerCase().includes('bloom') ||
  l.text.toLowerCase().includes('vignette') ||
  l.text.toLowerCase().includes('noise') ||
  l.text.toLowerCase().includes('selective')
);
console.log('\n=== Post-Processing Related Logs ===');
if (ppLogs.length === 0) {
  console.log('  (none found)');
} else {
  for (const log of ppLogs) {
    console.log(`  [${log.type}] ${log.text}`);
  }
}

await browser.close();
