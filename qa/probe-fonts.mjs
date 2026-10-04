
import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);

const r = await page.evaluate(async () => {
  await document.fonts.ready;
  const out = { fonts: [] };
  const g = document.querySelector('.cinematic-type__word--left .cinematic-type__glyphs');
  const cs = getComputedStyle(g);
  out.rendered = { family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, track: cs.letterSpacing };
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;font-size:100px;white-space:nowrap';
  probe.textContent = 'PERSONALPORTFOLIO';
  document.body.appendChild(probe);
  const widthOf = (fam) => { probe.style.fontFamily = fam; return probe.getBoundingClientRect().width; };
  const wMono = widthOf('monospace');
  const wSans = widthOf('sans-serif');
  const wSerif = widthOf('serif');
  const cands = ['Impact','Anton','Archivo Black','Archivo Narrow','Archivo Narrow Bold',
    'League Gothic','Oswald','Bebas Neue','Haettenschweiler','Arial Narrow',
    'Arial Black','Roboto Condensed','Barlow Condensed','Saira Condensed',
    'Fjalla One','Big Shoulders Display','Anton SC','League Gothic Narrow',
    'Franklin Gothic Medium Cond','Arial Black','Liberation Sans Narrow'];
  const cvs = document.createElement('canvas'); const ctx = cvs.getContext('2d');
  for (const fam of cands) {
    const w = widthOf('"' + fam + '"');
    const available = !(Math.abs(w-wMono)<0.5 && Math.abs(w-wSans)<0.5 && Math.abs(w-wSerif)<0.5);
    ctx.font = '100px "' + fam + '"';
    const m = ctx.measureText('PERSONAL');
    const cap = ctx.measureText('P').actualBoundingBoxAscent || 72;
    out.fonts.push({ fam, w:+w.toFixed(1), available,
      adv8:+m.width.toFixed(1), cap:+cap.toFixed(1),
      advPerCap:+(m.width/cap).toFixed(4) });
  }
  probe.remove();
  return out;
});
console.log("RENDERED:", JSON.stringify(r.rendered));
console.log('');
console.log('avail | family                  width(PERSONAL+PORTFOLIO)@100  cap   adv/cap');
for (const f of r.fonts) {
  if (f.available) console.log('  YES  | ' + f.fam.padEnd(23) + String(f.w).padStart(10) + '  ' + String(f.cap).padStart(5) + '  ' + f.advPerCap);
}
console.log('');
console.log('NOT available: ' + r.fonts.filter(f=>!f.available).map(f=>f.fam).join(', '));
await b.close();
