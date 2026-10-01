import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractDelays(dir: string) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp')).sort();
  return files.map(f => {
    const m = f.match(/delay-([\d.]+)s/);
    return m ? parseFloat(m[1]) : 0.04;
  });
}

const leftDir = path.join(__dirname, '..', 'left side');
const rightDir = path.join(__dirname, '..', 'right side');

const leftDelays = extractDelays(leftDir);
const rightDelays = extractDelays(rightDir);

fs.writeFileSync('src/data/leftDelays.json', JSON.stringify(leftDelays, null, 2));
fs.writeFileSync('src/data/rightDelays.json', JSON.stringify(rightDelays, null, 2));

console.log(`Left: ${leftDelays.length} frames, ${leftDelays.reduce((a,b)=>a+b,0).toFixed(2)}s`);
console.log(`Right: ${rightDelays.length} frames, ${rightDelays.reduce((a,b)=>a+b,0).toFixed(2)}s`);