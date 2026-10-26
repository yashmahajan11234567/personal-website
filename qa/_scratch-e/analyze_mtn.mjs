import fs from 'fs';
import { PNG } from 'pngjs';
const files = fs.readdirSync('.').filter(f=>f.startsWith('f171406')||f.startsWith('f144628'));
for (const f of files.sort()) {
  const png = PNG.sync.read(fs.readFileSync(f));
  const {width,height,data} = png;
  let sky=0, brownFlat=0, dark=0, cream=0;
  for (let y=0;y<height;y++) {
    for (let x=0;x<width;x++) {
      const i=(y*width+x)*4; const r=data[i],g=data[i+1],b=data[i+2];
      // sky-like (warm sky measured earlier ~rgb(218,170,99))
      if (r>190 && g>150 && b>80 && b<160 && r>g && g>b) sky++;
      // cream billboard
      if (r>240 && g>210 && b>120 && b<180) cream++;
      // dark brown/black
      if (r<60 && g<45 && b<35) dark++;
      // warm brown "flat" large surfaces - look for uniform brown bands
      if (r>100 && r<170 && g>70 && g<120 && b>40 && b<80 && Math.abs(r-g)<40) {
        // check if it's in upper/mid area where mountain mass would be
        if (y < height*0.7) brownFlat++;
      }
    }
  }
  const area=width*height;
  console.log(f+': sky='+(sky/area*100).toFixed(1)+'% cream='+(cream/area*100).toFixed(1)+'% dark='+(dark/area*100).toFixed(1)+'% brownMidUpper='+(brownFlat/area*100).toFixed(1)+'%');
}
