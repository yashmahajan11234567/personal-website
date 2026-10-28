// VIS-010 traversal: real-keyboard walk through the bore, both directions.
// Mirrors qa/traverse-final.mjs input pattern (initial drag to engage facing,
// 750ms W bursts, drift re-assert every 8 bursts).
import { chromium } from 'playwright';

const BASE = 'http://localhost:4180/#/cloud-world';
const OUT = 'qa-screenshots-vis010';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 25000 });
await page.waitForTimeout(1200);

// Initial drag: assert facing +Z.
await page.mouse.move(720, 450);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(720 + i * 30, 450, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(500);

const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);

async function reassert(dir) {
  await page.mouse.move(720, 450);
  await page.mouse.down();
  const steps = dir > 0 ? 4 : -4;
  for (let i = 1; i <= 4; i++) await page.mouse.move(720 + i * steps * 7.5, 450, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

// FWD: walk to z>=180 (through the bore), 60 bursts max.
let bursts = 0, z = await zNow(), fwdPass = false;
while (bursts < 60) {
  await page.keyboard.down('w');
  await page.waitForTimeout(750);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  bursts++;
  z = await zNow();
  if (z >= 180) { fwdPass = true; break; }
  if (bursts % 8 === 0) await reassert(1);
}
console.log(`FWD: z=${z.toFixed(1)} after ${bursts} bursts -> ${fwdPass ? 'PASS' : 'FAIL'}`);
await page.screenshot({ path: `${OUT}/trav-fwd-exit.png` });

// REV: walk back to z<=95, 60 bursts max.
bursts = 0; let revPass = false;
while (bursts < 60) {
  await page.keyboard.down('s');
  await page.waitForTimeout(750);
  await page.keyboard.up('s');
  await page.waitForTimeout(150);
  bursts++;
  z = await zNow();
  if (z <= 95) { revPass = true; break; }
  if (bursts % 8 === 0) await reassert(-1);
}
console.log(`REV: z=${z.toFixed(1)} after ${bursts} bursts -> ${revPass ? 'PASS' : 'FAIL'}`);
await page.screenshot({ path: `${OUT}/trav-rev-midbore.png` });

// FWD again: exit stability after reverse.
bursts = 0; let fwd2Pass = false;
while (bursts < 60) {
  await page.keyboard.down('w');
  await page.waitForTimeout(750);
  await page.keyboard.up('w');
  await page.waitForTimeout(150);
  bursts++;
  z = await zNow();
  if (z >= 185) { fwd2Pass = true; break; }
  if (bursts % 8 === 0) await reassert(1);
}
console.log(`FWD2: z=${z.toFixed(1)} after ${bursts} bursts -> ${fwd2Pass ? 'PASS' : 'FAIL'}`);

// Path-lock inside the canyon (same predicate as traverse-final).
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
console.log('path-lock:', JSON.stringify(lock), lock.maxOff <= 0.5 ? 'PASS' : 'FAIL');
console.log('errors:', JSON.stringify(errors));
await browser.close();
