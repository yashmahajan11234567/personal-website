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
  if (text.includes('error') || text.includes('Error') || text.includes('WARNING') || text.includes('WebGL')) {
    console.log(`[CONSOLE ${msg.type()}] ${text}`);
  }
});

page.on('pageerror', err => {
  console.log(`[PAGE ERROR] ${err.message}`);
});

console.log('Navigating to app...');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Check what's on the page
const pageContent = await page.content();
console.log('Page title:', await page.title());

// Look for any clickable elements
const buttons = await page.locator('button, a, [role="button"]').all();
console.log('Found', buttons.length, 'buttons/links');
for (const btn of buttons) {
  const text = await btn.textContent();
  const className = await btn.getAttribute('class');
  console.log(`  Button: "${text}" class="${className}"`);
}

// Look for any text mentioning Cloud World
const cloudWorldText = await page.locator('text=/cloud.*world/i').first();
if (await cloudWorldText.count() > 0) {
  console.log('Found Cloud World text, clicking...');
  await cloudWorldText.click();
  await page.waitForTimeout(3000);
} else {
  console.log('No Cloud World text found');
}

// Check for any navigation or menu
const navItems = await page.locator('nav a, nav button, header a, header button').all();
for (const item of navItems) {
  const text = await item.textContent();
  console.log(`Nav item: "${text}"`);
}

// Wait a bit more and check for canvas again
await page.waitForTimeout(2000);

const canvas = await page.locator('canvas').first();
if (await canvas.count() > 0) {
  console.log('Canvas found!');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    return gl && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 15000 });
  console.log('WebGL context ready');
} else {
  console.log('No canvas found on page');
}

await browser.close();
console.log('Initial exploration complete.');