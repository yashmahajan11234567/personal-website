// VIS-010 traversal v3 — EXACT vis008-matrix.mjs proven pattern.
// Reload → face(1) → FWD milestones (105/135/172/205) → adaptive REV
// milestones (164/130/96). No drag-turns mid-walk (vis007 lesson).
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:4180/#/cloud-world';
const OUT = 'qa-screenshots-vis010';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--enable-webgl2', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 30000 });
await page.waitForTimeout(2000);

const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
async function face(sign) {
  await page.mouse.move(720, 450);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(720 + sign * i * 30, 450, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

const results = [];
// FWD
const milestones = [
  { z: 105, name: 'T1-fwd-entering' }, { z: 135, name: 'T2-fwd-inside' },
  { z: 172, name: 'T3-fwd-exiting' }, { z: 205, name: 'T4-fwd-sunset' },
];
let mi = 0, bursts = 0;
console.log(`traversal start z=${await zNow()}`);
await face(1);
while (mi < milestones.length && bursts < 120) {
  await page.keyboard.down('w'); await page.waitForTimeout(750); await page.keyboard.up('w');
  await page.waitForTimeout(150); bursts++;
  const z = await zNow();
  if (bursts % 4 === 0) console.log(`  fwd burst ${bursts} z=${z.toFixed(1)} (next gate ${milestones[mi].z})`);
  if (z >= milestones[mi].z) {
    await page.screenshot({ path: `${OUT}/${milestones[mi].name}.png` });
    console.log(`FWD ${milestones[mi].name} @z ${z.toFixed(1)} (burst ${bursts})`);
    mi++;
  }
}
results.push({ name: 'forward-traversal', pass: mi === milestones.length });

// REV — adaptive key probe (vis007 pattern).
await page.keyboard.up('w');
const revMilestones = [
  { z: 164, name: 'T5-rev-entering' }, { z: 130, name: 'T6-rev-inside' }, { z: 96, name: 'T7-rev-exit-valley' },
];
mi = 0; bursts = 0; let revKey = 's';
{
  const z0 = await zNow();
  await page.keyboard.down('s'); await page.waitForTimeout(600); await page.keyboard.up('s');
  await page.waitForTimeout(200);
  const z1 = await zNow();
  revKey = z1 < z0 - 1 ? 's' : 'w';
  console.log(`REV direction probe: s-burst Δz ${(z1 - z0).toFixed(1)} → using '${revKey}'`);
}
while (mi < revMilestones.length && bursts < 150) {
  await page.keyboard.down(revKey); await page.waitForTimeout(750); await page.keyboard.up(revKey);
  await page.waitForTimeout(150); bursts++;
  const z = await zNow();
  if (bursts % 4 === 0) console.log(`  rev burst ${bursts} z=${z.toFixed(1)} (next gate ${revMilestones[mi].z})`);
  if (z <= revMilestones[mi].z) {
    await page.screenshot({ path: `${OUT}/${revMilestones[mi].name}.png` });
    console.log(`REV ${revMilestones[mi].name} @z ${z.toFixed(1)} (burst ${bursts})`);
    mi++;
  }
  if (bursts % 6 === 0 && mi < revMilestones.length) {
    const za = await zNow();
    await page.keyboard.down(revKey); await page.waitForTimeout(500); await page.keyboard.up(revKey);
    const zb = await zNow();
    if (zb > za - 0.5) { revKey = revKey === 's' ? 'w' : 's'; console.log(`REV drift: switching to '${revKey}'`); }
  }
}
results.push({ name: 'reverse-traversal', pass: mi === revMilestones.length });

// Path-lock inside the canyon.
const lock = await page.evaluate(() => {
  const hist = window.__cwAvatarHist ?? [];
  let maxOff = 0, n = 0;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const pcx = (z) => { const c = ss(92, 108, z) * (1 - ss(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * c); };
  for (const h of hist) {
    if (h.z < 97 || h.z > 178) continue;
    const off = Math.abs(h.x - pcx(h.z));
    if (off > maxOff) maxOff = off;
    n++;
  }
  return { maxOff: Number(maxOff.toFixed(3)), samples: n };
});
const lockPass = lock.maxOff <= 0.5;
results.push({ name: 'path-lock', pass: lockPass });

const passCount = results.filter((r) => r.pass).length;
console.log(`\nVIS-010 TRAVERSAL: ${passCount}/${results.length} PASS`);
console.log('path-lock:', JSON.stringify(lock));
console.log('path-lock', lockPass ? 'PASS' : 'FAIL');
if (errors.length) console.log('errors:', JSON.stringify(errors.slice(0, 6))); else console.log('console/page errors: 0');
fs.writeFileSync('qa-screenshots-vis010/traversal-result.json', JSON.stringify({ results, lock, errors }, null, 2));
await browser.close();
