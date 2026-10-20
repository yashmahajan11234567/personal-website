import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Use the global __THREE__ reference
const diagnostics = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };
  
  // Check the global __THREE__ object
  const three = window.__THREE__;
  
  let objects = [];
  let camera = null;
  let scene = null;
  let renderer = null;
  
  if (three) {
    // The __THREE__ object might contain scene, camera, renderer
    // In some R3F versions, it exposes these
    scene = three.scene;
    camera = three.camera;
    renderer = three.renderer || three.gl;
  }
  
  // If not found, check for other common globals
  if (!scene && window.scene) scene = window.scene;
  if (!camera && window.camera) camera = window.camera;
  if (!renderer && window.renderer) renderer = window.renderer;
  
  // Also check if the canvas has a __webglContext or similar
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
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
  
  // Check what's in the THREE global
  let threeKeys = [];
  if (three) {
    threeKeys = Object.keys(three);
  }
  
  return {
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    threeKeys,
    hasScene: !!scene,
    hasCamera: !!camera,
    hasRenderer: !!renderer,
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
      autoClear: renderer.autoClear
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
