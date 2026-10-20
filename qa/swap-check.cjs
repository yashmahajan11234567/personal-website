function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
function getTrees() {
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
  return trees;
}
const trees = getTrees();
const ROCKS = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];
for (const [z, side] of [[88, 'left'], [96, 'right']]) {
  const x = pathCenterX(z) + (side === 'left' ? -1 : 1) * 11.5;
  const blockers = [];
  for (const t of trees) { if (Math.hypot(t.x - x, t.z - z) < 3.5) blockers.push('tree@' + t.x.toFixed(1) + ',' + t.z.toFixed(1)); }
  for (const [cx, cz] of ROCKS) { if (Math.hypot(cx - x, cz - z) < 7) blockers.push('rock d=' + Math.hypot(cx - x, cz - z).toFixed(1)); }
  console.log(side, z, 'x=' + x.toFixed(2), blockers.join(' | ') || 'CLEAR');
}
