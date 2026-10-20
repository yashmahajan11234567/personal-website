// Pixel-level anomaly checks for the passage + sunset screenshots.
// (Vision backend is saturated; these are targeted programmatic proxies.)
import fs from 'fs';

function decodePng(buf) {
  // Minimal PNG reader is overkill — use Chromium via Playwright instead.
  return null;
}
decodePng;

import { chromium } from 'playwright';

async function analyze(file, question) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('about:blank');
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  const result = await page.evaluate(async ([url, q]) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const W = img.width, H = img.height;

    if (q === 'blackClustersAboveHorizon') {
      // Count near-black (<28,28,28) pixel clusters in the upper 60% of frame.
      // Mountains/trees can be dark, so only flag near-BLACK (unlit geometry).
      const d = ctx.getImageData(0, 0, W, Math.floor(H * 0.6)).data;
      let black = 0, total = 0;
      for (let i = 0; i < d.length; i += 4) {
        total++;
        if (d[i] < 28 && d[i + 1] < 28 && d[i + 2] < 28) black++;
      }
      return { blackPct: +(100 * black / total).toFixed(3) };
    }

    if (q === 'orangeMarkers') {
      // Count saturated orange pixels (r>200, g 90-180, b<90) — project cubes.
      const d = ctx.getImageData(0, 0, W, H).data;
      let orange = 0;
      const clusters = [];
      let xs = [], ys = [];
      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const i = (y * W + x) * 4;
          if (d[i] > 200 && d[i + 1] > 90 && d[i + 1] < 180 && d[i + 2] < 90) {
            orange++;
            xs.push(x); ys.push(y);
          }
        }
      }
      return { orangePx: orange, centroid: xs.length ? [Math.round(xs.reduce((a,b)=>a+b)/xs.length), Math.round(ys.reduce((a,b)=>a+b)/ys.length)] : null };
    }

    if (q === 'cloudMotionPair') {
      return { note: 'handled separately' };
    }
    return null;
  }, [dataUrl, question]);
  await browser.close();
  return result;
}

const dir = 'qa-screenshots-v2';
console.log('passage black-above-horizon %:', JSON.stringify(await analyze(`${dir}/03-passage-approach.png`, 'blackClustersAboveHorizon')));
console.log('sunset orange markers:', JSON.stringify(await analyze(`${dir}/04-sunset-zone.png`, 'orangeMarkers')));
console.log('default black-above-horizon %:', JSON.stringify(await analyze(`${dir}/01-default.png`, 'blackClustersAboveHorizon')));
