import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

// Force a render and read pixels
const result = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  // Check if there's a render loop running
  // Try to trigger a render by dispatching a resize
  canvas.dispatchEvent(new Event('resize'));
  
  // Wait a bit
  return new Promise(resolve => {
    setTimeout(() => {
      const centerPixel = new Uint8Array(4);
      gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, centerPixel);
      
      const topPixel = new Uint8Array(4);
      gl.readPixels(canvas.width / 2, canvas.height * 0.1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, topPixel);
      
      resolve({
        canvas: { width: canvas.width, height: canvas.height },
        centerPixel: Array.from(centerPixel),
        topPixel: Array.from(topPixel),
        glParams: {
          clearColor: gl.getParameter(gl.COLOR_CLEAR_VALUE),
          depthClear: gl.getParameter(gl.DEPTH_CLEAR_VALUE),
          viewport: gl.getParameter(gl.VIEWPORT)
        }
      });
    }, 100);
  });
});

console.log('=== RENDER DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
