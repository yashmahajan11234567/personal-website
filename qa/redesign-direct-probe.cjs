
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-redesign/10-board-direct.png'));
const { width, height } = png;
function px(x, y) { const i = (y * width + x) * 4; return [png.data[i], png.data[i+1], png.data[i+2]]; }
// Center grid
const s = [];
for (const fy of [0.35, 0.5, 0.65]) for (const fx of [0.4, 0.5, 0.6]) {
  const x = Math.round(width*fx), y = Math.round(height*fy);
  s.push({ at: [x, y], rgb: px(x, y) });
}
console.log(JSON.stringify(s));
