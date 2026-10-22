// VIS-002 verification: replay the flower loop WITH the exclusion guard and
// assert 0 flowers inside z (92,178), total 40, plus outdoor distribution.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
function pathHalfWidth(z) { return 2.6 + Math.sin(z * 0.07) * 0.7 + 0.5 * Math.sin(z * 0.023 + 1.3); }
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

const rnd = mulberry32(4242);
const TUNNEL_Z0 = 100, TUNNEL_Z1 = 170;
// rocks
const clusterCenters = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];
let placedRocks = 0;
for (const [cx0, cz0] of clusterCenters) {
  const n = 3 + Math.floor(rnd() * 4);
  for (let r = 0; r < n && placedRocks < 80; r++) {
    const x = cx0 + (rnd() * 2 - 1) * 4.5;
    const z = cz0 + (rnd() * 2 - 1) * 4.5;
    const d = Math.abs(x - pathCenterX(z));
    if (d < 6.0) continue;
    rnd(); rnd(); rnd(); rnd(); rnd(); rnd();
    placedRocks++;
  }
}
// tufts
let ti = 0, guard = 0;
while (ti < 220 && guard < 1500) {
  guard++;
  const z = -100 + rnd() * 330;
  const x = (rnd() * 2 - 1) * 115;
  const d = Math.abs(x - pathCenterX(z));
  if (d < 2.9) continue;
  rnd(); rnd();
  ti++;
}
// shrubs (needs tree specs for x,z — same as _tmp-vis002-map)
function treeSpecs() {
  const r2 = mulberry32(1337);
  const specs = [];
  let attempts = 0;
  while (specs.length < 90 && attempts < 4000) {
    attempts++;
    const z = -105 + r2() * 345;
    const x = (r2() * 2 - 1) * 125;
    const dist = Math.hypot(x, z - 60);
    if (dist < 18) continue;
    const d = Math.abs(x - pathCenterX(z));
    if (d < 6.5) continue;
    let scale;
    if (z > 150) scale = 0.55 + r2() * 0.35;
    else if (Math.abs(x) > 55 || z < -60) scale = 0.6 + r2() * 0.5;
    else scale = 0.95 + r2() * 0.75;
    specs.push({ x, z, scale, rotY: r2() * Math.PI * 2, kind: r2() < 0.35 ? 1 : 0 });
  }
  const framing = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
  for (const [x, z] of framing) {
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    specs.push({ x, z, scale: 1.45 + r2() * 0.15, rotY: r2() * Math.PI * 2 });
  }
  return specs;
}
const trees = treeSpecs();
let si = 0; guard = 0;
while (si < 120 && guard < 800) {
  guard++;
  const t = trees[Math.floor(rnd() * trees.length)];
  const x = t.x + (rnd() * 2 - 1) * 2.8;
  const z = t.z + (rnd() * 2 - 1) * 2.8;
  const d = Math.abs(x - pathCenterX(z));
  if (d < 4.2) continue;
  rnd(); rnd();
  si++;
}
// flowers WITH the exclusion guard
const flowers = [];
let fi = 0; guard = 0;
while (fi < 40 && guard < 400) {
  guard++;
  const z = -30 + rnd() * 255;
  if (z > 92 && z < 178) continue; // VIS-002 guard
  const side = rnd() < 0.5 ? -1 : 1;
  const d = pathHalfWidth(z) + 0.6 + rnd() * 1.8;
  const x = pathCenterX(z) + side * d;
  const sc = 0.7 + rnd() * 0.5;
  rnd(); rnd(); rnd();
  fi++;
  flowers.push({ x, z, d });
}
const inWindow = flowers.filter((f) => f.z > 92 && f.z < 178);
const inBore = flowers.filter((f) => f.z > TUNNEL_Z0 && f.z < TUNNEL_Z1);
const nearExitApron = flowers.filter((f) => f.z >= 168 && f.z <= 184);
const valley = flowers.filter((f) => f.z <= 92).length;
const sunset = flowers.filter((f) => f.z >= 178).length;
console.log(`flowers total: ${flowers.length} (guard draws used: ${guard})`);
console.log(`inside canyon window z(92,178): ${inWindow.length}  (must be 0)`);
console.log(`inside bore z(100,170): ${inBore.length}  (must be 0)`);
console.log(`near exit apron z 168..184: ${nearExitApron.length}  (must be 0)`);
console.log(`valley-side flowers kept: ${valley}   sunset-side kept: ${sunset}`);
if (flowers.length === 40 && inWindow.length === 0) console.log('VIS-002 REPLAY: PASS');
else console.log('VIS-002 REPLAY: FAIL');
