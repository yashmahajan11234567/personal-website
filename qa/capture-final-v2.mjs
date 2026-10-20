import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = 'D:/Yash/personal-website/qa-screenshots-final-v2';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Enable console logging
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('error') || text.includes('Error') || text.includes('WARNING') || text.includes('WebGL') || text.includes('[FrameDriver]') || text.includes('shader')) {
    console.log(`[CONSOLE ${msg.type()}] ${text}`);
  }
});

page.on('pageerror', err => {
  console.log(`[PAGE ERROR] ${err.message}`);
});

console.log('Navigating to Cloud World...');
await page.goto('http://localhost:5183/#/cloud-world', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

// Wait for canvas to be ready
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
  return gl && canvas.width > 0 && canvas.height > 0;
}, { timeout: 15000 });
await page.waitForTimeout(3000);

console.log('Cloud World canvas ready!');

// Function to capture screenshot with name
async function capture(name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Captured: ${filePath}`);
}

// 1. Default view
await capture('01-default');

// 2. Look up
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(1000);
await capture('02-look-up');
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(500);

// 3. Look down
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(1000);
await capture('03-look-down');
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(500);

// 4. Look left
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1000);
await capture('04-look-left');
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(500);

// 5. Look right
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1000);
await capture('05-look-right');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(500);

// 6. Mid-valley
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
await capture('06-mid-valley');

// 7. Mountain passage
await page.keyboard.down('w');
await page.waitForTimeout(4000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
await capture('07-mountain-passage');

// 8. Projects sunset - continue forward past passage
await page.keyboard.down('w');
await page.waitForTimeout(6000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
await capture('08-projects-sunset');

// 9. Escape test
await page.keyboard.press('Escape');
await page.waitForTimeout(2000);
await capture('09-after-escape');

console.log('Final capture complete.');
await browser.close();