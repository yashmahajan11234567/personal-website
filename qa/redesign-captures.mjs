// Redesign QA — 4 category signs + on-mountain PROJECTS: counts, positions, clearance, captures.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = 'qa-screenshots-redesign';
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:4173/#/cloud-world';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0 && Array.isArray(window.__cwMountainDomes);
}, { timeout: 25000 });
await page.waitForTimeout(3000);

const out = {};

// Live world state: category boards + mount face + dome clearance audit
out.world = await page.evaluate(() => {
  const domes = window.__cwMountainDomes || [];
  const pcx = (z) => Math.sin(z * 0.05) * 2.5 + Math.sin(z * 0.13 + 2) * 1.5; // approximate; use exposed pathCenterX via terrainHeight
  // Run the same bore-clearance test the build-time gate uses, live:
  // corridor samples must stay outside every dome's inflated ellipsoid.
  const BORE_R = 5.2, DISP = 1.22, CLEAR = 1.15;
  const T0 = 100, T1 = 170;
  // pathCenterX exact copy from world.ts
  const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const pathCenterX = (z) => {
    const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
    const amp = 1 - 0.75 * canyon;
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
  };
  let blockers = 0;
  let worst = Infinity;
  for (const d of domes) {
    let worstD = Infinity;
    for (let z = T0 - 2; z <= T1 + 2; z += 2) {
      const cx = pathCenterX(z);
      for (const dx of [0, -(BORE_R - 0.8), BORE_R - 0.8]) {
        for (const h of [0.5, 2.5, 4.5]) {
          const nx = (cx + dx - d.x) / (d.sx * DISP);
          const ny = (h - d.y) / (d.sy * DISP);
          const nz = (z - d.z) / (d.sz * DISP);
          const dist = Math.sqrt(nx * nx + ny * ny + nz * nz);
          if (dist < worstD) worstD = dist;
        }
      }
    }
    if (worstD < CLEAR) blockers++;
    if (worstD < worst) worst = worstD;
  }
  return {
    domeCount: domes.length,
    boreBlockers: blockers,
    worstNormalized: Math.round(worst * 1000) / 1000,
    mountFace: window.__cwMountFace || null,
  };
});

// Captures: valley approach (all 4 signs region), each sign, mountain + mounted billboard, bore
async function pin(name, cam, target) {
  await page.evaluate(([c, t]) => { window.__cwQaCam = { pos: c, target: t }; }, [cam, target]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot: ${name}`);
}

const pcx = (z) => {
  const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
};

await pin('01-valley-approach', [0, 14, 2], [0, 5, 40]);
await pin('02-sign1', [pcx(18) - 6, 5, 8], [pcx(18) - 11.5, 4.5, 18]);
await pin('03-sign2', [pcx(34) + 6, 5, 24], [pcx(34) + 11.5, 4.5, 34]);
await pin('04-sign3', [pcx(50) - 6, 5, 40], [pcx(50) - 11.5, 4.5, 50]);
await pin('05-sign4', [pcx(64) + 6, 5, 54], [pcx(64) + 11.5, 4.5, 64]);
await pin('06-mountain-frontal', [0, 10, 62], [0, 8, 102]);
await pin('07-tunnel-entrance', [0, 6, 84], [0, 4, 104]);
await pin('08-bore-interior', [0, 2.4, 112], [0, 2.2, 165]);

console.log(JSON.stringify(out, null, 2));
console.log('errors:', JSON.stringify(errors.slice(0, 6)));
await browser.close();
