const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isDarkText = ([r, g, b]) => r < 75 && g < 60 && b < 50;
const rows = [];
for (let y = 0; y < H; y += 10) {
  let n = 0;
  for (let x = 0; x < W; x += 4) { if (isDarkText(at(x, y))) n++; }
  if (n > 8) rows.push(y + ':' + n);
}
console.log('dark rows:', rows.join(' '));
