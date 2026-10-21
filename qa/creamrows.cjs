const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isCream = ([r, g, b]) => r > 200 && g > 185 && b > 140 && b < 235;
const rows = {};
for (let y = 0; y < H; y++) {
  let n = 0;
  for (let x = 0; x < W; x += 3) { if (isCream(at(x, y))) n++; }
  if (n > 8) rows[y] = n;
}
console.log('cream rows:', Object.keys(rows).join(','));
