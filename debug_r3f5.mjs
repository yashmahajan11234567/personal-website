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
  
  // Check what's rendered by reading pixels at different positions
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  // Read center pixel
  const centerPixel = new Uint8Array(4);
  gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, centerPixel);
  
  // Read top pixel (sky)
  const topPixel = new Uint8Array(4);
  gl.readPixels(canvas.width / 2, canvas.height * 0.1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, topPixel);
  
  // Read bottom pixel (ground)
  const bottomPixel = new Uint8Array(4);
  gl.readPixels(canvas.width / 2, canvas.height * 0.9, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bottomPixel);
  
  // Check if there's a three.js renderer attached to the canvas
  const canvasKeys = Object.keys(canvas);
  
  // Look for any THREE objects in window
  let windowThree = [];
  for (const key of Object.keys(window)) {
    if (key.toLowerCase().includes('three') || key.toLowerCase().includes('scene') || key.toLowerCase().includes('camera') || key.toLowerCase().includes('renderer')) {
      windowThree.push(key);
    }
  }
  
  // Check the props on canvas
  const propsKey = Object.keys(canvas).find(k => k.startsWith('__reactProps'));
  const props = propsKey ? canvas[propsKey] : null;
  
  // Check if Canvas component has children in its props
  let canvasChildren = null;
  if (props && props.children) {
    canvasChildren = Array.isArray(props.children) ? props.children.length : 1;
  }
  
  return {
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    centerPixel: Array.from(centerPixel),
    topPixel: Array.from(topPixel),
    bottomPixel: Array.from(bottomPixel),
    canvasKeys: canvasKeys.filter(k => k.startsWith('__')),
    windowThree,
    hasProps: !!props,
    canvasChildren,
    glVersion: gl.getParameter(gl.VERSION),
    glRenderer: gl.getParameter(gl.RENDERER)
  };
});

console.log('=== CANVAS PIXEL DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
