/** Stage 4 (regression): smoke + integrity checks (CJS, no TS/ESM) */
const { chromium } = require('playwright');

const BASE = 'http://localhost:4173/#/cloud-world';
const OUT = 'qa-screenshots-stage4-newreq';

async function main() {
  const browser = await chromium.launch({ headless: false, args: ['--enable-webgl2', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];
  page.on('console', (m) => logs.push({ t: m.type(), x: m.text() }));
  page.on('pageerror', (e) => console.log('[pageerr] ' + e.message));

  await page.goto(BASE);
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
    const markers = window.__cwMarkers || [];
    const hist = window.__cwAvatarHist || [];
    return gl && c.width > 0 && markers.length > 0 && hist.length > 0;
  }, { timeout: 25000 });
  await page.waitForTimeout(1000);

  const spawn = await page.evaluate(() => {
    const hist = window.__cwAvatarHist;
    const av = (hist && hist.length) ? hist[hist.length - 1] : { x: 0, z: 0, y: 0 };
    const markers = window.__cwMarkers || [];
    const firstSkill = markers.find((m) => m.kind === 'skill') || markers[0];
    const dist = firstSkill ? Math.hypot(firstSkill.x - av.x, firstSkill.z - av.z) : 0;
    return { dist: +dist.toFixed(2) };
  });
  console.log('1 spawn dist>=8:', spawn.dist >= 8, spawn.dist);

  const counts = await page.evaluate(() => {
    const markers = window.__cwMarkers || [];
    const skills = markers.filter((m) => m.kind === 'skill');
    return { count: skills.length };
  });
  console.log('2 skills:', counts.count);

  const bore = await page.evaluate(() => {
    const domes = window.__cwMountainDomes || [];
    function ss(a, b, x) {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }
    function pathCX(z) {
      const canyon = ss(92, 108, z) * (1 - ss(168, 184, z));
      return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
    }
    const BORE_R = 5.2;
    const Z0 = 100, Z1 = 170;
    const samples = 50;
    const dz = (Z1 - Z0) / (samples - 1);
    let hits = 0;
    for (let i = 0; i < samples; i++) {
      const z = Z0 + i * dz;
      const cx = pathCX(z);
      const heights = [0.9, 2.0, 2.8];
      for (let k = 0; k < heights.length; k++) {
        const h = heights[k];
        for (let j = 0; j < domes.length; j++) {
          const d = domes[j];
          const dx = cx - d.x, dy = h - d.y, dz2 = z - d.z;
          const rx = d.rx * 1.22, ry = d.ry * 1.22, rz = d.rz * 1.22;
          const nx = dx / rx, ny = dy / ry, nz = dz2 / rz;
          if (nx * nx + ny * ny + nz * nz <= 1.0 && Math.hypot(dx, dz2) <= BORE_R * 1.05) {
            hits++;
          }
        }
      }
    }
    return { hits, domes: domes.length };
  });
  console.log('3 bore hits (0 desired):', bore.hits);

  const lan = await page.evaluate(() => {
    const m = window.__cwLanternMat;
    if (!m) return { ok: false, i: 0 };
    return { ok: true, i: +m.emissiveIntensity.toFixed(3) };
  });
  console.log('4 lantern:', lan.ok, lan.i);

  const projects = await page.evaluate(() => {
    const markers = window.__cwMarkers || [];
    const p = markers.find((m) => m.kind === 'project');
    if (!p) return null;
    return { left: p.x < 0 };
  });
  console.log('5 projects left:', projects ? projects.left : false);

  await page.keyboard.down('w');
  let z = 0;
  const t0 = Date.now();
  while (z < 180 && Date.now() - t0 < 20000) {
    await page.waitForTimeout(400);
    z = await page.evaluate(() => {
      const hist = window.__cwAvatarHist;
      return hist && hist.length ? hist[hist.length - 1].z : 0;
    });
  }
  await page.keyboard.up('w');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const hist = window.__cwAvatarHist;
    const av = (hist && hist.length) ? hist[hist.length - 1] : { z: 0 };
    return { z: +av.z.toFixed(2) };
  });
  console.log('6 reached sunset z>170:', after.z > 170, after.z);

  for (let x = 600; x >= 400; x -= 40) {
    await page.mouse.click(x, 500);
    await page.waitForTimeout(80);
    const has = await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'));
    if (has) break;
  }
  const c1 = await page.evaluate(() => ({
    buttons: document.querySelectorAll('.cloud-card button').length,
    links: document.querySelectorAll('.cloud-card a').length,
    has: !!document.querySelector('.cloud-card-scrim'),
  }));
  if (c1.has) {
    const btn = await page.$('.cloud-card-return');
    if (btn) await btn.click();
    await page.waitForTimeout(300);
  }
  const c2 = await page.evaluate(() => ({
    closed: !document.querySelector('.cloud-card-scrim'),
    lock: window.__cwInputLocked,
  }));
  console.log('7 popup:', c1.buttons === 1 && c1.links === 0 && c2.closed && c2.lock === false);

  const errCount = logs.filter((l) => l.t === 'error').length;
  console.log('errors:', errCount);
  await page.screenshot({ path: OUT + '/01-walk-sunset.png' });
  await browser.close();
  console.log('DONE');
}

main().catch((e) => { console.error(e); process.exit(1); });
