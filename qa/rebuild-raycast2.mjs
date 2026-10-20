import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);
await page.evaluate(() => { window.__cwQaCam = { pos: [0, 10, 62], target: [0, 9, 102] }; });
await page.waitForTimeout(900);
const res = await page.evaluate(() => {
  // Find the camera: R3F stores it in the fiber root of the canvas.
  const canvas = document.querySelector('canvas');
  const key = Object.keys(canvas).find(k => k.startsWith('__reactContainer') || k.startsWith('__reactFiber'));
  let cam = null;
  let fiber = canvas[key];
  // walk up/down for Camera
  const seen = new Set();
  const stack = [fiber];
  while (stack.length && !cam) {
    const f = stack.pop();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    const st = f.stateNode || f.memoizedState;
    if (f.stateNode && f.stateNode.type === 'PerspectiveCamera') cam = f.stateNode;
    if (f.memoizedProps && f.memoizedProps.camera && f.memoizedProps.camera.isPerspectiveCamera) cam = f.memoizedProps.camera;
    if (f.child) stack.push(f.child);
    if (f.sibling) stack.push(f.sibling);
  }
  if (!cam) return { camFound: false };
  cam.updateMatrixWorld();
  const THREEvc = cam.position.constructor;
  const ray = new (Object.getPrototypeOf(cam.position).constructor.extend ? Object : Object)();
  // Use proper raycaster via cam: build one from camera matrices
  const raycasterScript = `
    const cam = arguments[0];
    const scene = arguments[1];
    const ndc = { x: -0.667, y: 0 };
    const rc = new (cam.position.constructor.extend ? Object : Object)();
  `;
  // Simplest: patch THREE in from the module scope of the app — window.THREE isn't
  // exposed. Use the camera's unproject: cam.unproject needs a Vector3 of the same
  // class. Construct via cam.position.clone-like: use THREE.Vector3 from any
  // object3D in the scene: e.g. scene.position.__proto__.constructor
  const V3 = cam.position.constructor;
  const ndcNear = new V3(-0.667, 0, 0.5).unproject(cam);
  const ndcFar = new V3(-0.667, 0, 1).unproject(cam);
  const dir = ndcFar.clone().sub(ndcNear).normalize();
  // Raycast against the mountain surface: find the big mesh (vertexColors)
  let surface = null;
  scene.traverse((o) => {
    if (o.type === 'Mesh' && o.material?.vertexColors && !surface && o.geometry?.attributes?.position?.count > 3000) surface = o;
  });
  if (!surface) return { camFound: true, surfaceFound: false };
  const raycaster = { far: 300 };
  // Build a minimal raycaster from the scene's own THREE: use one via any mesh's
  // material... Not accessible. Use math: march dir and test against the surface's
  // bounding structures? Use three-mesh-bvh absent. Do triangle intersection via
  // geometry positions manually — heavy but decisive for ONE ray.
  const pos = surface.geometry.attributes.position;
  const a = new V3(), b = new V3(), c = new V3();
  const ro = ndcNear, rd = dir;
  let bestT = Infinity, bestTri = null;
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    // Möller–Trumbore
    const e1 = b.clone().sub(a), e2 = c.clone().sub(a);
    const p = dir.clone().cross(e2);
    const det = e1.dot(p);
    if (Math.abs(det) < 1e-8) continue;
    const inv = 1 / det;
    const t = ro.clone().sub(a);
    const u = t.dot(p) * inv;
    if (u < 0 || u > 1) continue;
    const q = t.clone().cross(e1);
    const v = dir.dot(q) * inv;
    if (v < 0 || u + v > 1) continue;
    const tt = e2.dot(q) * inv;
    if (tt > 0.5 && tt < bestT) { bestT = tt; bestTri = i; }
  }
  if (!bestTri) return { camFound: true, surfaceFound: true, hit: false };
  const hitPoint = ro.clone().add(dir.clone().multiplyScalar(bestT));
  return { camFound: true, surfaceFound: true, hit: true,
           dist: Math.round(bestT * 10) / 10,
           point: { x: Math.round(hitPoint.x), y: Math.round(hitPoint.y * 10) / 10, z: Math.round(hitPoint.z) } };
});
console.log(JSON.stringify(res, null, 0));
await browser.close();
