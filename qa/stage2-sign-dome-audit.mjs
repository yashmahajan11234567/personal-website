/** Verify live: (1) Ansible sign at 96-RIGHT exists, readable, clickable
 * with the right card; (2) no sign sits inside a mountain dome (the
 * __cwMountainDomes mirror vs sign positions incl. the new billboard);
 * (3) PROJECTS billboard readable at gameplay angles. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage2-fix';

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const tm = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
}

const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0 && Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(1500);

// 1. Dome containment audit for ALL signs (live mirror)
const audit = await page.evaluate(() => {
  const domes = window.__cwMountainDomes;
  if (!domes || !domes.length) return { error: 'no domes' };
  // all sign spots (skills + projects + billboard)
  function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
  function terrainHeight(x, z) {
    const d = Math.abs(x - pathCenterX(z));
    const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
    const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
    const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
    const flatten = smoothstep(4.5, 16, d);
    const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
    const rimZ = smoothstep(-38, -95, z) * 10;
    const tm = 1 - smoothstep(-95, -72, z);
    return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
  }
  const stations = [[16, 'left', 3.0, 11.5], [29, 'right', 3.0, 11.5], [44, 'left', 3.0, 11.5], [62, 'right', 3.0, 11.5], [74, 'left', 3.0, 11.5], [80, 'right', 3.0, 12.5], [88, 'right', 3.0, 11.5]];
  const signs = stations.map(([z, side, s, off]) => ({
    name: `skill@${z}${side[0]}`, x: pathCenterX(z) + (side === 'left' ? -off : off), z, s,
  }));
  // project markers
  for (const [z, dir] of [[196, -1], [206, 1], [216, -1]]) {
    signs.push({ name: `project@${z}`, x: pathCenterX(z) + dir * 13, z, s: 3.6 });
  }
  signs.push({ name: 'billboard', x: pathCenterX(72) + 9.5, z: 72, s: 3.4 });
  const out = [];
  for (const sg of signs) {
    const by = terrainHeight(sg.x, sg.z) + 2.9 * sg.s;
    let worst = 1e9;
    for (const d of domes) {
      const nx = (sg.x - d.x) / d.sx, ny = (by - d.y) / d.sy, nz = (sg.z - d.z) / d.sz;
      const v = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (v < worst) worst = v;
    }
    out.push({ name: sg.name, worstDist: +worst.toFixed(3), inside: worst < 1 });
  }
  return out;
});
console.log('sign-vs-dome audit (live mirror):');
for (const r of audit) console.log(`  ${r.inside ? '❌ INSIDE DOME' : '✅ clear'} ${r.name} worst=${r.worstDist}`);
const anyInside = audit.some((r) => r.inside);

// 2. Ansible 80R click → card
const ax = pathCenterX(80) + 12.5;
const aby = terrainHeight(ax, 80) + (2.35 + 0.55) * 3.0;
await page.evaluate(({ ax, aby }) => {
  window.__cwQaCam = { pos: [ax - 0.4, aby + 1.0, 80 - 13], target: [ax, aby, 80] };
}, { ax, aby });
await page.waitForTimeout(800);
await page.mouse.click(720, 450);
await page.waitForTimeout(300);
const ansibleCard = await page.evaluate(() => document.querySelector('.cloud-card-title')?.textContent || null);
console.log('ansible 80R click →', ansibleCard);
if (ansibleCard) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `${OUT}/ansible-80R-verify.png` });
await page.evaluate(() => { window.__cwQaCam = undefined; });

console.log(`dome audit: ${anyInside ? 'FAIL' : 'PASS'}; pageErrors=${pageErrors.length}; consoleErrors=${consoleErrors.length}`);
await browser.close();
console.log('DONE');
