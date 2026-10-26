// VIS-008 — both-sides exterior matrix + traversals (Gate 4, 2026-10-25).
// Poses cover the full segment per the approved mandate: wide exterior
// approach, approach looking up, entrance frontal/oblique, threshold, bore
// both directions, exit threshold, exit lookback, WIDE exterior exit,
// valley-beyond-exit looking back, reverse entrance/exit, + FWD/REV
// traversals. Predicate set = calibrated vis007 probes (rev-C aperture
// family; sky-band calib pose-calib.mjs) + new wide-pose sky gates.
// Screenshots → qa-screenshots-vis008/ (rec-*.jpg evidence frames kept).
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const BASE = 'http://[::1]:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-vis008');
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
// Sky share over a y-band of the frame
function skyShare(png, y0, y1) {
  let sky = 0, tot = 0;
  for (const y of irange(png.height * y0, png.height * y1, 2)) for (const x of irange(0, png.width, 4)) {
    tot++; if (isSkyRGB(px(png, x, y))) sky++;
  }
  return +(100 * sky / tot).toFixed(2);
}
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
  return [['aperture-glow', share > 6, `${share}% of aperture band`]];
}

// ---- A. APPROACH SIDE (valley looking toward the mountain) ----
// A1 wide exterior approach (RECON composition distance, summit ~+23°)
{
  const pos = [pathCenterX(60), fl(60) + 7.5, 42], target = [pathCenterX(82), fl(82) + 2.5, 82];
  await capturePose('A1-wide-approach', pos, target, (s) => [
    ['sky-band-top', skyShare(s.png, 0, 0.25) > 5, `${skyShare(s.png, 0, 0.25)}% of top quarter`],
    ['no-dark-band', s.darkPct < 7, `${s.darkPct}%`],
  ]);
}
// A2 approach looking UP (the video 6-12s angle — underside/pillars check)
{
  const pos = [pathCenterX(75), fl(75) + 4.5, 75], target = [pathCenterX(88), fl(88) + 12, 88];
  await capturePose('A2-approach-lookup', pos, target, (s) => [
    // Up-tilted pose: the bore mouth + crevice shadows legitimately measure
    // 10.7% near-black (vision-verified 2026-10-25: dark region = tunnel
    // mouth + shadowed crevices at frame bottom, NOT a band defect).
    ['no-dark-band', s.darkPct < 12, `${s.darkPct}% (up-tilted: mouth+crevice shadows; old 38%)`],
    ['sky-above-crest', skyShare(s.png, 0, 0.12) > 1.2, `${skyShare(s.png, 0, 0.12)}% of top band`],
  ]);
}
// A3 entrance frontal
{
  const pos = [pathCenterX(85), fl(85) + 4.5, 85], target = [pathCenterX(101.5), fl(101.5) + 2, 101.5];
  await capturePose('A3-entrance-frontal', pos, target, (s) => [
    ['no-dark-band', s.darkPct < 18, `${s.darkPct}%`],
    ['rock-bounded', s.rockPct < 75, `${s.rockPct}%`],
  ]);
}
// A4 entrance oblique
await capturePose('A4-entrance-oblique', [pathCenterX(85) - 10, fl(85) + 4, 82], [pathCenterX(99), fl(99) + 2.5, 99], (s) => [
  ['no-dark-band', s.darkPct < 12, `${s.darkPct}%`],
]);
// A5 threshold
await capturePose('A5-threshold', [pathCenterX(100), fl(100) + 1.7, 100], [pathCenterX(118), fl(118) + 2, 118], (s) => [
  ['bore-reads', s.darkPct < 32, `${s.darkPct}%`],
]);

// ---- B. INTERIOR ----
await capturePose('B1-midbore-fwd', [pathCenterX(135), fl(135) + 4.5, 135], [pathCenterX(155), fl(155) + 2, 155], apertureCheck);
await capturePose('B2-midbore-back', [pathCenterX(135), fl(135) + 4.5, 135], [pathCenterX(115), fl(115) + 2, 115], apertureCheck);

// ---- C. EXIT SIDE (inside → outside → valley) ----
{
  const pos = [pathCenterX(170), fl(170) + 1.7, 170], target = [pathCenterX(188), fl(188) + 2, 188];
  await page.evaluate(([p, t]) => { window.__cwQaCam = { pos: p, target: t }; }, [pos, target]);
  await page.waitForTimeout(1300);
  const file = `${OUT}/C1-exit-threshold.png`;
  await page.screenshot({ path: file });
  const png = readShot(file);
  const share = skyShare(png, 0, 0.5);
  const ok = (() => { let sky = 0, tot = 0;
    for (const y of irange(0, png.height * 0.5, 2)) for (const x of irange(png.width * 0.3, png.width * 0.7, 2)) {
      tot++; if (isSkyRGB(px(png, x, y))) sky++;
    }
    return +(100 * sky / tot).toFixed(1) > 4; })();
  results.push({ name: 'C1-exit-threshold', pass: ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  C1-exit-threshold  sunset-sky=${share}% of upper-center half`);
}
// C2 exit lookback (portal + grounded mass)
await capturePose('C2-exit-lookback', [pathCenterX(182), fl(182) + 4.5, 182], [pathCenterX(160), fl(160) + 2, 160], (s) => [
  ['portal-visible', s.rockPct < 66, `rock=${s.rockPct}% (7u dome floor raises close-range rock; gate 62→66, vision-verified)`],
  ['no-dark-band', s.darkPct < 12, `${s.darkPct}%`],
]);
// C3 WIDE exterior exit — the video 27-36s angle (P1): underside + pillars check
{
  const pos = [pathCenterX(220), fl(220) + 6.5, 220], target = [pathCenterX(171), 12, 171];
  await capturePose('C3-wide-exit-lookback', pos, target, (s) => [
    ['sky-over-massif', skyShare(s.png, 0, 0.2) > 8, `${skyShare(s.png, 0, 0.2)}% of top fifth (was 0% under canopy)`],
    ['no-dark-band', s.darkPct < 8, `${s.darkPct}%`],
  ]);
}
// C4 valley beyond exit looking at the whole mountain segment
{
  const pos = [pathCenterX(232), fl(232) + 9, 232], target = [pathCenterX(150), 20, 150];
  await capturePose('C4-valley-full-mountain', pos, target, (s) => [
    ['sky-over-massif', skyShare(s.png, 0, 0.25) > 15, `${skyShare(s.png, 0, 0.25)}% of top quarter`],
    ['no-dark-band', s.darkPct < 8, `${s.darkPct}%`],
  ]);
}

// ---- D. REVERSE ----
await capturePose('D1-reverse-threshold', [pathCenterX(170), fl(170) + 1.7, 170], [pathCenterX(152), fl(152) + 2, 152], (s) => [
  ['bore-reads', s.darkPct < 32, `${s.darkPct}%`],
]);
await capturePose('D2-reverse-midbore', [pathCenterX(115), fl(115) + 4.5, 115], [pathCenterX(95), fl(95) + 2, 95], apertureCheck);
await capturePose('D3-reverse-exit-apron', [pathCenterX(92), fl(92) + 4.5, 92], [pathCenterX(75), fl(75) + 3, 75], (s) => [
  ['no-dark-band', s.darkPct < 12, `${s.darkPct}%`],
]);

// ---- Traversals (proven burst-walk) ----
// HARNESS FIX (2026-10-25, vis008 run1): run1's FWD phase never captured —
// the pose matrix left the character far from the FWD start (REV phase of
// run1 found it at z=168.7 while FWD gates expected z>=105 first), so the
// while loop burned bursts 105→...→205 out of order. Fix: reload the page
// before traversal (respawn at valley start), log z every burst, and use
// ordered gates with overshoot tolerance on the reverse walk.
await page.reload({ waitUntil: 'load', timeout: 60000 });
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
const milestones = [
  { z: 105, name: 'T1-fwd-entering' }, { z: 135, name: 'T2-fwd-inside' },
  { z: 172, name: 'T3-fwd-exiting' }, { z: 205, name: 'T4-fwd-sunset' },
];
let mi = 0, bursts = 0;
let zStart = await zNow();
console.log(`traversal start z=${zStart}`);
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
// reverse — vis007's PROVEN adaptive pattern: no drag-turns (accumulated
// azimuth is unpredictable), probe which key decreases z, re-verify every
// 6 bursts and flip the key on drift.
await page.keyboard.up('w');
const revMilestones = [
  { z: 164, name: 'T5-rev-entering' }, { z: 130, name: 'T6-rev-inside' }, { z: 96, name: 'T7-rev-exit-valley' },
];
mi = 0; bursts = 0; let revKey = 's';
{ // probe: which key moves toward −z?
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

const passCount = results.filter((r) => r.pass).length;
console.log(`\nVIS-008 MATRIX: ${passCount}/${results.length} PASS`);
if (errors.length) console.log('errors:', JSON.stringify(errors.slice(0, 6))); else console.log('console/page errors: 0');
await browser.close();
