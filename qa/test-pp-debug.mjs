/** Debug post-processing in Cloud World */
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

// Check canvas and R3F internals
const debugInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas' };
  
  // Check R3F fiber
  const fiber = canvas.__r3f;
  
  // Check scene for post-processing
  let composer = null;
  let bloomEffect = null;
  let vignetteEffect = null;
  let noiseEffect = null;
  
  if (fiber && fiber.scene) {
    fiber.scene.traverse(obj => {
      if (obj.constructor?.name?.includes('EffectComposer') || obj.constructor?.name?.includes('Composer')) {
        composer = obj;
      }
      if (obj.constructor?.name?.includes('SelectiveBloom') || obj.constructor?.name?.includes('Bloom')) {
        bloomEffect = obj;
      }
      if (obj.constructor?.name?.includes('Vignette')) {
        vignetteEffect = obj;
      }
      if (obj.constructor?.name?.includes('Noise')) {
        noiseEffect = obj;
      }
    });
  }
  
  return {
    hasFiber: !!fiber,
    fiberKeys: fiber ? Object.keys(fiber) : null,
    scene: fiber?.scene ? {
      children: fiber.scene.children.length,
      traverse: 'yes'
    } : null,
    composer: !!composer,
    bloomEffect: !!bloomEffect,
    vignetteEffect: !!vignetteEffect,
    noiseEffect: !!noiseEffect,
    canvasParent: canvas.parentElement?.className,
  };
});

console.log('\n=== Debug Info ===');
console.log(JSON.stringify(debugInfo, null, 2));

// Check if cloud meshes have layer 1
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
await page.screenshot({ path: 'qa-screenshots/cloudworld-pp-debug.png', fullPage: true });
console.log('\nScreenshot captured');

await browser.close();
