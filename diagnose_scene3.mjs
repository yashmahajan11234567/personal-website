import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// More direct approach - evaluate in the page context to find Three.js objects
const diagnostics = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  // Get the WebGL context
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  // The R3F store is typically at canvas.__r3f in v9+
  // Let's check all properties on canvas
  const canvasProps = Object.getOwnPropertyNames(canvas).filter(p => p.includes('r3f') || p.includes('three') || p.includes('react') || p.includes('fiber') || p.includes('__'));
  
  // Try to access the store
  let store = null;
  for (const prop of canvasProps) {
    const val = canvas[prop];
    if (val && typeof val.getState === 'function') {
      store = val;
      break;
    }
  }
  
  // If that fails, check for the internal fiber
  let fiberRoot = null;
  if (canvas._reactRootContainer) fiberRoot = canvas._reactRootContainer;
  else if (canvas._reactInternals) fiberRoot = canvas._reactInternals;
  
  let camera = null;
  let scene = null;
  let renderer = null;
  
  if (store) {
    try {
      const state = store.getState();
      camera = state.camera;
      scene = state.scene;
      renderer = state.gl;
    } catch (e) {
      console.log('Store access error:', e.message);
    }
  }
  
  // Try a completely different approach - use the canvas to render a frame and read pixels
  // But first, let's check if there's a global THREE reference
  const hasTHREE = typeof THREE !== 'undefined';
  
  // Check if there are any meshes in the DOM (some renderers attach to window)
  let windowThreeObjects = [];
  for (const key of Object.keys(window)) {
    if (key.toLowerCase().includes('three') || key.toLowerCase().includes('scene') || key.toLowerCase().includes('camera')) {
      windowThreeObjects.push(key);
    }
  }
  
  // Let's try to use the R3F useThree hook by creating a temporary component
  // Actually, let's just try to traverse what we can
  let objects = [];
  
  if (scene) {
    scene.traverse(obj => {
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
  
  return {
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    canvasProps,
    hasStore: !!store,
    hasFiberRoot: !!fiberRoot,
    hasTHREE,
    windowThreeObjects,
    camera: camera ? {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      target: camera.target ? camera.target.toArray().map(v => Math.round(v * 100) / 100) : null,
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      quaternion: camera.quaternion.toArray().map(v => Math.round(v * 100) / 100)
    } : null,
    renderer: renderer ? {
      type: renderer.constructor.name,
      autoClear: renderer.autoClear,
      shadowMap: renderer.shadowMap ? { enabled: renderer.shadowMap.enabled, type: renderer.shadowMap.type } : null
    } : null,
    objectCount: objects.length,
    objects: objects.slice(0, 100)
  };
});

console.log('=== DIAGNOSTICS ===');
console.log(JSON.stringify(diagnostics, null, 2));
console.log('=== CONSOLE ERRORS ===');
console.log(errors.join('\n'));

await browser.close();
