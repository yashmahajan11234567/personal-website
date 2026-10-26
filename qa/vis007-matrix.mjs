// VIS-007 — 12-pose tunnel visual matrix (forensic plan §6, rev B 2026-10-25).
// Rev B changes: geometric sky-ray probe instead of whole-frame sky class
// (measured sunset palette rgb(255,183,77)/rgb(218,170,99) broke the b>80
// predicate); aperture check = center-box sunset-glow ratio; traversals use
// the proven traverse-final burst-walk pattern (no teleport exists in
// CloudCharacter — the earlier harness walked from spawn backwards).
// Screenshots → qa-screenshots-vis007/ (rev-B files overwrite rev-A).
// NOTE: original 01-approach-z85 pose unrecoverable (plan decision 2) —
// pose 01 = audit replacement pose; pose 01b = RECON composition distance.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-vis007');
fs.mkdirSync(OUT, { recursive: true });

function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const towardMountains = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + towardMountains * 2.2;
}
const fl = (z) => terrainHeight(pathCenterX(z), z);

// Direction at (elev°, azim°) relative to the pin camera's forward — projected
// to a pixel (fov 50, 1440x900). Used for the geometric sky-ray probe.
function dirPixel(pos, target, elevDeg, azimDeg) {
  const p = [...pos], t = [...target];
  let fx = t[0] - p[0], fy = t[1] - p[1], fz = t[2] - p[2];
  const L = Math.hypot(fx, fy, fz); fx /= L; fy /= L; fz /= L;
  // right = normalize(forward × up(0,1,0))
  let rx = fz, ry = 0, rz = -fx;
  const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; rz /= rl;
  // up = right × forward
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const el = (elevDeg * Math.PI) / 180, az = (azimDeg * Math.PI) / 180;
  const s = Math.sin(el), c = Math.cos(el);
  const dx = fx * c + (rx * Math.cos(az) + ux * Math.sin(az)) * s;
  const dy = fy * c + (ry * Math.cos(az) + uy * Math.sin(az)) * s;
  const dz = fz * c + (rz * Math.cos(az) + uz * Math.sin(az)) * s;
  const tanH = Math.tan((50 / 2) * Math.PI / 180);
  const aspect = 1440 / 900;
  const zc = dx * fx + dy * fy + dz * fz;
  const xc = dx * rx + dy * ry + dz * rz;
  const yc = dx * ux + dy * uy + dz * uz;
  const ndcX = xc / (zc * tanH * aspect);
  const ndcY = yc / (zc * tanH);
  return { x: Math.round((ndcX + 1) / 2 * 1440), y: Math.round((1 - ndcY) / 2 * 900), inFrame: Math.abs(ndcX) < 1 && Math.abs(ndcY) < 1 };
}

const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-for-occluded-windows'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 120)); });
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 30000 });
await page.waitForTimeout(2500);

const results = [];
function readShot(file) { return PNG.sync.read(fs.readFileSync(file)); }
function px(png, x, y) { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; }
const isSkyRGB = ([r, g, b]) => r > 200 && g > 150 && b > 55 && b < 0.68 * r && g < 0.88 * r && g > 0.6 * r;
const isSunsetGlow = ([r, g, b]) => r > 185 && g > 130 && b > 50 && r > g && g >= b;
// Integer loop bounds — fractional pixel indices read undefined (rev-B bug).
const irange = (from, to, step) => { const out = []; for (let v = Math.round(from); v < to; v += step) out.push(v); return out; };

async function capturePose(name, pos, target, checks) {
  await page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [pos, target]);
  await page.waitForTimeout(1300);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  const png = readShot(file);
  const { width: W, height: H } = png;
  let dark = 0, rock = 0, total = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const [r, g, b] = px(png, x, y); total++;
    if (r < 60 && g < 45 && b < 35) dark++;
    if (r >= 95 && r < 210 && g >= 65 && g < 145 && b < 105 && r > g && g >= b) rock++;
  }
  const pct = (n) => +(100 * n / total).toFixed(2);
  const s = { darkPct: pct(dark), rockPct: pct(rock), png };
  let pass = true; const notes = [];
  for (const [label, ok, detail] of checks(s)) { if (!ok) pass = false; notes.push(`${label}:${ok ? 'OK' : 'FAIL'}(${detail})`); }
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  dark=${s.darkPct}% rock=${s.rockPct}%  ${notes.join(' ')}`);
}

// 01 Exterior approach — audit replacement pose (RC-2 site; old build: dark 38%).
// SKY GATE calibration (qa/_scratch-e/pose-calib.mjs, 2026-10-25): at the
// natural 15u trail the 52u summit legitimately fills the upper half
// (sky 1.6-1.9%); the walking-approach distance (30u trail) shows 8.0% and
// the RECON composition distance 35.2% (pose 01b). Sky composition is gated
// at 01b; here only "sky present through the skyline notches" (>1.2%) plus
// the dark-band gate apply. The original 5% gate was mis-scoped to this pose.
{
  const pos = [-1.5, 7.5, 75.5], target = [-1.5, 1.8, 85];
  await capturePose('01-approach', pos, target, (s) => {
    // Sky share over the full upper half — a single elevation-ray can land on
    // a flank shoulder at this pose (the summit fills ±20° of a 50° FOV).
    let sky = 0, tot = 0;
    for (const y of irange(0, s.png.height * 0.5, 2)) for (const x of irange(0, s.png.width, 4)) {
      tot++; if (isSkyRGB(px(s.png, x, y))) sky++;
    }
    return [
      ['no-dark-band', s.darkPct < 6, `${s.darkPct}% (old 38%)`],
      ['sky-upper-half', +(100 * sky / tot).toFixed(2) > 1.2, `${(100 * sky / tot).toFixed(2)}% of upper half (calib: 1.6-1.9 natural / 8.0 far / 35.2 comp)`],
    ];
  });
}
// 01b RECON composition distance (summit ≈ +23° per RECON notes → cam z≈42)
{
  const pos = [pathCenterX(60), fl(60) + 7.5, 42], target = [pathCenterX(82), fl(82) + 2.5, 82];
  await capturePose('01b-approach-wide', pos, target, (s) => {
    let skyTop = 0, tot = 0;
    for (let y = 0; y < s.png.height * 0.25; y += 2) for (let x = 0; x < s.png.width; x += 2) {
      tot++; if (isSkyRGB(px(s.png, x, y))) skyTop++;
    }
    return [
      ['sky-band-top', +(100 * skyTop / tot).toFixed(2) > 5, `${(100 * skyTop / tot).toFixed(2)}% of top quarter`],
      ['no-dark-band', s.darkPct < 7, `${s.darkPct}%`],
    ];
  });
}
// 02 Entrance frontal — mouth strip (center 16% wide, 35-75% down) must read
// as open (shaded interior or bright glow), not as front rock.
{
  const pos = [pathCenterX(85), fl(85) + 4.5, 85], target = [pathCenterX(101.5), fl(101.5) + 2, 101.5];
  await capturePose('02-entrance-frontal', pos, target, (s) => {
    let openPx = 0, tot = 0;
    for (const y of irange(s.png.height * 0.35, s.png.height * 0.75, 2)) {
      for (const x of irange(s.png.width * 0.42, s.png.width * 0.58, 2)) {
        tot++;
        const rgb = px(s.png, x, y);
        const darkish = rgb[0] < 150 && rgb[1] < 110;
        if (darkish || isSunsetGlow(rgb)) openPx++;
      }
    }
    return [
      ['mouth-open-strip', +(100 * openPx / tot).toFixed(1) > 25, `${(100 * openPx / tot).toFixed(1)}% of mouth strip reads open`],
      ['no-dark-band', s.darkPct < 18, `${s.darkPct}%`],
    ];
  });
}
// 03 Entrance oblique left
await capturePose('03-entrance-oblique', [pathCenterX(85) - 10, fl(85) + 4, 82], [pathCenterX(99), fl(99) + 2.5, 99], (s) => [
  ['no-dark-band', s.darkPct < 12, `${s.darkPct}%`],
]);
// 04 Threshold crossing
await capturePose('04-threshold', [pathCenterX(100), fl(100) + 1.7, 100], [pathCenterX(118), fl(118) + 2, 118], (s) => [
  ['bore-reads', s.darkPct < 32, `${s.darkPct}%`],
]);
// 05/06/10 — aperture poses. FORENSIC rev-C probe fix (2026-10-25): the old
// center-box mixed the FLOOR into the sample (the corrected sandstone floor
// is no longer glow-class, so the share dropped ~4.6pp with zero scene
// change — measured), and the glow predicate (r>185) excluded the measured
// aperture family: glow through ~20u of warm fog samples rgb(154-200,
// 123-147, 81-108) at pose 05 (sample_px). The aperture is the band ABOVE
// the far mouth's horizon line: 28..52% height × center 44% width, counted
// as "open" when brighter than any bore-interior surface (bore in-band
// measures rgb(54,29,7)..(101,55,17)).
function apertureCheck(s) {
  let glow = 0, tot = 0;
  for (const y of irange(s.png.height * 0.28, s.png.height * 0.52, 2)) {
    for (const x of irange(s.png.width * 0.28, s.png.width * 0.72, 2)) {
      const [r, g, b] = px(s.png, x, y);
      tot++;
      if (r > 140 && g > 105 && r >= g && (r - b) > 35) glow++;
    }
  }
  const share = +(100 * glow / tot).toFixed(1);
  return [['aperture-glow', share > 6, `${share}% of aperture band (28-52%h, measured glow family)`]];
}
await capturePose('05-midbore-fwd', [pathCenterX(135), fl(135) + 4.5, 135], [pathCenterX(155), fl(155) + 2, 155], apertureCheck);
await capturePose('06-midbore-back', [pathCenterX(135), fl(135) + 4.5, 135], [pathCenterX(115), fl(115) + 2, 115], apertureCheck);
await capturePose('10-reverse-midbore', [pathCenterX(115), fl(115) + 4.5, 115], [pathCenterX(95), fl(95) + 2, 95], apertureCheck);
// 07 Exit threshold — sunset sky through the open exit (upper-center half)
{
  const pos = [pathCenterX(170), fl(170) + 1.7, 170], target = [pathCenterX(188), fl(188) + 2, 188];
  await page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [pos, target]);
  await page.waitForTimeout(1200);
  const f = `${OUT}/07-exit-threshold.png`;
  await page.screenshot({ path: f });
  const png = readShot(f);
  let sky = 0, tot = 0;
  for (const y of irange(0, png.height * 0.5, 2)) for (const x of irange(png.width * 0.3, png.width * 0.7, 2)) {
    tot++; if (isSkyRGB(px(png, x, y))) sky++;
  }
  const share = +(100 * sky / tot).toFixed(1);
  const ok = share > 4;
  results.push({ name: '07-exit-threshold', pass: ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  07-exit-threshold  sunset-sky=${share}% of upper-center half`);
}
// 08 Exit outside looking back
await capturePose('08-exit-lookback', [pathCenterX(182), fl(182) + 4.5, 182], [pathCenterX(160), fl(160) + 2, 160], (s) => [
  ['portal-visible', s.rockPct < 62, `rock=${s.rockPct}%`],
  ['no-dark-band', s.darkPct < 12, `${s.darkPct}%`],
]);
// 09 Reverse entrance threshold
await capturePose('09-reverse-threshold', [pathCenterX(170), fl(170) + 1.7, 170], [pathCenterX(152), fl(152) + 2, 152], (s) => [
  ['bore-reads', s.darkPct < 32, `${s.darkPct}%`],
]);
// 11/12 clamp corners
{
  await capturePose('11-corner-high', [pathCenterX(110) + 3.2, fl(110) + 4.0, 110], [pathCenterX(110), fl(110) + 1.2, 125], (s) => [
    ['no-rock-fill', s.rockPct < 55, `rock=${s.rockPct}%`],
  ]);
  await capturePose('12-corner-low', [pathCenterX(96) + 3.3, fl(96) + 2.2, 96], [pathCenterX(96), fl(96) + 1.2, 112], (s) => [
    ['no-rock-fill', s.rockPct < 58, `rock=${s.rockPct}%`],
  ]);
}

// ---- Traversals (burst-walk, traverse-final pattern; no teleport exists) ----
const zNow = () => page.evaluate(() => window.__cwAvatarHist?.slice(-1)[0]?.z ?? -1);
async function face(sign) {
  await page.mouse.move(720, 450);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(720 + sign * i * 30, 450, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}
const milestones = [
  { z: 105, name: 'traverse-entering' }, { z: 135, name: 'traverse-inside' },
  { z: 172, name: 'traverse-exiting' }, { z: 205, name: 'traverse-sunset' },
];
let mi = 0, bursts = 0;
await face(1);
while (mi < milestones.length && bursts < 80) {
  await page.keyboard.down('w'); await page.waitForTimeout(750); await page.keyboard.up('w');
  await page.waitForTimeout(150); bursts++;
  const z = await zNow();
  if (z >= milestones[mi].z) {
    await page.screenshot({ path: `${OUT}/${milestones[mi].name}.png` });
    console.log(`FWD ${milestones[mi].name} @z ${z.toFixed(1)} (burst ${bursts})`);
    mi++;
  }
  if (bursts % 8 === 0) await face(1);
}
const fwdOk = mi === milestones.length;
const lock = await page.evaluate(() => {
  const hist = window.__cwAvatarHist ?? [];
  let maxOff = 0, n = 0;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const pcx = (z) => { const c = ss(92, 108, z) * (1 - ss(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * c); };
  for (const h of hist) {
    if (h.z < 92 || h.z > 178) continue;
    const off = Math.abs(h.x - pcx(h.z));
    if (off > maxOff) maxOff = off; n++;
  }
  return { maxOff: +maxOff.toFixed(2), n };
});
console.log(`FWD path-lock: max ${lock.maxOff}u over ${lock.n} samples (gate 0.35)`);
// Reverse: walk back toward the valley. No drag-turns (accumulated azimuth is
// unpredictable) — adaptively pick the key whose burst DECREASES z: probe one
// short S burst, else use W; re-verify every 6 bursts in case of drift.
await page.keyboard.up('w');
const revMarks = [{ z: 168, name: 'rev-entering' }, { z: 135, name: 'rev-inside' }, { z: 96, name: 'rev-exit-valley' }];
let ri = 0; bursts = 0; let revKey = 's';
{ // probe: which key moves toward −z?
  const z0 = await zNow();
  await page.keyboard.down('s'); await page.waitForTimeout(600); await page.keyboard.up('s');
  await page.waitForTimeout(200);
  const z1 = await zNow();
  revKey = z1 < z0 - 1 ? 's' : 'w';
  console.log(`REV direction probe: s-burst Δz ${(z1 - z0).toFixed(1)} → using '${revKey}'`);
}
while (ri < revMarks.length && bursts < 90) {
  await page.keyboard.down(revKey); await page.waitForTimeout(750); await page.keyboard.up(revKey);
  await page.waitForTimeout(150); bursts++;
  const z = await zNow();
  if (z <= revMarks[ri].z) {
    await page.screenshot({ path: `${OUT}/${revMarks[ri].name}.png` });
    console.log(`REV ${revMarks[ri].name} @z ${z.toFixed(1)} (burst ${bursts})`);
    ri++;
  }
  if (bursts % 6 === 0 && ri < revMarks.length) {
    const za = await zNow();
    await page.keyboard.down(revKey); await page.waitForTimeout(500); await page.keyboard.up(revKey);
    const zb = await zNow();
    if (zb > za - 0.5) { revKey = revKey === 's' ? 'w' : 's'; console.log(`REV drift: switching to '${revKey}'`); }
  }
}
const revOk = ri === revMarks.length;
results.push({ name: 'traverse-forward', pass: fwdOk && lock.maxOff < 0.35 });
results.push({ name: 'traverse-reverse', pass: revOk });

const fails = results.filter(r => !r.pass);
console.log(`\nVIS-007 MATRIX: ${results.length - fails.length}/${results.length} PASS`);
if (fails.length) console.log('FAILED:', fails.map(f => f.name).join(', '));
console.log('console/page errors:', errors.length ? JSON.stringify(errors.slice(0, 8)) : '0');
await browser.close();
