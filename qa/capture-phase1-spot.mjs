// Canvas-only capture for specific viewpoints.
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
  { name: 'approach', z: 88, y: 12, dx: 0, targetZ: 115 },
  { name: 'tunnel-entrance', z: 98, y: 5, dx: 0, targetZ: 125 },
  { name: 'frontal', z: 85, y: 19, dx: 0, targetZ: 100 },
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
    console.log(`CAPTURED ${v.name}`);
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
  console.log('CONSOLE ERRORS:', errors.length);
  errors.forEach((e) => console.log('  ERR:', e.slice(0, 200)));
  await browser.close();
  console.log('done');
})();
