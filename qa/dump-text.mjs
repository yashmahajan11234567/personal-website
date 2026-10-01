import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
const d=await p.evaluate(()=>Array.from(document.querySelectorAll('.cinematic-type__word')).map(box=>{
  const fit=box.querySelector('.cinematic-type__fit');
  const g=box.querySelector('.cinematic-type__glyphs');
  const gr=g.getBoundingClientRect();
  return {
    text:g.textContent.trim(),
    boxW:Math.round(box.getBoundingClientRect().width),
    fitW:fit.clientWidth,
    glyphFontSize:getComputedStyle(g).fontSize,
    glyphTransform:getComputedStyle(g).transform,
    glyphRenderedW:Math.round(gr.width),
    glyphScrollW:g.scrollWidth,
    fitsWithinBox: gr.width <= box.getBoundingClientRect().width + 1,
  };
}));
console.log(JSON.stringify(d,null,1));
await b.close();
