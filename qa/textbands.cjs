const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const at = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const isDarkText = ([r, g, b]) => r < 75 && g < 60 && b < 50;
let prev = false;
const bands = [];
for (let y = 300; y < 800; y++) {
  let n = 0;
  for (let x = 0; x < W; x += 3) { if (isDarkText(at(x, y))) n++; }
  const band = n > 6;
  if (band && !prev) bands.push([y]);
  else if (!band && prev) bands[bands.length - 1].push(y);
  prev = band;
}
console.log('text bands y:', JSON.stringify(bands));
let minX = 1e9, maxX = -1;
for (let y = 350; y < 750; y++) for (let x = 0; x < W; x++) {
  if (isDarkText(at(x, y))) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
}
console.log('text x-span:', minX, '..', maxX);
