import fs from 'fs';
import { PNG } from 'pngjs';
function classify(r,g,b){
  if (r>200&&g>160&&b>80&&b<170&&r>g&&g>b) return 'S'; // sky warm
  if (r>235&&g>205&&b>110&&b<190) return 'C';           // cream (billboard)
  if (r<60&&g<45&&b<35) return '#';                     // near-black
  if (r<95&&g<70&&b<55) return 'k';                      // dark brown
  if (r>=95&&r<175&&g>=65&&g<125&&b<85&&r>g&&g>b) {     // mid brown rock
    return (r-g>35)?'B':'b';                            // B=warm brown, b=muted
  }
  if (g>r&&g>b) return 'g';                              // green vegetation
  if (r>175&&g>150&&b>110) return 'w';                   // light sand
  return '.';
}
const file = process.argv[2];
const cols = parseInt(process.argv[3]||'100');
const png = PNG.sync.read(fs.readFileSync(file));
const {width,height,data} = png;
const rows = Math.round(cols*height/width*0.55);
let out='';
for (let gy=0; gy<rows; gy++){
  let line='';
  for (let gx=0; gx<cols; gx++){
    const x0=Math.floor(gx*width/cols), x1=Math.floor((gx+1)*width/cols);
    const y0=Math.floor(gy*height/rows), y1=Math.floor((gy+1)*height/rows);
    const counts={};
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const i=(y*width+x)*4;
      const c=classify(data[i],data[i+1],data[i+2]);
      counts[c]=(counts[c]||0)+1;
    }
    let best='.',bn=0;
    for(const k in counts) if(counts[k]>bn){bn=counts[k];best=k;}
    line+=best;
  }
  out+=line+'\n';
}
console.log('=== '+file+' ===');
console.log(out);
