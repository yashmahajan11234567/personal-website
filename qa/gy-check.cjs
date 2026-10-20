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
const x = pathCenterX(88) - 6.5;
console.log('sign x', x.toFixed(2), 'gy', terrainHeight(x, 88).toFixed(2), 'board center y', (terrainHeight(x, 88) + 8.7).toFixed(2));
// also the clearSignPosition default offset 11.5 (from MountainPassage? it uses clearSignPosition(z,'left') default 11.5)
const x2 = pathCenterX(88) - 11.5;
console.log('with 11.5 offset: x', x2.toFixed(2), 'gy', terrainHeight(x2, 88).toFixed(2), 'board center', (terrainHeight(x2, 88) + (2.35 + 0.55) * 3.4).toFixed(2));
