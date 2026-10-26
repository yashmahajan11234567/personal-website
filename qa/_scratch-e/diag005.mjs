// DIAG-005: identify the meshes at the exact pixels vision flags as
// "floating plates" in P4-approach-z75 and 02-entrance-frontal.
import { chromium } from 'playwright';

const BASE = 'http://[::1]:5195/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'load', timeout: 90000 });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 30000 });
await page.waitForTimeout(2500);

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}

const poses = [
  ['P4', [-2.5, 7.5, 75], [-1.2, 3, 88], [[700, 120], [860, 180], [560, 200], [1000, 150], [720, 60], [400, 250]]],
  ['FRONTAL', [-1.5, 6.0, 85], [-1.5, 3.2, 101.5], [[300, 140], [1140, 160], [720, 80], [500, 220], [950, 240]]],
];

for (const [name, pos, target, pts] of poses) {
  await page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [pos, target]);
  await page.waitForTimeout(1400);
  const file = `qa-screenshots-diag-004/D5-${name}.png`;
  await page.screenshot({ path: file });
  const report = await page.evaluate(async ([p, t, pixels]) => {
    const scene = window.__cwScene;
    const THREE = await import('/@fs/D:/Yash/personal-website/node_modules/three/build/three.module.js');
    const { Raycaster, Vector3, PerspectiveCamera } = THREE;
    const camera = new PerspectiveCamera(50, 1440 / 900, 0.1, 20000);
    camera.position.set(p[0], p[1], p[2]);
    camera.lookAt(t[0], t[1], t[2]);
    camera.updateMatrixWorld();
    const rc = new Raycaster();
    rc.camera = camera;
    const W = 1440, H = 900;
    const out = [];
    for (const [nx, ny] of pixels) {
      const ndc = new Vector3((nx / W) * 2 - 1, -(ny / H) * 2 + 1, 0.5);
      ndc.unproject(camera);
      const dir = ndc.sub(camera.position).normalize();
      rc.set(camera.position, dir);
      const objs = [];
      scene.traverse((o) => { if (!o.isSprite && o.visible) objs.push(o); });
      const hits = rc.intersectObjects(objs, false).slice(0, 2).map((h) => {
        const g = h.object.geometry;
        // identify mesh by geometry size + material
        const tris = g?.attributes?.position ? g.attributes.position.count / 3 : -1;
        const vc = h.object.material?.vertexColors ? 'vc' : '';
        const col = h.object.material?.color ? '#' + h.object.material.color.getHexString() : '';
        return { tris, col, vc, dist: +h.distance.toFixed(1), pt: h.point.toArray().map((v) => +v.toFixed(1)), n: h.face ? h.face.normal.toArray().map((v) => +v.toFixed(2)) : null };
      });
      out.push({ px: [nx, ny], hits });
    }
    return out;
  }, [pos, target, pts]);
  console.log(`\n=== ${name} ===`);
  for (const r of report) {
    const h = r.hits[0];
    console.log(`  px${r.px}: ${h ? `tris=${h.tris} ${h.col}${h.vc} d=${h.dist} pt=[${h.pt}] n=[${h.n}]` : 'SKY (no hit)'}`);
  }
}
await browser.close();
console.log('DONE');
