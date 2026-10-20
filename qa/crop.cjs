const fs = require('fs');
const { PNG } = require('pngjs');
const png = PNG.sync.read(fs.readFileSync(process.argv[2]));
const { width: W, height: H, data } = png;
const cx0 = +process.argv[3], cy0 = +process.argv[4], cx1 = +process.argv[5], cy1 = +process.argv[6];
const out = new PNG({ width: cx1 - cx0, height: cy1 - cy0 });
for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) {
  const i = (y * W + x) * 4, j = ((y - cy0) * (cx1 - cx0) + (x - cx0)) * 4;
  out.data[j] = data[i]; out.data[j + 1] = data[i + 1]; out.data[j + 2] = data[i + 2]; out.data[j + 3] = 255;
}
const outPath = process.argv[7];
fs.writeFileSync(outPath, PNG.sync.write(out));
console.log('saved', outPath, out.width, 'x', out.height);
