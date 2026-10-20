const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const cols = [];
for (let x = 0; x < W; x += 20) {
  let n = 0;
  for (let y = 0; y < 14; y += 2) { const c = at(x, y); if (c[0] < 75 && c[1] < 60 && c[2] < 50) n++; }
  if (n > 2) cols.push(x + ':' + n);
}
console.log('row0 dark cols:', cols.join(' ') || 'none');
