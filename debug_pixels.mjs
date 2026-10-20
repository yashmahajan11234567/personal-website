import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

const result = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  // Read pixels at various positions
  const centerPixel = new Uint8Array(4);
  gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, centerPixel);
  
  const topPixel = new Uint8Array(4);
  gl.readPixels(canvas.width / 2, canvas.height * 0.1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, topPixel);
  
  const bottomPixel = new Uint8Array(4);
  gl.readPixels(canvas.width / 2, canvas.height * 0.9, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bottomPixel);
  
  const leftPixel = new Uint8Array(4);
  gl.readPixels(canvas.width * 0.1, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, leftPixel);
  
  const rightPixel = new Uint8Array(4);
  gl.readPixels(canvas.width * 0.9, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rightPixel);
  
  // Read a small region around center
  const centerRegion = new Uint8Array(10 * 10 * 4);
  gl.readPixels(canvas.width / 2 - 5, canvas.height / 2 - 5, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, centerRegion);
  
  // Check if any non-zero pixels in center region
  let nonZeroCount = 0;
  let maxR = 0, maxG = 0, maxB = 0;
  for (let i = 0; i < centerRegion.length; i += 4) {
    if (centerRegion[i] > 0 || centerRegion[i+1] > 0 || centerRegion[i+2] > 0) {
      nonZeroCount++;
      maxR = Math.max(maxR, centerRegion[i]);
      maxG = Math.max(maxG, centerRegion[i+1]);
      maxB = Math.max(maxB, centerRegion[i+2]);
    }
  }
  
  return {
    canvas: { width: canvas.width, height: canvas.height },
    centerPixel: Array.from(centerPixel),
    topPixel: Array.from(topPixel),
    bottomPixel: Array.from(bottomPixel),
    leftPixel: Array.from(leftPixel),
    rightPixel: Array.from(rightPixel),
    centerRegion: {
      nonZeroPixels: nonZeroCount,
      totalPixels: 100,
      maxR, maxG, maxB
    }
  };
});

console.log('=== PIXEL DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
