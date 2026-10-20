
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-redesign/09-face-closeup.png'));
const { width, height, data } = png;
function px(x, y) { const i = (y * width + x) * 4; return [data[i], data[i+1], data[i+2]]; }
const samples = [];
for (let fy = 0.3; fy <= 0.7; fy += 0.2) {
  for (let fx = 0.35; fx <= 0.65; fx += 0.15) {
    samples.push({ x: Math.round(width*fx), y: Math.round(height*fy), rgb: px(Math.round(width*fx), Math.round(height*fy)) });
  }
}
console.log(JSON.stringify(samples));
