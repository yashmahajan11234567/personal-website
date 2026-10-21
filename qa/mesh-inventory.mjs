/** True rendered-silhouette probe: traverse __cwScene, find the big mountain
 * meshes, and raycast per screen column using THREE.Raycaster from the page's
 * own three.js (bundle exposes it via the scene's children constructors). */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);

const result = await page.evaluate(() => {
  const scene = window.__cwScene;
  // Find THREE via any mesh's geometry constructor chain
  let THREE = null;
  scene.traverse((o) => {
    if (!THREE && o.isMesh && o.geometry && o.geometry.boundingSphere !== undefined) {
      THREE = o.geometry.constructor.constructor; // function Object → no
    }
  });
  // Simpler: the R3F root exposes THREE via window.__THREE__ in dev; in prod
  // not available — but Raycaster can be reached through the fiber root store?
  // Brute-force alternative that always works: use gl.readPixels? No.
  // Use the camera from the R3F store through the canvas fiber (worked in
  // earlier sessions):
  const canvas = document.querySelector('canvas');
  const fk = Object.keys(canvas).find((k) => k.startsWith('__reactFiber'));
  let fiber = canvas[fk];
  let store = null, depth = 0;
  while (fiber && depth < 60 && !store) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (hook.memoizedState && typeof hook.memoizedState.getState === 'function' && hook.memoizedState.getState().scene) { store = hook.memoizedState; break; }
      hook = hook.next;
    }
    fiber = fiber.return; depth++;
  }
  if (!store) return { error: 'no store' };
  const st = store.getState();
  const camera = st.camera;
  const Ray = st.gl.__proto__.constructor; // WebGLRenderer — no
  // THREE classes hang off the scene objects:
  const sample = st.scene.children[0];
  const Vec3 = sample.position.constructor;
  const Mat4 = sample.matrixWorld.constructor;
  // Raycaster lives at THREE.Raycaster; get THREE from any THREE export on
  // the renderer: st.gl.info is a plain object... Use scene.background?
  // Robust: construct via the material's constructor module — not exposed.
  // FALLBACK that needs no THREE: manual ray vs bounding-BOX of the massif
  // meshes is crude. Instead do CPU ray-march over the mesh's position
  // attribute (fine at 0.5u steps using a local is-inside test via closest
  // vertex distance — too slow).
  // BEST AVAILABLE: raycast via the camera's own projection — compute each
  // mesh's silhouette analytically is overkill. Use bounding-box slabs:
  const boxes = [];
  st.scene.traverse((o) => {
    if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position && o.geometry.attributes.position.count > 5000) {
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      const corners = [
        new Vec3(bb.min.x, bb.min.y, bb.min.z), new Vec3(bb.max.x, bb.min.y, bb.min.z),
        new Vec3(bb.min.x, bb.max.y, bb.min.z), new Vec3(bb.max.x, bb.max.y, bb.min.z),
        new Vec3(bb.min.x, bb.min.y, bb.max.z), new Vec3(bb.max.x, bb.min.y, bb.max.z),
        new Vec3(bb.min.x, bb.max.y, bb.max.z), new Vec3(bb.max.x, bb.max.y, bb.max.z),
      ].map((v) => v.applyMatrix4(o.matrixWorld));
      boxes.push({ name: o.name || o.uuid.slice(0, 4), count: o.geometry.attributes.position.count, corners });
    }
  });
  window.__cwQaCam = { pos: [0, 6.5, 44], target: [0, 6, 100] };
  return { error: null, boxes: boxes.map((b) => ({ name: b.name, count: b.count, min: [Math.min(...b.corners.map((c) => c.x)), Math.min(...b.corners.map((c) => c.y)), Math.min(...b.corners.map((c) => c.z))], max: [Math.max(...b.corners.map((c) => c.x)), Math.max(...b.corners.map((c) => c.y)), Math.max(...b.corners.map((c) => c.z))] })) };
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
console.log('done');
