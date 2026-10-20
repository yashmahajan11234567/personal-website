function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
const rnd = mulberry32(1337);
const trees = [];
let att = 0;
while (trees.length < 90 && att < 4000) {
  att++;
  const z = -105 + rnd() * 345;
  const x = (rnd() * 2 - 1) * 125;
  if (Math.hypot(x, z - 60) < 18) continue;
  if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
  trees.push({ x, z });
  rnd(); rnd(); rnd();
}
const fr = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
for (const [x, z] of fr) { if (Math.abs(x - pathCenterX(z)) < 6.5) continue; trees.push({ x, z }); rnd(); rnd(); }

function sightBlockers(camX, camZ, signX, signZ, margin) {
  const seg = Math.hypot(signX - camX, signZ - camZ);
  const out = [];
  for (const t of trees) {
    const t2 = ((t.x - camX) * (signX - camX) + (t.z - camZ) * (signZ - camZ)) / (seg * seg);
    if (t2 < 0 || t2 > 1) continue;
    const px = camX + t2 * (signX - camX), pz = camZ + t2 * (signZ - camZ);
    const d = Math.hypot(t.x - px, t.z - pz);
    if (d < margin) out.push(`tree(${t.x.toFixed(1)},${t.z.toFixed(1)}) d=${d.toFixed(2)} at ${(t2 * 100).toFixed(0)}% of segment`);
  }
  return out;
}
// cam pins used in the approach shots → PROJECTS sign (-12.46, 95.5)
for (const [camX, camZ] of [[0, 70], [-2, 76], [-5, 82], [-8, 90]]) {
  const b = sightBlockers(camX, camZ, -12.46, 95.5, 4.5);
  console.log(`cam(${camX},${camZ}) → PROJECTS:`, b.length ? b.join(' ; ') : 'clear');
}
// also from the actual path centerline (player positions)
for (const z of [70, 76, 82, 88]) {
  const camX = pathCenterX(z);
  const b = sightBlockers(camX, z, -12.46, 95.5, 4.5);
  console.log(`path(z=${z}, x=${camX.toFixed(1)}) → PROJECTS:`, b.length ? b.join(' ; ') : 'clear');
}
