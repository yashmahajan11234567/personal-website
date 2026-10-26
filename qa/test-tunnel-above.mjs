import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  await page.goto('http://127.0.0.1:5195/#/cloud-world', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(8000);
  
  // Try to move towards tunnel entrance
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'qa-screenshots-tunnel-above/01-approach-entrance.png' });
  
  // Go into tunnel
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4000);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'qa-screenshots-tunnel-above/02-inside-looking-out.png' });
  
  // Move through to exit
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(8000);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'qa-screenshots-tunnel-above/03-near-exit.png' });
  
  // Exit tunnel
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(4000);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'qa-screenshots-tunnel-above/04-exited-looking-back.png' });
  
  await browser.close();
  console.log('DONE');
})();
