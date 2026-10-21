const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isCream = ([r, g, b]) => r > 200 && g > 185 && b > 140 && b < 235;
let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isCream(at(x, y))) continue;
  n++;
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
}
console.log('cream bbox:', n > 100 ? `${minX},${minY}..${maxX},${maxY} (${n}px)` : `only ${n}px`);
