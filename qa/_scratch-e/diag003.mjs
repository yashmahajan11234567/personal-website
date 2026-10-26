// DIAG-003: definitive scene inventory + side-aware raycast at the approach
// pin pose. Verifies the reconstructed camera by projecting the known
// billboard anchor, inventories every scene child's bbox, then casts rays
// with the massif's material temporarily DoubleSide to expose backfaces.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:5178/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-diag-003');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)); });
await page.goto(BASE, { waitUntil: 'load', timeout: 90000 });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForTimeout(10000);

const cz = 75.5, cx = -1.5; // pathCenterX(85) approx
const poseA = { pos: [cx, 7.5, cz], target: [cx, 1.8, 85] };
await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [poseA.pos, poseA.target]);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/A-approach.png` });

const report = await page.evaluate(async ([pos, target]) => {
  const scene = window.__cwScene;
  const THREE = await import('/@fs/D:/Yash/personal-website/node_modules/three/build/three.module.js');
  const { Raycaster, Vector3, PerspectiveCamera, Box3 } = THREE;

  // live camera position from the FrameDriver ring buffer (ground truth)
  const hist = window.__cwCamHist || [];
  const lastCam = hist.length ? hist[hist.length - 1] : null;

  const camera = new PerspectiveCamera(50, 1440 / 900, 0.1, 20000);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateMatrixWorld();

  // ---- scene child inventory (top level, with world bboxes)
  const inv = [];
  const box = new Box3();
  for (const o of scene.children) {
    try { box.setFromObject(o); } catch { continue; }
    if (!isFinite(box.min.x)) continue;
    inv.push({
      type: o.type, name: o.name || '',
      min: [box.min.x, box.min.y, box.min.z].map(v => +v.toFixed(1)),
      max: [box.max.x, box.max.y, box.max.z].map(v => +v.toFixed(1)),
      tris: o.geometry && o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count / 3 : (o.children ? 'group' : '-'),
    });
  }
  inv.sort((a, b) => (b.tris || 0) - (a.tris || 0) || (b.max[2] - b.min[2]) - (a.max[2] - a.min[2]));

  // ---- verify camera by projecting the billboard anchor (mountGround+12, z=88.5)
  const bill = new Vector3(-1.5, 12, 88.5).project(camera);
  const billPx = [Math.round((bill.x + 1) / 2 * 1440), Math.round((1 - bill.y) / 2 * 900)];

  // ---- raycast helper with side override
  const rc = new Raycaster();
  rc.camera = camera;
  const W = 1440, H = 900;
  const overridden = [];
  function cast(nx, ny, doubleSide) {
    const ndc = new Vector3((nx / W) * 2 - 1, -(ny / H) * 2 + 1, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    rc.set(camera.position, dir);
    if (doubleSide) {
      scene.traverse(o => {
        if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.side === 0) { // FrontSide
          o.material.side = 2; // DoubleSide
          overridden.push(o);
        }
      });
    }
    let hits;
    try {
      const objs = [];
      scene.traverse(o => { if (!o.isSprite && o.visible) objs.push(o); });
      hits = rc.intersectObjects(objs, false);
    } finally {
      if (doubleSide) for (const o of overridden) o.material.side = 0;
    }
    return hits.slice(0, 4).map(h => ({
      kind: h.object.type, dist: +h.distance.toFixed(2),
      point: h.point.toArray().map(v => +v.toFixed(1)),
      face: h.face ? (h.face.normal.toArray().map(v => +v.toFixed(2))) : null,
      mat: h.object.material && (h.object.material.color ? '#' + h.object.material.color.getHexString() : 'tex'),
      vc: !!(h.object.material && h.object.material.vertexColors),
    }));
  }
  return {
    lastCam,
    billPx,
    inventory: inv.slice(0, 14),
    front: { c115: cast(720, 115, false), c225: cast(720, 225, false), c300: cast(720, 300, false) },
    double: { c115: cast(720, 115, true), c225: cast(720, 225, true), c300: cast(720, 300, true), c450: cast(720, 450, true) },
  };
}, [poseA.pos, poseA.target]);
console.log(JSON.stringify(report, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 6)));
await browser.close();
console.log('DONE');
