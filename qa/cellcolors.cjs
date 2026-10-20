const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const x0 = +process.argv[3], x1 = +process.argv[4], y0 = +process.argv[5], y1 = +process.argv[6], step = +process.argv[7];
for (let y = y0; y < y1; y += step) {
  const row = [];
  for (let x = x0; x < x1; x += step) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y; yy < y + step && yy < H; yy += 5) for (let xx = x; xx < x + step && xx < W; xx += 5) { const c = at(xx, yy); r += c[0]; g += c[1]; b += c[2]; n++; }
    row.push(Math.round(r / n) + ',' + Math.round(g / n) + ',' + Math.round(b / n));
  }
  console.log(y, row.join(' | '));
}
