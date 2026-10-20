
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-polish/c7-frontal.png'));
const { width, height, data } = png;
const bands = [];
for (let x0 = 0; x0 < width; x0 += 40) {
  let sky = 0, dark = 0, total = 0;
  for (let y = 150; y < 750; y += 3) {
    for (let x = x0; x < Math.min(x0 + 40, width); x += 3) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      total++;
      if (r > 200 && g > 150 && b < 160) sky++;
      else if (r < 40 && g < 40 && b < 40) dark++;
    }
  }
  bands.push({ x: x0, skyPct: Math.round(sky/total*100), darkPct: Math.round(dark/total*100) });
}
console.log(JSON.stringify(bands.filter(b => b.skyPct > 12 || b.darkPct > 18)));
