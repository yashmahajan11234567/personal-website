// VIS-002 outdoor-presence check: pin the camera low over the valley path edge
// (z=40, where kept flowers live per the replay: valley z<=92 band) and scan
// for flower-palette pixels. Also captures a close exit-side outdoor frame
// (z=186, sunset zone past the mouth) where kept flowers z>=178 live.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-vis002-outdoor');

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 100)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });
fs.mkdirSync(OUT, { recursive: true });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(6000);

// Low camera at the valley path edge z=40: the replay shows kept flowers
// spanning z -28..92 — sweep several z positions to guarantee some are in frame.
const poses = [
  { name: 'valley-z20', pos: [pathCenterX(20) + 4, 1.2, 20], target: [pathCenterX(26) + 5, 0.6, 26] },
  { name: 'valley-z55', pos: [pathCenterX(55) + 4, 1.2, 55], target: [pathCenterX(61) + 5, 0.6, 61] },
  { name: 'valley-z85', pos: [pathCenterX(85) + 4, 1.2, 85], target: [pathCenterX(89) + 5, 0.6, 89] },
  { name: 'sunset-z186', pos: [pathCenterX(186) + 4, 1.2, 186], target: [pathCenterX(190) + 5, 0.6, 190] },
];
const targets = [
  ['#FFB74D', [255, 183, 77]],
  ['#FFD54F', [255, 213, 79]],
  ['#FF8A65', [255, 138, 101]],
];
for (const p of poses) {
  await page.evaluate(([pos, target]) => { window.__cwQaCam = { pos, target }; }, [p.pos, p.target]);
  await page.waitForTimeout(1200);
  const file = `${OUT}/${p.name}.png`;
  await page.screenshot({ path: file });
  const png = PNG.sync.read(fs.readFileSync(file));
  const W = png.width, H = png.height, D = png.data;
  let hits = 0;
  const blobs = [];
  for (let y = Math.floor(H * 0.25); y < H - 40; y += 2) {
    for (let x = 40; x < W - 40; x += 2) {
      const i = (y * W + x) * 4;
      const r = D[i], g = D[i + 1], b = D[i + 2];
      for (const [, [tr, tg, tb]] of targets) {
        if (Math.abs(r - tr) < 26 && Math.abs(g - tg) < 30 && Math.abs(b - tb) < 30) { hits++; if (blobs.length < 4) blobs.push(`${x},${y}`); break; }
      }
    }
  }
  console.log(`${p.name}: ${hits} flower-palette px ${hits ? 'at ' + blobs.join(' | ') : '(none in frame)'}`);
}
console.log('errors:', JSON.stringify(errors.slice(0, 3)), `total ${errors.length}`);
await browser.close();
console.log('DONE');
