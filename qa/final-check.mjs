
import { chromium } from 'playwright';
const SIL_L=0.4088, SIL_R=0.5547;
const b = await chromium.launch();
for (const vp of [{w:1920,h:1080},{w:1440,h:900},{w:1280,h:720},{w:1024,h:768}]) {
  const page = await b.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const o={};
    for (const side of ['left','right']) {
      const w=document.querySelector('.cinematic-type__word--'+side);
      const g=w.querySelector('.cinematic-type__glyphs');
      const cs=getComputedStyle(g); const n=g.firstChild;
      const rf=document.createRange(); rf.setStart(n,0); rf.setEnd(n,1);
      const rl=document.createRange(); rl.setStart(n,n.length-1); rl.setEnd(n,n.length);
      const f=rf.getBoundingClientRect(), l=rl.getBoundingClientRect();
      const wb=w.getBoundingClientRect();
      o[side]={size:+parseFloat(cs.fontSize).toFixed(2),
        trackEm:+(parseFloat(cs.letterSpacing)/parseFloat(cs.fontSize)).toFixed(4),
        inkL:Math.round(f.left), inkR:Math.round(l.right),
        boxL:Math.round(wb.left), boxR:Math.round(wb.right)};
    }
    return o;
  });
  const L=r.left,R=r.right,silL=SIL_L*vp.w,silR=SIL_R*vp.w;
  console.log(`${vp.w}x${vp.h}  size ${L.size}px track ${L.trackEm}em | `
    +`clearFig L ${(silL-L.inkR).toFixed(0)} R ${(R.inkL-silR).toFixed(0)} | `
    +`wordGap ${R.inkL-L.inkR} | frameMargin L ${L.inkL} R ${vp.w-R.inkR} | `
    +`clip ${L.inkL<0.5||R.inkR>vp.w-0.5 ? 'YES':'no'} | `
    +`glow/env ${await page.evaluate(()=>[document.querySelectorAll('.cinematic-glow').length,document.querySelectorAll('.cinematic-env').length].join('/'))}`);
  await page.screenshot({path:`qa/shots/final-${vp.w}.png`});
  await page.close();
}
await b.close();
