// Canvas-only pinned-camera capture for all required viewpoints.
// Screenshots the <canvas> element only (excludes HTML overlay text).
import { chromium } from 'playwright';

const PORT = 5195;
const ORIGIN = `http://localhost:${PORT}`;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}

const VIEWS = [
  { name: 'spawn', z: 40, y: 12, dx: 0, targetZ: 100, label: 'Spawn & distant approach' },
  { name: 'approach', z: 88, y: 12, dx: 0, targetZ: 115, label: 'Normal player approach' },
  { name: 'frontal', z: 85, y: 19, dx: 0, targetZ: 100, label: 'Frontal at tunnel mouth' },
  { name: 'left-oblique', z: 88, y: 14, dx: -15, targetZ: 115, label: 'Left-oblique approach' },
  { name: 'right-oblique', z: 88, y: 14, dx: +15, targetZ: 115, label: 'Right-oblique approach' },
  { name: 'tunnel-entrance', z: 98, y: 5, dx: 0, targetZ: 125, label: 'Tunnel entrance looking in' },
  { name: 'tunnel-interior', z: 135, y: 4, dx: 0, targetZ: 155, label: 'Tunnel interior looking forward' },
  { name: 'tunnel-interior-back', z: 135, y: 4, dx: 0, targetZ: 95, label: 'Tunnel interior looking back' },
  { name: 'tunnel-exit-back', z: 178, y: 5, dx: 0, targetZ: 150, label: 'Tunnel exit looking back at arch' },
  { name: 'billboard-close', z: 97.5, y: 18, dx: 0, targetZ: 96, label: 'PROJECTS billboard close-up' },
];

const OUT = 'qa-screenshots-phase1-canvas';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${ORIGIN}/#/cloud-world`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(3000);

  for (const v of VIEWS) {
    const cx = pathCenterX(v.z);
    const tcx = pathCenterX(v.targetZ);
    await page.evaluate(({ pos, target }) => {
      window.__cwQaCam = { pos, target };
    }, { pos: [cx + v.dx, v.y, v.z], target: [tcx, v.y, v.targetZ] });
    await page.waitForTimeout(800);
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    await page.screenshot({ path: `${OUT}/${v.name}.png`, clip: box, animations: 'disabled' });
    console.log(`CAPTURED ${v.label} -> ${OUT}/${v.name}.png`);
  }

  await page.evaluate(() => { window.__cwQaCam = undefined; });
  console.log('CONSOLE ERRORS:', errors.length);
  errors.forEach((e) => console.log('  ERR:', e.slice(0, 200)));
  await browser.close();
  console.log('done');
})();
