/** Live silhouette probe: for each screen column, raycast from the camera
 * through the top of the frame downward until the first world hit; report
 * the world position of the silhouette-forming surface per column. Tells us
 * WHICH mesh creates the flat band at y93-95. */
import { chromium } from 'playwright';

const URL = 'http://[::1]:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__cwScene, { timeout: 25000 });
await page.waitForTimeout(2500);

const probe = await page.evaluate(() => {
  // Camera pin identical to 00-approach
  window.__cwQaCam = { pos: [0, 6.5, 44], target: [0, 6, 100] };
  const scene = window.__cwScene;
  const cam = (scene).children.find ? null : null;
  // Find the camera: use the renderer's camera via the R3F root — easier:
  // compute the ray ourselves from pos/target with the 50° vFOV/16:9 hFOV.
  const pos = { x: 0, y: 6.5, z: 44 };
  const dirBase = { x: 0, y: 6 - 6.5, z: 100 - 44 }; // toward target
  const len = Math.hypot(dirBase.x, dirBase.y, dirBase.z);
  const fwd = { x: dirBase.x / len, y: dirBase.y / len, z: dirBase.z / len };
  const hFovHalf = Math.atan(Math.tan((50 * Math.PI / 180) / 2) * (1440 / 900));
  const out = [];
  // Raycaster against the mountain meshes
  const THREE = window.__THREE__ ?? null;
  // Use the scene's own Raycaster via a temporary object
  const ray = new (window.__cwRaycaster ?? Object)();
  // Fallback: brute force ray march (no raycaster import available).
  // March each column ray from the camera in steps of 0.5u up to 300u; a hit
  // = any vertex of the big meshes is hard without geometry query — instead
  // use the analytic surface: sample crestHeight-like probe via the SAME math
  // the app compiled... not available outside the bundle. SO: query the
  // bounding data we DO have: __cwMountainFootprint + __cwMountFace and the
  // known peak formula from source (duplicated here, honest engineering).
  function ss(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  const skew = (z0, h, sl, sr) => (z) => h * (z <= z0 ? Math.exp(-((z - z0) ** 2) / (2 * sl * sl)) : Math.exp(-((z - z0) ** 2) / (2 * sr * sr)));
  const pBrow = skew(97, 9, 8, 8), pLeft = skew(120, 38, 10, 13), pMain = skew(150, 52, 10, 13), pRight = skew(178, 36, 14, 18);
  const crestLine = (z) => Math.max(0, Math.max(pBrow(z), pLeft(z), pMain(z), pRight(z)) + (3.5 * Math.sin(z * 0.23 + 1.7) + 2 * Math.sin(z * 0.41 + 0.4)) * ss(90, 104, z));
  const CORRIDOR_EDGE = 6.5, TUNNEL_Z0 = 100, TUNNEL_Z1 = 170, ROOF_CROWN = 6.2;
  function height(x, z) {
    const cx = 0; // path centerline approx 0 in the mouth stretch
    const cd = Math.abs(x - cx);
    const crest = crestLine(z);
    const hw = 88 - (88 - 30) * Math.min(1, Math.max(0, crest / 52));
    const u = cd / hw;
    if (u >= 1) return 0;
    if (cd === 0) return crest;
    const fallAmt = 0.55 + 0.25 * ss(150, 200, z);
    const spur = 1 + 0.35 * Math.sin(z * 0.19 + x * 0.16) + 0.2 * Math.sin(z * 0.37 - x * 0.31);
    const latFall = Math.min(1.15, (1 - fallAmt * Math.pow(u, 1.5)) * spur);
    const inTunnel = z >= TUNNEL_Z0 && z <= TUNNEL_Z1;
    if (inTunnel && cd < CORRIDOR_EDGE) return ROOF_CROWN * (1 - cd / CORRIDOR_EDGE) ** 2;
    if (!inTunnel && cd < CORRIDOR_EDGE) return 0;
    const w = ss(118, 96, z);
    const lateralExp = 2 - 1.5 * w;
    const t = (cd - CORRIDOR_EDGE) / (hw - CORRIDOR_EDGE);
    const flank = crest * latFall * Math.pow(Math.max(0, t), lateralExp);
    const fE = 18 * ss(84, 92, z) * (1 - ss(103, 114, z));
    const floor = fE * Math.min(1, (cd - CORRIDOR_EDGE) / 2);
    const fX = 26 * ss(158, 166, z) * (1 - ss(174, 184, z));
    const floorExit = fX * Math.min(1, (cd - CORRIDOR_EDGE) / 2);
    return Math.max(flank, floor, floorExit);
  }
  // For each screen column: ray from camera; find max-elevation hit.
  for (let px = 240; px <= 1200; px += 60) {
    const ndcX = (px / 1440) * 2 - 1;
    const ang = Math.atan(Math.tan(hFovHalf) * ndcX); // bearing offset
    // rotate forward dir by ang around Y:
    const rx = fwd.x * Math.cos(ang) + fwd.z * Math.sin(ang);
    const rz = fwd.z * Math.cos(ang) - fwd.x * Math.sin(ang);
    // march upward elevation angles from +25° down; first angle whose ray
    // passes under the surface = silhouette top.
    let silhouette = null;
    for (let deg = 25; deg >= -5; deg -= 0.15) {
      const el = deg * Math.PI / 180;
      const dy = Math.sin(el) / Math.cos(el);
      // ray: p(t) = pos + t*(rx, dy', rz) with dy' normalized on the flat dir
      const flatLen = Math.hypot(rx, rz);
      let hit = false;
      for (let t = 6; t <= 300; t += 1.2) {
        const x = pos.x + (rx / flatLen) * t;
        const z = pos.z + (rz / flatLen) * t;
        const y = pos.y + dy * t;
        if (y <= height(x, z)) { hit = true; break; }
      }
      if (hit) { silhouette = { px, deg: +deg.toFixed(1), }; break; }
    }
    out.push(silhouette ?? { px, deg: 'none' });
  }
  return out;
});
console.log(JSON.stringify(probe));
await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('done');
