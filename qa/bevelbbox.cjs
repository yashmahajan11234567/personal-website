const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isBevel = ([r, g, b]) => Math.abs(r - 169) < 25 && Math.abs(g - 119) < 25 && Math.abs(b - 72) < 30 && r > g && g > b;
let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, n = 0;
for (let y = 200; y < 800; y++) for (let x = 0; x < W; x++) {
  if (isBevel(at(x, y))) { n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
}
console.log('bevel px:', n, 'bbox', minX + ',' + minY + '..' + maxX + ',' + maxY);
