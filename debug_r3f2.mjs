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
  
  // Check all properties on the canvas
  const canvasProps = Object.getOwnPropertyNames(canvas).filter(p => 
    p.includes('r3f') || p.includes('three') || p.includes('react') || p.includes('fiber') || p.includes('__')
  );
  
  // Try to access the store directly
  let store = null;
  for (const prop of canvasProps) {
    const val = canvas[prop];
    if (val && typeof val.getState === 'function') {
      store = val;
      break;
    }
  }
  
  // Also check for __r3f property
  if (!store && canvas.__r3f && canvas.__r3f.getState) {
    store = canvas.__r3f;
  }
  
  // Also check _r3f
  if (!store && canvas._r3f && canvas._r3f.getState) {
    store = canvas._r3f;
  }
  
  // Check if there's a react fiber root
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  const fiber = fiberKey ? canvas[fiberKey] : null;
  
  let camera = null, scene = null, gl = null;
  
  if (store) {
    try {
      const state = store.getState();
      camera = state.camera;
      scene = state.scene;
      gl = state.gl;
    } catch (e) {
      return { error: 'Store access failed: ' + e.message, canvasProps, hasFiber: !!fiber };
    }
  }
  
  if (!camera) return { error: 'No camera found', canvasProps, hasFiber: !!fiber };
  if (!scene) return { error: 'No scene found', canvasProps, hasFiber: !!fiber };
  
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
    canvasProps,
    hasFiber: !!fiber,
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
