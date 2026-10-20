const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isDarkText = ([r, g, b]) => r < 75 && g < 60 && b < 50;
const cols = [];
for (let x = 0; x < W; x += 20) {
  let n = 0;
  for (let y = +process.argv[3]; y < +process.argv[4]; y += 4) { if (isDarkText(at(x, y))) n++; }
  if (n > 5) cols.push(x + ':' + n);
}
console.log('dark cols:', cols.join(' '));
