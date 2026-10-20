/** Debug v5: read the R3F root fiber's pendingProps/stateNode hooks — the
 * store lives in a React context provided by the root at d3 ('cx'). Context
 * values ride on fiber.dependencies of CONSUMERS. Instead of hunting the
 * store: get the CAMERA via the WebGL context handle + renderer from the
 * canvas, or better — raycast from screen center: R3F's raycaster is
 * overkill. SIMPLEST: use the sign's own on-screen position: the QA pin aims
 * the controls target AT the sign center, so the sign is at the VIEW CENTER
 * = (720, 450) minus any y-offset of the board vs target (target y 9.5 ≈
 * board center y 10.44*ground…). Click the viewport center and a small
 * cross pattern. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage1-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1200);

// Pin cam so the sign's board center is exactly the view center: aim target
// at the sign's board center; R3F centers the target at viewport center.
async function pinOnSign(x, z, scale) {
  await page.evaluate(({ x, z, s }) => {
    // board center height: terrain + (2.35+0.55)*s
    // terrainHeight is analytic; replicate inline
    function smoothstep(a, b, xx) { const t = Math.min(1, Math.max(0, (xx - a) / (b - a))); return t * t * (3 - 2 * t); }
    function pathCenterX(zz) {
      const canyon = smoothstep(92, 108, zz) * (1 - smoothstep(168, 184, zz));
      return (2.5 * Math.sin(zz * 0.05) + 1.5 * Math.sin(zz * 0.13 + 2.0)) * (1 - 0.75 * canyon);
    }
    const d = Math.abs(x - pathCenterX(z));
    const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
    const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
    const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
    const flatten = smoothstep(4.5, 16, d);
    const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
    const rimZ = smoothstep(-38, -95, z) * 10;
    const towardMountains = 1 - smoothstep(-95, -72, z);
    const gy = (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + towardMountains * 2.2;
    const by = gy + (2.35 + 0.55) * s;
    window.__cwQaCam = { pos: [x + 0.5, by + 1.5, z - 15], target: [x, by, z] };
    window.__cwSignTarget = { x, y: by, z };
  }, { x, z, s: scale });
  await page.waitForTimeout(800);
}

await pinOnSign(pathCenterX(16) - 11.5, 16, 3.0);
// Click a small cross around the center; return which point opened a card.
let hitPt = null;
outer: for (const [dx, dy] of [[0, 0], [0, -20], [0, 20], [-20, 0], [20, 0], [0, -45], [0, 45], [-45, 0], [45, 0], [0, -80], [0, 80], [-80, 0], [80, 0]]) {
  await page.mouse.click(720 + dx, 450 + dy);
  await page.waitForTimeout(150);
  const opened = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  if (opened) { hitPt = [720 + dx, 450 + dy]; break outer; }
}
console.log('Git sign click hit:', hitPt);
if (hitPt) {
  const c = await page.evaluate(() => ({
    title: document.querySelector('.cloud-card-title')?.textContent,
    desc: document.querySelector('.cloud-card-desc')?.textContent,
  }));
  const expected = await page.evaluate(() => {
    const s = window.__PORTFOLIO__?.skills?.git;
    return s ? { title: s.name, desc: s.summary } : null;
  });
  console.log('title match:', c.title === expected.title, '|', c.title);
  console.log('desc match:', c.desc === expected.desc);
  await page.screenshot({ path: `${OUT}/card-git.png` });
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(300);
}

await page.evaluate(() => { window.__cwQaCam = undefined; });
await browser.close();
console.log('DONE');
