// Horizon/sky detector: scan a column band to find where warm sky pixels
// (bright cream/gold/orange) vs rock. Prints per-row sky coverage.
const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
// Sky: bright warm (cream/gold) OR the pale-orange upper gradient.
const isSky = ([r, g, b]) => (r > 190 && g > 150 && b > 100 && r >= g) || (r > 230 && g > 180);
const rows = [];
for (let y = 0; y < 300; y += 5) {
  let n = 0, seen = 0;
  for (let x = 100; x < W - 100; x += 5) { seen++; if (isSky(at(x, y))) n++; }
  rows.push(`y${y}:${Math.round((n / seen) * 100)}%`);
}
console.log('sky coverage by row:', rows.join(' '));
