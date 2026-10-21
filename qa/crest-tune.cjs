// Silhouette composition tuner: compute crestLine, footprint width, and the
// projected elevation angles from the approach cameras, so the new profile
// is designed against the frame geometry (vFOV 50°, half 25°) rather than
// by eye. Prints a per-z profile table.
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---- candidate crestLine (asymmetric skewed peaks + ridge noise) ----
const skew = (z0, h, sl, sr) => (z) =>
  h * (z <= z0 ? Math.exp(-((z - z0) ** 2) / (2 * sl * sl)) : Math.exp(-((z - z0) ** 2) / (2 * sr * sr)));
const pMain = skew(150, 54, 15, 24);   // main summit z=150, sharp front, long back tail
const pLeft = skew(122, 26, 10, 13);   // left secondary peak (notch before summit)
const pRight = skew(170, 34, 15, 19);   // right shoulder beyond the exit
const pBrow = skew(97, 8, 7, 7);       // gentle brow rise (facade + floor carry the face)
const crestLine = (z) => Math.max(0,
  pMain(z) + pLeft(z) + pRight(z) + pBrow(z)
  + 3.5 * Math.sin(z * 0.23 + 1.7) + 2.2 * Math.sin(z * 0.41 + 0.4));

// ---- profile table ----
console.log('z   crest  hw    note');
for (let z = 58; z <= 186; z += 4) {
  const c = crestLine(z);
  const t = Math.min(1, c / 48);
  const hw = 88 - (88 - 30) * t; // 88 foot -> 30 at summit
  const floorE = 32 * ss(84, 92, z) * (1 - ss(103, 114, z));
  const floorX = 30 * ss(158, 166, z) * (1 - ss(174, 184, z));
  const notes = [];
  if (floorE > 1) notes.push('ENTfloor ' + floorE.toFixed(0));
  if (floorX > 1) notes.push('EXITfloor ' + floorX.toFixed(0));
  console.log(String(z).padStart(3), c.toFixed(1).padStart(6), hw.toFixed(0).padStart(5), ' ', notes.join(' '));
}

// ---- sight-line checks from the approach cameras (eye 6.5u) ----
const rayY = (camZ, camY, z0, y0, z) => camY + (y0 - camY) * (z - camZ) / (z0 - camZ);
const checks = [
  ['approach pin z=44 (eye 6.5)', 44, 6.5],
  ['mid-valley z=25', 25, 6.5],
  ['spawn z=0', 0, 7.5],
];
const targets = [
  ['sign top   (28u @ z=93)', 93, 28],
  ['facade top (30u @ z=99)', 99, 30],
  ['left peak  (26u @ z=122)', 122, 26],
  ['summit     (54u @ z=150)', 150, 54],
  ['rt shoulder(34u @ z=170)', 170, 34],
];
console.log('\nelevation angles (deg) — frame top is +25°:');
for (const [nm, camZ, camY] of checks) {
  const row = [];
  for (const [tn, tz, ty] of targets) {
    const el = Math.atan((ty - camY) / (tz - camZ)) * 180 / Math.PI;
    row.push(`${tn.split(' ')[0]}:${el.toFixed(1)}`);
  }
  console.log(nm.padEnd(28), row.join('  '));
}
// does the summit clear the sight line over the sign top?
for (const camZ of [0, 25, 44]) {
  const y = rayY(camZ, camY(camZ), 93, 28, 150);
  console.log(`cam z=${camZ}: ray over sign top reaches ${y.toFixed(1)}u at z=150 (summit 54 → clearance ${(54 - y).toFixed(1)}u)`);
}
function camY(z) { return z === 0 ? 7.5 : 6.5; }
