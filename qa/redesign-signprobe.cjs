
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-redesign/06-mountain-frontal.png'));
const { width, height, data } = png;
let woodPx = 0, textPx = 0, haloPx = 0;
for (let y = 0; y < height; y += 2) {
  for (let x = 0; x < width; x += 2) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i+1], b = data[i+2];
    if (Math.abs(r-139)<25 && Math.abs(g-94)<25 && Math.abs(b-52)<25) { woodPx++; }
    if (r<70 && g<50 && b<35 && r>25) { textPx++; }
    if (r>235 && g>225 && b>180 && b<235) { haloPx++; }
  }
}
console.log(JSON.stringify({ woodPx, textPx, haloPx, width, height }));
