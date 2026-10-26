// NUMVERIFY: replicate MountainPassage crestHeight + world math exactly,
// print cross-sections to verify the flank-wall / slab / carve relationships.
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  const amp = 1 - 0.75 * canyon;
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * amp;
}
const TUNNEL_Z0 = 100, TUNNEL_Z1 = 170, BORE_R = 5.2, ROOF_CROWN = 6.2, CORRIDOR_EDGE = 6.5, PEAK_H = 52;
const skew = (z0, h, sl, sr) => (z) => h * (z <= z0 ? Math.exp(-((z - z0) ** 2) / (2 * sl * sl)) : Math.exp(-((z - z0) ** 2) / (2 * sr * sr)));
const pBrow = skew(97, 9, 8, 8), pLeft = skew(120, 38, 10, 13), pMain = skew(150, PEAK_H, 10, 13), pRight = skew(178, 36, 14, 18);
const ridgeNoise = (z) => (3.5 * Math.sin(z * 0.23 + 1.7) + 2.0 * Math.sin(z * 0.41 + 0.4)) * smoothstep(90, 104, z);
const crestLine = (z) => Math.max(0, Math.max(pBrow(z), pLeft(z), pMain(z), pRight(z)) + ridgeNoise(z));
const halfWidthAt = (_z, crest) => { const t = Math.min(1, Math.max(0, crest / PEAK_H)); return 88 - (88 - 30) * t; };
function crestHeight(z, x) {
  const cx = pathCenterX(z);
  const corridorDist = Math.abs(x - cx);
  const crest = crestLine(z);
  if (corridorDist === 0) return crest;
  const fallAmt = 0.55 + 0.25 * smoothstep(150, 200, z);
  const spur = 1 + 0.35 * Math.sin(z * 0.19 + x * 0.16) + 0.2 * Math.sin(z * 0.37 - x * 0.31);
  const latFall = Math.min(1.15, (1 - fallAmt * Math.pow(corridorDist / halfWidthAt(z, crest), 1.5)) * spur);
  const inTunnel = z >= TUNNEL_Z0 && z <= TUNNEL_Z1;
  if (inTunnel && corridorDist < CORRIDOR_EDGE) { const t = 1 - corridorDist / CORRIDOR_EDGE; return ROOF_CROWN * t * t; }
  if (!inTunnel && corridorDist < CORRIDOR_EDGE) return 0;
  const lift = 1 - Math.pow((corridorDist - CORRIDOR_EDGE) / Math.max(1, CORRIDOR_EDGE * 2.2), 2);
  const flank = crest * latFall * Math.min(1, Math.max(0, lift));
  const MOUTH_FLOOR = 18;
  const floorZ = MOUTH_FLOOR * smoothstep(84, 92, z) * (1 - smoothstep(103, 114, z));
  const floor = floorZ * Math.min(1, (corridorDist - CORRIDOR_EDGE) / 2);
  const EXIT_FLOOR = 26;
  const floorX = EXIT_FLOOR * smoothstep(158, 166, z) * (1 - smoothstep(174, 184, z));
  const floorExit = floorX * Math.min(1, (corridorDist - CORRIDOR_EDGE) / 2);
  return Math.max(flank, floor, floorExit);
}
console.log('== MASSIF CROSS-SECTIONS (height above ground by lateral offset from path center) ==');
for (const z of [80, 92, 97, 103, 120, 135, 150, 165, 175, 182]) {
  const cx = pathCenterX(z);
  const offs = [0, 4.4, 5.2, 6.5, 7, 8, 10, 14, 21, 28.5, 31];
  const row = offs.map(o => `${o}:${crestHeight(z, cx + o).toFixed(1)}`).join('  ');
  console.log(`z=${String(z).padStart(3)} crest=${crestLine(z).toFixed(1).padStart(5)} hw=${halfWidthAt(z, crestLine(z)).toFixed(0)}  ${row}`);
}
console.log('\n== WHAT occludes the mouth from the approach (z=92..108 slab vs arch at 99.8) ==');
console.log('faceMesh: zStart=mountZ-5.5 =', (100 - 2.5 - 5.5), ' zEnd=mountZ+6 =', (100 - 2.5 + 6), ' crest=17 const, halfWidth=13, edgeFloor=0.6');
const t0 = 0, t1 = 1;
for (const z of [92, 96, 100, 104, 108.5]) {
  const tt = (z - 92) / 16.5;
  const rawEnv = Math.sin(Math.PI * Math.min(1, Math.max(0.04, tt))) ** 0.8;
  const env = 0.6 + rawEnv * 0.4;
  console.log(`  slab z=${z}: centerline height = 17*env*jitter ≈ ${(17 * env).toFixed(1)}u (arch crown is 7.3u, tube rim top ≈ ${(5.2 + 2.5 + 1.8).toFixed(1)}u)`);
}
console.log('\n== CAMERA CLAMP GATES ==');
console.log('clamp engages at cam.z >', 100 - 2 - 3, '(CANYON_Z0-2 = 95); facade slab occupies z 92..108.5');
console.log('avatar-canyon gate (followDist 9.5) at avatar z > 97');
console.log('\n== BORE SHELL vs MASSIF CARVE (ceiling continuity) ==');
console.log('shell: half-cyl r=4.8 centered floor+0.2 -> crown', (4.8 + 0.2), 'u; massif carve crown 6.2u at centerline, 0.4u at |dx|=4.4');
console.log('shell z span: segs at z=102..170 (translate +2, len 4.4) -> covers 100..172.2; massif carve z span: 100..170 only');
console.log('=> above the path, z 170..186: massif height =', crestHeight(175, pathCenterX(175)), '(open air); lintel box fills 7..14u at z 168..174 only');
