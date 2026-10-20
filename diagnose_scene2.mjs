import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Inject diagnostic code into the page
const diagnostics = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  // R3F v9+ stores the store on the canvas as a property
  // Try multiple ways to access the store
  let store = canvas.__r3f || canvas._r3f || canvas.__reactThreeFiber;
  
  // Also check if there's a global reference
  if (!store && window.__r3f) store = window.__r3f;
  if (!store && window.__THREE__) store = window.__THREE__;
  
  // Try to find the internal react fiber root
  const fiber = canvas._reactRootContainer || canvas._reactInternals;
  
  let camera = null;
  let scene = null;
  let gl = null;
  
  if (store && typeof store.getState === 'function') {
    const state = store.getState();
    camera = state.camera;
    scene = state.scene;
    gl = state.gl;
  }
  
  // Alternative: look at the renderer directly
  if (!camera && gl) {
    // Can't easily get camera from gl alone
  }
  
  // Let's try a different approach - traverse from the scene if we can find it
  // Check if there's a __three property on objects
  let objects = [];
  let foundScene = scene;
  
  // If no scene found, try to find it through the fiber tree
  if (!foundScene && fiber) {
    // This is complex, let's try another way
  }
  
  // Try to use the R3F useThree hook approach by evaluating in component context
  // For now, let's just try to access via the canvas.__r3f which should work in v9
  if (canvas.__r3f && canvas.__r3f.getState) {
    const state = canvas.__r3f.getState();
    camera = state.camera;
    foundScene = state.scene;
    gl = state.gl;
  }
  
  if (foundScene) {
    foundScene.traverse(obj => {
      if (obj.type === 'Mesh' || obj.type === 'Group' || obj.type === 'Object3D') {
        objects.push({
          type: obj.type,
          name: obj.name || obj.uuid.slice(0, 8),
          position: obj.position.toArray().map(v => Math.round(v * 100) / 100),
          scale: obj.scale.toArray().map(v => Math.round(v * 100) / 100),
          visible: obj.visible,
          material: obj.material ? {
            type: obj.material.type,
            color: obj.material.color ? '#' + obj.material.color.getHexString() : null,
            transparent: obj.material.transparent,
            opacity: obj.material.opacity,
            side: obj.material.side,
            depthTest: obj.material.depthTest,
            depthWrite: obj.material.depthWrite
          } : null,
          geometry: obj.geometry ? {
            type: obj.geometry.type,
            parameters: obj.geometry.parameters
          } : null
        });
      }
    });
  }
  
  // Also check for OrbitControls target
  let controlsTarget = null;
  if (camera) {
    // Camera might have controls attached
  }
  
  return {
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    hasStore: !!store,
    camera: camera ? {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      target: camera.target ? camera.target.toArray().map(v => Math.round(v * 100) / 100) : null,
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      quaternion: camera.quaternion.toArray().map(v => Math.round(v * 100) / 100)
    } : null,
    objectCount: objects.length,
    objects: objects.slice(0, 80)
  };
});

console.log('=== DIAGNOSTICS ===');
console.log(JSON.stringify(diagnostics, null, 2));
console.log('=== CONSOLE ERRORS ===');
console.log(errors.join('\n'));

await browser.close();
