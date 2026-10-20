const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isDarkText = ([r, g, b]) => r < 75 && g < 60 && b < 50;
const cell = 100;
const rows = {};
for (let cy = 0; cy < H; cy += cell) for (let cx = 0; cx < W; cx += cell) {
  let n = 0;
  for (let y = cy; y < Math.min(cy + cell, H); y += 4) for (let x = cx; x < Math.min(cx + cell, W); x += 4) { if (isDarkText(at(x, y))) n++; }
  if (n > 10) { const r = cy / cell, c = cx / cell; (rows[r] = rows[r] || []).push(c + ':' + n); }
}
for (const r of Object.keys(rows).sort((a, b) => a - b)) console.log('row', r, rows[r].join(' '));
