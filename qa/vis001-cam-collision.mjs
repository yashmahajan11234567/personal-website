
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = 'qa-screenshots-vis001-baseline';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(2500);

// walk into mid-bore deterministically (same drag as traverse-final)
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(500);
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
const xNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.x ?? 0);
const pin = (p, t) => page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [p, t]);

// walk to z~135
while ((await zNow()) < 133) {
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  await page.waitForTimeout(100);
}
const az0 = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0] ?? {});
console.log('avatar at', JSON.stringify(az0));
// baseline: WORST-CASE camera azimuths orbiting the avatar at FOLLOW dist 9.5,
// WITHOUT the clamp — emulate by pinning the camera at the clamped-position
// envelope the clamp allows (x = axis ± 3.4) and beyond, to see what the
// clamp prevents vs permits.
const cx = az0.x, cz = az0.z;
const poses = [
  { name: 'az0-behind', pos: [cx, 3.4, cz - 9.5] },          // camera behind avatar (typical)
  { name: 'az60-right', pos: [cx + 8.2, 3.4, cz - 4.8] },    // 60deg right: x = cx+9.5*sin60
  { name: 'az90-right', pos: [cx + 9.5, 3.4, cz] },          // full right orbit
  { name: 'az120-right', pos: [cx + 8.2, 3.4, cz + 4.8] },   // 120deg
];
for (const p of poses) {
  // pin camera AT the orbit position looking at the avatar
  await pin(p.pos, [cx, 1.8, cz]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/baseline-${p.name}.png` });
  // measure rock-fill in the frame
  const png = PNG.sync.read(fs.readFileSync(`${OUT}/baseline-${p.name}.png`));
  const W = png.width, H = png.height, D = png.data;
  let rock = 0, tot = 0;
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    const i = (y * W + x) * 4;
    const r = D[i], g = D[i + 1], b = D[i + 2];
    tot++;
    if (r > 110 && r < 240 && r > g + 16 && g > b + 6 && g < r * 0.82) rock++;
  }
  console.log(`${p.name}: rockFill=${(100 * rock / tot).toFixed(1)}% camera=(${p.pos.map(v=>v.toFixed(1)).join(',')})`);
}
await browser.close();
console.log('BASELINE DONE');
