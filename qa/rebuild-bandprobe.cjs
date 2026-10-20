
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-polish/c6-frontal.png'));
const { width, height, data } = png;
// For each column band (every 40px), count bright-sky pixels vs dark pixels in
// the vertical middle strip (y 200..700) where the mountain lives.
const bands = [];
for (let x0 = 0; x0 < width; x0 += 40) {
  let sky = 0, dark = 0, rock = 0, total = 0;
  for (let y = 150; y < 750; y += 3) {
    for (let x = x0; x < Math.min(x0 + 40, width); x += 3) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      total++;
      // sky/fog: bright warm, high R, medium G, low B, luminance high
      if (r > 200 && g > 150 && b < 160) sky++;
      // near-black: all channels < 40
      else if (r < 40 && g < 40 && b < 40) dark++;
      else rock++;
    }
  }
  bands.push({ x: x0, skyPct: Math.round(sky/total*100), darkPct: Math.round(dark/total*100) });
}
console.log(JSON.stringify(bands.filter(b => b.skyPct > 12 || b.darkPct > 18)));
