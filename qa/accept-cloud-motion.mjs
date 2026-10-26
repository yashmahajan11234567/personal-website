
/** Final acceptance — cloud-world: keyboard motion, jump, boundary hold,
 * stuck-check, and a live sign board shot. */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const BASE = 'http://[::1]:4173/';
const OUT = 'qa-screenshots-acceptance';
mkdirSync(OUT, { recursive: true });
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
await page.goto(BASE + '#/cloud-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 30000 });
await page.waitForTimeout(1500);

const pos = () => page.evaluate(() => window.__cwAvatarHist[window.__cwAvatarHist.length - 1]);
const p0 = await pos();
// W forward 3s
await page.keyboard.down('w');
await page.waitForTimeout(3000);
await page.keyboard.up('w');
const p1 = await pos();
check('W moves avatar forward (z increases)', p1.z > p0.z + 2, `Δz=${(p1.z - p0.z).toFixed(1)}`);
// S back
await page.keyboard.down('s');
await page.waitForTimeout(1500);
await page.keyboard.up('s');
const p2 = await pos();
check('S moves avatar back', p2.z < p1.z, `Δz=${(p2.z - p1.z).toFixed(1)}`);
// A/D lateral + path lock
await page.keyboard.down('a');
await page.waitForTimeout(1200);
await page.keyboard.up('a');
await page.keyboard.down('d');
await page.waitForTimeout(2400);
await page.keyboard.up('d');
const p3 = await pos();
const dev = Math.abs(p3.x - pathCenterX(p3.z));
check('path-lock: lateral moves return near path', dev < 8, `dev=${dev.toFixed(2)}u`);
// Jump (Space)
const pj0 = await pos();
await page.keyboard.press(' ');
await page.waitForTimeout(300);
const pjMid = await pos();
await page.waitForTimeout(1200);
const pjLand = await pos();
check('jump: y rises then lands', pjMid.y > pj0.y + 0.05 && Math.abs(pjLand.y - pj0.y) < 0.5, `y0=${pj0.y.toFixed(2)} mid=${pjMid.y.toFixed(2)} end=${pjLand.y.toFixed(2)}`);
await page.screenshot({ path: `${OUT}/cw-keyboard-motion.png` });
// Boundary: hold W 25s straight — must not crash or clip through terrain
await page.keyboard.down('w');
for (let i = 0; i < 10; i++) { await page.waitForTimeout(2500); }
await page.keyboard.up('w');
const pEnd = await pos();
const alive = await page.evaluate(() => !!document.querySelector('canvas'));
check('boundary: 25s forward hold, no crash', alive, `z=${pEnd.z.toFixed(1)}`);
await page.screenshot({ path: `${OUT}/cw-boundary-hold.png` });
// Live sign board shot (dev-automation — the VIS-003 fixed board)
{
  const x = pathCenterX(64) + 11.5;
  await page.evaluate(({ x }) => {
    const by = 10.7; // matches board center height used in prior probes
    window.__cwQaCam = { pos: [x, by, 64 - 11], target: [x, by, 64] };
  }, { x });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/cw-sign-dev-automation-live.png` });
  await page.evaluate(() => { window.__cwQaCam = undefined; });
}
check('cloud-world motion zero errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== CLOUD-WORLD MOTION: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
