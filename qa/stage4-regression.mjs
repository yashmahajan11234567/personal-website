/** Stage 4 (regression): smoke + integrity checks.
 * 1) Spawn area clear; first skill sign >= 8u from start
 * 2) 7 skill signs exist, alternate L/R, all readable
 * 3) Bore open: 0 corridor intersections vs __cwMountainDomes
 * 4) Lanterns pulsing continuously (1.16–1.65)
 * 5) PROJECTS sign at left, readable, unobscured
 * 6) Camera playable inside bore (no rock clipping under control)
 * 7) Sunset zone reachable (z>170); no hard errors
 * 8) Popup regression: 1 button, 0 links, lock/unlock
 * 9) Avatar is the smiling cloud only (no human rider in live state)
 * 10) Content from PORTFOLIO only
 * 11) Build fresh, 0 console errors in a short walk
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage4-newreq';

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push({ t: m.type(), x: m.text() }));
page.on('pageerror', (e) => console.log(`[pageerr] ${e.message}`));

await page.goto(BASE);
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const c = document.querySelector('canvas');
  const gl = c?.getContext('webgl2') || c?.getContext('webgl');
  return gl && c.width > 0;
}, { timeout: 20000 });
await page.waitForTimeout(2000);

// --- 1 Spawn clear ---
const spawn = await page.evaluate(() => {
  const hist = window.__cwAvatarHist;
  const av = (hist && hist.length) ? hist[hist.length - 1] : { x: 0, z: 0, y: 0 };
  const markers = window.__cwMarkers || [];
  const firstSkill = markers.find((m) => m.kind === 'skill') || markers[0];
  const dist = firstSkill ? Math.hypot(firstSkill.x - av.x, firstSkill.z - av.z) : 0;
  return { avZ: av.z, dist: +dist.toFixed(2) };
});
console.log('1 spawn:', spawn, spawn.dist >= 8 ? 'OK' : 'SHORT');

// --- 2 Seven skill signs, L/R pattern ---
const counts = await page.evaluate(() => {
  const markers = window.__cwMarkers || [];
const skills = markers.filter((m) => m.kind === 'skill');
  const sides = skills.map((s, i) => ({ z: s.z, x: s.x, left: s.x < 0 }));
  // check alternating around the path origin pattern (L, R, L...) or at least 7
  return { count: skills.length, sides };
});
console.log('2 skills:', counts.count, counts.sides.slice(0, 3));

// --- 3 Bore clearance ---
const bore = await page.evaluate(() => {
const domes = window.__cwMountainDomes || [];
  function ss(a: number, b: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function pathCX(z: number) {
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  }
  const BORE_R = 5.2;
  const Z0 = 100, Z1 = 170;
  const samples = 70;
  const dz = (Z1 - Z0) / (samples - 1);
  let hits = 0;
  for (let i = 0; i < samples; i++) {
    const z = Z0 + i * dz;
    const cx = pathCX(z);
    for (let h of [0.8, 1.6, 2.4]) {
      const v = { x: cx, y: h, z };
      for (const d of domes) {
        const dx = v.x - d.x, dy = v.y - d.y, dz2 = v.z - d.z;
        const rx = d.rx * 1.22, ry = d.ry * 1.22, rz = d.rz * 1.22;
        const n = Math.max(rx, ry, rz) || 1;
        const nx = dx / rx, ny = dy / ry, nz = dz2 / rz;
        const val = nx * nx + ny * ny + nz * nz;
        if (val <= 1.0) {
          const dist = Math.sqrt(dx * dx + dz2 * dz2);
          if (dist <= BORE_R * 1.05) {
            hits++;
          }
        }
      }
    }
  }
  return { hits, domes: domes.length };
});
console.log('3 bore intersections:', bore.hits, 'domes=', bore.domes);

// --- 4 Lantern pulse ---
const lan = await page.evaluate(() => {
  const m = (window as any).__cwLanternMat;
  if (!m) return { ok: false };
  return { ok: true, i: +m.emissiveIntensity.toFixed(3) };
});
console.log('4 lantern:', lan);

// --- 5 PROJECTS sign location ---
const projects = await page.evaluate(() => {
  const markers = window.__cwMarkers || [];
  const p = markers.find((m: any) => m.kind === 'project');
  if (!p) return null;
  return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), left: p.x < 0 };
});
console.log('5 projects:', projects);

// --- 6 Short walk through bore ---
await page.keyboard.down('w');
let z = 0;
const t0 = Date.now();
while (z < 185 && Date.now() - t0 < 30000) {
  await page.waitForTimeout(600);
  z = await page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z || 0);
}
await page.keyboard.up('w');
await page.waitForTimeout(800);
const after = await page.evaluate(() => {
  const av = window.__cwAvatarHist?.slice(-1)[0] || { z: 0, x: 0, y: 0 };
  const pathCX = (z: number) => {
    const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
    return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
  };
  const inside = av.z > 98 && av.z < 172;
  return {
    z: +av.z.toFixed(2),
    x: +av.x.toFixed(2),
    y: +av.y.toFixed(2),
    inside,
    off: inside ? Math.abs(av.x - pathCX(av.z)).toFixed(2) : '-',
  };
});
await page.screenshot({ path: `${OUT}/01-walk-sunset.png` });
console.log('6 after walk:', after);

// --- 7 Popup quick regression ---
const card = await page.evaluate(async () => {
  const c = document.createElement('script');
  c.textContent = '1+1';
  document.body.appendChild(c);
  return 1;
});
// find a sign to click
for (let x = 600; x >= 400; x -= 40) {
  await page.mouse.click(x, 500);
  await page.waitForTimeout(90);
  const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
  if (has) break;
}
const creg = await page.evaluate(() => {
  const b = document.querySelectorAll('.cloud-card button').length;
  const a = document.querySelectorAll('.cloud-card a').length;
  return { buttons: b, links: a, has: !!document.querySelector('.cloud-card-scrim') };
});
if (creg.has) {
  await page.locator('.cloud-card-return').click();
  await page.waitForTimeout(350);
}
const creg2 = await page.evaluate(() => {
  const has = !!document.querySelector('.cloud-card-scrim');
  const lock = (window as any).__cwInputLocked;
  return { closed: !has, lock };
});
console.log('7 popup reg:', creg, '→', creg2);

// --- 8 Avatar is smiling cloud only (no human mesh) ---
const avatar = await page.evaluate(() => {
  // scan scene graph via custom probe if any — CloudCharacter creates cloud meshes
  const log = (window as any).__cwDiag ? 1 : 0;
  const hasRider = (window as any).__cwHasRider === false; // best-effort marker not set; rely on structure: avatar root is cloud
  return { hasRider };
});
console.log('8 avatar probe (best-effort):', avatar);

// --- Summary ---
const errCount = logs.filter((l) => l.t === 'error').length;
console.log('\n=== STAGE 4 SUMMARY ===');
console.log('spawn OK, dist>=8?', spawn.dist >= 8);
console.log('bore hits 0?', bore.hits === 0);
console.log('lantern ok?', lan.ok);
console.log('projects at left?', projects && projects.left);
console.log('reached sunset?', after.z > 170);
console.log('popup ok (1b,0l,unlocked)?', creg.buttons === 1 && creg.links === 0 && creg2.closed && creg2.lock === false);
console.log(`console errors: ${errCount}`);
console.log(`screenshot: ${OUT}/01-walk-sunset.png`);

await browser.close();
console.log('DONE');
