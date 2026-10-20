
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-redesign/09-face-closeup.png'));
const { width, height, data } = png;
function px(x, y) { const i = (y * width + x) * 4; return [data[i], data[i+1], data[i+2]]; }
// Center 300x200 region histogram: classify each pixel
const counts = { wood: 0, faceRock: 0, darkText: 0, cream: 0, sky: 0, other: 0 };
for (let y = height/2 - 100; y < height/2 + 100; y += 2) {
  for (let x = width/2 - 150; x < width/2 + 150; x += 2) {
    const [r, g, b] = px(Math.round(x), Math.round(y));
    if (Math.abs(r-139)<20 && Math.abs(g-94)<20 && Math.abs(b-52)<20) counts.wood++;
    else if (Math.abs(r-201)<25 && Math.abs(g-160)<25 && Math.abs(b-117)<25) counts.faceRock++;
    else if (r<80 && g<55 && b<40) counts.darkText++;
    else if (r>230 && g>220 && b>170) counts.cream++;
    else if (r>200 && g>150 && b<140) counts.sky++;
    else counts.other++;
  }
}
console.log(JSON.stringify(counts));
