import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Use the React DevTools fiber to find the R3F canvas store
const diagnostics = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  // Get the fiber root from the canvas
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  const fiber = fiberKey ? canvas[fiberKey] : null;
  
  // Traverse the fiber tree to find the R3F Canvas component's state
  let r3fStore = null;
  
  function findR3FStore(node) {
    if (!node) return null;
    // Look for the R3F store in the memoizedState or stateNode
    if (node.memoizedState && node.memoizedState.getState) {
      return node.memoizedState;
    }
    if (node.stateNode && node.stateNode.getState) {
      return node.stateNode;
    }
    // Check children
    let child = node.child;
    while (child) {
      const found = findR3FStore(child);
      if (found) return found;
      child = child.sibling;
    }
    return null;
  }
  
  if (fiber) {
    r3fStore = findR3FStore(fiber);
  }
  
  let camera = null;
  let scene = null;
  let gl = null;
  
  if (r3fStore) {
    try {
      const state = r3fStore.getState();
      camera = state.camera;
      scene = state.scene;
      gl = state.gl;
    } catch (e) {
      console.log('Store access error:', e.message);
    }
  }
  
  // Also check the other fiber property
  const propsKey = Object.keys(canvas).find(k => k.startsWith('__reactProps'));
  const props = propsKey ? canvas[propsKey] : null;
  
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
    fiberKey,
    propsKey,
    hasR3FStore: !!r3fStore,
    camera: camera ? {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      target: camera.target ? camera.target.toArray().map(v => Math.round(v * 100) / 100) : null,
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      quaternion: camera.quaternion.toArray().map(v => Math.round(v * 100) / 100)
    } : null,
    gl: gl ? {
      type: gl.constructor.name,
      drawingBufferWidth: gl.drawingBufferWidth,
      drawingBufferHeight: gl.drawingBufferHeight
    } : null,
    objectCount: objects.length,
    objects: objects.slice(0, 120)
  };
});

console.log('=== DIAGNOSTICS ===');
console.log(JSON.stringify(diagnostics, null, 2));
console.log('=== CONSOLE ERRORS ===');
console.log(errors.join('\n'));

await browser.close();
