import { chromium } from 'playwright';

async function captureCloudWorld() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', error => {
    consoleLogs.push({ type: 'error', text: error.message });
  });

  try {
    await page.goto('http://localhost:5195/#/cloud-world', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const screenshotsDir = 'qa-screenshots-current';
    
    // Screenshot 1: Default view
    await page.screenshot({ path: `${screenshotsDir}/angle-1-default.png`, fullPage: false, timeout: 15000 });
    console.log('Screenshot 1: Default view saved');
    
    // Screenshot 2: Look up
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(720, 300);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/angle-2-look-up.png`, fullPage: false, timeout: 15000 });
    console.log('Screenshot 2: Look up saved');
    
    // Screenshot 3: Look down
    await page.mouse.down();
    await page.mouse.move(720, 600);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/angle-3-look-down.png`, fullPage: false, timeout: 15000 });
    console.log('Screenshot 3: Look down saved');
    
    // Screenshot 4: Look right
    await page.mouse.down();
    await page.mouse.move(900, 450);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/angle-4-look-right.png`, fullPage: false, timeout: 15000 });
    console.log('Screenshot 4: Look right saved');
    
    // Screenshot 5: Look left
    await page.mouse.down();
    await page.mouse.move(540, 450);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotsDir}/angle-5-look-left.png`, fullPage: false, timeout: 15000 });
    console.log('Screenshot 5: Look left saved');
    
    console.log('\n=== CONSOLE LOGS (last 20) ===');
    consoleLogs.slice(-20).forEach(log => console.log(`[${log.type}] ${log.text}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

captureCloudWorld();