import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

const result = await page.evaluate(() => {
  // Check the __THREE__ global
  const three = window.__THREE__;
  let threeKeys = [];
  if (three) {
    threeKeys = Object.keys(three);
  }
  
  // Check if there's a scene, camera, renderer in __THREE__
  let scene = null, camera = null, renderer = null;
  if (three) {
    scene = three.scene;
    camera = three.camera;
    renderer = three.renderer || three.gl;
  }
  
  // Also check common properties
  const canvas = document.querySelector('canvas');
  let gl = canvas ? (canvas.getContext('webgl2') || canvas.getContext('webgl')) : null;
  
  let objects = [];
  if (scene) {
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
  }
  
  return {
    threeKeys,
    hasScene: !!scene,
    hasCamera: !!camera,
    hasRenderer: !!renderer,
    camera: camera ? {
      position: camera.position.toArray().map(v => Math.round(v * 100) / 100),
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom
    } : null,
    renderer: renderer ? {
      type: renderer.constructor.name,
      autoClear: renderer.autoClear,
      getPixelRatio: typeof renderer.getPixelRatio === 'function'
    } : null,
    objectCount: objects.length,
    objects: objects.slice(0, 100)
  };
});

console.log('=== __THREE__ GLOBAL DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
