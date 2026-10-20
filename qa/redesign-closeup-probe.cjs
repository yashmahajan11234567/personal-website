
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-redesign/09-face-closeup.png'));
const { width, height, data } = png;
let woodPx = 0, textPx = 0, haloPx = 0;
let minX=1e9,maxX=-1,minY=1e9,maxY=-1;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i+1], b = data[i+2];
    // distinct sign-board wood (#8B5E34) — mountain face is #C9A075 (lighter)
    if (Math.abs(r-139)<18 && Math.abs(g-94)<18 && Math.abs(b-52)<18) {
      woodPx++;
      if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
    }
    if (r<75 && g<52 && b<38 && r>25) textPx++;
    if (r>235 && g>225 && b>175 && b<240) haloPx++;
  }
}
console.log(JSON.stringify({ woodPx, textPx, haloPx, woodBox: woodPx>50 ? {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY} : null, w: width, h: height }));
