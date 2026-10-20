/** Stage 1 verification: reproduce SKILL_STOPS resolution + report final
 * positions, spacing, clearance, and popup-id resolvability. */
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

const SIGN_TREE_OBSTACLES = (() => {
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
  for (const [x, z] of framing) {
    if (Math.abs(x - pathCenterX(z)) < 5.5) continue;
    trees.push({ x, z });
    rnd(); rnd();
  }
  return trees;
})();
const SIGN_ROCK_CLUSTERS = [[-9, -20], [10, 5], [-18, 30], [16, 55], [-14, 88]];

function clearSignPosition(zStation, side) {
  const dir = side === 'left' ? -1 : 1;
  for (let attempt = 0; attempt < 9; attempt++) {
    const z = zStation + attempt * 1.5;
    const x = pathCenterX(z) + dir * 6.2;
    let clear = true;
    for (const t of SIGN_TREE_OBSTACLES) {
      if (Math.hypot(t.x - x, t.z - z) < 3.5) { clear = false; break; }
    }
    if (clear) {
      for (const [cx, cz] of SIGN_ROCK_CLUSTERS) {
        if (Math.hypot(cx - x, cz - z) < 7) { clear = false; break; }
      }
    }
    if (clear) return { x, z };
  }
  return { x: pathCenterX(zStation) + dir * 6.2, z: zStation };
}

const ids = ['git', 'docker', 'health-checks', 'compose', 'ci-cd', 'terraform', 'ansible'];
const titles = { git: 'Git', docker: 'Docker', 'health-checks': 'Health Checks', compose: 'Docker Compose', 'ci-cd': 'CI/CD', terraform: 'Terraform / AWS', ansible: 'Ansible' };
const stations = [[12,'left'],[24,'right'],[36,'left'],[48,'right'],[60,'left'],[74,'right'],[88,'left']];

console.log('Resolved SKILL_STOPS (what the browser will render):');
let prevZ = 0;
const positions = [];
for (let i = 0; i < stations.length; i++) {
  const [zs, side] = stations[i];
  const pos = clearSignPosition(zs, side);
  const dFromPath = Math.abs(pos.x - pathCenterX(pos.z)) - pathHalfWidth(pos.z);
  // Yaw the sign renders with
  const eps = 1.5;
  const tangent = Math.atan2(pathCenterX(pos.z + eps) - pathCenterX(pos.z - eps), 2 * eps);
  const sideTilt = side === 'left' ? -0.42 : 0.42;
  const yawDeg = ((Math.PI + tangent * 0.6 + sideTilt) * 180 / Math.PI).toFixed(1);
  const spacing = i === 0 ? pos.z : pos.z - prevZ;
  prevZ = pos.z;
  positions.push(pos);
  console.log(
    `${ids[i].padEnd(13)} "${titles[ids[i]]}" | x=${pos.x.toFixed(2)} z=${pos.z.toFixed(1)} ${side.toUpperCase()} | ` +
    `clear of path edge by ${dFromPath.toFixed(2)}u | gap from prev sign ${spacing.toFixed(1)}u | yaw ${yawDeg}°`
  );
}
const firstGap = positions[0].z - 0; // spawn z=0
console.log(`\nFirst sign is ${firstGap}u down-path from spawn (requirement: >=12u, unobstructed start)`);
const minGap = Math.min(...positions.slice(1).map((p, i) => p.z - positions[i].z));
console.log(`Min gap between consecutive signs: ${minGap.toFixed(1)}u`);

// Approach yaw sanity: camera at spawn looks +Z; sign faces should be within
// 90° of facing the camera (|yaw - 180°| < 90° means face toward -Z player).
for (let i = 0; i < stations.length; i++) {
  const [zs, side] = stations[i];
  const pos = clearSignPosition(zs, side);
  const eps = 1.5;
  const tangent = Math.atan2(pathCenterX(pos.z + eps) - pathCenterX(pos.z - eps), 2 * eps);
  const yaw = Math.PI + tangent * 0.6 + (side === 'left' ? -0.42 : 0.42);
  let deg = (yaw * 180 / Math.PI) % 360;
  if (deg < 0) deg += 360;
  const offFromApproach = Math.abs(deg - 180);
  console.log(`${ids[i].padEnd(13)} yaw=${deg.toFixed(1)}° (off approach-facing 180° by ${offFromApproach.toFixed(1)}°)`);
}
