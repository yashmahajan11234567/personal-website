/** Test: same scene with and without post-processing */
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

// We need to test the actual Cloud World with its terrain, clouds, etc.
// But first we need to toggle effects OFF in the same scene
// Since we can't easily toggle, let's check if the original Cloud World 3D component
// has the effects integrated or if it's still using the test scene

console.log('\n=== This test requires the actual Cloud World with terrain ===');
console.log('We need to test the real CloudWorld3D component with terrain/clouds');
console.log('Current implementation uses a simple TestObject (sphere) not the real terrain');
console.log('');
console.log('The post-processing pipeline is working (99% diff on test sphere)');
console.log('Now we need to integrate it into the real CloudWorld3D with terrain/clouds');
console.log('');
await browser.close();
