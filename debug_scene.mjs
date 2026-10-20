import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Inject Three.js debug directly via CDP
const cdp = await page.target().createCDPSession();
await cdp.send('Runtime.enable');

// Evaluate script to create debug visualization
const result = await cdp.send('Runtime.evaluate', {
  expression: `
    (function() {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'No canvas' };
      
      // Get the Three.js renderer/scene/camera via the canvas context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      // Try to find the R3F store
      const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
      const fiber = fiberKey ? canvas[fiberKey] : null;
      
      // Search through fiber tree for R3F store
      function findR3FStore(node, depth = 0) {
        if (!node || depth > 20) return null;
        if (node.memoizedState && node.memoizedState.getState) {
          return node.memoizedState;
        }
        if (node.stateNode && node.stateNode.getState) {
          return node.stateNode;
        }
        let child = node.child;
        while (child) {
          const found = findR3FStore(child, depth + 1);
          if (found) return found;
          child = child.sibling;
        }
        return null;
      }
      
      let store = fiber ? findR3FStore(fiber) : null;
      
      if (!store && canvas.__r3f && canvas.__r3f.getState) {
        store = canvas.__r3f;
      }
      
      if (!store && canvas._r3f && canvas._r3f.getState) {
        store = canvas._r3f;
      }
      
      let camera = null, scene = null, renderer = null;
      
      if (store) {
        try {
          const state = store.getState();
          camera = state.camera;
          scene = state.scene;
          renderer = state.gl;
        } catch (e) {}
      }
      
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
        canvas: { width: canvas.width, height: canvas.height },
        hasStore: !!store,
        camera: camera ? {
          position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
          fov: camera.fov,
          near: camera.near,
          far: camera.far,
          quaternion: camera.quaternion.toArray().map(v => Math.round(v * 100) / 100)
        } : null,
        objectCount: objects.length,
        objects: objects.slice(0, 150)
      };
    })()
  `,
  awaitPromise: true
});

console.log('=== DEBUG RESULT ===');
console.log(result.result.value ? JSON.stringify(result.result.value, null, 2) : result.result.description);

await browser.close();
