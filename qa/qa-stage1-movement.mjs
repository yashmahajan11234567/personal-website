// Stage 1 acceptance v2 — timing-robust: bounds every measurement to
// wall-clock windows from the trajectory history itself, so key-dispatch
// delays can't inflate results.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:4173/#/cloud-world';
const OUT = path.join(process.cwd(), 'qa-screenshots-stage1');

async function clearHist(page) {
  await page.evaluate(() => { window.__cwAvatarHist.length = 0; });
}
async function readHist(page) {
  return page.evaluate(() => window.__cwAvatarHist.slice());
}
// displacement accumulated strictly within [tA, tB] (ms, page clock)
function distIn(hist, tA, tB) {
  let dist = 0, prev = null;
  for (const s of hist) {
    if (s.t < tA) { prev = s; continue; }
    if (s.t > tB) break;
    if (prev) dist += Math.hypot(s.x - prev.x, s.z - prev.z);
    prev = s;
  }
  return dist;
}
function speedProfile(hist, tA, tB) {
  const seg = hist.filter((s) => s.t >= tA && s.t <= tB);
  let peak = 0;
  for (let i = 1; i < seg.length; i++) {
    const dt = (seg[i].t - seg[i - 1].t) / 1000;
    if (dt <= 0 || dt > 0.3) continue;
    peak = Math.max(peak, Math.hypot(seg[i].x - seg[i - 1].x, seg[i].z - seg[i - 1].z) / dt);
  }
  return { peak, n: seg.length };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.HEADLESS === '0' ? false : true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForFunction(() => Array.isArray(window.__cwAvatarHist) && window.__cwAvatarHist.length > 30, { timeout: 30000 });
  // Bring the window to front — an occluded Chromium window throttles rAF and
  // would make speed measurements read low (physics caps catch-up by design).
  await page.bringToFront();
  await page.mouse.click(720, 450);
  // Warm-up: one throwaway W hold so shader/geometry upload jank doesn't
  // pollute the first real measurement, plus settle to a full stop.
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(2000);

  const results = { mode: process.env.HEADLESS === '0' ? 'headed' : 'headless' };
  const clock = () => page.evaluate(() => performance.now());

  // --- 1. Each key: hold ~1s (wall-clock bounded), measure to +1.4s decay ---
  results.keys = {};
  const keyData = {};
  for (const key of ['w', 'a', 's', 'd']) {
    await clearHist(page);
    const tDown = await clock();
    await page.keyboard.down(key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(key);
    const tUp = await clock();
    const holdMs = tUp - tDown;
    await page.waitForTimeout(1400);
    const hist = await readHist(page);
    const distHold = distIn(hist, tDown, tUp);
    const distDecay = distIn(hist, tUp, tUp + 1400);
    keyData[key] = { holdMs: +holdMs.toFixed(0), distHold: +distHold.toFixed(2), distDecay: +distDecay.toFixed(2) };
    results.keys[key] = keyData[key];
  }
  results.keysCheck = {
    wHoldPerSec: +(keyData.w.distHold / (keyData.w.holdMs / 1000)).toFixed(2),
    aHoldPerSec: +(keyData.a.distHold / (keyData.a.holdMs / 1000)).toFixed(2),
    sHoldPerSec: +(keyData.s.distHold / (keyData.s.holdMs / 1000)).toFixed(2),
    dHoldPerSec: +(keyData.d.distHold / (keyData.d.holdMs / 1000)).toFixed(2),
  };

  // --- 2. Diagonal W+A vs straight W, same wall-clock method ---
  await clearHist(page);
  const tD0 = await clock();
  await page.keyboard.down('w'); await page.keyboard.down('a');
  await page.waitForTimeout(1000);
  await page.keyboard.up('w'); await page.keyboard.up('a');
  const tU0 = await clock();
  const diagHist = await readHist(page);
  const diagHold = distIn(diagHist, tD0, tU0);
  const straightRate = results.keysCheck.wHoldPerSec;
  const diagRate = diagHold / ((tU0 - tD0) / 1000);
  results.diagonal = {
    straightRate: +straightRate.toFixed(2),
    diagonalRate: +diagRate.toFixed(2),
    within10pct: Math.abs(diagRate - straightRate) / straightRate <= 0.10,
  };

  // --- 3. Reversal W→S (sign-correct: W=+z at azimuth π) ---
  await page.mouse.click(720, 450); // re-assert focus before the key sequence
  await clearHist(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  await page.keyboard.down('s');
  const tS = await clock();
  await page.waitForTimeout(1200);
  await page.keyboard.up('s');
  const revHist = await readHist(page);
  const posPeak = Math.max(...revHist.filter((s) => s.t < tS).map((s) => s.vz));
  const posPeakSample = revHist.filter((s) => s.t < tS).find((s) => s.vz === posPeak);
  let crossS = null;
  for (const s of revHist) {
    if (s.t < posPeakSample.t) continue;
    if (s.vz <= 0) { crossS = (s.t - posPeakSample.t) / 1000; break; }
  }
  let maxSpeed = 0;
  for (let i = 1; i < revHist.length; i++) {
    maxSpeed = Math.max(maxSpeed, Math.hypot(revHist[i].vx, revHist[i].vz));
  }
  results.reversal = {
    crossedWithin0p6s: crossS !== null && crossS <= 0.6,
    crossTimeS: crossS !== null ? +crossS.toFixed(2) : null,
    maxSpeed: +maxSpeed.toFixed(2),
    withinCap: maxSpeed <= 8.5 * 1.15,
  };

  // --- 4. No-teleport check: every 0.5s window within a W hold must move
  // ≤ 8.5 u/s × 0.5s × 1.15 tolerance. (Inter-sample "speed" across a
  // stalled frame gap can exceed the cap even though per-substep motion
  // never does — windowed displacement is the honest metric.) ---
  await clearHist(page);
  const tW0 = await clock();
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  const tW1 = await clock();
  await page.waitForTimeout(300);
  const spikeHist = await readHist(page);
  // Build cumulative distance function from samples.
  let windowMax = 0;
  let windowBad = 0;
  for (let wStart = tW0; wStart < tW1 - 500; wStart += 250) {
    const d = distIn(spikeHist, wStart, wStart + 500);
    if (d > windowMax) windowMax = d;
    if (d > 8.5 * 0.5 * 1.15) windowBad++;
  }
  results.peakSpeed = {
    maxWindowDisplacementPer0p5s: +windowMax.toFixed(2),
    windowsOverCap: windowBad,
    target: '≤ 4.89u per 0.5s window, 0 windows over',
    pass: windowBad === 0,
  };

  // --- 5. Idle 10s (settle to full stop FIRST so no momentum is in-window) ---
  await page.waitForTimeout(2500);
  await clearHist(page);
  await page.waitForTimeout(10000);
  const idleHist = await readHist(page);
  const i0 = idleHist[0], i1 = idleHist[idleHist.length - 1];
  results.idle = {
    drift: +Math.hypot(i1.x - i0.x, i1.z - i0.z).toFixed(4),
    driftY: +(i1.y - i0.y).toFixed(4),
    stable: Math.hypot(i1.x - i0.x, i1.z - i0.z) < 0.001,
  };

  results.errors = errors;
  fs.writeFileSync(path.join(OUT, 'stage1-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error('STAGE1 QA FAILED:', e.message); process.exit(1); });
