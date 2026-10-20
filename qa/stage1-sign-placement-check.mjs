/** Stage 1 offline placement check: reproduce deterministic scatter (trees,
 * rocks) and verify candidate skill-sign positions are clear of them, spaced,
 * and not behind the path. Mirrors Vegetation.tsx logic exactly. */
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

// --- Trees (getTreeSpecs order-exact) ---
const rnd = mulberry32(1337);
const trees = [];
let attempts = 0;
while (trees.length < 90 && attempts < 4000) {
  attempts++;
  const z = -105 + rnd() * 345;
  const x = (rnd() * 2 - 1) * 125;
  const dist = Math.hypot(x, z - 60);
  if (dist < 18) continue;
  const d = Math.abs(x - pathCenterX(z));
  if (d < 5.5) continue;
  let scale;
  if (z > 150) scale = 0.55 + rnd() * 0.35;
  else if (Math.abs(x) > 55 || z < -60) scale = 0.6 + rnd() * 0.5;
  else scale = 0.95 + rnd() * 0.75;
  trees.push({ x, z, scale, rotY: rnd() * Math.PI * 2, kind: rnd() < 0.35 ? 'broad' : 'pine' });
}
const framing = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
for (const [x, z] of framing) {
  trees.push({ x, z, scale: 1.45 + rnd() * 0.15, rotY: rnd() * Math.PI * 2, kind: 'pine' });
}

// --- Rocks (RocksAndGrass order-exact: rocks are placed first) ---
const rrnd = mulberry32(4242);
const rocks = [];
const clusterCenters = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];
let placedRocks = 0;
for (const [cx, cz] of clusterCenters) {
  const n = 3 + Math.floor(rrnd() * 4);
  for (let r = 0; r < n && placedRocks < 80; r++) {
    const x = cx + (rrnd() * 2 - 1) * 4.5;
    const z = cz + (rrnd() * 2 - 1) * 4.5;
    const d = Math.abs(x - pathCenterX(z));
    if (d < 3.6) continue;
    const sc = 0.4 + rrnd() * 1.1;
    rrnd(); rrnd(); rrnd(); // euler rotations (consumed but irrelevant here)
    rocks.push({ x, z, sc });
    placedRocks++;
  }
}

// --- Candidate sign stations ---
const STATIONS = [12, 24, 36, 48, 60, 74, 88];
const OFFSET = 6.2;
const signs = STATIONS.map((z, i) => {
  const side = i % 2 === 0 ? -1 : 1; // left, right, ...
  const x = pathCenterX(z) + side * OFFSET;
  return { z, x, side };
});

console.log('Sign placement check (offset', OFFSET + 'u from path centerline):');
let allOk = true;
for (const s of signs) {
  const dPath = Math.abs(s.x - pathCenterX(s.z)) - pathHalfWidth(s.z);
  let minTree = 1e9, treeAt = null;
  for (const t of trees) {
    const d = Math.hypot(t.x - s.x, t.z - s.z);
    if (d < minTree) { minTree = d; treeAt = t; }
  }
  let minRock = 1e9, rockAt = null;
  for (const r of rocks) {
    const d = Math.hypot(r.x - s.x, r.z - s.z);
    if (d < minRock) { minRock = d; rockAt = r; }
  }
  const ok = minTree > 3.5 && minRock > 2.5 && dPath > 0.8;
  if (!ok) allOk = false;
  console.log(
    `z=${String(s.z).padStart(3)} x=${s.x.toFixed(2).padStart(7)} ${s.side < 0 ? 'L' : 'R'} | ` +
    `dist past path edge: ${dPath.toFixed(2)}u | nearest tree ${minTree.toFixed(2)}u` +
    (minTree < 3.5 ? ` ⚠ (${treeAt.kind} @${treeAt.x.toFixed(1)},${treeAt.z.toFixed(1)})` : '') +
    ` | nearest rock ${minRock.toFixed(2)}u` +
    (minRock < 2.5 ? ` ⚠ (@${rockAt.x.toFixed(1)},${rockAt.z.toFixed(1)})` : '') +
    ` | ${ok ? 'OK' : 'NUDGE'}`
  );
}
console.log(allOk ? 'ALL STATIONS CLEAR' : 'SOME STATIONS NEED NUDGING');
