// Flood-fill sky-connectivity hole detector: any TRUE-sky-colored pixel NOT
// connected to the top sky band (4-connected flood from row 0) and larger than
// 20px is an isolated bright patch inside the mountain band y 15%..70% —
// i.e. a candidate hole. Skyline notches (connected to sky) are NOT holes.
import { PNG } from 'pngjs';
import fs from 'fs';

const files = ['qa-screenshots-v9-final/seethru-full.png', 'qa-screenshots-v9-final/seethru-full-oblique.png'];
for (const file of files) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const W = png.width, H = png.height, D = png.data;
  // TRUE sky gradient of the RECON build: saturated orange (measured 218-236,170-186,99-112).
  const isTrueSky = (r, g, b) => r > 205 && g > 160 && b > 80 && b < 0.55 * r && g < 0.85 * r && g > 0.7 * r;
  const label = new Int32Array(W * H).fill(-1);
  const q = [];
  for (let x = 0; x < W; x++) {
    const i = x * 4;
    if (isTrueSky(D[i], D[i + 1], D[i + 2])) { label[x] = 0; q.push(x); }
  }
  let head = 0;
  while (head < q.length) {
    const idx = q[head++]; const x = idx % W, y = (idx - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const ni = ny * W + nx;
      if (label[ni] === -1 && isTrueSky(D[ni * 4], D[ni * 4 + 1], D[ni * 4 + 2])) { label[ni] = 0; q.push(ni); }
    }
  }
  const y0 = Math.round(H * 0.15), y1 = Math.round(H * 0.70);
  const seen = new Uint8Array(W * H);
  let holeCount = 0; const report = [];
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    if (seen[idx] || label[idx] !== -1) continue;
    if (!isTrueSky(D[idx * 4], D[idx * 4 + 1], D[idx * 4 + 2])) continue;
    const bq = [idx]; seen[idx] = 1;
    let n = 0, minX = x, maxX = x, minY = y, maxY = y;
    while (bq.length) {
      const i2 = bq.pop(); n++;
      const x2 = i2 % W, y2 = (i2 - x2) / W;
      if (x2 < minX) minX = x2; if (x2 > maxX) maxX = x2; if (y2 < minY) minY = y2; if (y2 > maxY) maxY = y2;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx2 = x2 + dx, ny2 = y2 + dy;
        if (nx2 < 0 || nx2 >= W || ny2 < 0 || ny2 >= H) continue;
        const ni2 = ny2 * W + nx2;
        if (!seen[ni2] && label[ni2] === -1 && isTrueSky(D[ni2 * 4], D[ni2 * 4 + 1], D[ni2 * 4 + 2])) { seen[ni2] = 1; bq.push(ni2); }
      }
    }
    if (n >= 20) { holeCount++; report.push({ x: minX, y: minY, w: maxX - minX, h: maxY - minY, n }); }
  }
  console.log(file.split('/').pop() + ' -> ISOLATED sky patches inside rock band: ' + holeCount);
  report.slice(0, 6).forEach((c) => console.log('   ' + JSON.stringify(c)));
}
