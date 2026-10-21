// Compare mean color of each isolated sky-colored cluster against the
// interpolated sunset gradient at the same y (what a true hole would show).
import { PNG } from 'pngjs';
import fs from 'fs';

const file = 'qa-screenshots-v9-final/seethru-full.png';
const png = PNG.sync.read(fs.readFileSync(file));
const W = png.width, D = png.data;
const px = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };

// measured sky gradient (clean column x=1420): y100 (218,170,99) y220 (236,186,112)
const gradAt = (y) => {
  const t = Math.min(1, Math.max(0, (y - 100) / 120));
  return [218 + t * 18, 170 + t * 16, 99 + t * 13];
};
// clusters from the floodfill run (excluding billboard-face and bulb clusters already vision-confirmed)
const clusters = [
  { label: 'right-of-board A', x0: 1254, y0: 315, w: 27, h: 15 },
  { label: 'small sliver', x0: 557, y0: 297, w: 50, h: 7 },
];
for (const c of clusters) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = c.y0; y < c.y0 + c.h; y++) for (let x = c.x0; x < c.x0 + c.w; x++) {
    const [pr, pg, pb] = px(x, y); r += pr; g += pg; b += pb; n++;
  }
  const mean = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  const sky = gradAt(c.y0 + c.h / 2);
  const dist = Math.abs(mean[0] - sky[0]) + Math.abs(mean[1] - sky[1]) + Math.abs(mean[2] - sky[2]);
  console.log(`${c.label}: mean rgb(${mean}) vs sky-at-y${c.y0} rgb(${sky.map(Math.round)}) -> L1 distance ${dist} ${dist < 40 ? 'MATCHES SKY (real hole!)' : 'does NOT match sky'}`);
}
