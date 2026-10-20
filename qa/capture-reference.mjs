import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = '/d/Yash/personal-website/qa-screenshots-audit';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

console.log('Loading reference image...');
await page.goto('file:///D:/Yash/personal-website/public/assets/skills-valley.png');
await page.waitForTimeout(2000);

const refImg = await page.screenshot({ path: path.join(outputDir, 'reference-skills-valley.png'), fullPage: true });
console.log('Reference image captured');

await browser.close();
console.log('Done.');