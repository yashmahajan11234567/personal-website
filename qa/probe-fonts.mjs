/*
 * Which font is ACTUALLY rendering, and what text-rendering settings apply?
 *
 * There is no @font-face anywhere in the project, so the whole hero runs on
 * whatever the OS has. Two competing smoothing declarations exist
 * (src/index.css and src/styles/globals.css), so the cascade winner has to be
 * read from the browser rather than assumed.
 */
import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight));
await p.waitForTimeout(1600);

const out = await p.evaluate(async () => {
  const res = {};
  const plate = document.querySelector('.cinematic-plate__body');
  const ps = getComputedStyle(plate);
  res.plate = {
    family: ps.fontFamily,
    smoothing: ps.webkitFontSmoothing,
    mozOsxFontSmoothing: ps.textRendering,
    textRendering: ps.textRendering,
    fontSize: ps.fontSize,
    // Width of a probe string in the FIRST listed family vs a known fallback,
    // to detect which family actually resolved.
    probeWidth: (() => {
      const c = document.createElement('canvas');
      const g = c.getContext('2d');
      const s = 'DATA ANALYST';
      g.font = `${ps.fontSize} ${ps.fontFamily}`;
      const withStack = g.measureText(s).width;
      g.font = `${ps.fontSize} monospace`;
      return { withStack, mono: g.measureText(s).width };
    })(),
  };

  const type = document.querySelector('.cinematic-type__glyphs');
  const ts = getComputedStyle(type);
  res.type = {
    family: ts.fontFamily,
    smoothing: ts.webkitFontSmoothing,
    textRendering: ts.textRendering,
    fontSize: ts.fontSize,
  };

  // Which of the named families are actually available to this browser?
  res.available = {};
  const names = [
    'Archivo Black',
    'Anton',
    'Impact',
    'Haettenschweiler',
    'Arial Narrow Bold',
    'Arial Black',
  ];
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const base = 'monospace';
  g.font = `72px ${base}`;
  const baseW = g.measureText('DATAANALYSTDEVOPSCLOUD').width;
  for (const n of names) {
    g.font = `72px "${n}", ${base}`;
    res.available[n] = Math.abs(g.measureText('DATAANALYSTDEVOPSCLOUD').width - baseW) > 0.5;
  }
  return res;
});

console.log('PLATE wordmark:');
console.log('  family        ', out.plate.family);
console.log('  size          ', out.plate.fontSize);
console.log('  -webkit-smoothing', out.plate.smoothing);
console.log('  -moz-osx        ', out.plate.mozOsxFontSmoothing);
console.log('  text-rendering  ', out.plate.textRendering);
console.log('  probe widths  ', JSON.stringify(out.plate.probeWidth));
console.log('\nHEADLINE:');
console.log('  family        ', out.type.family);
console.log('  size          ', out.type.fontSize);
console.log('  smoothing     ', out.type.smoothing, '/ text-rendering', out.type.textRendering);
console.log('\nFONT AVAILABILITY (differs from monospace = available):');
for (const [k, v] of Object.entries(out.available)) console.log(`  ${v ? 'YES' : 'no '}  ${k}`);

await b.close();