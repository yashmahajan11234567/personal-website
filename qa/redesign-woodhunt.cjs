
const { PNG } = require('pngjs');
const fs = require('fs');
const files = ['10-board-direct','seq-z80-approach','12-vista-fixed','07-tunnel-entrance'];
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(`qa-screenshots-redesign/${f}.png`));
  const { width, height, data } = png;
  let blob = 0, minX=1e9,maxX=-1,minY=1e9,maxY=-1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      // exact-ish sign wood under near-white light: r 100-160, g 60-110, b 30-75, r>g>b
      if (r>100 && r<170 && g>60 && g<115 && b>28 && b<80 && r>g && g>b) { blob++; if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y; }
    }
  }
  console.log(f, JSON.stringify({blob, box: blob>200?{minX,minY,maxX,maxY}:null}));
}
