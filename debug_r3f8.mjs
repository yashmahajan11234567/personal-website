import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

const result = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  const fiber = fiberKey ? canvas[fiberKey] : null;
  
  // Collect ALL fibers in the tree
  let allFibers = [];
  let r3fStore = null;
  
  function collectFibers(node, depth = 0, path = 'root') {
    if (!node || depth > 50) return;
    
    const info = {
      path,
      depth,
      typeName: node.type?.name || node.type?.displayName || (typeof node.type === 'function' ? 'FunctionComponent' : node.type),
      hasMemoizedState: !!node.memoizedState,
      memoizedStateType: node.memoizedState?.constructor?.name,
      hasGetState: node.memoizedState && typeof node.memoizedState.getState === 'function',
      stateNodeType: node.stateNode?.constructor?.name,
      hasStateNodeGetState: node.stateNode && typeof node.stateNode.getState === 'function',
      child: !!node.child,
      sibling: !!node.sibling,
      return: !!node.return
    };
    allFibers.push(info);
    
    // Check for R3F store
    if (node.memoizedState && typeof node.memoizedState.getState === 'function') {
      r3fStore = node.memoizedState;
    }
    if (node.stateNode && typeof node.stateNode.getState === 'function') {
      r3fStore = node.stateNode;
    }
    
    let child = node.child;
    let idx = 0;
    while (child) {
      collectFibers(child, depth + 1, path + '.child[' + idx + ']');
      child = child.sibling;
      idx++;
    }
  }
  
  if (fiber) collectFibers(fiber);
  
  // Try to get the store from canvas properties
  if (!r3fStore && canvas.__r3f && canvas.__r3f.getState) r3fStore = canvas.__r3f;
  if (!r3fStore && canvas._r3f && canvas._r3f.getState) r3fStore = canvas._r3f;
  
  let camera = null, scene = null, gl = null;
  
  if (r3fStore) {
    try {
      const state = r3fStore.getState();
      camera = state.camera;
      scene = state.scene;
      gl = state.gl;
    } catch (e) {
      return { error: 'Store access failed: ' + e.message, fibers: allFibers };
    }
  }
  
  if (!camera) return { error: 'No camera found', hasStore: !!r3fStore, fibers: allFibers };
  if (!scene) return { error: 'No scene found', hasStore: !!r3fStore, fibers: allFibers };
  
  let objects = [];
  scene.traverse(obj => {
    if (obj.type === 'Mesh' || obj.type === 'Group' || obj.type === 'Object3D') {
      objects.push({
        type: obj.type,
        name: obj.name || obj.uuid.slice(0, 8),
        position: obj.position.toArray().map(v => Math.round(v * 100) / 100),
        scale: obj.scale.toArray().map(v => Math.round(v * 100) / 100),
        rotation: obj.rotation.toArray().map(v => Math.round(v * 100) / 100),
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
  
  return {
    hasStore: !!r3fStore,
    fiberCount: allFibers.length,
    fibers: allFibers.slice(0, 50),
    camera: {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom
    },
    objectCount: objects.length,
    objects: objects
  };
});

console.log('=== FULL FIBER TREE DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
