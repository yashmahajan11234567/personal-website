
import { chromium } from 'playwright';
const b = await chromium.launch();
const out={};
for (const vp of [{w:1440,h:900},{w:1920,h:1080}]) {
  const page = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.reload({waitUntil:'networkidle'});
  await page.waitForTimeout(2300);
  const r=await page.evaluate(async()=>{ await document.fonts.ready;
    const q=s=>document.querySelector(s);
    const o={zT:getComputedStyle(q('.cinematic-type')).zIndex, zF:getComputedStyle(q('.cinematic-figure')).zIndex};
    o.w={};
    for (const side of ['left','right']) {
      const g=q('.cinematic-type__word--'+side+' .cinematic-type__glyphs');
      const cs=getComputedStyle(g); const n=g.firstChild;
      const a=document.createRange(); a.setStart(n,0); a.setEnd(n,1);
      const z=document.createRange(); z.setStart(n,n.length-1); z.setEnd(n,n.length);
      const A=a.getBoundingClientRect(), Z=z.getBoundingClientRect();
      const w=q('.cinematic-type__word--'+side);
      o.w[side]={text:g.textContent, size:+parseFloat(cs.fontSize).toFixed(2),
        ls:cs.letterSpacing, ff:cs.fontFamily.split(',')[0], tr:cs.transform,
        L:+A.left.toFixed(1), R:+Z.right.toFixed(1), T:+A.top.toFixed(1), B:+Z.bottom.toFixed(1),
        cssL:w.style.left, cssT:w.style.top};
    }
    const f=q('.cinematic-figure').getBoundingClientRect();
    o.fig={l:+f.left.toFixed(1), r:+f.right.toFixed(1), w:+f.width.toFixed(1)};
    return o; });
  out[vp.w]=r;
  const {left,right}=r.w;
  console.log(`\n### ${vp.w}x${vp.h}`);
  console.log(`  size ${left.size} / ${right.size}px  tracking ${left.ls}  font ${left.ff}  transform ${left.tr}`);
  console.log(`  layers: type z${r.zT} < figure z${r.zF}  (typography behind figure)`);
  for (const [nm,w] of [['PERSONAL',left],['PORTFOLIO',right]]) {
    console.log(`  ${nm.padEnd(9)} ink ${String(w.L).padStart(7)}..${String(w.R).padStart(7)}  cssLeft ${w.cssL}  cssTop ${w.cssT}  firstLetterIntact ${w.L>=0}`);
  }
  await page.screenshot({path:`qa/shots/final-${vp.w}.png`});
  await page.close();
}
await b.close();
