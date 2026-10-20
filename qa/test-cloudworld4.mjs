/** Test Cloud World - check console logs more carefully */
import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
  console.log(`  [${log.type}] ${log.text}`);
});
page.on('pageerror', err => {
  const log = { type: 'error', text: err.message };
  consoleLogs.push(log);
  console.log(`  [error] ${log.text}`);
});

// Navigate to hero page
await page.goto('http://localhost:5195/');
await page.waitForTimeout(2000);

// Scroll to selection hold (bottom of cinematic)
await page.evaluate(() => {
  const track = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, track);
});
await page.waitForTimeout(2000);

// Find and click the Cloud board
const cloudBoard = await page.locator('[data-testid="world-board-cloud"]').first();
await cloudBoard.click();
console.log('Clicked Cloud board');

// Wait for handoff and world mount - longer wait
await page.waitForTimeout(8000);

// Check for canvas
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // Try WebGL2 first
  let gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  let webglVersion = 'WebGL2';
  if (!gl) {
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    webglVersion = 'WebGL1';
  }
  if (!gl) return { error: 'No WebGL context' };
  
  return {
    width: canvas.width,
    height: canvas.height,
    webglVersion,
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION),
    hasWebGL2: webglVersion === 'WebGL2',
  };
});

console.log('\n=== Canvas/Renderer Info ===');
console.log(JSON.stringify(canvasInfo, null, 2));

// Check if R3F cloud world is mounted
const r3fCheck = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // Check for R3F fiber on canvas
  const fiber = canvas.__r3f;
  
  // Also check if there are multiple canvases
  const canvases = document.querySelectorAll('canvas');
  
  return {
    canvasCount: canvases.length,
    hasFiber: !!fiber,
    fiberKeys: fiber ? Object.keys(fiber) : null,
    canvasParent: canvas.parentElement?.className,
  };
});

console.log('\n=== R3F Check ===');
console.log(JSON.stringify(r3fCheck, null, 2));

// Capture screenshot
await page.screenshot({ path: 'qa-screenshots/cloudworld-verify4.png', fullPage: true });
console.log('\nScreenshot captured');

await browser.close();
