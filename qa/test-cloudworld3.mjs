/** Test Cloud World - force WebGL2 and check post-processing */
import { chromium } from 'playwright';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleLogs.push({ type: 'error', text: err.message }));

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

// Wait for handoff and world mount
await page.waitForTimeout(6000);

// Check for canvas and WebGL2
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // Force WebGL2
  let gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  let webglVersion = 'WebGL2';
  if (!gl) {
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    webglVersion = 'WebGL1';
  }
  if (!gl) return { error: 'No WebGL context' };
  
  // Check for post-processing related extensions
  const extensions = gl.getSupportedExtensions();
  
  return {
    width: canvas.width,
    height: canvas.height,
    webglVersion,
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    hasWebGL2: webglVersion === 'WebGL2',
    extensions: extensions?.slice(0, 30),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
  };
});

console.log('\n=== Canvas/Renderer Info ===');
console.log(JSON.stringify(canvasInfo, null, 2));

// Check if EffectComposer is in the scene by looking at the render loop
const effectCheck = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // Check for any post-processing related objects in global scope
  const globals = Object.keys(window).filter(k => 
    k.toLowerCase().includes('effect') || 
    k.toLowerCase().includes('composer') ||
    k.toLowerCase().includes('bloom') ||
    k.toLowerCase().includes('postprocess')
  );
  
  return { globals };
});

console.log('\n=== Global Post-Processing Objects ===');
console.log(JSON.stringify(effectCheck, null, 2));

// Console logs
console.log('\n=== Console Logs ===');
for (const log of consoleLogs) {
  console.log(`  [${log.type}] ${log.text}`);
}

// Post-processing related
const ppLogs = consoleLogs.filter(l => 
  l.text.toLowerCase().includes('postprocess') || 
  l.text.toLowerCase().includes('effectcomposer') ||
  l.text.toLowerCase().includes('bloom') ||
  l.text.toLowerCase().includes('vignette') ||
  l.text.toLowerCase().includes('noise') ||
  l.text.toLowerCase().includes('selective')
);
console.log('\n=== Post-Processing Related Logs ===');
if (ppLogs.length === 0) {
  console.log('  (none found)');
} else {
  for (const log of ppLogs) {
    console.log(`  [${log.type}] ${log.text}`);
  }
}

// All error logs
const errors = consoleLogs.filter(l => l.type === 'error');
console.log('\n=== Errors ===');
if (errors.length === 0) {
  console.log('  (none)');
} else {
  for (const err of errors) {
    console.log(`  ${err.text}`);
  }
}

// Capture screenshot
await page.screenshot({ path: 'qa-screenshots/cloudworld-verify3.png', fullPage: true });
console.log('\nScreenshot captured');

await browser.close();
