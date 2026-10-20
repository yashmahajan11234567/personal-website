/** Visual verification: compare with and without post-processing */
import { chromium } from 'playwright';
import { createReadStream } from 'fs';
import { PNG } from 'pngjs';

const browser = await chromium.launch({ 
  headless: false,
  args: ['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
  console.log(`  [${log.type}] ${log.text}`);
});
page.on('pageerror', err => {
  console.log(`  [error] ${err.message}`);
});

// Navigate to cloud-world
await page.goto('http://localhost:5195/#/cloud-world');
await page.waitForTimeout(3000);
await page.waitForTimeout(5000);

console.log('\n=== Step 1: Capture WITH post-processing (effects enabled) ===');
await page.screenshot({ path: 'qa-screenshots/pp-enabled.png', fullPage: true });
console.log('Screenshot saved: pp-enabled.png');

await page.screenshot({ path: 'qa-screenshots/current-with-effects.png', fullPage: true });
console.log('\nCaptured current state with effects: current-with-effects.png');

console.log('\n=== Comparing current (with effects) vs baseline (no effects) ===');

async function compareImages(baselinePath, currentPath, label) {
  return new Promise((resolve) => {
    const baselineStream = createReadStream(baselinePath);
    const currentStream = createReadStream(currentPath);
    
    const baselinePng = new PNG();
    const currentPng = new PNG();
    
    let baselineDone = false;
    let currentDone = false;
    
    baselineStream.pipe(baselinePng);
    currentStream.pipe(currentPng);
    
    baselinePng.on('parsed', () => { baselineDone = true; checkDone(); });
    currentPng.on('parsed', () => { currentDone = true; checkDone(); });
    
    function checkDone() {
      if (!baselineDone || !currentDone) return;
      
      if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
        console.log(`  ${label}: Size mismatch!`);
        resolve({ different: true, reason: 'size mismatch' });
        return;
      }
      
      let pixelDiffCount = 0;
      let maxDiff = 0;
      
      for (let y = 0; y < baselinePng.height; y++) {
        for (let x = 0; x < baselinePng.width; x++) {
          const idx = (baselinePng.width * y + x) << 2;
          
          const r1 = baselinePng.data[idx];
          const g1 = baselinePng.data[idx + 1];
          const b1 = baselinePng.data[idx + 2];
          const a1 = baselinePng.data[idx + 3];
          
          const r2 = currentPng.data[idx];
          const g2 = currentPng.data[idx + 1];
          const b2 = currentPng.data[idx + 2];
          const a2 = currentPng.data[idx + 3];
          
          const dr = Math.abs(r1 - r2);
          const dg = Math.abs(g1 - g2);
          const db = Math.abs(b1 - b2);
          const da = Math.abs(a1 - a2);
          
          const maxChannelDiff = Math.max(dr, dg, db, da);
          maxDiff = Math.max(maxDiff, maxChannelDiff);
          
          if (maxChannelDiff > 2) { 
            pixelDiffCount++;
          }
        }
      }
      
      const totalPixels = baselinePng.width * baselinePng.height;
      const diffPercent = (pixelDiffCount / totalPixels) * 100;
      
      console.log(`\n=== ${label} ===`);
      console.log(`  Different: ${pixelDiffCount > 0}`);
      console.log(`  Pixel diffs: ${pixelDiffCount} / ${totalPixels} (${diffPercent.toFixed(4)}%)`);
      console.log(`  Max channel diff: ${maxDiff}/255`);
      
      if (pixelDiffCount > 0) {
        console.log(`  >>> EFFECTS ARE VISIBLE! <<<`);
      } else {
        console.log(`  >>> NO VISUAL DIFFERENCE - Effects not rendering <<<`);
      }
      resolve({ pixelDiffCount, totalPixels, diffPercent, maxDiff });
    }
  });
}

console.log('\n=== Step 1: Capture WITH post-processing (effects enabled) ===');
await page.screenshot({ path: 'qa-screenshots/pp-enabled.png', fullPage: true });
console.log('Screenshot saved: pp-enabled.png');

await page.screenshot({ path: 'qa-screenshots/current-with-effects.png', fullPage: true });
console.log('\nCaptured current state with effects: current-with-effects.png');

console.log('\n=== Comparing current (with effects) vs baseline (no effects) ===');
await compareImages(
  'qa-screenshots-baseline/beat-00-open.png',
  'qa-screenshots/current-with-effects.png',
  'beat-00-open: baseline vs current (with effects)'
);

await browser.close();
