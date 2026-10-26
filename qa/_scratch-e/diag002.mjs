// DIAG-002: dev-server raycast identification of the dark approach band.
// Uses window.__cwQaCam to pin the camera, window.__cwScene to reach the
// graph, and a three.js Raycaster imported from the dev-server module graph.
// Also reaches the live camera via R3F fiber: canvas.__r3f? fallback: traverse.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:5178/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-diag-002');
fs.mkdirSync(OUT, { recursive: true });

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)); });
await page.goto(BASE, { waitUntil: 'load', timeout: 90000 });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForTimeout(10000);

const cz = 75.5, cx = pathCenterX(85);
const poseA = { pos: [cx, 7.5, cz], target: [cx, 1.8, 85] };
await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [poseA.pos, poseA.target]);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/A-approach.png` });

const hitReport = await page.evaluate(async ([pos, target]) => {
  const scene = window.__cwScene;
  const THREE = await import('/@fs/D:/Yash/personal-website/node_modules/three/build/three.module.js');
  const Raycaster = THREE.Raycaster, Vector3 = THREE.Vector3;
  // reach the live camera: not in scene graph — but the QA pin sets the SAME
  // camera object every frame; find it via the OrbitControls instance attached
  // to the canvas' r3f fiber, else reconstruct the exact pin camera matrix.
  let camera = null;
  // try r3f store via canvas element
  const canvas = document.querySelector('canvas');
  for (const k of Object.keys(canvas)) { /* r3f attaches nothing enumerable */ }
  // The FrameDriver pushes camera pos history; the pin pose equals what we set.
  // Reconstruct a camera identical to the pin: pos/target, fov 50, aspect W/H.
  camera = new THREE.PerspectiveCamera(50, 1440 / 900, 0.1, 20000);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(target[0], target[1], target[2]);
  camera.updateMatrixWorld();
  const rc = new Raycaster();
  const W = 1440, H = 900;
  function cast(nx, ny) {
    const ndc = new Vector3((nx / W) * 2 - 1, -(ny / H) * 2 + 1, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    rc.set(camera.position, dir);
    rc.camera = camera;
    const hits = [];
    try {
      const raw = rc.intersectObjects(scene.children, true).filter(h => h.object.visible);
      hits.push(...raw);
    } catch (e) {
      // Sprite.raycast needs the raycaster's internal camera — retry with
      // sprites excluded (they're UI glow, never the dark band anyway).
      const noSprites = [];
      scene.traverse(o => { if (!o.isSprite && o.visible) noSprites.push(o); });
      hits.push(...rc.intersectObjects(noSprites, false).filter(h => h.object.visible));
    }
    return hits.slice(0, 3).map(h => ({
      name: h.object.name || '(unnamed)',
      parent: (h.object.parent && h.object.parent.name) || '',
      kind: h.object.type,
      dist: +h.distance.toFixed(2),
      point: h.point.toArray().map(v => +v.toFixed(1)),
      mat: h.object.material && (Array.isArray(h.object.material) ? 'multi' : (h.object.material.color ? '#' + h.object.material.color.getHexString() : 'tex')),
      vc: !!(h.object.material && !Array.isArray(h.object.material) && h.object.material.vertexColors),
    }));
  }
  // vertical strip at screen center + two lateral columns
  return {
    c115: cast(720, 115), c225: cast(720, 225), c360: cast(720, 360),
    c500: cast(720, 500), c700: cast(720, 700), c850: cast(720, 850),
    left225: cast(360, 225), right225: cast(1080, 225),
  };
}, [poseA.pos, poseA.target]);
console.log('RAYCASTS:', JSON.stringify(hitReport, null, 1));
console.log('errors:', JSON.stringify(errors.slice(0, 6)));
await browser.close();
console.log('DONE');
