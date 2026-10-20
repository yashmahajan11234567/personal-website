// Offline port of Vegetation.tsx scatter math (exact rnd consumption order)
// to compute the 40 deterministic flower placements + framing pine spots for
// QA camera aiming. Mirrors world.ts functions verbatim (types stripped).
import fs from 'fs';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
function pathHalfWidth(z) {
  return 2.6 + Math.sin(z * 0.07) * 0.7 + 0.5 * Math.sin(z * 0.023 + 1.3);
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell =
    2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) +
    1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium =
    0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) +
    0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const towardMountains = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + towardMountains * 2.2;
}

function getTreeSpecs() {
  const rnd = mulberry32(1337);
  const specs = [];
  let attempts = 0;
  while (specs.length < 90 && attempts < 4000) {
    attempts++;
    const z = -105 + rnd() * 345;
    const x = (rnd() * 2 - 1) * 125;
    const dist = Math.hypot(x, z - 60);
    if (dist < 18) continue;
    const d = Math.abs(x - pathCenterX(z));
    if (d < 5.5) continue;
    const y = terrainHeight(x, z);
    let scale;
    if (z > 150) scale = 0.55 + rnd() * 0.35;
    else if (Math.abs(x) > 55 || z < -60) scale = 0.6 + rnd() * 0.5;
    else scale = 0.95 + rnd() * 0.75;
    specs.push({ x, z, y, scale, rotY: rnd() * Math.PI * 2, kind: rnd() < 0.35 ? 'broadleaf' : 'pine' });
  }
  const framing = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
  for (const [x, z] of framing) {
    if (Math.abs(x - pathCenterX(z)) < 5.5) continue;
    specs.push({ x, z, y: terrainHeight(x, z), scale: 1.45 + rnd() * 0.15, rotY: rnd() * Math.PI * 2, kind: 'pine', framing: true });
  }
  return specs;
}

// ---- RocksAndGrass consumption (seed 4242), exact order ----
const rnd = mulberry32(4242);
const clusterCenters = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];
let placedRocks = 0;
const rocks = [];
for (const [cx, cz] of clusterCenters) {
  const n = 3 + Math.floor(rnd() * 4);
  for (let r = 0; r < n && placedRocks < 80; r++) {
    const x = cx + (rnd() * 2 - 1) * 4.5;
    const z = cz + (rnd() * 2 - 1) * 4.5;
    const d = Math.abs(x - pathCenterX(z));
    if (d < 3.6) continue;
    const sc = 0.4 + rnd() * 1.1;
    rnd(); rnd(); rnd(); // euler
    placedRocks++;
    rocks.push({ x: +x.toFixed(2), z: +z.toFixed(2), sc: +sc.toFixed(2) });
  }
}

// tufts
let ti = 0, guard = 0;
const tufts = [];
while (ti < 220 && guard < 1500) {
  guard++;
  const z = -100 + rnd() * 330;
  const x = (rnd() * 2 - 1) * 115;
  const d = Math.abs(x - pathCenterX(z));
  if (d < 2.9) continue;
  const sc = 0.6 + rnd() * 0.8;
  rnd(); // euler rotY
  ti++;
  tufts.push({ x: +x.toFixed(2), z: +z.toFixed(2) });
}

// shrubs (needs tree specs for indexing)
const treeSpecs = getTreeSpecs();
let si = 0; guard = 0;
const shrubs = [];
while (si < 120 && guard < 800) {
  guard++;
  const t = treeSpecs[Math.floor(rnd() * treeSpecs.length)];
  const x = t.x + (rnd() * 2 - 1) * 2.8;
  const z = t.z + (rnd() * 2 - 1) * 2.8;
  const d = Math.abs(x - pathCenterX(z));
  if (d < 3.0) continue;
  const sc = 0.45 + rnd() * 0.45;
  rnd(); // euler rotY
  si++;
  shrubs.push({ x: +x.toFixed(2), z: +z.toFixed(2) });
}

// flowers — the placements Stage 2 (plan Stage 3) must preserve exactly
let fi = 0; guard = 0;
const flowers = [];
while (fi < 40 && guard < 400) {
  guard++;
  const z = -30 + rnd() * 255;
  const side = rnd() < 0.5 ? -1 : 1;
  const d = pathHalfWidth(z) + 0.6 + rnd() * 1.8;
  const x = pathCenterX(z) + side * d;
  const y = terrainHeight(x, z);
  const sc = 0.7 + rnd() * 0.5;
  rnd(); rnd(); rnd(); // euler
  flowers.push({
    i: fi, x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3),
    sc: +sc.toFixed(3), pal: fi % 3,
  });
  fi++;
}

// cluster flowers within 2.8u -> pick verification targets in z 0..90
const clusters = [];
const used = new Set();
for (const f of flowers) {
  if (used.has(f.i)) continue;
  const group = flowers.filter((g) => !used.has(g.i) && Math.hypot(g.x - f.x, g.z - f.z) < 2.8);
  group.forEach((g) => used.add(g.i));
  clusters.push({ n: group.length, cx: group.reduce((a, b) => a + b.x, 0) / group.length, cy: group.reduce((a, b) => a + b.y, 0) / group.length, cz: group.reduce((a, b) => a + b.z, 0) / group.length, members: group });
}
const inValley = clusters.filter((c) => c.cz > 0 && c.cz < 90).sort((a, b) => b.n - a.n);

const framingPines = treeSpecs.filter((t) => t.framing).map((t) => ({ x: t.x, z: t.z, y: +terrainHeight(t.x, t.z).toFixed(2), scale: +t.scale.toFixed(3) }));

const out = {
  counts: { rocks: rocks.length, tufts: tufts.length, shrubs: shrubs.length, flowers: flowers.length, guardStops: { tuftGuard: guard } },
  flowers, clusters: clusters.map((c) => ({ n: c.n, cx: +c.cx.toFixed(2), cy: +c.cy.toFixed(2), cz: +c.cz.toFixed(2) })),
  valleyClusters: inValley.slice(0, 4).map((c) => ({ n: c.n, cx: +c.cx.toFixed(2), cy: +c.cy.toFixed(2), cz: +c.cz.toFixed(2), members: c.members.map((m) => [m.x, m.y, m.z]) })),
  framingPines,
};
fs.writeFileSync('qa/stage2-placements.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.counts));
console.log('valley clusters (n, cx, cy, cz):');
inValley.slice(0, 4).forEach((c) => console.log(`  n=${c.n} at (${c.cx.toFixed(1)}, ${c.cy.toFixed(1)}, ${c.cz.toFixed(1)})`));
console.log('framing pines:', JSON.stringify(framingPines));
