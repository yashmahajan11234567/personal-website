// Final silhouette numbers for the reconstruction (v2 — max-composed peaks).
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const skew = (z0, h, sl, sr) => (z) =>
  h * (z <= z0 ? Math.exp(-((z - z0) ** 2) / (2 * sl * sl)) : Math.exp(-((z - z0) ** 2) / (2 * sr * sr)));
const pBrow = skew(97, 9, 8, 8);
const pLeft = skew(120, 30, 11, 14);
const pMain = skew(150, 46, 15, 18);
const pRight = skew(178, 28, 16, 20);
const ridge = (z) => 3.5 * Math.sin(z * 0.23 + 1.7) + 2.0 * Math.sin(z * 0.41 + 0.4);
const crestLine = (z) => Math.max(0, Math.max(pBrow(z), pLeft(z), pMain(z), pRight(z)) + ridge(z) * ss(90, 104, z));

console.log('z   crest  hw  entFloor exitFloor');
for (let z = 58; z <= 210; z += 4) {
  const c = crestLine(z);
  const hw = 88 - (88 - 30) * Math.min(1, c / 46);
  const fE = 22 * ss(84, 92, z) * (1 - ss(103, 114, z));
  const fX = 26 * ss(158, 166, z) * (1 - ss(174, 184, z));
  console.log(String(z).padStart(3), c.toFixed(1).padStart(6), hw.toFixed(0).padStart(4),
    fE > 0.5 ? '  ent ' + fE.toFixed(0) : '', fX > 0.5 ? '  exit ' + fX.toFixed(0) : '');
}

// Elevation angles from approach eye positions (vFOV half = 25°)
const el = (camZ, camY, tz, ty) => Math.atan((ty - camY) / (tz - camZ)) * 180 / Math.PI;
console.log('\nelevations from normal approach (frame top +25°):');
for (const [nm, cz, cy] of [['approach z=44', 44, 6.5], ['mid z=25', 25, 6.5], ['spawn z=0', 0, 7.5]]) {
  console.log(nm.padEnd(15),
    'signTop16.5:', el(cz, cy, 93, 16.5).toFixed(1) + '°',
    'facade22:', el(cz, cy, 98, 22).toFixed(1) + '°',
    'left30:', el(cz, cy, 120, 30).toFixed(1) + '°',
    'summit46:', el(cz, cy, 150, 46).toFixed(1) + '°',
    'right28:', el(cz, cy, 178, 28).toFixed(1) + '°');
}
// summit clearance over the sign-top sight line
for (const cz of [0, 25, 44]) {
  const cy = cz === 0 ? 7.5 : 6.5;
  const yAt150 = cy + (16.5 - cy) * (150 - cz) / (93 - cz);
  console.log(`cam z=${cz}: ray over sign top @z150 = ${yAt150.toFixed(1)}u → summit clearance ${(46 - yAt150).toFixed(1)}u`);
}
// notch depths along the skyline (for jaggedness)
const line = [];
for (let z = 92; z <= 200; z += 2) line.push({ z, c: crestLine(z) });
const peaks = [];
for (let i = 2; i < line.length - 2; i++) {
  if (line[i].c >= line[i - 1].c && line[i].c >= line[i + 1].c && line[i].c > line[i - 2].c && line[i].c > line[i + 2].c) peaks.push(line[i]);
}
console.log('\nskyline local maxima:', peaks.map((p) => `z${p.z}:${p.c.toFixed(0)}u`).join('  '));
