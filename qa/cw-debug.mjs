import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-vis009');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(20000);
  await page.screenshot({ path: path.join(OUT, 'debug-headed.png') });
  console.log('errors:', errors.slice(0, 10));
  console.log('canvas count:', await page.locator('canvas').count());
  await browser.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
