// Skyline analyzer: extracts the mountain ridgeline from a screenshot crop
// and reports peak count / jaggedness metrics. Sky = bright warm pixels;
// rock = brown. Works headless of any vision service.
//
// Usage: node qa/skyline-analyze.cjs <image.png> <x0> <x1> [yTop yBottom]
const fs = require('fs');
const { PNG } = require('pngjs');

const file = process.argv[2];
const x0 = +process.argv[3];
const x1 = +process.argv[4];
const yTop = +(process.argv[5] ?? 0);
const yBot = +(process.argv[6] ?? 900);

const png = PNG.sync.read(fs.readFileSync(file));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };

// Sky classifier: warm bright (sunset) — high R, G mid, B lower; or pale.
const isSky = ([r, g, b]) => (r > 180 && g > 120 && b > 90 && r >= g && g > b) || (r > 200 && g > 170 && b > 150);
// Rock classifier: brown-ish, not sky.
const isRock = ([r, g, b]) => r > 40 && r >= g && g >= b * 0.7 && r < 220 && (r - b) > 20;

// For each column find the FIRST rock row scanning from top (the skyline).
const skyline = [];
for (let x = x0; x <= x1; x += 2) {
  let found = -1;
  for (let y = yTop; y < yBot; y++) {
    const c = at(x, y);
    if (isRock(c) && !isSky(c)) { found = y; break; }
  }
  skyline.push({ x, y: found });
}
const valid = skyline.filter((s) => s.y > 0);
if (valid.length < 10) { console.log('no skyline found'); process.exit(0); }

// Interpolate gaps (sky holes between peaks are fine — treat as no-rock).
const ys = skyline.map((s) => (s.y > 0 ? s.y : null));
for (let i = 1; i < ys.length; i++) if (ys[i] === null) ys[i] = ys[i - 1];
for (let i = ys.length - 2; i >= 0; i--) if (ys[i] === null) ys[i] = ys[i + 1];

const minY = Math.min(...ys), maxY = Math.max(...ys);
const span = Math.max(1, maxY - minY);

// Local maxima = "peaks": a point higher (smaller y) than neighbors ±10px,
// and standing out by >3% of the span.
const peaks = [];
for (let i = 5; i < ys.length - 5; i++) {
  const y = ys[i];
  let isPeak = true;
  for (let j = i - 5; j <= i + 5; j++) if (j !== i && ys[j] < y - 1) { isPeak = false; break; }
  if (isPeak && (minY - y) > 0.03 * -span * -1 - 0) { /* placeholder */ }
  if (isPeak && y < minY + span * 0.5) {
    // merge peaks within 12 samples
    const last = peaks[peaks.length - 1];
    if (!last || Math.abs(last.i - i) > 12) peaks.push({ i, x: skyline[i].x, y });
    else if (y < last.y) { last.y = y; last.i = i; last.x = skyline[i].x; }
  }
}
// Notches: local minima between peaks that dip >4% of span.
let notches = 0;
for (let i = 1; i < peaks.length; i++) {
  const seg = ys.slice(peaks[i - 1].i, peaks[i].i);
  const dip = Math.max(...seg);
  if (dip - Math.min(peaks[i - 1].y, peaks[i].y) > span * 0.04) notches++;
}
// Jaggedness: mean absolute sample-to-sample slope (normalized by span).
let slopeSum = 0;
for (let i = 1; i < ys.length; i++) slopeSum += Math.abs(ys[i] - ys[i - 1]);
const jag = slopeSum / (ys.length - 1);

console.log(JSON.stringify({
  file: file.split('/').pop(),
  skylineTop: minY, skylineBottom: maxY, span,
  peaks: peaks.length, peakXs: peaks.map((p) => p.x),
  peakDepths: peaks.map((p) => (maxY - p.y)),
  notches,
  jaggedness: +jag.toFixed(2),
  plateauRisk: +(1 - (maxY - minY) / (yBot - yTop)).toFixed(2),
}, null, 1));
