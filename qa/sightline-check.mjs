// Sight-line check for the PROJECTS sign at its CURRENT placement
// (left side, 6.5u offset) from every approach distance.
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
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}
const rnd = mulberry32(1337);
const trees = [];
let attempts = 0;
while (trees.length < 90 && attempts < 4000) {
  attempts++;
  const z = -105 + rnd() * 345;
  const x = (rnd() * 2 - 1) * 125;
  if (Math.hypot(x, z - 60) < 18) continue;
  if (Math.abs(x - pathCenterX(z)) < 5.5) continue;
  trees.push({ x, z });
  rnd(); rnd(); rnd();
}
const framing = [[-9, -12], [8, -8], [-10, -4], [9, 2], [-8, 6], [10, 10]];
for (const [x, z] of framing) { trees.push({ x, z }); rnd(); rnd(); }

function clearSign(zStation, offset) {
  for (let a = 0; a < 9; a++) {
    const z = zStation + a * 1.5;
    const x = pathCenterX(z) + offset;
    let clear = true;
    for (const t of trees) if (Math.hypot(t.x - x, t.z - z) < 3.5) { clear = false; break; }
    if (clear) return { x, z };
  }
  return { x: pathCenterX(zStation) + offset, z: zStation };
}
const sign = clearSign(88, -6.5);
console.log('PROJECTS sign (left, 6.5u):', { x: +sign.x.toFixed(2), z: sign.z });
for (const backZ of [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40]) {
  const camZ = sign.z - backZ;
  const camX = pathCenterX(camZ);
  let blocker = null;
  for (let s = 0; s <= 1; s += 0.02) {
    const px = camX + (sign.x - camX) * s;
    const pz = camZ + (sign.z - camZ) * s;
    for (const t of trees) {
      if (Math.hypot(t.x - px, t.z - pz) < 2.4) { blocker = { t, s }; break; }
    }
    if (blocker) break;
  }
  const angle = Math.abs(Math.atan2(sign.x - camX, sign.z - camZ) * 180 / Math.PI);
  console.log(
    `  cam z=${camZ}: ${blocker ? `BLOCKED @(${blocker.t.x.toFixed(1)},${blocker.t.z.toFixed(1)})` : 'clear'} | ${angle.toFixed(1)}° off-axis (FOV ±25°)`
  );
}
