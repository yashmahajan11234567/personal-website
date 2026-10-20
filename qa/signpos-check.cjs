// Compute the ACTUAL PROJECTS signPos: clearSignPosition(88, 'left') with
// the real tree/rock scatter (offset 11.5), mirroring world.ts exactly.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
function getTrees() {
  const rnd = mulberry32(1337);
  const trees = [];
  let attempts = 0;
  while (trees.length < 90 && attempts < 4000) {
    attempts++;
    const z = -105 + rnd() * 345;
    const x = (rnd() * 2 - 1) * 125;
    if (Math.hypot(x, z - 60) < 18) continue;
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    trees.push({ x, z });
    rnd(); rnd(); rnd();
  }
  const framing = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
  for (const [x, z] of framing) {
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    trees.push({ x, z });
    rnd(); rnd();
  }
  return trees;
}
const SIGN_ROCK_CLUSTERS = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];
function clearSignPosition(zStation, side, offset = 11.5) {
  const dir = side === 'left' ? -1 : 1;
  const trees = getTrees();
  for (let attempt = 0; attempt < 9; attempt++) {
    const z = zStation + attempt * 1.5;
    const x = pathCenterX(z) + dir * offset;
    let clear = true;
    for (const t of trees) { if (Math.hypot(t.x - x, t.z - z) < 3.5) { clear = false; break; } }
    if (clear) {
      for (const [cx, cz] of SIGN_ROCK_CLUSTERS) { if (Math.hypot(cx - x, cz - z) < 7) { clear = false; break; } }
    }
    if (clear) return { x, z, attempt };
  }
  return { x: pathCenterX(zStation) + dir * offset, z: zStation, attempt: -1 };
}
const pos = clearSignPosition(88, 'left');
console.log('PROJECTS signPos:', JSON.stringify(pos));
// Skill stations too:
const st = [[16, 'left'], [29, 'right'], [44, 'left'], [62, 'right'], [74, 'left'], [88, 'right'], [96, 'left']];
for (const [z, s] of st) {
  const p = clearSignPosition(z, s);
  console.log(`skill z=${z} ${s} → x=${p.x.toFixed(2)} z=${p.z.toFixed(2)} (attempt ${p.attempt})`);
}
