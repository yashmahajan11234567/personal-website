// DIAG-004 (VIS-008 Gate 1): identify the meshes producing the "flat brown
// underside + support pillars" read seen after exiting (video 135213, ~24-36s)
// and verify the approach side. Poses reconstructed from video landmarks:
// plaza lanterns (z=236), heart rock (z=244.5), exit arch (z=171).
// For each pose: screenshot + 3x3 raycast grid, FrontSide vs DoubleSide.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://[::1]:5195/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-diag-004');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)); });
await page.goto(BASE, { waitUntil: 'load', timeout: 90000 });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 30000 });
await page.waitForTimeout(2500);

// Candidate poses: [name, pos, target]
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
const fl = (z) => 0; // placeholder; poses use pathCenterX only for x

const poses = [
  ['P1-z220-lookback', [pathCenterX(220), 6.5, 220], [pathCenterX(171), 12, 171]],
  ['P2-z195-lookback', [pathCenterX(195), 6.5, 195], [pathCenterX(171), 10, 171]],
  ['P3-z182-slot-upback', [pathCenterX(182), 4.0, 182], [pathCenterX(174), 14, 172]],
  ['P4-approach-z75', [pathCenterX(75), 7.5, 75], [pathCenterX(88), 3, 88]],
];

// First: full scene inventory with vertex counts + bboxes (mesh identification)
const inventory = await page.evaluate(async () => {
  const scene = window.__cwScene;
  const THREE = await import('/@fs/D:/Yash/personal-website/node_modules/three/build/three.module.js');
  const box = new THREE.Box3();
  const inv = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    try { box.setFromObject(o); } catch { return; }
    if (!isFinite(box.min.x)) return;
    const g = o.geometry;
    inv.push({
      id: inv.length,
      name: o.name || '(unnamed)',
      tris: g.attributes.position.count / 3,
      side: o.material?.side ?? '?',
      matColor: o.material?.color ? '#' + o.material.color.getHexString() : (o.material?.vertexColors ? 'vertexColors' : '?'),
      min: [box.min.x, box.min.y, box.min.z].map((v) => +v.toFixed(1)),
      max: [box.max.x, box.max.y, box.max.z].map((v) => +v.toFixed(1)),
    });
  });
  inv.sort((a, b) => b.tris - a.tris);
  return inv.slice(0, 20);
});
console.log('=== SCENE MESH INVENTORY (by tris) ===');
for (const m of inventory) {
  console.log(`#${m.id} tris=${m.tris} side=${m.side} mat=${m.matColor} z[${m.min[2]}..${m.max[2]}] x[${m.min[0]}..${m.max[0]}] y[${m.min[1]}..${m.max[1]}] ${m.name}`);
}

for (const [name, pos, target] of poses) {
  await page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [pos, target]);
  await page.waitForTimeout(1400);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });

  const report = await page.evaluate(async ([pos, target]) => {
    const scene = window.__cwScene;
    const THREE = await import('/@fs/D:/Yash/personal-website/node_modules/three/build/three.module.js');
    const { Raycaster, Vector3, PerspectiveCamera } = THREE;
    const camera = new PerspectiveCamera(50, 1440 / 900, 0.1, 20000);
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateMatrixWorld();
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
        scene.traverse((o) => {
          if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.side === 0) {
            o.material.side = 2;
            overridden.push(o);
          }
        });
      }
      let hits;
      try {
        const objs = [];
        scene.traverse((o) => { if (!o.isSprite && o.visible) objs.push(o); });
        hits = rc.intersectObjects(objs, false);
      } finally {
        if (doubleSide) for (const o of overridden) o.material.side = 0;
      }
      return hits.slice(0, 3).map((h) => {
        const g = h.object.geometry;
        return {
          tris: g?.attributes?.position ? g.attributes.position.count / 3 : -1,
          dist: +h.distance.toFixed(1),
          point: h.point.toArray().map((v) => +v.toFixed(1)),
          faceNormal: h.face ? h.face.normal.toArray().map((v) => +v.toFixed(2)) : null,
        };
      });
    }
    // 3x3 grid: top band (underside zone), mid, bottom
    const grid = {};
    for (const [label, x, y] of [
      ['topL', 360, 150], ['topC', 720, 150], ['topR', 1080, 150],
      ['midC', 720, 450], ['botC', 720, 750],
    ]) grid[label] = { front: cast(x, y, false), double: cast(x, y, true) };
    return grid;
  }, [pos, target]);

  console.log(`\n=== ${name} pos=[${pos.map(v=>+v.toFixed(1))}] target=[${target.map(v=>+v.toFixed(1))}] ===`);
  for (const [label, casts] of Object.entries(report)) {
    const f = casts.front[0];
    const d = casts.double[0];
    const fmt = (h) => h ? `tris=${h.tris} d=${h.dist} pt=[${h.point}] n=[${h.faceNormal}]` : 'NONE';
    console.log(`  ${label}: FRONT ${fmt(f)}`);
    if (!f || !d || (f.point + '') !== (d.point + '') || Math.abs((f.dist ?? 0) - (d.dist ?? 0)) > 0.5) {
      console.log(`  ${label}: DBLSIDE ${fmt(d)}`);
    }
  }
}
console.log('\nerrors:', JSON.stringify(errors.slice(0, 8)));
await browser.close();
console.log('DONE');
