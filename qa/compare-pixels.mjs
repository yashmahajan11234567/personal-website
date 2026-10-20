/** Compare baseline vs post-processing screenshots pixel by pixel */
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { PNG } from 'pngjs';

const baselineDir = 'qa-screenshots-baseline';
const afterDir = 'qa-screenshots-postprocessing';

const files = [
  'beat-00-open.png',
  'beat-05.png',
  'beat-10-selection-hold.png',
  'interaction-hover-cloud.png',
  'reduced-motion-1440.png',
];

async function compareImages(baselinePath, afterPath, outputPath) {
  return new Promise((resolve) => {
    const baselineStream = createReadStream(baselinePath);
    const afterStream = createReadStream(afterPath);
    
    const baselinePng = new PNG();
    const afterPng = new PNG();
    
    let baselineDone = false;
    let afterDone = false;
    
    baselineStream.pipe(baselinePng);
    afterStream.pipe(afterPng);
    
    baselinePng.on('parsed', () => { baselineDone = true; checkDone(); });
    afterPng.on('parsed', () => { afterDone = true; checkDone(); });
    
    function checkDone() {
      if (!baselineDone || !afterDone) return;
      
      if (baselinePng.width !== afterPng.width || baselinePng.height !== afterPng.height) {
        console.log(`  Size mismatch: baseline ${baselinePng.width}x${baselinePng.height} vs after ${afterPng.width}x${afterPng.height}`);
        resolve({ different: true, reason: 'size mismatch' });
        return;
      }
      
      const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
      let pixelDiffCount = 0;
      let maxDiff = 0;
      
      for (let y = 0; y < baselinePng.height; y++) {
        for (let x = 0; x < baselinePng.width; x++) {
          const idx = (baselinePng.width * y + x) << 2;
          
          const r1 = baselinePng.data[idx];
          const g1 = baselinePng.data[idx + 1];
          const b1 = baselinePng.data[idx + 2];
          const a1 = baselinePng.data[idx + 3];
          
          const r2 = afterPng.data[idx];
          const g2 = afterPng.data[idx + 1];
          const b2 = afterPng.data[idx + 2];
          const a2 = afterPng.data[idx + 3];
          
          const dr = Math.abs(r1 - r2);
          const dg = Math.abs(g1 - g2);
          const db = Math.abs(b1 - b2);
          const da = Math.abs(a1 - a2);
          
          const maxChannelDiff = Math.max(dr, dg, db, da);
          maxDiff = Math.max(maxDiff, maxChannelDiff);
          
          if (maxChannelDiff > 2) { // threshold of 2/255
            pixelDiffCount++;
            // Red highlight for diff
            diffPng.data[idx] = 255;
            diffPng.data[idx + 1] = 0;
            diffPng.data[idx + 2] = 0;
            diffPng.data[idx + 3] = 255;
          } else {
            diffPng.data[idx] = r1;
            diffPng.data[idx + 1] = g1;
            diffPng.data[idx + 2] = b1;
            diffPng.data[idx + 3] = a1;
          }
        }
      }
      
      const totalPixels = baselinePng.width * baselinePng.height;
      const diffPercent = (pixelDiffCount / totalPixels) * 100;
      
      // Save diff image
      const outStream = createWriteStream(outputPath);
      diffPng.pack().pipe(outStream);
      
      outStream.on('finish', () => {
        resolve({ 
          different: pixelDiffCount > 0,
          pixelDiffCount,
          totalPixels,
          diffPercent,
          maxDiff
        });
      });
    }
  });
}

async function main() {
  console.log('=== Pixel Comparison ===\n');
  
  for (const file of files) {
    const baselinePath = `${baselineDir}/${file}`;
    const afterPath = `${afterDir}/${file}`;
    const outputPath = `qa-screenshots/diff-${file}`;
    
    const result = await compareImages(baselinePath, afterPath, outputPath);
    
    console.log(`${file}:`);
    console.log(`  Different: ${result.different}`);
    console.log(`  Pixel diffs: ${result.pixelDiffCount} / ${result.totalPixels} (${result.diffPercent.toFixed(4)}%)`);
    console.log(`  Max channel diff: ${result.maxDiff}/255`);
    console.log();
  }
}

main().catch(console.error);
