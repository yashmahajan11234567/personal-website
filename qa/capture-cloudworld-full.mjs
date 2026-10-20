import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function captureCloudWorld() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', error => {
    consoleLogs.push({ type: 'error', text: error.message });
  });

  try {
    // Navigate to the cloud-world route
    await page.goto('http://localhost:5195/#/cloud-world', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for canvas to appear
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Wait a bit for WebGL to initialize
    await page.waitForTimeout(5000);
    
    // Take screenshots from different angles
    const screenshotsDir = path.join(process.cwd(), 'qa-screenshots-current');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    // Screenshot 1: Default view
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-1-default.png'),
      fullPage: false 
    });
    console.log('Screenshot 1: Default view saved');
    
    // Screenshot 2: Look up
    await page.mouse.move(720, 450); // Center
    await page.mouse.down();
    await page.mouse.move(720, 300); // Look up
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-2-look-up.png'),
      fullPage: false 
    });
    console.log('Screenshot 2: Look up saved');
    
    // Screenshot 3: Look down
    await page.mouse.down();
    await page.mouse.move(720, 600); // Look down
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-3-look-down.png'),
      fullPage: false 
    });
    console.log('Screenshot 3: Look down saved');
    
    // Screenshot 4: Look right
    await page.mouse.down();
    await page.mouse.move(900, 450); // Look right
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-4-look-right.png'),
      fullPage: false 
    });
    console.log('Screenshot 4: Look right saved');
    
    // Screenshot 5: Look left
    await page.mouse.down();
    await page.mouse.move(540, 450); // Look left
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-5-look-left.png'),
      fullPage: false 
    });
    console.log('Screenshot 5: Look left saved');
    
    // Screenshot 6: Move forward (W key) to approach first skill
    await page.keyboard.down('w');
    await page.waitForTimeout(3000);
    await page.keyboard.up('w');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-6-moved-forward.png'),
      fullPage: false 
    });
    console.log('Screenshot 6: Moved forward saved');
    
    // Screenshot 7: Move further to reach CI/CD skill
    await page.keyboard.down('w');
    await page.waitForTimeout(5000);
    await page.keyboard.up('w');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'angle-7-at-cicd.png'),
      fullPage: false 
    });
    console.log('Screenshot 7: At CI/CD saved');
    
    // Get frame index and scene state
    const frameInfo = await page.evaluate(() => {
      return {
        frameIndex: window.frameIndex || 'undefined',
        cameraPosition: window.camera?.position ? {
          x: window.camera.position.x,
          y: window.camera.position.y,
          z: window.camera.position.z
        } : 'unavailable',
        controlsTarget: window.controls?.target ? {
          x: window.controls.target.x,
          y: window.controls.target.y,
          z: window.controls.target.z
        } : 'unavailable'
      };
    });
    
    console.log('\n=== SCENE STATE ===');
    console.log(JSON.stringify(frameInfo, null, 2));
    
    console.log('\n=== CONSOLE LOGS (last 30) ===');
    consoleLogs.slice(-30).forEach(log => console.log(`[${log.type}] ${log.text}`));
    
    console.log('\n=== SCREENSHOTS SAVED ===');
    console.log(`Screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

captureCloudWorld();