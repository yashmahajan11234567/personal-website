import { chromium } from '@playwright/test';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(7000);
await page.evaluate(async () => {
  const target = document.body.scrollHeight - window.innerHeight * 1.8;
  for (let y = 0; y <= target; y += 150) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
  window.scrollTo(0, target);
});
await page.waitForTimeout(2000);
await page.screenshot({ path: 'qa-screenshots-planaudit/new-live.png.png', fullPage: false });
await b.close();
