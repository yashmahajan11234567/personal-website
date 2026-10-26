import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-vis009');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(15000);
  await page.screenshot({ path: path.join(OUT, 'v2-01-overview.png') });
  await page.keyboard.down('w'); await page.waitForTimeout(8000); await page.keyboard.up('w');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'v2-02-entrance.png') });
  await page.keyboard.down('w'); await page.waitForTimeout(6000); await page.keyboard.up('w');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'v2-03-inside.png') });
  await page.keyboard.down('w'); await page.waitForTimeout(8000); await page.keyboard.up('w');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'v2-04-exit.png') });
  await page.keyboard.down('w'); await page.waitForTimeout(6000); await page.keyboard.up('w');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'v2-05-after-exit.png') });
  console.log('ok');
  await browser.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
