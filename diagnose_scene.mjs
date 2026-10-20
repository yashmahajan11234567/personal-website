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
  // Find the canvas
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  // Get the Three.js renderer/scene/camera from the R3F context
  // R3F stores the internal instance on the canvas
  const gl = canvas.__r3f || canvas.__three || null;
  
  // Try to access via the react-three-fiber internal
  let camera = null;
  let scene = null;
  let renderer = null;
  
  // The canvas might have a reference to the R3F store
  if (canvas._r3f) {
    const store = canvas._r3f;
    camera = store.getState().camera;
    scene = store.getState().scene;
    renderer = store.getState().gl;
  } else if (canvas.__r3f) {
    const store = canvas.__r3f;
    camera = store.getState().camera;
    scene = store.getState().scene;
    renderer = store.getState().gl;
  }
  
  // Alternative: look for the renderer in the window
  if (!camera && window.__R3F_CAMERA__) {
    camera = window.__R3F_CAMERA__;
  }
  
  // Try to traverse the scene graph if we have a scene
  let objects = [];
  if (scene) {
    scene.traverse(obj => {
      if (obj.type === 'Mesh' || obj.type === 'Group' || obj.type === 'Object3D') {
        objects.push({
          type: obj.type,
          name: obj.name || obj.uuid,
          position: obj.position.toArray().map(v => Math.round(v * 100) / 100),
          scale: obj.scale.toArray().map(v => Math.round(v * 100) / 100),
          visible: obj.visible,
          material: obj.material ? {
            type: obj.material.type,
            color: obj.material.color ? '#' + obj.material.color.getHexString() : null,
            transparent: obj.material.transparent,
            opacity: obj.material.opacity,
            side: obj.material.side
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
    camera: camera ? {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      target: camera.target ? camera.target.toArray().map(v => Math.round(v * 100) / 100) : null,
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom
    } : null,
    objectCount: objects.length,
    objects: objects.slice(0, 50) // Limit output
  };
});

console.log('=== DIAGNOSTICS ===');
console.log(JSON.stringify(diagnostics, null, 2));
console.log('=== CONSOLE ERRORS ===');
console.log(errors.join('\n'));

await browser.close();
