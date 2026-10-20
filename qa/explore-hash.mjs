import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = '/d/Yash/personal-website/qa-screenshots-audit';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Enable console logging
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('error') || text.includes('Error') || text.includes('WARNING') || text.includes('WebGL') || text.includes('[FrameDriver]')) {
    console.log(`[CONSOLE ${msg.type()}] ${text}`);
  }
});

page.on('pageerror', err => {
  console.log(`[PAGE ERROR] ${err.message}`);
});

console.log('Navigating to app with Cloud World hash...');
await page.goto('http://localhost:5173/#/cloud-world', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

// Check what's on the page
console.log('Page title:', await page.title());
console.log('URL:', page.url());

// Look for any elements
const allElements = await page.locator('*').all();
console.log('Total elements:', allElements.length);

// Check for canvas
const canvas = await page.locator('canvas').first();
if (await canvas.count() > 0) {
  console.log('Canvas found!');
  const canvasBox = await canvas.boundingBox();
  console.log('Canvas size:', canvasBox);
} else {
  console.log('No canvas found');
  // Get full page content for debugging
  const content = await page.content();
  fs.writeFileSync(path.join(outputDir, 'page-content.html'), content);
  console.log('Saved page content for debugging');
}

// Wait a bit more
await page.waitForTimeout(5000);

const canvas2 = await page.locator('canvas').first();
if (await canvas2.count() > 0) {
  console.log('Canvas found after wait!');
} else {
  console.log('Still no canvas');
}

await browser.close();
console.log('Exploration complete.');