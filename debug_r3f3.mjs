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
  
  // Deep fiber traversal to find R3F store
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  const fiber = fiberKey ? canvas[fiberKey] : null;
  
  let foundStore = null;
  let visited = new Set();
  let maxDepth = 0;
  
  function findR3FStore(node, depth = 0) {
    if (!node || depth > 50 || visited.has(node)) return null;
    visited.add(node);
    maxDepth = Math.max(maxDepth, depth);
    
    // Check memoizedState
    if (node.memoizedState && typeof node.memoizedState.getState === 'function') {
      return node.memoizedState;
    }
    
    // Check stateNode
    if (node.stateNode && typeof node.stateNode.getState === 'function') {
      return node.stateNode;
    }
    
    // Check alternate
    if (node.alternate) {
      const alt = findR3FStore(node.alternate, depth + 1);
      if (alt) return alt;
    }
    
    // Check children
    let child = node.child;
    while (child) {
      const found = findR3FStore(child, depth + 1);
      if (found) return found;
      child = child.sibling;
    }
    
    // Check return fiber
    if (node.return) {
      const ret = findR3FStore(node.return, depth + 1);
      if (ret) return ret;
    }
    
    return null;
  }
  
  if (fiber) {
    foundStore = findR3FStore(fiber);
  }
  
  // Also check __r3f
  if (!foundStore && canvas.__r3f && canvas.__r3f.getState) {
    foundStore = canvas.__r3f;
  }
  if (!foundStore && canvas._r3f && canvas._r3f.getState) {
    foundStore = canvas._r3f;
  }
  
  let camera = null, scene = null, gl = null;
  
  if (foundStore) {
    try {
      const state = foundStore.getState();
      camera = state.camera;
      scene = state.scene;
      gl = state.gl;
    } catch (e) {
      return { error: 'Store access failed: ' + e.message, maxDepth };
    }
  }
  
  if (!camera) return { error: 'No camera found', hasStore: !!foundStore, maxDepth };
  if (!scene) return { error: 'No scene found', hasStore: !!foundStore, maxDepth };
  
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
          depthWrite: obj.material.depthWrite,
          emissive: obj.material.emissive ? '#' + obj.material.emissive.getHexString() : null,
          emissiveIntensity: obj.material.emissiveIntensity
        } : null,
        geometry: obj.geometry ? {
          type: obj.geometry.type,
          parameters: obj.geometry.parameters
        } : null
      });
    }
  });
  
  return {
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    hasStore: !!foundStore,
    maxDepth,
    camera: {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      quaternion: camera.quaternion.toArray().map(v => Math.round(v * 100) / 100),
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom
    },
    renderer: gl ? {
      type: gl.constructor.name,
      pixelRatio: gl.getPixelRatio?.() || 'unknown'
    } : null,
    objectCount: objects.length,
    objects: objects
  };
});

console.log('=== R3F SCENE DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
