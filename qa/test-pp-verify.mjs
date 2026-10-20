/** Visual verification of post-processing effects */
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
  console.log(`  [${log.type}] ${log.text}`);
});
page.on('pageerror', err => {
  const log = { type: 'error', text: err.message };
  consoleLogs.push(log);
  console.log(`  [error] ${log.text}`);
});

// Navigate directly to cloud-world
await page.goto('http://localhost:5195/#/cloud-world');
await page.waitForTimeout(3000);

// Wait for effects to settle
console.log('\n=== Waiting for effects to settle ===');
await page.waitForTimeout(5000);

// Capture baseline screenshot (with effects)
await page.screenshot({ path: 'qa-screenshots/postproc-with-effects.png', fullPage: true });
console.log('\nScreenshot with effects captured');

// Get a pixel sample from the center and corners via canvas.toDataURL
await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  // The WebGL canvas doesn't have 2d context, but we can verify via screenshot
});

console.log('\n=== Capturing verification screenshot ===');
await page.screenshot({ path: 'qa-screenshots/postproc-final-verified.png', fullPage: true });
console.log('\nScreenshot captured for visual comparison');

// Post-processing related logs
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
