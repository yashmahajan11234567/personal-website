/** Final verification of post-processing effects */
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

// Navigate directly to cloud-world
await page.goto('http://localhost:5195/#/cloud-world');
await page.waitForTimeout(3000);

// Wait for effects to settle
await page.waitForTimeout(5000);

// Check canvas info
const canvasInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
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

// Check for Cloud World elements
const cloudWorldCheck = await page.evaluate(() => {
  return {
    cloudWorldContainer: !!document.querySelector('.cloud-world-container'),
    cloudWorldOverlay: !!document.querySelector('.cloud-world-overlay'),
    worldCanvas: !!document.querySelector('.world-canvas'),
    dataWorldCanvas: !!document.querySelector('[data-testid="world-canvas"]'),
  };
});
console.log('\nCloud World check:', JSON.stringify(cloudWorldCheck, null, 2));

// Check if EffectComposer and effects are present
const effectCheck = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // Check for post-processing by examining the renderer's render target chain
  const fiber = canvas.__r3f;
  
  let hasEffectComposer = false;
  let hasSelectiveBloom = false;
  let hasVignette = false;
  let hasNoise = false;
  
  if (fiber && fiber.scene) {
    fiber.scene.traverse(obj => {
      const name = obj.constructor?.name || '';
      if (name.includes('EffectComposer') || name.includes('Composer')) {
        hasEffectComposer = true;
      }
      if (name.includes('SelectiveBloom') || name.includes('Bloom')) {
        hasSelectiveBloom = true;
      }
      if (name.includes('Vignette')) {
        hasVignette = true;
      }
      if (name.includes('Noise')) {
        hasNoise = true;
      }
    });
  }
  
  return {
    hasFiber: !!fiber,
    fiberKeys: fiber ? Object.keys(fiber) : null,
    sceneChildren: fiber?.scene?.children?.length,
    hasEffectComposer,
    hasSelectiveBloom,
    hasVignette,
    hasNoise,
    canvasParent: canvas.parentElement?.className,
  };
});

console.log('\n=== Effect Check ===');
console.log(JSON.stringify(effectCheck, null, 2));

// Check layer 1 meshes
const layerCheck = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  const fiber = canvas.__r3f;
  if (!fiber || !fiber.scene) return { error: 'No scene' };
  
  const layer1Meshes = [];
  fiber.scene.traverse(obj => {
    if (obj.isMesh && obj.layers && obj.layers.test(1)) {
      layer1Meshes.push({
        uuid: obj.uuid.slice(0, 8),
        position: obj.position.toArray(),
        material: obj.material?.constructor?.name,
      });
    }
  });
  
  return { layer1Meshes };
});

console.log('\n=== Layer 1 Meshes ===');
console.log(JSON.stringify(layerCheck, null, 2));

// Wait a bit more
await page.waitForTimeout(3000);

// Capture screenshot
await page.screenshot({ path: 'qa-screenshots/cloudworld-pp-final.png', fullPage: true });
console.log('\nScreenshot captured');

// Post-processing related logs
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

await browser.close();
