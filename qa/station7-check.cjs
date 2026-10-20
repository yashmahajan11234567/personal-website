// Full constraint check for a candidate 7th-skill station z=78 RIGHT
// (and a couple of nearby fallbacks), against trees/rocks/signs/domes.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) { const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z)); return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon); }
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
function getTrees() {
  const rnd = mulberry32(1337);
  const trees = []; let att = 0;
  while (trees.length < 90 && att < 4000) {
    att++;
    const z = -105 + rnd() * 345;
    const x = (rnd() * 2 - 1) * 125;
    if (Math.hypot(x, z - 60) < 18) continue;
    if (Math.abs(x - pathCenterX(z)) < 6.5) continue;
    trees.push({ x, z }); rnd(); rnd(); rnd();
  }
  const fr = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
  for (const [x, z] of fr) { if (Math.abs(x - pathCenterX(z)) < 6.5) continue; trees.push({ x, z }); rnd(); rnd(); }
  return trees;
}
const trees = getTrees();
const ROCKS = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];
// other signs' spots (with billboard at 72R 9.5 and stations 16..88 + terraform 88R)
const otherSigns = [
  { x: pathCenterX(16) - 11.5, z: 16 }, { x: pathCenterX(29) + 11.5, z: 29 },
  { x: pathCenterX(44) - 11.5, z: 44 }, { x: pathCenterX(62) + 11.5, z: 62 },
  { x: pathCenterX(74) - 11.5, z: 74 }, { x: pathCenterX(88) + 11.5, z: 88 },
  { x: pathCenterX(72) + 9.5, z: 72 }, // billboard
];
// mountain domes (seed 99 replica)
const rnd99 = mulberry32(99);
const BORE_R = 5.2, DISP = 1.22, CM = 1.15, TZ0 = 100, TZ1 = 170;
const domes = [];
function clears(d) {
  for (let z = TZ0 - 2; z <= TZ1 + 2; z += 2) {
    const cx = pathCenterX(z), gy = terrainHeight(cx, z);
    for (const dx of [0, -(BORE_R - 0.8), BORE_R - 0.8]) for (const h of [0.5, 2.5, 4.5]) {
      const nx = (cx + dx - d.x) / (d.sx * DISP), ny = (gy + h - d.y) / (d.sy * DISP), nz = (z - d.z) / (d.sz * DISP);
      if (nx * nx + ny * ny + nz * nz < CM * CM) return false;
    }
  }
  return true;
}
function clearDome(d) {
  const o = { ...d }; let g = 0;
  while (!clears(o) && g++ < 60) {
    if (o.y < terrainHeight(o.x, o.z) + o.sy * 0.18 + 8) { const c = pathCenterX(o.z); o.x += o.x >= c ? 1.2 : -1.2; } else { o.y += 1.2; }
  }
  return o;
}
for (let z = 96; z <= 174; z += 6.5) {
  const cx = pathCenterX(z);
  for (const side of [-1, 1]) {
    const sx = 16 + rnd99() * 8, sy = 14 + rnd99() * 10, sz = 9 + rnd99() * 5, dz = (rnd99() - 0.5) * 2.5;
    const ground = terrainHeight(cx, z); const off = sx * DISP + BORE_R + 2.0;
    domes.push(clearDome({ x: cx + side * off, y: ground + sy * 0.18, z: z + dz, sx, sy, sz }));
  }
}
for (let i = 0; i < 10; i++) {
  const z = 104 + i * 7, cx = pathCenterX(z);
  const lift = 1 - Math.abs(z - 137) / 40;
  const sx = 13 + rnd99() * 6, sy = 10 + rnd99() * 6, sz = 10 + rnd99() * 4, jx = (rnd99() - 0.5) * 6;
  const ground = terrainHeight(cx, z);
  domes.push(clearDome({ x: cx + jx, y: ground + 4.5 + CM * sy * DISP + lift * 10 + rnd99() * 4, z, sx, sy, sz }));
}
for (const pz of [TZ0 - 3, TZ1 + 3]) {
  const cx = pathCenterX(pz);
  for (const side of [-1, 1]) {
    const sx = 12 + rnd99() * 4, sy = 12 + rnd99() * 6, sz = 10 + rnd99() * 4;
    const ground = terrainHeight(cx, pz); const off = sx * DISP + BORE_R + 1.0;
    domes.push(clearDome({ x: cx + side * off, y: ground + 6 + rnd99() * 5, z: pz, sx, sy, sz }));
  }
}
for (const pz of [TZ0 - 1, TZ1 + 1]) {
  const cx = pathCenterX(pz);
  for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
    const sx = 6.5 + rnd99() * 2.5, sy = 6 + rnd99() * 3, sz = 8 + rnd99() * 3;
    const ground = terrainHeight(cx, pz); const off = sx * DISP + BORE_R + 0.6;
    domes.push(clearDome({ x: cx + side * off, y: ground + 1.5 + k * 4.5 + rnd99() * 1.5, z: pz + (rnd99() - 0.5) * 3, sx, sy, sz }));
  }
}
for (const pz of [TZ0, TZ1]) {
  const cx = pathCenterX(pz); const ground = terrainHeight(cx, pz);
  for (let a = -60; a <= 240; a += 30) {
    const rad = a * Math.PI / 180; const ringR = 9.2 + rnd99() * 1.2; const s = 2.0 + rnd99() * 1.2;
    domes.push(clearDome({ x: cx + Math.cos(rad) * ringR, y: ground + 0.4 + Math.sin(rad) * ringR * 0.85, z: pz + (rnd99() - 0.5) * 2.4, sx: s, sy: s, sz: s }));
  }
}

for (const zCand of [78, 79, 80, 82]) {
  const x = pathCenterX(zCand) + 11.5;
  const probs = [];
  for (const t of trees) if (Math.hypot(t.x - x, t.z - zCand) < 3.5) probs.push(`tree(${t.x.toFixed(1)},${t.z.toFixed(1)}) d=${Math.hypot(t.x - x, t.z - zCand).toFixed(1)}`);
  for (const [cx, cz] of ROCKS) if (Math.hypot(cx - x, cz - zCand) < 7) probs.push(`rock(${cx},${cz}) d=${Math.hypot(cx - x, cz - zCand).toFixed(1)}`);
  for (const s of otherSigns) { const dz = Math.abs(s.z - zCand), dx = Math.abs(s.x - x); if (dz < 8 && dx < 13) probs.push(`sign(${s.x.toFixed(1)},${s.z}) dz=${dz} dx=${dx.toFixed(1)}`); }
  const by = terrainHeight(x, zCand) + 8.7;
  let worst = 1e9;
  for (const d of domes) {
    const nx = (x - d.x) / d.sx, ny = (by - d.y) / d.sy, nz = (zCand - d.z) / d.sz;
    const v = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (v < worst) worst = v;
  }
  console.log(`z=${zCand}R x=${x.toFixed(2)}:`, probs.length ? probs.join(' ; ') : 'clear', `| dome worst=${worst.toFixed(2)} ${worst >= 1 ? '✅' : '❌'}`);
}
