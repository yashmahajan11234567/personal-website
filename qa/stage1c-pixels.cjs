/** Pixel probe v2: sign board + wrapped title detection, board-anchored.
 * The camera is PINNED with the sign centered, so the board occupies the
 * center of the frame. We find the board as the largest connected wood-
 * colored region reachable from the frame center (flood fill), then
 * measure dark-text inside that region only. */
const fs = require('fs');
const { PNG } = require('pngjs');

function probe(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width: W, height: H, data } = png;
  const at = (x, y) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const isWood = ([r, g, b]) => Math.abs(r - 139) < 55 && Math.abs(g - 94) < 50 && Math.abs(b - 52) < 45 && r > g && g > b;
  const isDarkText = ([r, g, b]) => r < 75 && g < 60 && b < 50;

  // Flood fill the board from the frame center (pinned cam guarantees the
  // board covers the center).
  const seen = new Uint8Array(W * H);
  const stack = [[Math.floor(W / 2), Math.floor(H / 2)]];
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, boardPixels = 0;
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = y * W + x;
    if (seen[k]) continue;
    seen[k] = 1;
    if (!isWood(at(x, y))) continue;
    boardPixels++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  if (boardPixels < 5000) {
    console.log('  board not found at center (pixels=' + boardPixels + ')');
    return false;
  }
  const bw = maxX - minX, bh = maxY - minY;

  // Text inside the board region only.
  let tMinX = 1e9, tMaxX = -1, tMinY = 1e9, tMaxY = -1, textCount = 0;
  const rowText = new Array(H).fill(0);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const k = y * W + x;
      if (!seen[k]) continue;
      if (isDarkText(at(x, y))) {
        textCount++;
        rowText[y]++;
        if (x < tMinX) tMinX = x;
        if (x > tMaxX) tMaxX = x;
        if (y < tMinY) tMinY = y;
        if (y > tMaxY) tMaxY = y;
      }
    }
  }
  const bands = [];
  let run = 0;
  for (let y = tMinY; y <= tMaxY + 1; y++) {
    if (rowText[y] > 3) run++;
    else if (run > 0) { bands.push(run); run = 0; }
  }
  const mL = tMinX - minX, mR = maxX - tMaxX, mT = tMinY - minY, mB = maxY - tMaxY;
  console.log('  board: ' + minX + ',' + minY + '..' + maxX + ',' + maxY + ' (' + bw + 'x' + bh + ', px=' + boardPixels + ')');
  console.log('  text : ' + textCount + 'px at ' + tMinX + ',' + tMinY + '..' + tMaxX + ',' + tMaxY);
  console.log('  margins L/R/T/B: ' + mL + '/' + mR + '/' + mT + '/' + mB);
  console.log('  bands: ' + JSON.stringify(bands));
  const pass = textCount > 1500 && mL > 6 && mR > 6 && mT > 3 && mB > 3 && bands.length >= 2;
  console.log(pass ? '  TEXT PROBE PASS (2+ wrapped lines, inside board)' : '  TEXT PROBE FAIL');
  return pass;
}

const files = process.argv.slice(2);
let allPass = true;
for (const f of files) {
  console.log('--- ' + f);
  if (!probe(f)) allPass = false;
}
console.log(allPass ? 'ALL TEXT PROBES PASS' : 'PROBE FAILURES — review');
