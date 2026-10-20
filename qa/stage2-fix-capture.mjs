/** Stage 2 fresh-evidence capture (post Stage-1-fix build):
 * vista with mountain + PROJECTS sign from the approach, tunnel entrance,
 * bore interior with lights, walk-through shots, exit + sunset arrival.
 * Walks the avatar with W (short bursts to avoid OrbitControls drift). */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-fix';

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1500);

// 1. Mountain vista: pin camera above the last skill stretch looking +Z
await page.evaluate(() => {
  window.__cwQaCam = { pos: [0, 14, 60], target: [0, 6, 130] };
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/01-mountain-vista.png` });
console.log('01 vista saved');
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(300);

// 2. PROJECTS sign approach pin (from the path, ~26u out, sign at (-7.73,88) yaw π-0.42)
await page.evaluate(() => {
  window.__cwQaCam = { pos: [-2.5, 9, 62], target: [-7.7, 7.5, 88] };
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/02-projects-sign-approach.png` });
console.log('02 projects approach saved');
await page.evaluate(() => { window.__cwQaCam = undefined; });
await page.waitForTimeout(300);

// 3. Tunnel entrance (player view, standing before the bore)
await page.evaluate(() => {
  window.__cwQaCam = { pos: [pathCX(90), 6.5, 88], target: [pathCX(108), 5, 112] };
  function pathCX(z) {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  }
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/03-tunnel-entrance.png` });
console.log('03 entrance saved');

// 4. Bore interior: pin inside the tunnel looking through to the exit
await page.evaluate(() => {
  function pathCX(z) {
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  }
  const cx = pathCX(130);
  window.__cwQaCam = { pos: [cx, 4.5, 118], target: [pathCX(168), 4.5, 170] };
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/04-bore-interior.png` });
console.log('04 bore interior saved');

// 5. Walk the avatar through: burst-walk with camera released
await page.evaluate(() => { window.__cwQaCam = undefined; });
// face +Z: rotate orbit to look forward
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(600);

const shots = [
  { z: 104, name: '05-walk-entering' },
  { z: 135, name: '06-walk-inside' },
  { z: 172, name: '07-walk-exiting' },
];
let idx = 0;
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
// Walk in 0.8s bursts; camera-relative W after the rotate ≈ +z
while (idx < shots.length) {
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(250);
  const z = await zNow();
  if (z >= shots[idx].z) {
    await page.screenshot({ path: `${OUT}/${shots[idx].name}.png` });
    console.log(`${shots[idx].name} @z ${z.toFixed(1)}`);
    idx++;
  }
  if (z > 200) break;
  // re-assert facing +z every few bursts
  if (Math.random() < 0.3) {
    await page.mouse.move(720, 450);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
}
// 6. Sunset arrival
await page.keyboard.down('w');
await page.waitForTimeout(3000);
await page.keyboard.up('w');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/08-sunset-arrival.png` });
console.log('08 sunset saved, avatar z:', await zNow());

const errs = errors.length + consoleErrors.length;
console.log(`errors: ${errs} (${errors.length} page, ${consoleErrors.length} console)`);
await browser.close();
console.log('DONE');
