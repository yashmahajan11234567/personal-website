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
  
  // Check __r3f property directly
  const r3f = canvas.__r3f;
  let r3fDetail = {};
  if (r3f) {
    for (const key of Object.keys(r3f)) {
      const val = r3f[key];
      r3fDetail[key] = {
        type: typeof val,
        constructor: val?.constructor?.name,
        isFunction: typeof val === 'function'
      };
    }
  }
  
  // Check _r3f
  const r3f2 = canvas._r3f;
  let r3f2Detail = {};
  if (r3f2) {
    for (const key of Object.keys(r3f2)) {
      const val = r3f2[key];
      r3f2Detail[key] = {
        type: typeof val,
        constructor: val?.constructor?.name,
        isFunction: typeof val === 'function'
      };
    }
  }
  
  // Try to call getState if available
  let storeState = null;
  if (r3f && typeof r3f.getState === 'function') {
    try {
      storeState = r3f.getState();
    } catch (e) {
      storeState = { error: e.message };
    }
  } else if (r3f2 && typeof r3f2.getState === 'function') {
    try {
      storeState = r3f2.getState();
    } catch (e) {
      storeState = { error: e.message };
    }
  }
  
  let cameraInfo = null, sceneInfo = null, glInfo = null;
  if (storeState && !storeState.error) {
    cameraInfo = storeState.camera ? {
      position: storeState.camera.position.toArray().map(v => Math.round(v * 100) / 100),
      fov: storeState.camera.fov,
      near: storeState.camera.near,
      far: storeState.camera.far,
      zoom: storeState.camera.zoom
    } : null;
    sceneInfo = storeState.scene ? 'THREE.Scene' : null;
    glInfo = storeState.gl ? {
      type: storeState.gl.constructor.name,
      drawingBufferWidth: storeState.gl.drawingBufferWidth,
      drawingBufferHeight: storeState.gl.drawingBufferHeight
    } : null;
  }
  
  return {
    hasR3F: !!r3f,
    hasR3F2: !!r3f2,
    r3fDetail,
    r3f2Detail,
    storeState: storeState ? {
      hasCamera: !!storeState.camera,
      hasScene: !!storeState.scene,
      hasGl: !!storeState.gl,
      camera: cameraInfo,
      scene: sceneInfo,
      gl: glInfo
    } : null
  };
});

console.log('=== __r3f PROPERTY DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
