import fs from 'fs';
import { PNG } from 'pngjs';
const file = process.argv[2];
const pts = process.argv.slice(3).map(p=>p.split(',').map(Number));
const png = PNG.sync.read(fs.readFileSync(file));
const {width,height,data} = png;
console.log(file+' '+width+'x'+height);
for (const [fx,fy] of pts) {
  const x=Math.floor(fx/100*width), y=Math.floor(fy/100*height);
  const i=(y*width+x)*4;
  console.log(`  (${fx}%,${fy}%) px(${x},${y}) rgb(${data[i]},${data[i+1]},${data[i+2]})`);
}
