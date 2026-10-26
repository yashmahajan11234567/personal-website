// DIAG-001: approach-view raycast identification + fresh captures at the
// canonical QA poses. Read-only wrt the repo (writes only qa-screenshots-).
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-diag-001');
fs.mkdirSync(OUT, { recursive: true });

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const towardMountains = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + towardMountains * 2.2;
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(7000);

// ---- Pose A: the diagnosis-2026-10-24 approach pose (avatar z=85, camera
// behind at z=85-9.5, height floor+7.5) — reproduce the dark-top-band view.
// The harness needs the pin EMULATED because __cwQaCam bypasses the camera
// clamp (memory note): compute what the RIG would produce naturally.
const cz = 85 - 9.5, cx = pathCenterX(85), cfloor = terrainHeight(cx, cz);
const poseA = { pos: [cx, cfloor + 7.5, cz], target: [cx, cfloor + 1.8, 85] };

await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [poseA.pos, poseA.target]);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/A-approach-z85.png` });

// ---- Raycast identification through the dark band + a lower reference ray
const report = await page.evaluate(([pos, target]) => {
  const scene = window.__cwScene;
  const cam = new (scene.constructor.constructor === Function ? Object.getPrototypeOf(scene.position).constructor : Object)(); // unused
  const THREE_OK = !!window.__cwLanternMat; // proves three loaded
  // Build a camera math via page-side: use the live camera from __cwCamHist? Instead compute manually.
  return { THREE_OK, hasScene: !!scene, sceneChildren: scene ? scene.children.length : 0 };
}, [poseA.pos, poseA.target]);
console.log('scene check:', JSON.stringify(report));

// Access the actual camera + renderer via the canvas' r3f fiber? Use a simpler
// approach: recompute the ray in page context with the exposed scene and the
// known pin (the __cwQaCam sets camera exactly).
const rays = await page.evaluate(([pos, target, W, H]) => {
  const scene = window.__cwScene;
  // find the perspective camera
  let camera = null;
  scene.traverse((o) => { if (o.isPerspectiveCamera && (!camera || o.id < camera.id)) camera = o; });
  if (!camera) return { err: 'no camera' };
  // pixel to NDC
  function ray(nx, ny) {
    const v = new (camera.getWorldDirection(new (Object.getPrototypeOf(camera.position).constructor))().constructor)(nx, ny, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const origin = camera.position.clone();
    // use scene's raycaster
    const rc = scene.raycast ? null : null;
    return { origin, dir };
  }
  // three's Raycaster accessible via any mesh's raycast? Use module import path instead:
  return { camPos: camera.position.toArray(), camFov: camera.fov };
}, [poseA.pos, poseA.target, 1440, 900]);
console.log('cam:', JSON.stringify(rays));

// Do the raycast with THREE from the page bundle: play via window.__cwScene and
// a manually constructed Raycaster from the module scope of the bundle.
const hitReport = await page.evaluate(async ([pos, target]) => {
  const scene = window.__cwScene;
  let camera = null;
  scene.traverse((o) => { if (o.isPerspectiveCamera) camera = o; });
  const mod = await import('/node_modules/three/build/three.module.js').catch(() => null);
  let Raycaster;
  if (mod) { Raycaster = mod.Raycaster; }
  else {
    // vite preview won't serve /node_modules — pull from a mesh's material? Fall back to manual ray-triangle is too heavy; instead reuse three's global if present
    Raycaster = window.THREE && window.THREE.Raycaster;
  }
  if (!Raycaster) return { err: 'no Raycaster available' };
  const rc = new Raycaster();
  const W = 1440, H = 900;
  function cast(nx, ny) {
    const ndc = new (camera.position.clone().constructor)((nx / W) * 2 - 1, -(ny / H) * 2 + 1, 0.5);
    ndc.unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    rc.set(camera.position, dir);
    const hits = rc.intersectObjects(scene.children, true).filter(h => h.object.visible);
    return hits.slice(0, 3).map(h => ({
      name: h.object.name || '(unnamed)',
      parent: h.object.parent && h.object.parent.name || '',
      kind: h.object.type,
      dist: +h.distance.toFixed(2),
      point: h.point.toArray().map(v => +v.toFixed(1)),
      mat: h.object.material && (h.object.material.color ? h.object.material.color.getHexString() : 'tex'),
      vertexColors: !!(h.object.material && h.object.material.vertexColors),
    }));
  }
  return {
    center_y115: cast(720, 115),
    center_y225: cast(720, 225),
    center_y360: cast(720, 360),
    center_y500: cast(720, 500),
    center_y700: cast(720, 700),
  };
}, [poseA.pos, poseA.target]);
console.log('RAYCASTS:', JSON.stringify(hitReport, null, 1));

// ---- Pose B: mouth view (camera at z=100 line as in 02 capture)
const bx = pathCenterX(100), bfloor = terrainHeight(bx, 100);
const poseB = { pos: [bx, bfloor + 4.5, 100], target: [pathCenterX(118), terrainHeight(pathCenterX(118), 118) + 2, 118] };
await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [poseB.pos, poseB.target]);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/B-inside-mouth-z100.png` });

// ---- Pose C: reverse view from bore mid looking back at entrance
const poseC = { pos: [pathCenterX(135), terrainHeight(pathCenterX(135), 135) + 4.5, 135], target: [pathCenterX(112), terrainHeight(pathCenterX(112), 112) + 2, 112] };
await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [poseC.pos, poseC.target]);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/C-mid-looking-back.png` });

// ---- Pose D: outside exit looking back (from sunset apron)
const ez = 182, ex = pathCenterX(ez), efloor = terrainHeight(ex, ez);
const poseD = { pos: [ex, efloor + 4.5, ez], target: [pathCenterX(160), terrainHeight(pathCenterX(160), 160) + 2, 160] };
await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [poseD.pos, poseD.target]);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/D-exit-lookback.png` });

console.log('errors:', JSON.stringify(errors.slice(0, 5)));
await browser.close();
console.log('DONE');
