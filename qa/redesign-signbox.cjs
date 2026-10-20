
const { PNG } = require('pngjs');
const fs = require('fs');
function scan(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  let minX=1e9,maxX=-1,minY=1e9,maxY=-1,count=0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      // wood tone (sign board): #8B5E34
      if (Math.abs(r-139)<25 && Math.abs(g-94)<25 && Math.abs(b-52)<25) {
        count++;
        if(x<minX)minX=x; if(x>maxX)maxX=x;
        if(y<minY)minY=y; if(y>maxY)maxY=y;
      }
    }
  }
  return {count, box: count? {minX,minY,maxX,maxY} : null};
}
console.log('frontal:', JSON.stringify(scan('qa-screenshots-redesign/06-mountain-frontal.png')));
console.log('entrance:', JSON.stringify(scan('qa-screenshots-redesign/07-tunnel-entrance.png')));
