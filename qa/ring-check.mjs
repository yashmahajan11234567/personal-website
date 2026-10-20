// Orange ground-ring detection for the sunset zone screenshot.
import { chromium } from 'playwright';
import fs from 'fs';

async function analyze(file) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('about:blank');
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  const result = await page.evaluate(async (url) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { width: W, height: H } = c;
    const d = ctx.getImageData(0, 0, W, H).data;
    // Saturated warm orange anywhere below the horizon band (y > 45% H),
    // excluding the top-right UI exit button area.
    let ring = 0;
    const rows = [];
    for (let y = Math.floor(H * 0.45); y < H; y += 2) {
      let rowHits = 0;
      for (let x = 0; x < W; x += 2) {
        const i = (y * W + x) * 4;
        const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
        if (r > 200 && g > 100 && g < 200 && b < 120) { ring++; rowHits++; }
      }
      if (rowHits > 3) rows.push(y);
    }
    return { ringPx: ring, yRange: rows.length ? [rows[0], rows[rows.length - 1]] : null };
  }, dataUrl);
  await browser.close();
  return result;
}

const r = await analyze('qa-screenshots-v2/j6-sunset-entry.png');
console.log('sunset-entry ring pixels:', JSON.stringify(r));
const r2 = await analyze('qa-screenshots-v2/j7-sunset-rings.png');
console.log('sunset-rings shot ring pixels:', JSON.stringify(r2));
