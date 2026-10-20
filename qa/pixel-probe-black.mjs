// Pixel probe: quantify near-black pixels in the mountain region of a screenshot.
// Usage: node qa/pixel-probe-black.mjs <png-path>
// Near-black = r,g,b all < 30. Reports percentage over the full frame and over
// the central band (x 20%-80%) where the mountain lives.
import fs from 'fs';
import { PNG } from 'pngjs';

const path = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(path));
const { width: W, height: H, data } = png;
let black = 0, blackBand = 0, bandTotal = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isBlack = r < 30 && g < 30 && b < 30;
    if (isBlack) {
      black++;
      if (x >= W * 0.2 && x <= W * 0.8) blackBand++;
    }
    if (x >= W * 0.2 && x <= W * 0.8) bandTotal++;
  }
}
console.log(`${path}`);
console.log(`  near-black full frame: ${(black / (W * H) * 100).toFixed(3)}%`);
console.log(`  near-black central band: ${(blackBand / bandTotal * 100).toFixed(3)}%`);
