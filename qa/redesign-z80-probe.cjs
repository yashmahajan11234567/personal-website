
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync('qa-screenshots-redesign/seq-z80-approach.png'));
function px(x, y) { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i+1], png.data[i+2]]; }
const s = [];
for (const [x, y] of [[713, 60], [713, 100], [713, 140], [650, 80], [780, 80], [713, 26]]) {
  s.push({ at: [x, y], rgb: px(x, y) });
}
console.log(JSON.stringify(s));
