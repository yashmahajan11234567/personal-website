import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5195/#/cloud-world', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check for three.js objects via console
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      console.log('Canvas found:', canvas.width, canvas.height);
      // Try to access three.js renderer
      if (canvas.__r3f) {
        console.log('R3F found');
        const gl = canvas.__r3f.getState().gl;
        console.log('WebGL context:', gl);
      }
    } else {
      console.log('No canvas found');
    }
  });
  
  console.log('Console logs:', consoleLogs);
  await browser.close();
})();
