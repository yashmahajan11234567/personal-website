import { chromium } from 'playwright';

async function testFunctionality() {
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
    
    // Test 1: Move forward (W key) to CI/CD skill
    console.log('Test 1: Moving forward to CI/CD skill...');
    await page.keyboard.down('w');
    await page.waitForTimeout(5000);
    await page.keyboard.up('w');
    await page.waitForTimeout(1000);
    
    // Screenshot at CI/CD
    await page.screenshot({ path: 'qa-screenshots-current/test-cicd.png', fullPage: false });
    console.log('Screenshot saved: test-cicd.png');
    
    // Test 2: Move further forward (past current bounds of 80)
    console.log('Test 2: Moving further forward (testing extended bounds)...');
    await page.keyboard.down('w');
    await page.waitForTimeout(8000);
    await page.keyboard.up('w');
    await page.waitForTimeout(1000);
    
    // Screenshot at extended position
    await page.screenshot({ path: 'qa-screenshots-current/test-extended.png', fullPage: false });
    console.log('Screenshot saved: test-extended.png');
    
    // Test 3: Mouse look
    console.log('Test 3: Testing mouse look...');
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(720, 300);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'qa-screenshots-current/test-look-up.png', fullPage: false });
    
    await page.mouse.down();
    await page.mouse.move(720, 600);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'qa-screenshots-current/test-look-down.png', fullPage: false });
    
    // Test 4: Click a skill marker
    console.log('Test 4: Testing skill marker click...');
    // Try clicking near the left blue marker (AWS at x=-4, z=-20)
    await page.mouse.move(600, 400);
    await page.mouse.click(600, 400);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'qa-screenshots-current/test-click-marker.png', fullPage: false });
    
    // Test 5: Escape key
    console.log('Test 5: Testing Escape key...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'qa-screenshots-current/test-escape.png', fullPage: false });
    
    // Test 6: Check character position via evaluate
    const position = await page.evaluate(() => {
      // Try to find the character group
      const canvas = document.querySelector('canvas');
      return {
        canvasExists: !!canvas,
        width: canvas?.width,
        height: canvas?.height
      };
    });
    console.log('Canvas info:', JSON.stringify(position, null, 2));
    
    console.log('\n=== CONSOLE LOGS (last 20) ===');
    consoleLogs.slice(-20).forEach(log => console.log(`[${log.type}] ${log.text}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testFunctionality();