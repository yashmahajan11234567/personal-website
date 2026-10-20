import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5183/#/cloud-world', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  let current = canvas[fiberKey];
  let depth = 0;
  let canvasImpl = null;
  while (current && depth < 20) {
    const name = current.type?.name || current.type?.displayName;
    if (name === 'CanvasImpl') { canvasImpl = current; break; }
    current = current.return;
    depth++;
  }
  if (!canvasImpl) return { error: 'no canvasImpl' };
  let store = null;
  let hook = canvasImpl.memoizedState;
  while (hook) {
    if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') {
      store = hook.memoizedState;
      break;
    }
    hook = hook.next;
  }
  if (!store && canvas.__r3f?.getState) store = canvas.__r3f;
  if (!store) return { error: 'no store' };

  const state = store.getState();
  const scene = state.scene;
  const camera = state.camera;

  const meshes = [];
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const c = obj.material.color?.getHexString?.() || 'no-color';
      const pos = obj.getWorldPosition ? obj.getWorldPosition(new obj.position.constructor()) : obj.position;
      const scale = obj.scale;
      meshes.push({
        name: obj.name || obj.uuid.slice(0, 8),
        geometry: obj.geometry?.type,
        color: c,
        pos: [Math.round(pos.x * 10) / 10, Math.round(pos.y * 10) / 10, Math.round(pos.z * 10) / 10],
        scale: [Math.round(scale.x * 10) / 10, Math.round(scale.y * 10) / 10, Math.round(scale.z * 10) / 10],
      });
    }
  });

  return {
    camera: {
      pos: [camera.position.x, camera.position.y, camera.position.z],
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
    },
    meshCount: meshes.length,
    meshes: meshes.filter(m =>
      // Show only large flat surfaces and dark objects
      (m.geometry === 'PlaneGeometry' && (m.scale[0] > 50 || m.scale[1] > 50 || m.scale[2] > 50)) ||
      ['3a3a2a', '4a3a2a', '2a2a3a', '3a3a4a'].includes(m.color) ||
      parseInt(m.color, 16) < 0x444444
    ),
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();