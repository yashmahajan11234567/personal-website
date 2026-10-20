
const { PNG } = require('pngjs');
const fs = require('fs');
function cyanScan(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  let minX=1e9,maxX=-1,minY=1e9,maxY=-1,count=0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      // cyan glow even at low intensity: blue-dominant, green-mid
      if (b > 120 && b > r + 40 && g > 80 && g < b + 30) {
        count++;
        if(x<minX)minX=x; if(x>maxX)maxX=x;
        if(y<minY)minY=y; if(y>maxY)maxY=y;
      }
    }
  }
  return {count, box: count? {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY} : null};
}
for (const f of ['01-valley-approach','06-mountain-frontal','07-tunnel-entrance']) {
  console.log(f, JSON.stringify(cyanScan(`qa-screenshots-redesign/${f}.png`)));
}
